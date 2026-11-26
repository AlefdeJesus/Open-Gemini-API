import crypto from 'node:crypto';
import config from '../config/env.js';

export function authMiddleware(req, res, next) {
  try {
    let receivedToken = req.headers['x-api-key'];

    if (!receivedToken && req.headers['authorization']) {
      const authHeader = req.headers['authorization'];
      if (typeof authHeader === 'string') {
        receivedToken = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : authHeader.trim();
      }
    }

    if (!receivedToken || typeof receivedToken !== 'string') {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Acesso não autorizado. Envie a chave no cabeçalho 'x-api-key' ou 'Authorization: Bearer <token>'.",
        codigo: 'MISSING_API_KEY'
      });
    }

    // crypto.timingSafeEqual exige buffers de mesmo comprimento. O hash SHA-256 fixa ambos
    // em 32 bytes, evitando RangeError e vazamento estatístico do tamanho da chave por timing.
    const receivedDigest = crypto.createHash('sha256').update(receivedToken).digest();
    const expectedDigest = crypto.createHash('sha256').update(config.API_SECRET_KEY).digest();

    if (!crypto.timingSafeEqual(receivedDigest, expectedDigest)) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Chave de API inválida.',
        codigo: 'INVALID_API_KEY'
      });
    }

    return next();
  } catch (error) {
    console.error('[ERRO AUTH MIDDLEWARE]:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao validar credenciais de segurança.',
      codigo: 'AUTH_INTERNAL_ERROR'
    });
  }
}

export default authMiddleware;
