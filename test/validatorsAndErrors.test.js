import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../src/errors/AppError.js';
import { formatGeminiError } from '../src/errors/errorHandler.js';
import { buildHighResCandidateUrls } from '../src/services/puppeteerDownloader.js';
import { getRequestBaseUrl } from '../src/utils/requestUrl.js';
import {
  normalizeNonEmptyString,
  requireNonEmptyString,
  wantsBinaryStream
} from '../src/utils/validators.js';

describe('Validators, Request URL, High-Res URLs e Error Mapping', () => {
  it('normalizeNonEmptyString e requireNonEmptyString devem validar strings vazias', () => {
    assert.equal(normalizeNonEmptyString('  olá  '), 'olá');
    assert.equal(normalizeNonEmptyString('   '), null);
    assert.equal(normalizeNonEmptyString(123), null);

    assert.throws(
      () => requireNonEmptyString('  ', 'Prompt obrigatório', 'INVALID_PARAM_PROMPT'),
      (err) => err instanceof AppError && err.status === 400 && err.codigo === 'INVALID_PARAM_PROMPT'
    );
  });

  it('wantsBinaryStream deve reconhecer query params, body e header Accept', () => {
    assert.equal(wantsBinaryStream({ query: { stream: 'true' }, headers: {} }, 'image/'), true);
    assert.equal(wantsBinaryStream({ query: {}, body: { stream: true }, headers: {} }, 'audio/'), true);
    assert.equal(wantsBinaryStream({ query: {}, headers: { accept: 'image/png' } }, 'image/'), true);
    assert.equal(wantsBinaryStream({ query: {}, headers: { accept: 'application/json' } }, 'image/'), false);
  });

  it('getRequestBaseUrl deve priorizar X-Forwarded-Host público sobre localhost', () => {
    const fakeProxyReq = {
      protocol: 'http',
      get(header) {
        const map = {
          'x-forwarded-host': 'api.example.com',
          'x-forwarded-proto': 'https',
          host: '127.0.0.1:3333'
        };
        return map[header.toLowerCase()];
      }
    };

    assert.equal(getRequestBaseUrl(fakeProxyReq), 'https://api.example.com/api2');
  });

  it('formatGeminiError deve preservar status e codigo de AppError', () => {
    const custom = new AppError('Vídeo indisponível', 422, 'NO_VIDEO_GENERATED');
    const formatted = formatGeminiError(custom);

    assert.equal(formatted.status, 422);
    assert.equal(formatted.codigo, 'NO_VIDEO_GENERATED');
    assert.equal(formatted.mensagem, 'Vídeo indisponível');
  });

  it('buildHighResCandidateUrls deve priorizar =s0, =w2048 e /rd-gg-dl/ sem duplicatas', () => {
    const candidates = buildHighResCandidateUrls('https://lh3.googleusercontent.com/gg-dl/abc123=s512');

    assert.equal(candidates[0], 'https://lh3.googleusercontent.com/gg-dl/abc123=s0');
    assert.ok(candidates.includes('https://lh3.googleusercontent.com/gg-dl/abc123=w2048'));
    assert.ok(candidates.includes('https://lh3.googleusercontent.com/rd-gg-dl/abc123=s0'));
    assert.equal(new Set(candidates).size, candidates.length);
  });
});
