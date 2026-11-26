import pkg from 'gemini-web-sdk';
import config from '../config/env.js';

const {
  AuthError,
  APIError,
  UsageLimitExceeded,
  ModelInvalid,
  TemporarilyBlocked
} = pkg;

export function formatGeminiError(error) {
  console.error('[ERRO GEMINI SERVICE]:', error);

  if (error?.status && error?.codigo) {
    return {
      status: error.status,
      mensagem: error.message,
      codigo: error.codigo,
      detalhes: error.detalhes || null
    };
  }

  if (
    error instanceof AuthError ||
    error?.name === 'AuthError' ||
    error?.codigo === 'AUTH_COOKIE_MISSING' ||
    (typeof error?.message === 'string' && error.message.includes('Cookies invalid'))
  ) {
    return {
      status: 401,
      mensagem:
        'Cookie de autenticação do Gemini expirado ou inválido (__Secure-1PSID / __Secure-1PSIDTS). Atualize os cookies no arquivo .env ou execute "npm run login".',
      codigo: 'GEMINI_AUTH_EXPIRED'
    };
  }

  if (error instanceof UsageLimitExceeded) {
    return {
      status: 429,
      mensagem:
        'Limite de uso atingido para a conta Google associada. Aguarde alguns minutos ou utilize outra conta.',
      codigo: 'GEMINI_USAGE_LIMIT'
    };
  }

  if (error instanceof TemporarilyBlocked) {
    return {
      status: 403,
      mensagem:
        'O endereço IP foi temporariamente bloqueado pelo Google. Tente mais tarde ou configure um proxy.',
      codigo: 'GEMINI_IP_BLOCKED'
    };
  }

  if (error instanceof ModelInvalid) {
    return {
      status: 400,
      mensagem:
        'Modelo de inteligência artificial inválido ou não disponível no plano de assinatura da conta.',
      codigo: 'GEMINI_INVALID_MODEL'
    };
  }

  if (error instanceof APIError) {
    return {
      status: 502,
      mensagem: `Falha na comunicação com a API interna do Gemini: ${error.message}`,
      codigo: 'GEMINI_API_ERROR'
    };
  }

  return {
    status: 500,
    mensagem:
      config.isProduction
        ? 'Ocorreu um erro interno ao processar a requisição no Gemini.'
        : error?.message || 'Ocorreu um erro interno ao processar a requisição no Gemini.',
    codigo: 'GEMINI_UNKNOWN_ERROR'
  };
}

export function notFoundMiddleware(req, res) {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota '${req.method} ${req.originalUrl}' não encontrada.`,
    codigo: 'ROUTE_NOT_FOUND'
  });
}

export function globalErrorMiddleware(err, req, res, _next) {
  console.error('[ERRO GLOBAL NA APLICAÇÃO]:', err);

  const status = err.status || 500;
  res.status(status).json({
    sucesso: false,
    mensagem: config.isProduction
      ? 'Ocorreu um erro interno no servidor.'
      : err.message,
    codigo: err.codigo || 'INTERNAL_SERVER_ERROR',
    ...(err.detalhes ? { detalhes: err.detalhes } : {})
  });
}
