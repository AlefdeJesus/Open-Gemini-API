import pkg from 'gemini-web-sdk';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { ensureStorageDirectory } from '../cleanupService.js';
import { downloadGoogleMedia } from '../puppeteerDownloader.js';
import { getAuthenticatedGeminiClient, resolveModel } from './geminiClient.js';

const { Model } = pkg;

const CAPACITY_LIMIT_REGEX =
  /muitas solicitações|too many requests|tente de novo mais tarde|try again later|limite de uso/i;

export async function prepareImageFile(imageInput) {
  if (!imageInput || typeof imageInput !== 'string') return null;
  const str = imageInput.trim();

  if (fs.existsSync(str)) {
    return { path: str, isTemp: false };
  }

  ensureStorageDirectory();
  const tempName = path.join(
    config.STORAGE_DIR,
    `temp_input_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`
  );

  if (str.startsWith('http://') || str.startsWith('https://')) {
    const res = await fetch(str);
    if (!res.ok) {
      throw new Error(`Falha ao baixar imagem de referência (${res.status} ${res.statusText})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(tempName, Buffer.from(arrayBuffer));
    return { path: tempName, isTemp: true };
  }

  if (str.startsWith('data:image/')) {
    const base64Data = str.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(tempName, Buffer.from(base64Data, 'base64'));
    return { path: tempName, isTemp: true };
  }

  if (/^[A-Za-z0-9+/=]{100,}$/.test(str)) {
    fs.writeFileSync(tempName, Buffer.from(str, 'base64'));
    return { path: tempName, isTemp: true };
  }

  return null;
}

async function persistVideoAssets(videoObj, uniqueName) {
  const destVideoPath = path.join(config.STORAGE_DIR, `${uniqueName}.mp4`);
  let savedVideoPath = null;
  let savedThumbPath = null;

  if (videoObj.url && videoObj.url.startsWith('http')) {
    try {
      console.log('[VIDEO GENERATION] Baixando vídeo .mp4 via Puppeteer com cookies...');
      const dlResult = await downloadGoogleMedia(videoObj.url, destVideoPath);
      savedVideoPath = dlResult.path;
    } catch (pErr) {
      console.warn(`[VIDEO GENERATION] Download via Puppeteer falhou (${pErr.message}). Tentando SDK...`);
    }
  }

  if (videoObj.thumbnail && videoObj.thumbnail.startsWith('http')) {
    const destThumbPath = path.join(config.STORAGE_DIR, `${uniqueName}_thumb.jpg`);
    try {
      await downloadGoogleMedia(videoObj.thumbnail, destThumbPath);
      savedThumbPath = destThumbPath;
    } catch {
      // Thumbnail é opcional; segue sem interromper entrega do vídeo
    }
  }

  if (!savedVideoPath) {
    try {
      const saveResult = await videoObj.save({
        savePath: config.STORAGE_DIR,
        filename: uniqueName,
        verbose: true
      });
      savedVideoPath = saveResult.video;
      if (saveResult.video_thumbnail) {
        savedThumbPath = saveResult.video_thumbnail;
      }
    } catch (saveErr) {
      console.error(`[VIDEO GENERATION] Falha em todos os métodos de download: ${saveErr.message}`);
    }
  }

  return { savedVideoPath, savedThumbPath };
}

export async function generateVideo(prompt, options = {}) {
  ensureStorageDirectory();
  const baseUrl = (options.baseUrl || config.BASE_URL).replace(/\/+$/, '');
  const client = await getAuthenticatedGeminiClient();

  // extended_thinking precisa ser false, pois o modo de raciocínio estendido desabilita a geração Veo no Gemini Web
  const modelToUse = resolveModel(options.model) || Model.ADVANCED_PRO;

  let chat;
  try {
    chat = client.newChat({ model: modelToUse });
  } catch (mErr) {
    console.warn(
      `[VIDEO GENERATION] Modelo ${modelToUse?.model_name || 'ADVANCED_PRO'} indisponível, usando padrão: ${mErr.message}`
    );
    chat = client.newChat();
  }

  let preparedImage = null;

  try {
    const imageInput = options.image || options.imageUrl;
    if (imageInput) {
      preparedImage = await prepareImageFile(imageInput);
    }

    const files = preparedImage ? [preparedImage.path] : options.files || null;
    console.log(
      `[VIDEO GENERATION] Gerando vídeo via Gemini Web SDK (modelo: ${modelToUse?.model_name || 'ADVANCED_PRO'})...`
    );

    let response;
    try {
      response = await chat.generateContent({ prompt, files, extended_thinking: false });
    } catch (genErr) {
      if (/not available for your account plan|FEATURE_NOT_AVAILABLE/i.test(genErr.message)) {
        console.warn('[VIDEO GENERATION] Modelo recusado pelo plano, tentando chat padrão...');
        const fallbackChat = client.newChat();
        response = await fallbackChat.generateContent({ prompt, files, extended_thinking: false });
      } else {
        throw genErr;
      }
    }

    if (!response.videos || response.videos.length === 0) {
      const textFeedback = response.text || '';
      const isCapacityLimit = CAPACITY_LIMIT_REGEX.test(textFeedback);
      const feedback = textFeedback ? ` Resposta do modelo: "${textFeedback.slice(0, 200)}..."` : '';

      throw new AppError(
        isCapacityLimit
          ? 'Servidores de vídeo do Google temporariamente sobrecarregados. Aguarde e tente novamente.'
          : `Nenhum vídeo foi retornado. Verifique o prompt e se sua conta possui Gemini Advanced ativo.${feedback}`,
        isCapacityLimit ? 429 : 422,
        isCapacityLimit ? 'GOOGLE_VIDEO_CAPACITY_LIMIT' : 'NO_VIDEO_GENERATED'
      );
    }

    const videoObj = response.videos[0];
    const uniqueName = `video_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const { savedVideoPath, savedThumbPath } = await persistVideoAssets(videoObj, uniqueName);

    const savedFileName = savedVideoPath ? path.basename(savedVideoPath) : null;
    const finalVideoUrl = savedFileName ? `${baseUrl}/media/${savedFileName}` : videoObj.url;

    return {
      videoUrl: finalVideoUrl,
      nomeArquivo: savedFileName,
      caminhoLocal: savedVideoPath,
      thumbnailUrl: savedThumbPath
        ? `${baseUrl}/media/${path.basename(savedThumbPath)}`
        : videoObj.thumbnail || null
    };
  } finally {
    if (preparedImage?.isTemp && fs.existsSync(preparedImage.path)) {
      try {
        fs.unlinkSync(preparedImage.path);
      } catch {
        // Ignora erro na exclusão de arquivo temporário
      }
    }
  }
}
