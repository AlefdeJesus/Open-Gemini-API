import { VOICES_CATALOG_PAYLOAD } from '../config/voicesCatalog.js';
import { getRequestBaseUrl } from '../utils/requestUrl.js';

export function getHealth(req, res) {
  const baseUrl = getRequestBaseUrl(req);
  return res.status(200).json({
    sucesso: true,
    status: 'online',
    baseUrl,
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)}s`,
    versao: '1.0.0',
    servico: 'Gemini Custom REST API'
  });
}

export function getVoices(_req, res) {
  return res.status(200).json(VOICES_CATALOG_PAYLOAD);
}
