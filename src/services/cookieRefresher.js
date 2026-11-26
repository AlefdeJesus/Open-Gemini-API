import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config/env.js';
import { findChromeExecutable } from './browser/chromeLocator.js';
import {
  buildPuppeteerCookies,
  onSessionUpdated,
  persistCookiesToEnvFile
} from './session/sessionStore.js';

const PROFILE_DIR = config.CHROME_PROFILE_DIR;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

let isRefreshing = false;
let autoRefreshTimer = null;

export function onCookiesUpdated(callback) {
  return onSessionUpdated(callback);
}

export function isCookieRefreshRunning() {
  return isRefreshing;
}

function configureLinuxDisplayIfNeeded(headless) {
  if (process.platform !== 'linux' || headless || process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    return;
  }

  try {
    const x11Dir = '/tmp/.X11-unix';
    if (fs.existsSync(x11Dir)) {
      const xDisplays = fs
        .readdirSync(x11Dir)
        .filter((file) => /^X\d+$/.test(file))
        .map((file) => parseInt(file.replace('X', ''), 10))
        .sort((a, b) => a - b);

      process.env.DISPLAY = xDisplays.length > 0 ? `:${xDisplays[0]}` : ':0';
      console.log(`[COOKIE REFRESHER] DISPLAY configurado automaticamente como ${process.env.DISPLAY}`);
    } else {
      process.env.DISPLAY = ':0';
    }
  } catch {
    process.env.DISPLAY = ':0';
  }

  if (!process.env.XAUTHORITY) {
    const homeDir = process.env.HOME || '';
    const xauthPath = path.join(homeDir, '.Xauthority');
    if (fs.existsSync(xauthPath)) {
      process.env.XAUTHORITY = xauthPath;
    }
  }
}

async function checkIsGeminiAuthenticated(page) {
  return page.evaluate(() => {
    const html = document.documentElement ? document.documentElement.innerHTML : '';
    const hasSNlM0e = typeof window.WIZ_global_data === 'object' && Boolean(window.WIZ_global_data?.SNlM0e);
    const hasRawSNlM0e = /"SNlM0e":"([^"]+)"/.test(html);

    const hasChatInput = Boolean(
      document.querySelector('rich-textarea, div[contenteditable="true"], textarea')
    );
    const hasUserAvatar = Boolean(
      document.querySelector(
        'img[src*="googleusercontent.com"], a[href*="SignOutOptions"], a[aria-label*="Google Account"], a[aria-label*="Conta do Google"]'
      )
    );

    const hasLoginButton = Array.from(document.querySelectorAll('a, button')).some((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      return (
        text === 'fazer login' ||
        text === 'sign in' ||
        href.includes('accounts.google.com/servicelogin')
      );
    });

    return (hasSNlM0e || hasRawSNlM0e || (hasChatInput && hasUserAvatar)) && !hasLoginButton;
  }).catch(() => false);
}

