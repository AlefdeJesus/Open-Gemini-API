import fs from 'node:fs';
import path from 'node:path';
import { formatGeminiError } from '../errors/errorHandler.js';
import geminiService, { resolveImageStreamPayload } from '../services/geminiService.js';
import { getRequestBaseUrl } from '../utils/requestUrl.js';
import {
  normalizeNonEmptyString,
  requireNonEmptyString,
  wantsBinaryStream
} from '../utils/validators.js';

const PROMPT_REQUIRED_MESSAGE =
  "O parâmetro 'prompt' é obrigatório e deve ser uma string não vazia.";

function sendFormattedError(res, error) {
  const formatted = formatGeminiError(error);
  return res.status(formatted.status).json({
    sucesso: false,
    mensagem: formatted.mensagem,
    codigo: formatted.codigo,
    ...(formatted.detalhes ? { detalhes: formatted.detalhes } : {})
  });
}

export async function postGenerateText(req, res) {
  try {
    const promptText = requireNonEmptyString(
      req.body?.prompt || req.body?.text,
      PROMPT_REQUIRED_MESSAGE,
      'INVALID_PARAM_PROMPT'
    );
    const systemText = normalizeNonEmptyString(
      req.body?.systemMessage || req.body?.systemInstruction
    );

    const finalPrompt = systemText ? `${systemText}\n\n${promptText}` : promptText;
    const result = await geminiService.generateText(finalPrompt, {
      model: req.body?.model
    });

    return res.status(200).json({
      sucesso: true,
      output: result.texto,
      texto: result.texto,
      prompt: finalPrompt,
      dados: result
    });
  } catch (error) {
    return sendFormattedError(res, error);
  }
}

export async function postGenerateVideo(req, res) {
  try {
    const promptText = requireNonEmptyString(
      req.body?.prompt,
      PROMPT_REQUIRED_MESSAGE,
      'INVALID_PARAM_PROMPT'
    );

    const baseUrl = getRequestBaseUrl(req);
    const result = await geminiService.generateVideo(promptText, {
      baseUrl,
      image: req.body?.image || req.body?.imageUrl,
      model: req.body?.model
    });

    return res.status(200).json({
      sucesso: true,
      videoUrl: result.videoUrl,
      nomeArquivo: result.nomeArquivo,
      thumbnailUrl: result.thumbnailUrl,
      prompt: promptText
    });
  } catch (error) {
    return sendFormattedError(res, error);
  }
}

export async function postGenerateImage(req, res) {
  try {
    const promptText = requireNonEmptyString(
      req.body?.prompt || req.body?.text || req.body?.description,
      PROMPT_REQUIRED_MESSAGE,
      'INVALID_PARAM_PROMPT'
    );

    const baseUrl = getRequestBaseUrl(req);
    const result = await geminiService.generateImage(promptText, {
      ...req.body,
      baseUrl
    });

    if (wantsBinaryStream(req, 'image/')) {
      const streamPayload = await resolveImageStreamPayload(result.imagens?.[0]);

      if (streamPayload) {
        res.setHeader('Content-Type', streamPayload.contentType);
        res.setHeader('Content-Disposition', `inline; filename="${streamPayload.fileName}"`);
        if (streamPayload.type === 'file') {
          return res.sendFile(streamPayload.filePath);
        }
        return res.send(streamPayload.buffer);
      }

      // Evita que automações (ex: n8n) gravem JSON de texto dentro de um arquivo .jpg esperado como binário
      return res.status(502).json({
        sucesso: false,
        mensagem:
          'A imagem foi gerada, mas o arquivo binário não pôde ser transmitido no formato stream. Tente novamente sem o parâmetro stream=true para obter a URL direta.',
        imageUrl: result.imageUrl,
        codigo: 'STREAM_BINARY_UNAVAILABLE'
      });
    }

    return res.status(200).json({
      sucesso: true,
      imageUrl: result.imageUrl,
      total: result.total,
      imagens: result.imagens,
      prompt: promptText
    });
  } catch (error) {
    return sendFormattedError(res, error);
  }
}

export async function postGenerateAudio(req, res) {
  try {
    const directText =
      normalizeNonEmptyString(req.body?.text) ||
      normalizeNonEmptyString(req.body?.roteiro);
    const promptText = normalizeNonEmptyString(req.body?.prompt);

    if (!directText && !promptText) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Informe o parâmetro 'text' (para narrar um roteiro pronto diretamente) ou 'prompt' (para o Gemini criar a história).",
        codigo: 'INVALID_PARAM_AUDIO'
      });
    }

    const baseUrl = getRequestBaseUrl(req);
    const result = await geminiService.generateAudio({
      ...req.body,
      prompt: promptText,
      text: directText,
      baseUrl
    });

    if (
      wantsBinaryStream(req, 'audio/') &&
      result.caminhoLocal &&
      fs.existsSync(result.caminhoLocal)
    ) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${result.nomeArquivo}"`);
      return res.sendFile(path.resolve(result.caminhoLocal));
    }

    return res.status(200).json({
      sucesso: true,
      ...(promptText ? { prompt: promptText } : {}),
      ...result
    });
  } catch (error) {
    return sendFormattedError(res, error);
  }
}

export async function postResearch(req, res) {
  try {
    const queryText = requireNonEmptyString(
      req.body?.query || req.body?.prompt,
      "O parâmetro 'query' (ou 'prompt') é obrigatório para realizar a pesquisa.",
      'INVALID_PARAM_QUERY'
    );

    const result = await geminiService.deepResearch(queryText);

    return res.status(200).json({
      sucesso: true,
      query: queryText,
      relatorio: result.relatorio
    });
  } catch (error) {
    return sendFormattedError(res, error);
  }
}
