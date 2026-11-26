import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const windowMinutes = Math.round(config.RATE_LIMIT_WINDOW_MS / 60000);

export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      sucesso: false,
      mensagem: `Muitas requisições enviadas por este IP. Limite de ${config.RATE_LIMIT_MAX} requisições por ${windowMinutes} minutos atingido.`,
      codigo: 'RATE_LIMIT_EXCEEDED',
      detalhes: {
        janelaMinutos: windowMinutes,
        limiteMaximo: config.RATE_LIMIT_MAX
      }
    });
  }
});

export default apiLimiter;
