import pkg from 'gemini-web-sdk';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../../config/env.js';
import { DEFAULT_VOICE, SLEEP_CALM_DEFAULT_VOICE } from '../../config/voicesCatalog.js';
import { AppError } from '../../errors/AppError.js';
import { ensureStorageDirectory } from '../cleanupService.js';
import { getAuthenticatedGeminiClient } from '../gemini/geminiClient.js';
import { synthesizeEdgeNeural } from './edgeTtsService.js';
import {
  isCalmMode,
  isDarkSuspenseMode,
  isDynamicMode,
  normalizePitch,
  normalizeRate,
  normalizeVolume,
  resolveVoice
} from './ttsTextProcessor.js';

const { Model } = pkg;
const EDGE_PROVIDER_NAME = 'microsoft_edge_neural';

function normalizeAudioArguments(promptOrOptions, extraOptions = {}) {
  if (typeof promptOrOptions === 'string') {
    const options = extraOptions || {};
    return {
      prompt: promptOrOptions,
      directText: options.text || options.roteiro || '',
      options
    };
  }

  if (typeof promptOrOptions === 'object' && promptOrOptions !== null) {
    return {
      prompt: promptOrOptions.prompt || '',
      directText: promptOrOptions.text || promptOrOptions.roteiro || '',
      options: promptOrOptions
    };
  }

  return { prompt: '', directText: '', options: {} };
}

function buildAudioVoiceProfile(options, sampleText) {
  const isSleepCalm = isCalmMode(options.modo, sampleText);
  const isDarkSuspense = !isSleepCalm && isDarkSuspenseMode(options.modo, sampleText);

  let defaultRate = '+0%';
  let defaultPitch = '+0%';
  let defaultVolume = '+0%';

  if (isSleepCalm) {
    defaultRate = '-25%';
    defaultPitch = '-3%';
    defaultVolume = '-15%';
  } else if (isDarkSuspense) {
    defaultRate = '-3%';
    defaultPitch = '-3%';
  } else if (isDynamicMode(options.modo)) {
    defaultRate = '+4%';
  }

  const defaultVoice = isSleepCalm ? SLEEP_CALM_DEFAULT_VOICE : DEFAULT_VOICE;
  const voice = resolveVoice(options.voice || defaultVoice);
  const rate = normalizeRate(options.rate || defaultRate);
  const pitch = normalizePitch(options.pitch || defaultPitch);
  const volume = normalizeVolume(options.volume || defaultVolume);

  return {
    isSleepCalm,
    isDarkSuspense,
    voice,
    rate,
    pitch,
    volume,
    styleName: isSleepCalm
      ? 'sono_calmo_manso'
      : isDarkSuspense
        ? 'canal_dark_suspense'
        : options.modo || 'padrao',
    modulationMode: options.modo || (isSleepCalm ? 'calmo' : isDarkSuspense ? 'suspense' : 'padrao'),
    synthesisOptions: {
      voice,
      rate,
      pitch,
      volume,
      modo: options.modo || (isSleepCalm ? 'sono' : isDarkSuspense ? 'suspense' : 'padrao'),
      pausePonto: options.pausePonto || options.pausaPonto
    }
  };
}

function formatNarrationResponse({
  profile,
  audioUrl,
  savedFileName,
  mp3Path,
  narratedText,
  includeDirectOrigin = false
}) {
  return {
    tipo: 'narracao_voz',
    ...(includeDirectOrigin ? { origem: 'texto_direto' } : {}),
    estilo: profile.styleName,
    provedor: EDGE_PROVIDER_NAME,
    voz: profile.voice,
    modulacao: {
      velocidade: profile.rate,
      tomGrave: profile.pitch,
      volume: profile.volume,
      modo: profile.modulationMode
    },
    audioUrl,
    nomeArquivo: savedFileName,
    caminhoLocal: mp3Path,
    textoNarrado: narratedText
  };
}

