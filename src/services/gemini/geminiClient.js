import pkg from 'gemini-web-sdk';
import config from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import {
  getSessionCredentials,
  isUsableCredentialValue,
  onSessionUpdated,
  updateSessionCredentials
} from '../session/sessionStore.js';
import { refreshGeminiCookies } from '../cookieRefresher.js';

const { Gemini, Model } = pkg;

const TOKEN_CACHE_MS = 15 * 60 * 1000;

let clientInstance = null;
let lastTokenTimestamp = 0;

onSessionUpdated((_allCredentials, updatedFields) => {
  if (updatedFields?.GEMINI_ACCESS_TOKEN) {
    lastTokenTimestamp = Date.now();
  }
  clientInstance = null;
  console.log('[GEMINI CLIENT] Credenciais de sessão em memória atualizadas.');
});

export function updateRuntimeCookies(newCookies) {
  updateSessionCredentials(newCookies);
}

export function resolveModel(modelInput) {
  if (!modelInput) return null;
  if (typeof modelInput === 'object') return modelInput;

  const normalized = String(modelInput).toLowerCase().trim();
  if (
    normalized === 'advanced_pro' ||
    normalized.includes('3.8') ||
    normalized.includes('advanced') ||
    normalized === 'pro' ||
    normalized.includes('high')
  ) {
    return Model.ADVANCED_PRO;
  }
  if (normalized === 'advanced_flash') {
    return Model.ADVANCED_FLASH;
  }
  if (normalized === 'basic_flash' || normalized === 'gemini-3-flash' || normalized === 'flash') {
    return Model.BASIC_FLASH;
  }
  if (normalized === 'basic_pro' || normalized === 'gemini-3-pro' || normalized === 'basic') {
    return Model.BASIC_PRO;
  }
  if (normalized === 'unspecified' || normalized === 'default') {
    return Model.UNSPECIFIED;
  }

  try {
    return Model.fromName(modelInput);
  } catch {
    return Model.BASIC_FLASH || Model.ADVANCED_PRO;
  }
}

export function getGeminiClient() {
  const credentials = getSessionCredentials();
  const psid = credentials.GEMINI_SECURE_1PSID;

  if (!isUsableCredentialValue(psid)) {
    throw new AppError(
      'O cookie GEMINI_SECURE_1PSID não está configurado. Insira o cookie __Secure-1PSID no arquivo .env ou execute npm run login.',
      401,
      'AUTH_COOKIE_MISSING'
    );
  }

  if (!clientInstance) {
    const psidts = credentials.GEMINI_SECURE_1PSIDTS;
    const psidcc = credentials.GEMINI_SECURE_1PSIDCC;
    const sid = credentials.GEMINI_SID;
    const hsid = credentials.GEMINI_HSID;
    const ssid = credentials.GEMINI_SSID;

    clientInstance = new Gemini({
      secure_1psid: psid,
      secure_1psidts: psidts || undefined,
      secure_1psidcc: psidcc || undefined,
      timeout: config.GEMINI_TIMEOUT_MS,
      autoClose: false,
      maxResponseHeaderSize: 65536
    });

    if (psidts) clientInstance.cookies['__Secure-1PSIDTS'] = psidts;
    if (psidcc) clientInstance.cookies['__Secure-1PSIDCC'] = psidcc;
    if (sid) clientInstance.cookies['SID'] = sid;
    if (hsid) clientInstance.cookies['HSID'] = hsid;
    if (ssid) clientInstance.cookies['SSID'] = ssid;

    const accessToken = credentials.GEMINI_ACCESS_TOKEN;
    const buildLabel = credentials.GEMINI_BUILD_LABEL;
    const sessionId = credentials.GEMINI_SESSION_ID;

    if (accessToken) {
      clientInstance.accessToken = accessToken;
      if (buildLabel) clientInstance.buildLabel = buildLabel;
      if (sessionId) clientInstance.sessionId = sessionId;
      // _ready sinaliza ao gemini-web-sdk que o token anti-CSRF já foi injetado
      clientInstance._ready = true;
    }
  }

  return clientInstance;
}

export async function getAuthenticatedGeminiClient() {
  const client = getGeminiClient();
  const isTokenExpired = Date.now() - lastTokenTimestamp > TOKEN_CACHE_MS;

  if (client.accessToken && !isTokenExpired) {
    return client;
  }

  console.log('[GEMINI AUTH] Renovando credenciais de sessão e accessToken via perfil do Chrome...');
  try {
    const refreshResult = await refreshGeminiCookies({ headless: true });
    if (refreshResult?.sucesso !== false) {
      const refreshedClient = getGeminiClient();
      if (refreshedClient.accessToken) {
        lastTokenTimestamp = Date.now();
        console.log('[GEMINI AUTH] Sessão autenticada com sucesso via navegador.');
        return refreshedClient;
      }
    }
  } catch (refreshErr) {
    console.warn(`[GEMINI AUTH] Auto-renovação via Chrome falhou: ${refreshErr.message}`);
  }

  if (!client.accessToken) {
    client._ready = false;
    client._initPromise = null;
    try {
      await client.init();
      if (client.accessToken) {
        lastTokenTimestamp = Date.now();
      }
    } catch (initErr) {
      console.warn(`[GEMINI AUTH] Falha no client.init(): ${initErr.message}`);
    }
  }

  if (!client.accessToken) {
    throw new AppError(
      'Sessão do Google Gemini não autenticada (__Secure-1PSID / __Secure-1PSIDTS inválidos ou expirados). ' +
        'O Google rejeitou os cookies informados. Para resolver, execute npm run login (ou atualize os cookies no .env e limpe a pasta storage/chrome-profile).',
      401,
      'GEMINI_AUTH_REQUIRED'
    );
  }

  console.log(`[GEMINI AUTH] Sessão ativa (buildLabel: ${client.buildLabel || 'N/A'}).`);
  return client;
}
