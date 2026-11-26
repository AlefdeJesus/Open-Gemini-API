import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config/env.js';
import { globalErrorMiddleware, notFoundMiddleware } from './errors/errorHandler.js';
import apiLimiter from './middlewares/limiter.js';
import apiRouter from './routes/index.js';

const app = express();

// Necessário atrás de proxy reverso (ex: Nginx) para identificar o IP real em X-Forwarded-For no Rate Limiting
app.set('trust proxy', 1);

app.use(
  helmet({
    // Permite carregamento de vídeos, imagens e áudios gerados em players e origens externas
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Montado em /api2/media e /media para compatibilidade com Nginx com ou sem remoção do prefixo no proxy_pass
const mediaStaticMiddleware = express.static(config.STORAGE_DIR, {
  dotfiles: 'ignore',
  etag: true,
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
});

app.use('/api2/media', mediaStaticMiddleware);
app.use('/media', mediaStaticMiddleware);

// Montado uma única vez na raiz para cobrir /api2/* e /* sem contabilizar requisições em dobro
app.use('/', apiLimiter);

// Montado em /api2 e / para atender tanto proxy_pass mantendo prefixo quanto fazendo strip da barra final
app.use('/api2', apiRouter);
app.use('/', apiRouter);

app.get('/', (_req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API Gemini Web SDK online. Endpoints disponíveis.',
    healthCheck: `${config.BASE_URL}/health`
  });
});

app.use(notFoundMiddleware);
app.use(globalErrorMiddleware);

export default app;
