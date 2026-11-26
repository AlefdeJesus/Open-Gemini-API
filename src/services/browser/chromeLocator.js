import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/env.js';

function getCandidateChromePaths() {
  return [
    config.PUPPETEER_EXECUTABLE_PATH,
    config.CHROME_BIN,
    config.CHROME_PATH,

    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
      : null,

    // Linux (Ubuntu, Debian, CentOS, Fedora, Arch)
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/local/bin/chrome',
    '/usr/local/bin/chromium',

    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
}

function findBinaryInDir(dir, binaryName) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findBinaryInDir(fullPath, binaryName);
        if (found) return found;
      } else if (
        entry.name === binaryName ||
        (process.platform === 'win32' && entry.name === `${binaryName}.exe`)
      ) {
        return fullPath;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function findChromeExecutable() {
  for (const candidatePath of getCandidateChromePaths()) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const cacheDir = path.join(homeDir, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) {
      const binaryName = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
      const cachedBinary = findBinaryInDir(cacheDir, binaryName);
      if (cachedBinary) {
        return cachedBinary;
      }
    }
  }

  throw new Error(
    'Google Chrome / Chromium não foi encontrado no sistema.\n' +
    'Em servidores Linux (Ubuntu/Debian), instale com: sudo apt update && sudo apt install -y chromium-browser\n' +
    'Ou defina PUPPETEER_EXECUTABLE_PATH no .env apontando para o binário do navegador.'
  );
}
