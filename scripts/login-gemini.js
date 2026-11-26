import { renovarCookiesGemini } from '../src/services/cookieRefresher.js';

console.log('===========================================================');
console.log('🔐 INICIALIZANDO LOGIN INTERATIVO NO GOOGLE GEMINI');
console.log('===========================================================');
console.log('Uma janela do Google Chrome será aberta.');
console.log('1. Conecte-se com sua conta Google (Gemini Pro/Advanced).');
console.log('2. Complete o login e eventuais autenticações em 2 etapas.');
console.log('3. Quando o chat do Gemini carregar, os cookies serão capturados');
console.log('   automaticamente e gravados no seu arquivo .env!');
console.log('===========================================================\n');

try {
  await renovarCookiesGemini({ headless: false, maxWaitLoginMs: 300000 });
  console.log('\n✅ SESSÃO CAPTURADA E COOKIES ATUALIZADOS COM SUCESSO!');
  console.log('A partir de agora, o servidor renovará esses cookies automaticamente em segundo plano.');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Falha no login interativo:', error.message);
  if (
    error.message.includes('Missing X server') ||
    error.message.includes('DISPLAY') ||
    error.message.includes('Cannot open display')
  ) {
    console.error('\n💡 DICAS PARA VPS / LINUX:');
    console.error('1. Se estiver vendo a VPS pelo navegador (noVNC):');
    console.error('   Abra o Terminal dentro do noVNC (Applications -> Terminal Emulator)');
    console.error('   e execute:');
    console.error('     cd ~/open-gemini-api');
    console.error('     npm run login\n');
    console.error('2. Ou se estiver rodando por um terminal SSH externo, especifique a tela:');
    console.error('     DISPLAY=:0 npm run login');
    console.error('   (Caso seu display seja :1, use DISPLAY=:1 npm run login)\n');
  }
  process.exit(1);
}
