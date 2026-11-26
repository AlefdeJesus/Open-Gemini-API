import { formatGeminiError } from '../errors/errorHandler.js';
import {
  getAuthenticatedGeminiClient,
  getGeminiClient,
  resolveModel,
  updateRuntimeCookies
} from './gemini/geminiClient.js';
import { deepResearch, generateText } from './gemini/textService.js';
import { generateImage, resolveImageStreamPayload } from './gemini/imageService.js';
import { generateVideo, prepareImageFile } from './gemini/videoService.js';
import { generateAudio } from './tts/audioService.js';

export {
  getGeminiClient,
  getAuthenticatedGeminiClient,
  updateRuntimeCookies,
  resolveModel,
  generateText,
  generateVideo,
  prepareImageFile,
  generateImage,
  resolveImageStreamPayload,
  generateAudio,
  deepResearch,
  formatGeminiError
};

export default {
  getGeminiClient,
  getAuthenticatedGeminiClient,
  updateRuntimeCookies,
  resolveModel,
  generateText,
  generateVideo,
  generateImage,
  resolveImageStreamPayload,
  generateAudio,
  deepResearch,
  formatGeminiError
};
