import { renovarCookiesGemini } from '../src/services/cookieRefresher.js';

console.log('🔄 Iniciando renovação silenciosa de cookies em segundo plano (Headless)...');

try {
  const resultado = await renovarCookiesGemini({ headless: true });
  if (resultado && resultado.sucesso === false) {
    console.error(`\n⚠️ ${resultado.mensagem}`);
    console.error('Execute "npm run login" para realizar o login interativo ou atualize as chaves no .env.');
    process.exit(1);
  }
  console.log('\n✅ Cookies renovados com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Falha na renovação:', error.message);
  process.exit(1);
}
