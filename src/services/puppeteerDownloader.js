import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { findChromeExecutable } from './browser/chromeLocator.js';
import { buildPuppeteerCookies } from './session/sessionStore.js';

export { findChromeExecutable };

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--disable-extensions'
];

/**
 * Gera permutações de alta resolução conhecidas para URLs do Google CDN (lh3.googleusercontent.com),
 * mantendo ordem de prioridade da maior resolução (=s0 / =w2048 / /rd-gg-dl/) para os fallbacks.
 */
export function buildHighResCandidateUrls(url, alternativeUrls = []) {
  const baseInputUrls = [];
  if (Array.isArray(url)) {
    baseInputUrls.push(...url);
  } else if (typeof url === 'string') {
    baseInputUrls.push(url);
  }
  if (Array.isArray(alternativeUrls)) {
    baseInputUrls.push(...alternativeUrls);
  }

  const candidates = [];
  for (const rawUrl of baseInputUrls) {
    if (!rawUrl || typeof rawUrl !== 'string') continue;
    const cleanUrl = rawUrl.replace(/=[^/]+$/, '');

    candidates.push(`${cleanUrl}=s0`);
    candidates.push(`${cleanUrl}=s0-d`);
    candidates.push(`${cleanUrl}=w2048`);
    candidates.push(`${cleanUrl}=w1920`);
    candidates.push(`${cleanUrl}=s2048`);
    candidates.push(`${cleanUrl}=s1024`);

    if (cleanUrl.includes('/gg/') || cleanUrl.includes('/gg-dl/')) {
      const rdUrl = cleanUrl.replace('/gg/', '/rd-gg-dl/').replace('/gg-dl/', '/rd-gg-dl/');
      candidates.push(`${rdUrl}=s0`);
      candidates.push(rdUrl);
    }

    candidates.push(cleanUrl);
    candidates.push(rawUrl);
  }

  return candidates.filter((item, idx, arr) => item && arr.indexOf(item) === idx);
}

async function evaluateBestMediaInPage(page, candidateUrls) {
  return page.evaluate(async (urls) => {
    let best = null;

    for (const testUrl of urls) {
      try {
        const resp = await fetch(testUrl, {
          credentials: 'include',
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });
        if (!resp.ok) continue;

        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('text/html')) continue;

        const arrayBuffer = await resp.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength < 5000) continue;

        const dimensions = await new Promise((resolve) => {
          const blob = new Blob([arrayBuffer], { type: contentType || 'image/jpeg' });
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve(null);
          img.src = URL.createObjectURL(blob);
        });

        const width = dimensions ? dimensions.width : 0;
        const height = dimensions ? dimensions.height : 0;
        const byteLength = arrayBuffer.byteLength;

        const candidate = {
          url: testUrl,
          width,
          height,
          byteLength,
          contentType: contentType || 'image/jpeg',
          buffer: Array.from(new Uint8Array(arrayBuffer))
        };

        if (!best || width > best.width || (width === best.width && byteLength > best.byteLength)) {
          best = candidate;
        }

        if (width >= 1024) {
          break;
        }
      } catch {
        // Continua testando a próxima variante candidata
      }
    }

    return best;
  }, candidateUrls).catch(() => null);
}

async function fetchMediaViaDirectNavigation(page, candidateUrls) {
  for (const fallbackUrl of candidateUrls) {
    try {
      const resp = await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
      if (resp && resp.status() === 200) {
        const buffer = await resp.buffer();
        if (buffer && buffer.length > 5000) {
          return {
            buffer,
            contentType: (resp.headers()['content-type'] || 'image/jpeg').toLowerCase(),
            url: fallbackUrl
          };
        }
      }
    } catch {
      // Tenta próxima URL de fallback
    }
  }
  return null;
}

export async function downloadGoogleMedia(url, destPath, options = {}) {
  const chromePath = findChromeExecutable();
  const cookies = buildPuppeteerCookies(['.google.com', '.googleusercontent.com'], {
    syncFromDisk: true
  });
  const uniqueCandidates = buildHighResCandidateUrls(url, options.alternativeUrls);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: BROWSER_ARGS
  });

  try {
    const page = await browser.newPage();

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: 'https://gemini.google.com/'
    });

    console.log('[PUPPETEER DOWNLOADER] Inicializando contexto autenticado em gemini.google.com...');
    await page.goto('https://gemini.google.com/app', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    }).catch(() => null);

    console.log(`[PUPPETEER DOWNLOADER] Testando ${uniqueCandidates.length} variantes de resolução...`);

    const bestResult = await evaluateBestMediaInPage(page, uniqueCandidates);

    let finalBuffer = null;
    let finalContentType = 'image/jpeg';
    let finalWidth = 0;
    let finalHeight = 0;
    let usedUrl = '';

    if (bestResult && bestResult.buffer && bestResult.buffer.length > 5000) {
      finalBuffer = Buffer.from(bestResult.buffer);
      finalContentType = bestResult.contentType || 'image/jpeg';
      finalWidth = bestResult.width || 0;
      finalHeight = bestResult.height || 0;
      usedUrl = bestResult.url;
      console.log(
        `[PUPPETEER DOWNLOADER] Mídia obtida em alta resolução: ${finalWidth}x${finalHeight} (${finalBuffer.length} bytes)`
      );
    } else {
      console.warn('[PUPPETEER DOWNLOADER] Fetch interno sem resultado. Tentando navegação direta...');
      const directResult = await fetchMediaViaDirectNavigation(page, uniqueCandidates);
      if (directResult) {
        finalBuffer = directResult.buffer;
        finalContentType = directResult.contentType;
        usedUrl = directResult.url;
        console.log(`[PUPPETEER DOWNLOADER] Mídia baixada via navegação direta (${finalBuffer.length} bytes)`);
      }
    }

    if (!finalBuffer || finalBuffer.length === 0) {
      throw new Error('Nenhuma das variantes de mídia do Google pôde ser baixada com sucesso.');
    }

    const parentDir = path.dirname(destPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(destPath, finalBuffer);

    return {
      path: destPath,
      size: finalBuffer.length,
      contentType: finalContentType,
      width: finalWidth,
      height: finalHeight,
      url: usedUrl
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