async function waitForAuthenticatedSession(page, { headless, timeout, maxWaitLoginMs }) {
  const startTime = Date.now();
  const maxWait = headless ? 20000 : maxWaitLoginMs;

  while (Date.now() - startTime < maxWait) {
    const currentUrl = page.url();

    if (currentUrl.includes('CookieMismatch')) {
      console.warn('[COOKIE REFRESHER] Detectado CookieMismatch. Limpando cookies da aba e recarregando login...');
      try {
        const cdpClient = await page.target().createCDPSession();
        await cdpClient.send('Network.clearBrowserCookies');
        await page.goto(
          'https://accounts.google.com/ServiceLogin?continue=https://gemini.google.com/app',
          { timeout }
        ).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      } catch (err) {
        console.warn('[COOKIE REFRESHER] Aviso ao recuperar de CookieMismatch:', err.message);
      }
    }

    const isAtGeminiApp = currentUrl.startsWith('https://gemini.google.com');
    const isAtLoginOrError =
      currentUrl.includes('accounts.google.com') ||
      currentUrl.includes('CookieMismatch') ||
      currentUrl.includes('signin') ||
      currentUrl.includes('ServiceLogin');

    if (isAtGeminiApp && !isAtLoginOrError) {
      const authenticated = await checkIsGeminiAuthenticated(page);
      if (authenticated) {
        const geminiCookies = await page.cookies('https://gemini.google.com');
        const googleCookies = await page.cookies('https://google.com');
        const allCookies = [...geminiCookies, ...googleCookies];

        const hasPsid = allCookies.some((c) => c.name === '__Secure-1PSID');
        const hasPsidts = allCookies.some((c) => c.name === '__Secure-1PSIDTS');

        if (hasPsid && hasPsidts) {
          console.log('[COOKIE REFRESHER] Sessão ativa e autenticada detectada no Gemini Web.');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return true;
        }
      }
    }

    if (headless && isAtLoginOrError) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}

async function extractSessionTokensFromPage(page) {
  return page.evaluate(() => {
    const wiz = window.WIZ_global_data || {};
    const html = document.documentElement ? document.documentElement.innerHTML : '';
    const snlm0e = wiz.SNlM0e || (html.match(/"SNlM0e":\s*"([^"]+)"/) || [])[1] || null;
    const cfb2h = wiz.cfb2h || (html.match(/"cfb2h":\s*"([^"]+)"/) || [])[1] || null;
    const fdrfje = wiz.FdrFJe || (html.match(/"FdrFJe":\s*"([^"]+)"/) || [])[1] || null;
    return { snlm0e, cfb2h, fdrfje };
  }).catch(() => ({}));
}

export async function refreshGeminiCookies(options = {}) {
  if (isRefreshing) {
    console.warn('[COOKIE REFRESHER] Renovação de cookies já em execução. Aguardando conclusão...');
    while (isRefreshing) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return { sucesso: true, mensagem: 'Renovação concluída pelo processo concorrente.' };
  }

  isRefreshing = true;

  try {
    if (!fs.existsSync(PROFILE_DIR)) {
      fs.mkdirSync(PROFILE_DIR, { recursive: true });
    }

    const chromePath = findChromeExecutable();
    const headless = options.headless !== false;
    const timeout = options.timeout || 60000;
    const maxWaitLoginMs = options.maxWaitLoginMs || 180000;

    console.log(
      `[COOKIE REFRESHER] Iniciando Chrome (${headless ? 'modo headless' : 'modo janela interativa'})...`
    );
    configureLinuxDisplayIfNeeded(headless);

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: headless ? 'new' : false,
      defaultViewport: headless ? { width: 1280, height: 800 } : null,
      userDataDir: PROFILE_DIR,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-infobars',
        ...(headless
          ? ['--window-size=1280,800']
          : ['--start-maximized', '--window-position=0,0']),
        ...(process.platform === 'linux' ? ['--disable-gpu'] : [])
      ]
    });

    try {
      const page = await browser.newPage();
      if (headless) {
        await page.setViewport({ width: 1280, height: 800 });
      }
      await page.setUserAgent(DEFAULT_USER_AGENT);

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      });

      // Injeta cookies semente apenas em '.google.com' e somente em modo headless.
      // Injetar simultaneamente em '.gemini.google.com' causa duplicação e o erro 'CookieMismatch' do Google.
      if (headless) {
        const seedCookies = buildPuppeteerCookies(['.google.com'], { syncFromDisk: true });
        if (seedCookies.length > 0) {
          await page.setCookie(...seedCookies).catch(() => {});
        }
      }

      console.log('[COOKIE REFRESHER] Conectando a https://gemini.google.com/app...');
      await page.goto('https://gemini.google.com/app', {
        waitUntil: 'networkidle2',
        timeout
      }).catch(() => page.goto('https://gemini.google.com/app', { timeout }).catch(() => {}));

      if (!headless) {
        console.log('\n======================================================');
        console.log('👉 Se o Gemini já abrir conectado, a captura será instantânea!');
        console.log('👉 Caso a sessão peça login, entre com sua conta Google.');
        console.log('👉 A sessão será mantida salva para todas as próximas execuções.');
        console.log('======================================================\n');
      }

      const isLogged = await waitForAuthenticatedSession(page, {
        headless,
        timeout,
        maxWaitLoginMs
      });

      if (!isLogged) {
        if (!headless) {
          throw new Error('Tempo limite para login excedido. Não foi detectada sessão autenticada a tempo.');
        }
        // Em modo headless, preserva o .env intacto para evitar sobrescrever credenciais com estado deslogado
        console.warn('[COOKIE REFRESHER] Sessão no perfil do Chrome está desconectada ou expirada.');
        return {
          sucesso: false,
          mensagem: 'Sessão deslogada ou expirada. Execute "npm run login" ou atualize os cookies no .env.'
        };
      }

      const rawCookiesGemini = await page.cookies('https://gemini.google.com');
      const rawCookiesGoogle = await page.cookies('https://google.com');
      const cookieMap = {};
      for (const cookie of [...rawCookiesGemini, ...rawCookiesGoogle]) {
        cookieMap[cookie.name] = cookie.value;
      }

      const pageTokens = await extractSessionTokensFromPage(page);
      if (pageTokens.snlm0e) cookieMap['__SNlM0e'] = pageTokens.snlm0e;
      if (pageTokens.cfb2h) cookieMap['__cfb2h'] = pageTokens.cfb2h;
      if (pageTokens.fdrfje) cookieMap['__FdrFJe'] = pageTokens.fdrfje;

      if (!cookieMap['__Secure-1PSID'] || !cookieMap['__Secure-1PSIDTS']) {
        throw new Error('Não foi possível capturar os cookies __Secure-1PSID e __Secure-1PSIDTS da sessão ativa.');
      }

      persistCookiesToEnvFile(cookieMap);
      console.log(
        `[COOKIE REFRESHER] Cookies e tokens atualizados com sucesso (accessToken presente: ${Boolean(pageTokens.snlm0e)}).`
      );

      return cookieMap;
    } finally {
      await browser.close().catch(() => {});
    }
  } finally {
    isRefreshing = false;
  }
}

