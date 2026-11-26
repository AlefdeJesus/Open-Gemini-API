import pkg from 'gemini-web-sdk';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { ensureStorageDirectory } from '../cleanupService.js';
import { downloadGoogleMedia } from '../puppeteerDownloader.js';
import { buildGoogleCookieHeader } from '../session/sessionStore.js';
import { getAuthenticatedGeminiClient, resolveModel } from './geminiClient.js';

const { Model } = pkg;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

function buildImagePrompt(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') return '';

  let cleaned = prompt.trim();

  // Remove comandos redundantes caso o cliente já tenha enviado verbos imperativos
  cleaned = cleaned
    .replace(
      /^(?:por favor,? )?(?:gere|crie|desenhe|produza|faca|faça|monte|generate|create|draw|make|renderize|render)\s+(?:para mim\s+)?(?:uma?\s+)?(?:imagem|foto|ilustra[çc][ãa]o|desenho|pintura|image|photo|picture)?(?:\s+(?:de|da|do|dos|das|of|showing|com)\b)?/i,
      ''
    )
    .trim();

  if (!cleaned) {
    cleaned = prompt.trim();
  }

  // Monta a diretiva imperativa que aciona o Imagen 3 no Gemini Web sem depender do usuário digitar verbos
  let effectivePrompt = `Generate a detailed, high-quality photorealistic image of: ${cleaned}`;

  const aspectRatio = options.aspectRatio || options.aspect_ratio;
  if (aspectRatio && !effectivePrompt.includes(aspectRatio)) {
    effectivePrompt += `, ${aspectRatio} aspect ratio, cinematic lighting`;
  }

  return effectivePrompt;
}

// Em URLs /gg-dl/, a chamada RPC _getFullSizeImage do SDK é necessária para obter imagem >512px
async function resolveFullSizeRpcUrl(imgObj) {
  let downloadUrl = imgObj.url;

  if (imgObj.client_ref && imgObj.cid && imgObj.rid && imgObj.rcid && imgObj.image_id) {
    try {
      console.log(`[IMAGE GENERATION] Buscando URL full-size via RPC (cid=${imgObj.cid?.slice(0, 12)})...`);
      const fullUrl = await imgObj.client_ref._getFullSizeImage(
        imgObj.cid,
        imgObj.rid,
        imgObj.rcid,
        imgObj.image_id
      );
      if (fullUrl && typeof fullUrl === 'string' && fullUrl.startsWith('http')) {
        downloadUrl = fullUrl;
      }
    } catch (rpcErr) {
      console.warn(`[IMAGE GENERATION] RPC _getFullSizeImage falhou: ${rpcErr.message}. Usando URL de preview.`);
    }
  }

  if (downloadUrl.includes('=s1024-rj')) {
    return downloadUrl.replace('=s1024-rj', '=s2048-rj');
  }
  if (
    downloadUrl.includes('googleusercontent.com') &&
    !downloadUrl.includes('/gg') &&
    !downloadUrl.includes('=s')
  ) {
    return `${downloadUrl}=s2048-rj`;
  }

  return downloadUrl;
}

async function tryDirectAuthenticatedDownload(downloadUrl, previewUrl, destPath, cookieHeader) {
  const candidates = [];
  for (const baseU of [downloadUrl, previewUrl].filter(Boolean)) {
    const cleanU = baseU.replace(/=[^/]+$/, '');
    candidates.push(`${cleanU}=s0`, `${cleanU}=w2048`, baseU);
  }
  const uniqueUrls = candidates.filter((u, idx, arr) => u && arr.indexOf(u) === idx);

  for (const candidateUrl of uniqueUrls) {
    try {
      const headers = {
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: 'https://gemini.google.com/'
      };
      if (cookieHeader && (candidateUrl.includes('/gg') || candidateUrl.includes('lh3.googleusercontent.com'))) {
        headers.Cookie = cookieHeader;
      }

      const resp = await fetch(candidateUrl, { headers });
      if (!resp.ok) continue;

      const buf = await resp.arrayBuffer();
      if (buf && buf.byteLength > 120000) {
        fs.writeFileSync(destPath, Buffer.from(buf));
        return destPath;
      }
    } catch {
      // Tenta próxima URL candidata
    }
  }

  return null;
}

