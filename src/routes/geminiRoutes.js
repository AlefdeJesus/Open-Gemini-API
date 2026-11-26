import { Router } from 'express';
import {
  postGenerateAudio,
  postGenerateImage,
  postGenerateText,
  postGenerateVideo,
  postResearch
} from '../controllers/generationController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.post('/generate-text', authMiddleware, postGenerateText);
router.post('/generate-video', authMiddleware, postGenerateVideo);
router.post('/generate-image', authMiddleware, postGenerateImage);
router.post('/generate-audio', authMiddleware, postGenerateAudio);
router.post('/research', authMiddleware, postResearch);

export default router;
