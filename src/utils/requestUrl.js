import config from '../config/env.js';

/**
 * Resolve a URL base pública da requisição priorizando cabeçalhos de proxy reverso
 * (X-Forwarded-Host / Host / X-Forwarded-Proto) para links de mídia consistentes.
 */
export function getRequestBaseUrl(req) {
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}/api2`.replace(/\/+$/, '');
  }

  if (
    config.BASE_URL &&
    !config.BASE_URL.includes('localhost') &&
    !config.BASE_URL.includes('127.0.0.1')
  ) {
    return config.BASE_URL.replace(/\/+$/, '');
  }

  return (config.BASE_URL || `http://${host || 'localhost:3333'}/api2`).replace(/\/+$/, '');
}
