import { Router } from 'express';
import { getHealth, getVoices } from '../controllers/publicController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/voices', getVoices);

export default router;