async function persistGeneratedImage(imgObj, index, baseUrl, cookieHeader) {
  const uniqueName = `image_${Date.now()}_${index}_${crypto.randomBytes(4).toString('hex')}`;
  const downloadUrl = await resolveFullSizeRpcUrl(imgObj);
  const localFileName = `${uniqueName}.jpg`;
  const destPath = path.join(config.STORAGE_DIR, localFileName);

  let savedPath = await tryDirectAuthenticatedDownload(downloadUrl, imgObj.url, destPath, cookieHeader);
  let imgResolution = null;
  let finalImageUrl = savedPath ? `${baseUrl}/media/${localFileName}` : downloadUrl;

  if (!savedPath) {
    try {
      console.log('[IMAGE GENERATION] Buscando máxima resolução via Puppeteer...');
      const dlResult = await downloadGoogleMedia(downloadUrl, destPath, {
        alternativeUrls: [imgObj.url].filter(Boolean)
      });
      savedPath = dlResult.path;
      imgResolution = { width: dlResult.width, height: dlResult.height };
      finalImageUrl = `${baseUrl}/media/${localFileName}`;
    } catch (dlErr) {
      console.warn(`[IMAGE GENERATION] Puppeteer falhou (${dlErr.message}). Tentando SDK save()...`);
      try {
        savedPath = await imgObj.save({
          path: config.STORAGE_DIR,
          filename: uniqueName,
          verbose: true,
          fullSize: true
        });
        const savedFileName = path.basename(savedPath);
        finalImageUrl = `${baseUrl}/media/${savedFileName}`;
      } catch (saveErr) {
        console.warn(`[IMAGE GENERATION] SDK save() falhou (${saveErr.message}). Retornando URL remota.`);
      }
    }
  }

  return {
    imageUrl: finalImageUrl,
    googleUrl: imgObj.url,
    nomeArquivo: savedPath ? path.basename(savedPath) : null,
    caminhoLocal: savedPath,
    largura: imgResolution?.width || null,
    altura: imgResolution?.height || null,
    descricao: imgObj.alt || null,
    modelo: 'gemini_pro_web'
  };
}

