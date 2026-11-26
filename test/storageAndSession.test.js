import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  cleanExpiredMedia,
  ensureStorageDirectory
} from '../src/services/cleanupService.js';
import {
  buildGoogleCookieHeader,
  buildPuppeteerCookies,
  onSessionUpdated,
  persistCookiesToEnvFile,
  readEnvFileMap
} from '../src/services/session/sessionStore.js';

describe('Storage Cleanup & Session Store', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-gemini-api-test-'));
  });

  after(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('cleanExpiredMedia deve remover apenas arquivos expirados preservando .gitkeep e recentes', async () => {
    const mediaDir = path.join(tempDir, 'media');
    ensureStorageDirectory(mediaDir);

    const gitkeep = path.join(mediaDir, '.gitkeep');
    const oldFile = path.join(mediaDir, 'expired.mp4');
    fs.writeFileSync(gitkeep, '');
    fs.writeFileSync(oldFile, 'expired');

    // Aguarda 50ms para que tanto mtimeMs quanto birthtimeMs (Windows NTFS) ultrapassem o limite
    await new Promise((resolve) => setTimeout(resolve, 50));

    const freshFile = path.join(mediaDir, 'fresh.mp3');
    fs.writeFileSync(freshFile, 'fresh');

    const result = cleanExpiredMedia(25, mediaDir);
    assert.equal(result.excluidos, 1);
    assert.deepEqual(result.arquivosExcluidos, ['expired.mp4']);
    assert.equal(fs.existsSync(oldFile), false);
    assert.equal(fs.existsSync(gitkeep), true);
    assert.equal(fs.existsSync(freshFile), true);
  });

  it('sessionStore deve persistir cookies em arquivo .env isolado e notificar listeners em memória', () => {
    const customEnvPath = path.join(tempDir, '.env.test');
    fs.writeFileSync(customEnvPath, 'PORT=3333\nGEMINI_SECURE_1PSID=antigo\n', 'utf8');

    let notified = false;
    const unsubscribe = onSessionUpdated((_all, updated) => {
      if (updated.GEMINI_SECURE_1PSID === 'psid_novo_teste') {
        notified = true;
      }
    });

    try {
      persistCookiesToEnvFile(
        {
          '__Secure-1PSID': 'psid_novo_teste',
          '__Secure-1PSIDTS': 'psidts_novo_teste',
          SID: 'sid_teste',
          __SNlM0e: 'token_teste'
        },
        { envPath: customEnvPath }
      );

      assert.equal(notified, true);

      const diskMap = readEnvFileMap(customEnvPath);
      assert.equal(diskMap.PORT, '3333');
      assert.equal(diskMap.GEMINI_SECURE_1PSID, 'psid_novo_teste');
      assert.equal(diskMap.GEMINI_ACCESS_TOKEN, 'token_teste');

      const header = buildGoogleCookieHeader();
      assert.ok(header.includes('__Secure-1PSID=psid_novo_teste'));

      const puppeteerCookies = buildPuppeteerCookies(['.google.com']);
      assert.ok(puppeteerCookies.some((c) => c.name === '__Secure-1PSID' && c.domain === '.google.com'));
    } finally {
      unsubscribe();
    }
  });
});
