import app from './app.js';
import config from './config/env.js';
import { ensureStorageDirectory, startMediaCleanupTask } from './services/cleanupService.js';
import { startCookieAutoRefreshTask } from './services/cookieRefresher.js';

try {
  const created = ensureStorageDirectory(config.STORAGE_DIR);
  if (created) {
    console.log(`[STORAGE] Diretório de mídia criado em: ${config.STORAGE_DIR}`);
  }
} catch (error) {
  console.error('[STORAGE ERRO] Falha ao criar diretório de mídias:', error);
  process.exit(1);
}

startMediaCleanupTask();
startCookieAutoRefreshTask(config.COOKIE_REFRESH_HOURS);

const server = app.listen(config.PORT, () => {
  console.log('\n======================================================');
  console.log('🚀  GEMINI CUSTOM REST API INICIADA COM SUCESSO!');
  console.log('======================================================');
  console.log(`• Ambiente:       ${config.NODE_ENV}`);
  console.log(`• Porta Local:    ${config.PORT}`);
  console.log(`• URL Local:      http://localhost:${config.PORT}/api2`);
  console.log(`• URL Base Púb:   ${config.BASE_URL}`);
  console.log(`• Mídias:         ${config.STORAGE_DIR}`);
  console.log('------------------------------------------------------');
  console.log('Endpoints disponíveis:');
  console.log(`  [GET]  ${config.BASE_URL}/health`);
  console.log(`  [POST] ${config.BASE_URL}/generate-text`);
  console.log(`  [POST] ${config.BASE_URL}/generate-video`);
  console.log(`  [POST] ${config.BASE_URL}/generate-image`);
  console.log(`  [POST] ${config.BASE_URL}/generate-audio`);
  console.log(`  [POST] ${config.BASE_URL}/research`);
  console.log(`  [GET]  ${config.BASE_URL}/media/:arquivo`);
  console.log('======================================================\n');
});

function handleShutdown(signal) {
  console.log(`\n[SISTEMA] Sinal ${signal} recebido. Encerrando conexões ativas...`);
  server.close(() => {
    console.log('[SISTEMA] Servidor HTTP encerrado com segurança.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SISTEMA] Tempo limite de encerramento excedido. Forçando encerramento.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
