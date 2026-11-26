import { Router } from 'express';
import geminiRoutes from './geminiRoutes.js';
import publicRoutes from './publicRoutes.js';
import sessionRoutes from './sessionRoutes.js';

const apiRouter = Router();

apiRouter.use(publicRoutes);
apiRouter.use(sessionRoutes);
apiRouter.use(geminiRoutes);

export default apiRouter;