export async function generateImage(prompt, options = {}) {
  ensureStorageDirectory();

  const baseUrl = (options.baseUrl || config.BASE_URL).replace(/\/+$/, '');
  const client = await getAuthenticatedGeminiClient();

  const resolved = resolveModel(options.model);
  // Modelos com capacidade de geração de imagem (Imagen 3) ativada no Gemini Web
  const modelsToTry = resolved
    ? [resolved, Model.BASIC_PRO, Model.ADVANCED_PRO, Model.BASIC_FLASH]
    : [Model.BASIC_PRO, Model.ADVANCED_PRO, Model.BASIC_FLASH];

  const effectivePrompt = buildImagePrompt(prompt, options);
  let lastTextFeedback = '';
  let successfulResponse = null;

  for (const currentModel of modelsToTry) {
    const modelName = currentModel?.model_name || 'unspecified';
    try {
      console.log(`[IMAGE GENERATION] Gerando imagem via Gemini Web SDK (modelo: ${modelName})...`);
      const chat = client.newChat({ model: currentModel });
      let response = await chat.generateContent({ prompt: effectivePrompt });

      if (response.images && response.images.length > 0) {
        successfulResponse = response;
        break;
      }

      const text = response.text || '';
      lastTextFeedback = text;

      // Se o modelo responder que não pode criar ou tentar apenas procurar imagens, faz auto-recuperação direta
      const isRefusal = /(?:não consigo criar|posso procurar imagens|não é possível criar|não esteja disponível na sua região|can't create|cannot generate|unable to generate)/i.test(text);
      if (isRefusal) {
        console.warn(`[IMAGE GENERATION AVISO] Modelo ${modelName} respondeu com recusa regional/procura. Tentando reforço diretivo...`);
        try {
          const retryChat = client.newChat({ model: currentModel });
          const retryPrompt = `Create an image: ${prompt}. Photorealistic, highly detailed, cinematic lighting.`;
          const retryResponse = await retryChat.generateContent({ prompt: retryPrompt });
          if (retryResponse.images && retryResponse.images.length > 0) {
            successfulResponse = retryResponse;
            break;
          }
          if (retryResponse.text) {
            lastTextFeedback = retryResponse.text;
          }
        } catch {
          // Continua para o próximo modelo da lista
        }
      }
    } catch (err) {
      console.warn(`[IMAGE GENERATION AVISO] Modelo ${modelName} falhou: ${err.message}`);
    }
  }

  if (!successfulResponse || !successfulResponse.images || successfulResponse.images.length === 0) {
    const feedback = lastTextFeedback ? ` Resposta do modelo: "${lastTextFeedback.slice(0, 200)}..."` : '';
    throw new AppError(
      `Nenhuma imagem foi gerada pelo modelo para o prompt informado.${feedback}`,
      422,
      'NO_IMAGE_GENERATED'
    );
  }

  const cookieHeader = buildGoogleCookieHeader({ syncFromDisk: true });
  const savedImages = [];

  for (let i = 0; i < successfulResponse.images.length; i++) {
    const saved = await persistGeneratedImage(successfulResponse.images[i], i, baseUrl, cookieHeader);
    savedImages.push(saved);
  }

  return {
    sucesso: true,
    provedor: 'gemini_pro_web',
    modelo: 'gemini_pro_web',
    total: savedImages.length,
    imageUrl: savedImages[0]?.imageUrl || null,
    largura: savedImages[0]?.largura || null,
    altura: savedImages[0]?.altura || null,
    imagens: savedImages
  };
}

/**
 * Resolve o arquivo local ou baixa o buffer binário para requisições com ?stream=true (ex: n8n).
 */
export async function resolveImageStreamPayload(firstImage) {
  if (!firstImage) return null;

  if (firstImage.caminhoLocal && fs.existsSync(firstImage.caminhoLocal)) {
    const ext = path.extname(firstImage.caminhoLocal).toLowerCase();
    return {
      type: 'file',
      filePath: path.resolve(firstImage.caminhoLocal),
      contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
      fileName: firstImage.nomeArquivo || 'image.jpg'
    };
  }

  const rawUrls = [firstImage.imageUrl, firstImage.googleUrl].filter(Boolean);
  const streamUrls = [];
  for (const url of rawUrls) {
    const clean = url.replace(/=s2048-rj$/, '');
    if (!streamUrls.includes(clean)) streamUrls.push(clean);
    if (!streamUrls.includes(url)) streamUrls.push(url);
  }

  for (const url of streamUrls) {
    try {
      const imgResponse = await fetch(url, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Referer: 'https://gemini.google.com/'
        }
      });
      if (!imgResponse.ok) continue;

      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await imgResponse.arrayBuffer());

      if (firstImage.caminhoLocal && !fs.existsSync(firstImage.caminhoLocal)) {
        try {
          fs.writeFileSync(firstImage.caminhoLocal, buffer);
        } catch {
          // Ignora falha de cache opcional em disco
        }
      }

      return {
        type: 'buffer',
        buffer,
        contentType,
        fileName: firstImage.nomeArquivo || 'image.jpg'
      };
    } catch (streamErr) {
      console.warn(`[IMAGE STREAM] Falha ao buscar imagem para stream: ${streamErr.message}`);
    }
  }

  return null;
}