function buildDarkStoryPrompt(topicPrompt) {
  return `Você é um roteirista profissional de documentários e canais dark investigativos (estilo Operações Especiais, mistérios históricos e arquivos desclassificados).
Escreva uma narrativa de altíssimo impacto, envolvente, misteriosa e fluida.
DIRETRIZES FUNDAMENTAIS PARA A LOCUÇÃO:
1. Cadência envolvente e respiração: estruture a narrativa em parágrafos curtos e objetivos (2 a 4 frases por parágrafo, separados por linha em branco). Use pausas dramáticas para que o narrador consiga respirar. Evite blocos maçantes de texto.
2. Tensão construída pelas palavras: crie suspense através da escolha de vocabulário e da revelação gradual dos fatos.
3. Retorne EXCLUSIVAMENTE o texto puro e contínuo que o narrador deve falar, sem títulos, sem marcações de cena, sem parênteses e sem emojis.

Tema da narração: "${topicPrompt}"`;
}

async function saveMusicMediaItems(mediaItems, baseUrl) {
  const savedAudios = [];

  for (let i = 0; i < mediaItems.length; i++) {
    const mediaObj = mediaItems[i];
    const uniqueName = `audio_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`;

    const saveResult = await mediaObj.save({
      savePath: config.STORAGE_DIR,
      filename: uniqueName,
      verbose: false
    });

    const mp3Name = saveResult.mp3 ? path.basename(saveResult.mp3) : null;
    const mp4Name = saveResult.mp4 ? path.basename(saveResult.mp4) : null;

    savedAudios.push({
      mp3Url: mp3Name ? `${baseUrl}/media/${mp3Name}` : null,
      mp4Url: mp4Name ? `${baseUrl}/media/${mp4Name}` : null,
      caminhoMp3: saveResult.mp3,
      caminhoMp4: saveResult.mp4
    });
  }

  return {
    tipo: 'musica',
    audioUrl: savedAudios[0]?.mp3Url || savedAudios[0]?.mp4Url || null,
    total: savedAudios.length,
    audios: savedAudios
  };
}

export async function generateAudio(promptOrOptions, extraOptions = {}) {
  ensureStorageDirectory();

  const { prompt, directText, options } = normalizeAudioArguments(promptOrOptions, extraOptions);
  const baseUrl = (options.baseUrl || config.BASE_URL).replace(/\/+$/, '');
  const profile = buildAudioVoiceProfile(options, prompt || directText);

  if (directText && typeof directText === 'string' && directText.trim() !== '') {
    const cleanScript = directText.trim();
    const uniqueName = `audio_direto_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    console.log(
      `[AUDIO GENERATION] Roteiro direto recebido (${cleanScript.length} caracteres). Executando TTS (${profile.voice})...`
    );
    const mp3Path = await synthesizeEdgeNeural(
      cleanScript,
      config.STORAGE_DIR,
      uniqueName,
      profile.synthesisOptions
    );
    const savedFileName = path.basename(mp3Path);

    return formatNarrationResponse({
      profile,
      audioUrl: `${baseUrl}/media/${savedFileName}`,
      savedFileName,
      mp3Path,
      narratedText: cleanScript,
      includeDirectOrigin: true
    });
  }

  const client = await getAuthenticatedGeminiClient();
  let chat;
  try {
    chat = client.newChat({ model: Model.ADVANCED_PRO });
  } catch {
    chat = client.newChat();
  }

  const directedPrompt = profile.isDarkSuspense ? buildDarkStoryPrompt(prompt) : prompt;
  console.log(`[AUDIO GENERATION] Gerando roteiro/áudio via Gemini (Modo Dark: ${profile.isDarkSuspense})...`);

  const response = await chat.generateContent({ prompt: directedPrompt });

  if (response.media && response.media.length > 0) {
    return saveMusicMediaItems(response.media, baseUrl);
  }

  if (response.text && response.text.trim() !== '') {
    const uniqueName = `audio_dark_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const mp3Path = await synthesizeEdgeNeural(
      response.text,
      config.STORAGE_DIR,
      uniqueName,
      profile.synthesisOptions
    );
    const savedFileName = path.basename(mp3Path);

    return formatNarrationResponse({
      profile,
      audioUrl: `${baseUrl}/media/${savedFileName}`,
      savedFileName,
      mp3Path,
      narratedText: response.text
    });
  }

  throw new AppError(
    'Nenhum áudio ou texto foi retornado pelo modelo para o prompt fornecido.',
    422,
    'NO_AUDIO_GENERATED'
  );
}
