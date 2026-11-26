# Guia de Contribuição

Obrigado pelo interesse em contribuir com o projeto! Este documento reúne as diretrizes para configurar o ambiente local, manter o padrão arquitetural e enviar contribuições com segurança.

## Pré-requisitos

- **Node.js** `>= 18.0.0` (ES Modules nativo e `node:test`).
- **Google Chrome** ou **Chromium** instalado localmente (necessário apenas para testar login interativo, renovação de cookies e download autenticado via Puppeteer).

## Configuração do Ambiente Local

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie seu arquivo `.env` local a partir do modelo:
   ```bash
   cp .env.example .env
   ```
3. Execute a suíte de testes automatizados (não exige conta Google nem conexão externa):
   ```bash
   npm test
   ```

## Organização da Arquitetura

- `src/config/`: carregamento centralizado de variáveis de ambiente (`env.js`) e catálogos estáticos (`voicesCatalog.js`).
- `src/routes/` e `src/controllers/`: camada HTTP (extração de parâmetros, cabeçalhos, streaming e envio de respostas JSON). Evite colocar regras de negócio ou chamadas diretas ao SDK nas rotas.
- `src/services/gemini/`: cliente autenticado e serviços de geração (`textService.js`, `imageService.js`, `videoService.js`).
- `src/services/tts/`: processamento puro de texto/prosódia (`ttsTextProcessor.js`), cliente WebSocket (`edgeTtsService.js`) e orquestração de áudio (`audioService.js`).
- `src/services/browser/` e `src/services/session/`: localização do Chrome, renovação de cookies, download de mídia e estado de sessão compartilhado (`sessionStore.js`).
- `src/errors/` e `src/utils/`: erros operacionais (`AppError.js`), mapeamento de falhas do SDK e validadores reutilizáveis.

## Diretrizes de Código e Segurança

1. **Contratos HTTP:** preserve os endpoints existentes e os nomes dos campos JSON das respostas (`sucesso`, `mensagem`, `codigo`, etc.) para não quebrar integrações existentes (como fluxos n8n).
2. **Segurança:** nunca inclua chaves reais, cookies (`__Secure-1PSID`, `__Secure-1PSIDTS`), perfis de navegador ou domínios privados em commits, testes ou exemplos de documentação.
3. **Código Limpo:** mantenha funções pequenas e focadas, utilize identificadores internos claros e documente apenas decisões arquiteturais, requisitos de segurança ou comportamentos não óbvios de bibliotecas externas.
4. **Testes:** ao adicionar novos utilitários, validadores ou transformações de texto, inclua testes correspondentes em `test/` utilizando `node:test` e `node:assert/strict`.

## Enviando um Pull Request

1. Crie uma branch descritiva (`feat/minha-melhoria` ou `fix/correcao-especifica`).
2. Certifique-se de que `npm test` passa integralmente.
3. Descreva no Pull Request o problema resolvido, os arquivos impactados e como validar a alteração.
