import {
  DEFAULT_VOICE,
  EDGE_OFFICIAL_VOICES,
  EDGE_VOICE_ALIASES
} from '../../config/voicesCatalog.js';

const CALM_MODES = new Set(['sono', 'dormir', 'calmo', 'relaxar', 'meditacao', 'suave', 'manso']);
const DARK_MODES = new Set(['suspense', 'dark_channel', 'militar']);
const DYNAMIC_MODES = new Set(['dinamico', 'shorts', 'tiktok']);

const CALM_TEXT_REGEX = /dormir|sono|relaxa|medita|suave|manso|acalm/i;
const DARK_TEXT_REGEX =
  /suspense|dark|militar|experimento|secreto|conspir|arquivo|black ops|area 51|governo/i;

const TTS_REFUSAL_PREFIX_REGEX =
  /^(sou apenas um modelo|como um modelo de linguagem|i am just a language model|as an ai language model)/i;

const MODEL_REFUSAL_BODY_REGEX =
  /(?:não fui programado|não posso|não consigo|não sou capaz|não tenho como|sou (?:apenas |só )?um modelo de linguagem|como uma ia|como um modelo de ia|além das minhas (?:habilidades|capacidades)|i (?:can't|cannot) help|i am (?:just |only )?a language model)/i;

const SHORT_APOLOGY_REGEX = /(?:desculpe|lamento|sorry|não posso ajudar|não consigo ajudar)/i;

export function isCalmMode(mode, textSample = '') {
  if (mode && CALM_MODES.has(String(mode).toLowerCase().trim())) {
    return true;
  }
  return Boolean(textSample && CALM_TEXT_REGEX.test(textSample));
}

export function isDarkSuspenseMode(mode, textSample = '') {
  if (mode && DARK_MODES.has(String(mode).toLowerCase().trim())) {
    return true;
  }
  return Boolean(textSample && DARK_TEXT_REGEX.test(textSample));
}

export function isDynamicMode(mode) {
  return Boolean(mode && DYNAMIC_MODES.has(String(mode).toLowerCase().trim()));
}

export function isTtsRefusalPrefix(text) {
  return Boolean(text && TTS_REFUSAL_PREFIX_REGEX.test(text.trim()));
}

export function isModelRefusalResponse(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    MODEL_REFUSAL_BODY_REGEX.test(trimmed) ||
    (trimmed.length < 150 && SHORT_APOLOGY_REGEX.test(trimmed))
  );
}

export function resolveVoice(voiceInput) {
  if (!voiceInput || typeof voiceInput !== 'string') {
    return DEFAULT_VOICE;
  }
  const clean = voiceInput.trim();
  if (EDGE_VOICE_ALIASES[clean]) {
    console.log(`[EDGE TTS INFO] Voz '${clean}' mapeada para '${EDGE_VOICE_ALIASES[clean]}'`);
    return EDGE_VOICE_ALIASES[clean];
  }
  if (EDGE_OFFICIAL_VOICES.has(clean)) {
    return clean;
  }
  if (clean.startsWith('pt-BR')) {
    console.warn(`[EDGE TTS AVISO] Voz '${clean}' indisponível no Edge TTS. Usando '${DEFAULT_VOICE}'.`);
    return DEFAULT_VOICE;
  }
  return clean;
}

// O Edge TTS encerra o WebSocket imediatamente se receber valores absolutos inválidos de pitch.
export function normalizePitch(pitchInput) {
  if (!pitchInput) {
    return '+0%';
  }
  const str = String(pitchInput).trim();
  const hzMatch = str.match(/^([+-]?\d+)\s*Hz$/i);
  if (hzMatch) {
    const hzVal = parseInt(hzMatch[1], 10);
    const convertedPct = Math.round(hzVal * 0.8);
    const bounded = Math.max(-25, Math.min(25, convertedPct));
    return `${bounded >= 0 ? '+' : ''}${bounded}%`;
  }
  const pctMatch = str.match(/^([+-]?\d+)\s*%$/);
  if (pctMatch) {
    const pctVal = Math.max(-25, Math.min(25, parseInt(pctMatch[1], 10)));
    return `${pctVal >= 0 ? '+' : ''}${pctVal}%`;
  }
  return '+0%';
}

export function normalizeRate(rateInput) {
  if (!rateInput) {
    return '+0%';
  }
  const str = String(rateInput).trim();
  const pctMatch = str.match(/^([+-]?\d+)\s*%$/);
  if (pctMatch) {
    const pctVal = Math.max(-50, Math.min(100, parseInt(pctMatch[1], 10)));
    return `${pctVal >= 0 ? '+' : ''}${pctVal}%`;
  }
  return '+0%';
}

export function normalizeVolume(volumeInput) {
  if (!volumeInput) {
    return '+0%';
  }
  const str = String(volumeInput).trim().toLowerCase();
  if (str === 'soft' || str === 'suave') return '-20%';
  if (str === 'x-soft') return '-35%';
  if (str === 'loud') return '+20%';
  const pctMatch = str.match(/^([+-]?\d+)\s*%$/);
  if (pctMatch) {
    const pctVal = Math.max(-50, Math.min(50, parseInt(pctMatch[1], 10)));
    return `${pctVal >= 0 ? '+' : ''}${pctVal}%`;
  }
  return '+0%';
}

/**
 * Higieniza Markdown, HTML, emojis e expande siglas monetárias/unidades para pronúncia natural,
 * preservando quebras de linha (\n\n) para cadência de parágrafos.
 */
export function cleanTextForTTS(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<(?!break\b)[^>]*>/gi, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[ \t]*[-*•]\s+/gm, '')
    .replace(/^(\d+)\.\s+/gm, '$1, ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/R\$\s*(\d+(?:[.,]\d+)?)/gi, '$1 reais')
    .replace(/\$\s*(\d+(?:[.,]\d+)?)/g, '$1 dólares')
    .replace(/(\d+)\s*%/g, '$1 por cento')
    .replace(/(\d+)\s*km\/h\b/gi, '$1 quilômetros por hora')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converte marcações <break> em reticências (...) ou quebras de parágrafo (\n\n) e escapa XML.
 * O protocolo WebSocket do Edge Read Aloud rejeita tags <break> diretas com erro 'Stream closed'.
 */
export function prepareSSMLText(text, optionsOrIsCalm = false) {
  if (!text || typeof text !== 'string') return '';

  const options =
    typeof optionsOrIsCalm === 'object' && optionsOrIsCalm !== null
      ? optionsOrIsCalm
      : { isCalm: Boolean(optionsOrIsCalm) };

  const calm = Boolean(options.isCalm) || isCalmMode(options.modo);

  let pausePontoMs = 0;
  if (options.pausePonto || options.pausaPonto) {
    const match = String(options.pausePonto || options.pausaPonto).match(/\d+/);
    if (match) pausePontoMs = parseInt(match[0], 10);
  }

  let processed = text
    .replace(/<break[^>]*time\s*=\s*["'](?:1\d{3}|[2-9]\d{2,})ms["'][^>]*>/gi, '\n\n')
    .replace(/<break[^>]*>/gi, ' ... ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/["']/g, '')
    .replace(/\.{4,}/g, '...')
    .replace(/(\w)\.\.\./g, '$1... ');

  if (pausePontoMs >= 1100) {
    processed = processed.replace(/([^.\s])\.\s+/g, '$1...\n\n');
  } else if (calm || pausePontoMs >= 400) {
    processed = processed.replace(/([^.\s])\.\s+/g, '$1... ');
  }

  return processed
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Divide textos apenas quando excedem o limite seguro do WebSocket (~2500 caracteres),
 * evitando múltiplas conexões curtas que disparam bloqueio HTTP 403 no Bing Speech.
 */
export function splitTextIntoSafeChunks(text, maxChars = 2500) {
  if (!text) return [];

  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const paragraphs = trimmed.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    const candidate = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
    if (candidate.length <= maxChars) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = '';
    }

    if (trimmedPara.length <= maxChars) {
      currentChunk = trimmedPara;
    } else {
      const sentences = trimmedPara.match(/[^.!?;\n]+[.!?;\n]+|\s*[^.!?;\n]+$/g) || [trimmedPara];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        const sentenceCandidate = currentChunk
          ? `${currentChunk} ${trimmedSentence}`
          : trimmedSentence;
        if (sentenceCandidate.length <= maxChars) {
          currentChunk = sentenceCandidate;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = trimmedSentence;
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [trimmed];
}