// Mantém alias em português por compatibilidade com scripts e integrações existentes
export const renovarCookiesGemini = refreshGeminiCookies;

export function startCookieAutoRefreshTask(intervalHours = config.COOKIE_REFRESH_HOURS) {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  console.log(`[COOKIE CRON] Auto-renovação de cookies agendada a cada ${intervalHours} hora(s).`);

  autoRefreshTimer = setInterval(async () => {
    try {
      console.log('\n[COOKIE CRON] Executando renovação automática de cookies do Gemini...');
      const result = await refreshGeminiCookies({ headless: true });
      if (result?.sucesso === false) {
        console.warn(`[COOKIE CRON] Renovação automática não concluída: ${result.mensagem}`);
      } else {
        console.log('[COOKIE CRON] Renovação automática concluída com sucesso.\n');
      }
    } catch (err) {
      console.warn(`[COOKIE CRON] Falha na auto-renovação periódica (${err.message}).`);
    }
  }, intervalMs);

  const bootTimer = setTimeout(async () => {
    try {
      console.log('\n[COOKIE CRON] Executando verificação inicial de cookies no boot...');
      const result = await refreshGeminiCookies({ headless: true });
      if (result?.sucesso === false) {
        console.warn(`[COOKIE CRON] Verificação inicial pendente de login: ${result.mensagem}\n`);
      } else {
        console.log('[COOKIE CRON] Verificação inicial de cookies concluída com sucesso.\n');
      }
    } catch (err) {
      console.warn(`[COOKIE CRON] Aviso na verificação inicial (${err.message}).`);
    }
  }, 5000);

  // Impede que os timers mantenham o event loop aberto no encerramento do processo
  if (autoRefreshTimer.unref) autoRefreshTimer.unref();
  if (bootTimer.unref) bootTimer.unref();
}

export default {
  refreshGeminiCookies,
  renovarCookiesGemini,
  startCookieAutoRefreshTask,
  isCookieRefreshRunning,
  onCookiesUpdated
};
