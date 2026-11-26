import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import {
  cleanTextForTTS,
  isCalmMode,
  isTtsRefusalPrefix,
  normalizePitch,
  normalizeRate,
  normalizeVolume,
  prepareSSMLText,
  resolveVoice,
  splitTextIntoSafeChunks
} from './ttsTextProcessor.js';

const MAX_CHUNK_CHARS = 2500;
const MAX_ATTEMPTS_PER_CHUNK = 2;

async function createConfiguredTtsClient(voice) {
  const isTlsVerificationDisabled = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
  const agent = new https.Agent({
    rejectUnauthorized: !isTlsVerificationDisabled,
    keepAlive: true
  });
  const client = new MsEdgeTTS({ agent });
  await client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  return client;
}

function closeTtsClientSafely(client) {
  if (!client) return;
  try {
    client.close();
  } catch {
    // Ignora erro de socket já encerrado
  }
}

async function synthesizeChunkWithRetry({
  ttsHolder,
  voice,
  chunkText,
  prosody,
  writeStream,
  chunkIndex,
  totalChunks
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CHUNK; attempt++) {
    try {
      if (!ttsHolder.client) {
        ttsHolder.client = await createConfiguredTtsClient(voice);
      }

      const { audioStream } = ttsHolder.client.toStream(chunkText, prosody);

      await new Promise((resolve, reject) => {
        audioStream.on('data', (data) => writeStream.write(data));
        audioStream.on('end', resolve);
        audioStream.on('error', reject);
      });

      return;
    } catch (err) {
      lastError = err;
      console.warn(
        `[EDGE TTS AVISO] Falha na tentativa ${attempt} do bloco ${chunkIndex + 1}/${totalChunks}: ${err.message}`
      );
      closeTtsClientSafely(ttsHolder.client);
      ttsHolder.client = null;

      if (attempt < MAX_ATTEMPTS_PER_CHUNK) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  console.error(`[EDGE TTS ERRO] Falha definitiva no bloco ${chunkIndex + 1}/${totalChunks}:`, lastError);
  throw lastError;
}

export async function synthesizeEdgeNeural(text, savePath, filename, voiceOptions = {}) {
  const cleanText = cleanTextForTTS(text);
  if (!cleanText) {
    throw new Error('O texto fornecido para síntese de áudio está vazio.');
  }

  if (isTtsRefusalPrefix(cleanText)) {
    throw new Error(
      'O texto enviado para narração parece ser uma mensagem de recusa da IA ("Sou apenas um modelo de linguagem..."). Verifique a etapa anterior de geração de roteiro.'
    );
  }

  const voice = resolveVoice(voiceOptions.voice);
  const rate = normalizeRate(voiceOptions.rate);
  const pitch = normalizePitch(voiceOptions.pitch);
  const volume = normalizeVolume(voiceOptions.volume);
  const isCalm = isCalmMode(voiceOptions.modo);

  const chunks = splitTextIntoSafeChunks(cleanText, MAX_CHUNK_CHARS);
  const targetFile = path.join(savePath, `${filename}.mp3`);
  const writeStream = fs.createWriteStream(targetFile);
  const ttsHolder = { client: null };

  console.log(
    `[EDGE TTS] Sintetizando áudio (${chunks.length} bloco(s), Modo Calmo: ${isCalm}, Voz: ${voice}, Rate: ${rate}, Pitch: ${pitch}, Volume: ${volume})...`
  );

  try {
    ttsHolder.client = await createConfiguredTtsClient(voice);

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = prepareSSMLText(chunks[i], { ...voiceOptions, isCalm });

      await synthesizeChunkWithRetry({
        ttsHolder,
        voice,
        chunkText,
        prosody: { rate, pitch, volume },
        writeStream,
        chunkIndex: i,
        totalChunks: chunks.length
      });

      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    await new Promise((resolve) => writeStream.end(resolve));
    return targetFile;
  } catch (err) {
    writeStream.destroy();
    if (fs.existsSync(targetFile)) {
      try {
        fs.unlinkSync(targetFile);
      } catch {
        // Ignora falha ao remover arquivo parcial
      }
    }
    throw err;
  } finally {
    closeTtsClientSafely(ttsHolder.client);
  }
}
