import { Router } from 'express';
import {
  getSessionStatus,
  postRefreshCookies,
  postRenewCookies
} from '../controllers/sessionController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/session-status', getSessionStatus);
router.post('/renew-cookies', postRenewCookies);
router.post('/refresh-cookies', authMiddleware, postRefreshCookies);

export default router;
