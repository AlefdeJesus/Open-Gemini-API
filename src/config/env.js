import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// override: true garante recarregamento real do .env em restarts gerenciados pelo PM2
dotenv.config({ override: true });

// Suporte para ambientes corporativos, proxies ou antivírus com inspeção SSL (MITM)
if (
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ||
  process.env.STRICT_SSL === 'false' ||
  process.env.IGNORE_SSL_ERRORS === 'true'
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn(
    '\x1b[33m[AVISO SSL/TLS] Validação estrita de certificados SSL desativada (NODE_TLS_REJECT_UNAUTHORIZED=0). ' +
    'Modo compatível com proxies corporativos / inspeção TLS ativo.\x1b[0m'
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

function resolveProjectPath(rawPath, fallbackRelative) {
  const target = rawPath || fallbackRelative;
  return path.isAbsolute(target) ? target : path.resolve(projectRoot, target);
}

const API_SECRET_KEY = process.env.API_SECRET_KEY;
if (!API_SECRET_KEY) {
  console.warn(
    '\x1b[33m[AVISO DE SEGURANÇA] A variável API_SECRET_KEY não foi definida no .env! ' +
    'Utilizando chave padrão temporária para testes locais. Defina uma chave segura em produção.\x1b[0m'
  );
}

const GEMINI_SECURE_1PSID = process.env.GEMINI_SECURE_1PSID;
if (!GEMINI_SECURE_1PSID || GEMINI_SECURE_1PSID.includes('insira_aqui')) {
  console.warn(
    '\x1b[33m[CONFIGURAÇÃO] GEMINI_SECURE_1PSID não configurado ou está com o valor padrão. ' +
    'Chamadas autenticadas ao Gemini Pro/Advanced falharão até que o cookie real seja informado no .env.\x1b[0m'
  );
}

export const config = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  PORT: parseInt(process.env.PORT || '3333', 10),
  API_SECRET_KEY: API_SECRET_KEY || 'dev-local-default-key-change-in-production',

  GEMINI_SECURE_1PSID: GEMINI_SECURE_1PSID || '',
  GEMINI_SECURE_1PSIDTS: process.env.GEMINI_SECURE_1PSIDTS || '',
  GEMINI_SECURE_1PSIDCC: process.env.GEMINI_SECURE_1PSIDCC || '',
  GEMINI_SID: process.env.GEMINI_SID || '',
  GEMINI_HSID: process.env.GEMINI_HSID || '',
  GEMINI_SSID: process.env.GEMINI_SSID || '',

  GEMINI_ACCESS_TOKEN: process.env.GEMINI_ACCESS_TOKEN || '',
  GEMINI_BUILD_LABEL: process.env.GEMINI_BUILD_LABEL || '',
  GEMINI_SESSION_ID: process.env.GEMINI_SESSION_ID || '',

  BASE_URL: (process.env.BASE_URL || 'http://localhost:3333/api2').replace(/\/+$/, ''),
  STORAGE_DIR: resolveProjectPath(process.env.STORAGE_DIR, './storage/media'),
  CHROME_PROFILE_DIR: resolveProjectPath(process.env.CHROME_PROFILE_DIR, './storage/chrome-profile'),

  PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || '',
  CHROME_BIN: process.env.CHROME_BIN || '',
  CHROME_PATH: process.env.CHROME_PATH || '',

  GEMINI_TIMEOUT_MS: parseInt(process.env.GEMINI_TIMEOUT_MS || '300000', 10),
  MEDIA_MAX_AGE_HOURS: parseInt(process.env.MEDIA_MAX_AGE_HOURS || '4', 10),
  MEDIA_CLEANUP_INTERVAL_MS: parseInt(process.env.MEDIA_CLEANUP_INTERVAL_MS || String(30 * 60 * 1000), 10),
  COOKIE_REFRESH_HOURS: parseFloat(process.env.COOKIE_REFRESH_HOURS || '3'),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  PROJECT_ROOT: projectRoot
});

export default config;
