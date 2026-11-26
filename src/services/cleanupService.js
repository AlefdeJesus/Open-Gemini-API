import fs from 'node:fs';
import path from 'node:path';
import config from '../config/env.js';

const DEFAULT_MAX_AGE_MS = (config.MEDIA_MAX_AGE_HOURS || 4) * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = config.MEDIA_CLEANUP_INTERVAL_MS || 30 * 60 * 1000;

export function ensureStorageDirectory(dirPath = config.STORAGE_DIR) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

export function cleanExpiredMedia(maxAgeMs = DEFAULT_MAX_AGE_MS, targetDir = config.STORAGE_DIR) {
  const result = {
    excluidos: 0,
    arquivosExcluidos: []
  };

  try {
    if (!fs.existsSync(targetDir)) {
      return result;
    }

    const files = fs.readdirSync(targetDir);
    const now = Date.now();

    for (const file of files) {
      if (file.startsWith('.')) {
        continue;
      }

      const filePath = path.join(targetDir, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          const fileTime = Math.max(stat.mtimeMs || 0, stat.birthtimeMs || 0);
          const ageMs = now - fileTime;

          if (ageMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            result.excluidos++;
            result.arquivosExcluidos.push(file);

            const ageHours = (ageMs / (1000 * 60 * 60)).toFixed(1);
            console.log(`[STORAGE CLEANUP] Arquivo expirado excluído: ${file} (Criado há ${ageHours}h)`);
          }
        }
      } catch (fileErr) {
        console.warn(`[STORAGE CLEANUP] Aviso ao verificar arquivo ${file}:`, fileErr.message);
      }
    }

    if (result.excluidos > 0) {
      console.log(`[STORAGE CLEANUP] Varredura concluída: ${result.excluidos} arquivo(s) temporário(s) removido(s).`);
    }
  } catch (error) {
    console.error('[STORAGE CLEANUP ERRO] Falha ao executar varredura de limpeza de mídias:', error);
  }

  return result;
}

export function startMediaCleanupTask(intervalMs = CHECK_INTERVAL_MS, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  console.log(`[STORAGE CLEANUP] Agendador de retenção iniciado: mídias serão excluídas após ${config.MEDIA_MAX_AGE_HOURS || 4}h de vida.`);

  cleanExpiredMedia(maxAgeMs);

  const timer = setInterval(() => {
    cleanExpiredMedia(maxAgeMs);
  }, intervalMs);

  // Impede que o timer ativo bloqueie o encerramento gracioso do processo Node.js
  if (timer.unref) {
    timer.unref();
  }

  return timer;
}

export default {
  ensureStorageDirectory,
  cleanExpiredMedia,
  startMediaCleanupTask
};
