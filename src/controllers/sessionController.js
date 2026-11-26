import {
  isCookieRefreshRunning,
  refreshGeminiCookies
} from '../services/cookieRefresher.js';
import { getAuthenticatedGeminiClient } from '../services/gemini/geminiClient.js';

export async function getSessionStatus(_req, res) {
  try {
    const client = await getAuthenticatedGeminiClient();
    return res.status(200).json({
      sucesso: true,
      autenticado: Boolean(client.accessToken),
      accessTokenParcial: client.accessToken
        ? `${String(client.accessToken).slice(0, 12)}...`
        : null,
      buildLabel: client.buildLabel || null,
      cookiesPresentes: Object.keys(client.cookies || {}).length
    });
  } catch (err) {
    return res.status(500).json({
      sucesso: false,
      mensagem: err.message,
      codigo: err.codigo || 'SESSION_ERROR'
    });
  }
}

export async function postRenewCookies(_req, res) {
  console.log('[RENEW-COOKIES] Renovação manual solicitada via API...');
  try {
    await refreshGeminiCookies({ headless: true });
    const client = await getAuthenticatedGeminiClient();
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Cookies renovados e sessão reautenticada com sucesso!',
      autenticado: Boolean(client.accessToken),
      accessTokenParcial: client.accessToken
        ? `${String(client.accessToken).slice(0, 12)}...`
        : null
    });
  } catch (err) {
    console.error('[RENEW-COOKIES ERRO]', err.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: `Falha na renovação: ${err.message}`
    });
  }
}

export async function postRefreshCookies(_req, res) {
  try {
    if (isCookieRefreshRunning()) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'Uma rotina de renovação de cookies já está em andamento.'
      });
    }

    const result = await refreshGeminiCookies({ headless: true });
    if (result?.sucesso === false) {
      return res.status(401).json({
        sucesso: false,
        mensagem: result.mensagem,
        codigo: 'GEMINI_AUTH_EXPIRED'
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Cookies renovados com sucesso via Puppeteer!',
      dados: {
        __Secure_1PSIDTS: result['__Secure-1PSIDTS']
          ? `${result['__Secure-1PSIDTS'].slice(0, 16)}...`
          : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      sucesso: false,
      mensagem: `Falha ao renovar cookies via Puppeteer: ${error.message}`,
      codigo: 'COOKIE_REFRESH_FAILED'
    });
  }
}
