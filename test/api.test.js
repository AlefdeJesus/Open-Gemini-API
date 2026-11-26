import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import app from '../src/app.js';
import config from '../src/config/env.js';

describe('API Gemini HTTP Integration & Contracts', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET / deve retornar orientação rápida online', async () => {
    const res = await fetch(`${baseUrl}/`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.ok(body.healthCheck);
  });

  it('GET /api2/health deve retornar status 200 e contabilizar 1 requisição no RateLimit', async () => {
    const res1 = await fetch(`${baseUrl}/api2/health`);
    const body1 = await res1.json();
    const rem1 = Number(res1.headers.get('ratelimit-remaining'));

    assert.equal(res1.status, 200);
    assert.equal(body1.sucesso, true);
    assert.equal(body1.status, 'online');

    const res2 = await fetch(`${baseUrl}/api2/health`);
    const rem2 = Number(res2.headers.get('ratelimit-remaining'));

    if (!Number.isNaN(rem1) && !Number.isNaN(rem2)) {
      assert.equal(rem1 - rem2, 1);
    }
  });

  it('GET /api2/voices deve retornar o catálogo de vozes do Edge TTS', async () => {
    const res = await fetch(`${baseUrl}/api2/voices`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.equal(body.padrao, 'pt-BR-AntonioNeural');
    assert.ok(Array.isArray(body.vozesRecomendadasDark));
    assert.ok(body.vozesRecomendadasDark.length > 0);
  });

  it('POST /api2/generate-text sem cabeçalho de autenticação deve retornar 401 MISSING_API_KEY', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Teste' })
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.sucesso, false);
    assert.equal(body.codigo, 'MISSING_API_KEY');
  });

  it('POST /api2/generate-text com chave inválida deve retornar 401 INVALID_API_KEY', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'chave_completamente_incorreta'
      },
      body: JSON.stringify({ prompt: 'Teste' })
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.sucesso, false);
    assert.equal(body.codigo, 'INVALID_API_KEY');
  });

  it('POST /api2/generate-text com prompt vazio deve retornar 400 INVALID_PARAM_PROMPT', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.API_SECRET_KEY
      },
      body: JSON.stringify({ prompt: '   ' })
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.codigo, 'INVALID_PARAM_PROMPT');
  });

  it('POST /api2/generate-video com Authorization Bearer válido e sem prompt deve retornar 400 INVALID_PARAM_PROMPT', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.API_SECRET_KEY}`
      },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.codigo, 'INVALID_PARAM_PROMPT');
  });

  it('POST /api2/generate-image sem prompt deve retornar 400 INVALID_PARAM_PROMPT', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.API_SECRET_KEY
      },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.codigo, 'INVALID_PARAM_PROMPT');
  });

  it('POST /api2/generate-audio sem text nem prompt deve retornar 400 INVALID_PARAM_AUDIO', async () => {
    const res = await fetch(`${baseUrl}/api2/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.API_SECRET_KEY
      },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.codigo, 'INVALID_PARAM_AUDIO');
  });

  it('POST /api2/research sem query nem prompt deve retornar 400 INVALID_PARAM_QUERY', async () => {
    const res = await fetch(`${baseUrl}/api2/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.API_SECRET_KEY
      },
      body: JSON.stringify({})
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.codigo, 'INVALID_PARAM_QUERY');
  });

  it('POST /api2/refresh-cookies sem chave deve exigir autenticação (401)', async () => {
    const res = await fetch(`${baseUrl}/api2/refresh-cookies`, { method: 'POST' });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.codigo, 'MISSING_API_KEY');
  });

  it('Rotas inexistentes e mídias inexistentes devem retornar 404', async () => {
    const resMedia = await fetch(`${baseUrl}/api2/media/inexistente.mp4`);
    assert.equal(resMedia.status, 404);

    const resUnknown = await fetch(`${baseUrl}/api2/rota-que-nao-existe`);
    const bodyUnknown = await resUnknown.json();
    assert.equal(resUnknown.status, 404);
    assert.equal(bodyUnknown.codigo, 'ROUTE_NOT_FOUND');
  });
});
