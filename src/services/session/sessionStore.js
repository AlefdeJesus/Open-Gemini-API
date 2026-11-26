import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/env.js';

const DEFAULT_ENV_PATH = path.resolve(config.PROJECT_ROOT, '.env');
const DEFAULT_ENV_EXAMPLE_PATH = path.resolve(config.PROJECT_ROOT, '.env.example');

const SESSION_ENV_KEYS = [
  'GEMINI_SECURE_1PSID',
  'GEMINI_SECURE_1PSIDTS',
  'GEMINI_SECURE_1PSIDCC',
  'GEMINI_SID',
  'GEMINI_HSID',
  'GEMINI_SSID',
  'GEMINI_ACCESS_TOKEN',
  'GEMINI_BUILD_LABEL',
  'GEMINI_SESSION_ID'
];

const COOKIE_TO_ENV_ENTRIES = [
  ['__Secure-1PSID', 'GEMINI_SECURE_1PSID'],
  ['__Secure-1PSIDTS', 'GEMINI_SECURE_1PSIDTS'],
  ['__Secure-1PSIDCC', 'GEMINI_SECURE_1PSIDCC'],
  ['SID', 'GEMINI_SID'],
  ['HSID', 'GEMINI_HSID'],
  ['SSID', 'GEMINI_SSID']
];

const TOKEN_TO_ENV_ENTRIES = [
  ['__SNlM0e', 'GEMINI_ACCESS_TOKEN'],
  ['__cfb2h', 'GEMINI_BUILD_LABEL'],
  ['__FdrFJe', 'GEMINI_SESSION_ID']
];

let runtimeCredentials = {
  GEMINI_SECURE_1PSID: config.GEMINI_SECURE_1PSID,
  GEMINI_SECURE_1PSIDTS: config.GEMINI_SECURE_1PSIDTS,
  GEMINI_SECURE_1PSIDCC: config.GEMINI_SECURE_1PSIDCC,
  GEMINI_SID: config.GEMINI_SID,
  GEMINI_HSID: config.GEMINI_HSID,
  GEMINI_SSID: config.GEMINI_SSID,
  GEMINI_ACCESS_TOKEN: config.GEMINI_ACCESS_TOKEN,
  GEMINI_BUILD_LABEL: config.GEMINI_BUILD_LABEL,
  GEMINI_SESSION_ID: config.GEMINI_SESSION_ID
};

const listeners = new Set();

export function isUsableCredentialValue(value) {
  return Boolean(value && typeof value === 'string' && !value.includes('insira_aqui'));
}

export function readEnvFileMap(envPath = DEFAULT_ENV_PATH) {
  const parsed = {};
  try {
    if (!fs.existsSync(envPath)) {
      return parsed;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        parsed[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (err) {
    console.warn(`[SESSION STORE] Aviso ao ler ${envPath}: ${err.message}`);
  }
  return parsed;
}

export function getSessionCredentials({ syncFromDisk = false, envPath = DEFAULT_ENV_PATH } = {}) {
  if (syncFromDisk) {
    const diskValues = readEnvFileMap(envPath);
    for (const key of SESSION_ENV_KEYS) {
      if (diskValues[key]) {
        runtimeCredentials[key] = diskValues[key];
      }
    }
  }
  return { ...runtimeCredentials };
}

export function onSessionUpdated(listener) {
  if (typeof listener === 'function') {
    listeners.add(listener);
  }
  return () => listeners.delete(listener);
}

export function updateSessionCredentials(newValues = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(newValues)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  runtimeCredentials = { ...runtimeCredentials, ...sanitized };

  for (const listener of listeners) {
    try {
      listener({ ...runtimeCredentials }, sanitized);
    } catch (err) {
      console.warn(`[SESSION STORE] Erro em listener de sessão: ${err.message}`);
    }
  }

  return { ...runtimeCredentials };
}

export function buildGoogleCookieHeader(options = {}) {
  const creds = getSessionCredentials(options);
  const parts = [];
  if (isUsableCredentialValue(creds.GEMINI_SECURE_1PSID)) {
    parts.push(`__Secure-1PSID=${creds.GEMINI_SECURE_1PSID}`);
  }
  if (isUsableCredentialValue(creds.GEMINI_SECURE_1PSIDTS)) {
    parts.push(`__Secure-1PSIDTS=${creds.GEMINI_SECURE_1PSIDTS}`);
  }
  if (isUsableCredentialValue(creds.GEMINI_SID)) {
    parts.push(`SID=${creds.GEMINI_SID}`);
  }
  return parts.join('; ');
}

export function buildPuppeteerCookies(
  domains = ['.google.com', '.googleusercontent.com'],
  options = {}
) {
  const creds = getSessionCredentials(options);
  const cookies = [];

  for (const domain of domains) {
    for (const [cookieName, envKey] of COOKIE_TO_ENV_ENTRIES) {
      const value = creds[envKey];
      if (isUsableCredentialValue(value)) {
        cookies.push({
          name: cookieName,
          value,
          domain,
          path: '/',
          secure: true
        });
      }
    }
  }

  return cookies;
}

export function persistCookiesToEnvFile(
  rawCookieMap,
  { envPath = DEFAULT_ENV_PATH, envExamplePath = DEFAULT_ENV_EXAMPLE_PATH } = {}
) {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  } else {
    envContent = [
      'PORT=3333',
      'NODE_ENV=development',
      'API_SECRET_KEY=sua_chave_secreta_aqui',
      'BASE_URL=http://localhost:3333/api2',
      'STORAGE_DIR=./storage/media',
      'GEMINI_TIMEOUT_MS=300000',
      'MEDIA_MAX_AGE_HOURS=4',
      ''
    ].join('\n');
  }

  const allMappings = [...COOKIE_TO_ENV_ENTRIES, ...TOKEN_TO_ENV_ENTRIES];
  const updatedEnvValues = {};

  for (const [rawKey, envKey] of allMappings) {
    const value = rawCookieMap[rawKey];
    if (value) {
      updatedEnvValues[envKey] = value;
      const lineRegex = new RegExp(`^${envKey}=.*$`, 'm');
      if (lineRegex.test(envContent)) {
        envContent = envContent.replace(lineRegex, `${envKey}=${value}`);
      } else {
        envContent += `${envContent.endsWith('\n') ? '' : '\n'}${envKey}=${value}\n`;
      }
    }
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  updateSessionCredentials(updatedEnvValues);
}
