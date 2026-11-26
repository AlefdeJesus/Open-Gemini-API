# Gemini Custom REST API (Node.js + gemini-web-sdk)

API REST modular desenvolvida em **Node.js (ES Modules)** utilizando [`gemini-web-sdk`](https://www.npmjs.com/package/gemini-web-sdk) e [`msedge-tts`](https://www.npmjs.com/package/msedge-tts). Permite geração de **textos**, **imagens**, **vídeos (`.mp4`)**, **narrações neurais / áudios (`.mp3`)** e **pesquisas aprofundadas (Deep Research)** autenticada via sessão do Google Gemini.

Inclui autenticação por **API Key com comparação em tempo constante (`crypto.timingSafeEqual`)**, **Rate Limiting configurável**, **entrega estática e via stream binário** (compatível com **n8n**), **limpeza automática de mídias expiradas** e **auto-renovação de cookies com Puppeteer**.

> **Aviso importante:** Este projeto utiliza o pacote comunitário `gemini-web-sdk` (baseado na interface web do Google Gemini via cookies de sessão) e não a API oficial paga da Google Cloud / Vertex AI. Mudanças na interface web do Google podem exigir atualização do SDK ou renovação da sessão (`npm run login`).

---

## 📁 Estrutura do Projeto

```text
open-gemini-api/
├── package.json                       # Scripts, metadados e dependências
├── .env.example                       # Modelo de variáveis de ambiente
├── .editorconfig                      # Padrão de formatação entre editores
├── .gitignore                         # Exclusão de segredos, mídias temporárias e perfil Chrome
├── LICENSE                            # Licença MIT
├── CONTRIBUTING.md                    # Guia para contribuidores
├── README.md                          # Visão geral, instalação, operação e deploy
├── REQUISICOES.md                     # Guia completo de payloads (cURL, PowerShell, JS, Python, n8n)
├── requests.http                      # Coleção executável para VS Code REST Client / Thunder Client
├── docs/
│   └── REFACTORING_AUDIT.md           # Auditoria arquitetural do projeto
├── scripts/
│   ├── login-gemini.js                # Login interativo no Google Gemini via Chrome
│   └── refresh-cookies.js             # Renovação manual de cookies em modo headless
├── storage/
│   └── media/                         # Diretório temporário para mídias geradas (.mp4, .jpg, .mp3)
│       └── .gitkeep
├── src/
│   ├── server.js                      # Ponto de entrada HTTP, tarefas agendadas e graceful shutdown
│   ├── app.js                         # Configuração do Express, Helmet, CORS, estáticos e middlewares
│   ├── config/
│   │   ├── env.js                     # Validação e centralização das variáveis de ambiente
│   │   └── voicesCatalog.js           # Catálogo de vozes e aliases do Microsoft Edge TTS
│   ├── controllers/
│   │   ├── publicController.js        # Handlers de /health e /voices
│   │   ├── sessionController.js       # Handlers de status e renovação de sessão
│   │   └── generationController.js    # Handlers de texto, imagem, vídeo, áudio e research
│   ├── errors/
│   │   ├── AppError.js                # Classe de erro operacional padronizada
│   │   └── errorHandler.js            # Mapeamento de erros do SDK e handlers 404/500
│   ├── middlewares/
│   │   ├── auth.js                    # Autenticação segura por API Key (SHA-256 + timingSafeEqual)
│   │   └── limiter.js                 # Rate limiting por IP
│   ├── routes/
│   │   ├── index.js                   # Agregador das rotas montado em /api2 e /
│   │   ├── publicRoutes.js            # Rotas públicas (/health, /voices)
│   │   ├── sessionRoutes.js           # Rotas de sessão e cookies
│   │   └── geminiRoutes.js            # Rotas autenticadas de geração
│   ├── services/
│   │   ├── geminiService.js           # Fachada pública unificada dos serviços de geração
│   │   ├── cleanupService.js          # Garantia do diretório de mídia e retenção por TTL
│   │   ├── cookieRefresher.js         # Automação Puppeteer de login e renovação periódica
│   │   ├── puppeteerDownloader.js     # Download autenticado em alta resolução do Google CDN
│   │   ├── browser/
│   │   │   └── chromeLocator.js       # Detecção multiplataforma do binário Chrome/Chromium
│   │   ├── gemini/
│   │   │   ├── geminiClient.js        # Singleton do cliente Gemini e resolução de modelos
│   │   │   ├── textService.js         # Geração de texto e Deep Research
│   │   │   ├── imageService.js        # Geração de imagens e resolução de stream binário
│   │   │   └── videoService.js        # Geração de vídeos (.mp4)
│   │   ├── session/
│   │   │   └── sessionStore.js        # Estado de credenciais em memória e sincronização com .env
│   │   └── tts/
│   │       ├── ttsTextProcessor.js    # Limpeza fonética, prosódia, pseudo-SSML e chunking
│   │       ├── edgeTtsService.js      # Cliente WebSocket MsEdgeTTS com retentativas
│   │       └── audioService.js        # Narração direta, história com Gemini + TTS e MusicFX
│   └── utils/
│       ├── requestUrl.js              # Resolução de URL base atrás de proxy reverso
│       └── validators.js              # Validadores reutilizáveis de parâmetros HTTP
└── test/
    ├── api.test.js                    # Testes de integração HTTP e contratos de erro
    ├── ttsTextProcessor.test.js       # Testes unitários do processador de texto e vozes
    ├── validatorsAndErrors.test.js    # Testes unitários de validadores, URLs e erros
    └── storageAndSession.test.js      # Testes unitários de limpeza de mídia e sessionStore
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos
- **Node.js** `>= 18.0.0`
- **Google Chrome** ou **Chromium** instalado no sistema (utilizado para login persistente, renovação automática de sessão e download de imagens/vídeos de alta resolução)
- Uma conta Google com acesso ao [Google Gemini](https://gemini.google.com) (recursos de vídeo e Deep Research exigem plano compatível na conta Google)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Crie e configure o arquivo `.env`:**
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e defina uma chave forte em `API_SECRET_KEY`.

3. **Autentique a sessão do Google Gemini (Opções):**
   - **Opção recomendada (login interativo automático):**
     ```bash
     npm run login
     ```
     Uma janela do Chrome será aberta no perfil persistente (`storage/chrome-profile/`). Após concluir o login na conta Google e abrir o chat do Gemini, os cookies e tokens serão salvos automaticamente no `.env`.
   - **Opção manual:** copie os cookies `__Secure-1PSID` e `__Secure-1PSIDTS` de `https://gemini.google.com` (via DevTools → *Application* → *Cookies*) para o `.env`.

4. **Inicie o servidor:**
   ```bash
   # Desenvolvimento (auto-reload)
   npm run dev

   # Produção
   npm start
   ```

5. **Execute os testes automatizados:**
   ```bash
   npm test
   ```

### Scripts Disponíveis (`package.json`)

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor HTTP em produção |
| `npm run dev` | Inicia o servidor com `--watch` para desenvolvimento |
| `npm test` | Executa as suítes unitárias e de integração com `node:test` |
| `npm run login` | Abre o navegador para autenticar e capturar cookies da conta Google |
| `npm run refresh-cookies` | Testa a renovação silenciosa (headless) dos cookies |
| `npm run clean-profile` | Remove o diretório `storage/chrome-profile` para reiniciar sessão limpa |

---

## 🛡️ Segurança e Autenticação

As rotas de geração exigem envio da chave configurada em `API_SECRET_KEY` por qualquer um dos cabeçalhos abaixo:

```http
x-api-key: sua_chave_secreta_aqui
```
ou
```http
Authorization: Bearer sua_chave_secreta_aqui
```

A validação em `src/middlewares/auth.js` compara digests SHA-256 de 32 bytes com `crypto.timingSafeEqual`, garantindo tempo constante e prevenindo ataques de temporização (*timing attacks*).

---

## 📡 Resumo dos Endpoints

Todas as rotas respondem tanto sob o prefixo `/api2` quanto na raiz `/` (para compatibilidade com diferentes configurações de `proxy_pass` no Nginx). Para exemplos completos em **cURL, PowerShell, JavaScript, Python e n8n**, consulte [REQUISICOES.md](./REQUISICOES.md) e [requests.http](./requests.http).

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/api2/health` | Pública | Status do servidor, versão e uptime |
| `GET` | `/api2/voices` | Pública | Catálogo de vozes e aliases do Microsoft Edge TTS |
| `POST` | `/api2/generate-text` | API Key | Geração textual (`prompt`, `systemMessage`, `model`) |
| `POST` | `/api2/generate-image` | API Key | Geração de imagens (suporta `?stream=true` para binário direto) |
| `POST` | `/api2/generate-video` | API Key | Geração de vídeo `.mp4` com download para `storage/media` |
| `POST` | `/api2/generate-audio` | API Key | TTS direto (`text`) ou criação com Gemini + narração (`prompt`), suportando `?stream=true` |
| `POST` | `/api2/research` | API Key | Relatório consolidado via Gemini Deep Research (`query`) |
| `POST` | `/api2/refresh-cookies` | API Key | Dispara renovação headless imediata dos cookies |
| `GET` | `/api2/media/:arquivo` | Pública | Entrega estática dos arquivos gerados (retenção padrão: 4h via `MEDIA_MAX_AGE_HOURS`) |

### Exemplo Rápido (`POST /api2/generate-text`)

```bash
curl -X POST http://localhost:3333/api2/generate-text \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_chave_secreta_aqui" \
  -d '{
    "prompt": "Explique resumidamente o que é computação quântica em 3 tópicos."
  }'
```

### Exemplo Rápido de Narração Direta (`POST /api2/generate-audio`)

O processador de texto (`src/services/tts/ttsTextProcessor.js`) limpa artefatos de Markdown, converte valores monetários/unidades para leitura fonética natural e ajusta cadência de parágrafos e pausas (`pausePonto`, `modo: "suspense" | "sono" | "dinamico"`), mantendo compatibilidade estável com o WebSocket do Edge TTS:

```bash
curl -X POST http://localhost:3333/api2/generate-audio \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_chave_secreta_aqui" \
  -d '{
    "text": "Documentos recém-desclassificados revelam relatos intrigantes.\n\nMoradores locais relataram luzes e marcas inexplicáveis.",
    "voice": "pt-BR-AntonioNeural",
    "modo": "suspense",
    "rate": "-3%",
    "pitch": "-3%",
    "pausePonto": "800ms"
  }'
```

---

## 🌐 Deploy em VPS Linux (Chromium + PM2 + Nginx)

### 1. Instalar Chromium no Ubuntu / Debian

```bash
sudo apt update && sudo apt install -y chromium-browser || sudo apt install -y chromium
```

### 2. Executar com PM2

```bash
npm install -g pm2
pm2 start src/server.js --name "gemini-api" --node-args="--max-http-header-size=65536"
pm2 startup
pm2 save
```

### 3. Proxy Reverso Nginx (Timeout Estendido para Vídeos e Research)

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 100M;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    location /api2 {
        proxy_pass http://127.0.0.1:3333/api2;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
        send_timeout          300s;
        proxy_buffering       off;
    }
}
```

---

## 📋 Códigos de Erro Padronizados

| Código HTTP | `codigo` JSON | Descrição |
|---|---|---|
| `400` | `INVALID_PARAM_PROMPT` | Parâmetro `prompt` ausente ou vazio |
| `400` | `INVALID_PARAM_AUDIO` | Nenhum `text` ou `prompt` enviado em `/generate-audio` |
| `400` | `INVALID_PARAM_QUERY` | Parâmetro `query` ausente em `/research` |
| `400` | `GEMINI_INVALID_MODEL` | Modelo informado inválido ou indisponível na conta |
| `401` | `MISSING_API_KEY` | Cabeçalho `x-api-key` ou `Authorization` ausente |
| `401` | `INVALID_API_KEY` | Chave de API inválida |
| `401` | `GEMINI_AUTH_EXPIRED` / `GEMINI_AUTH_REQUIRED` | Sessão Google expirada (execute `npm run login`) |
| `403` | `GEMINI_IP_BLOCKED` | IP temporariamente bloqueado pelo Google |
| `404` | `ROUTE_NOT_FOUND` | Rota não encontrada |
| `422` | `NO_IMAGE_GENERATED` / `NO_VIDEO_GENERATED` / `NO_AUDIO_GENERATED` | O modelo não retornou mídia para o prompt enviado |
| `429` | `RATE_LIMIT_EXCEEDED` | Limite de requisições por IP excedido |
| `429` | `GEMINI_USAGE_LIMIT` / `GOOGLE_VIDEO_CAPACITY_LIMIT` | Limite de quota ou capacidade do Google atingido |
| `502` | `GEMINI_API_ERROR` / `STREAM_BINARY_UNAVAILABLE` | Erro de comunicação upstream ou stream binário indisponível |
| `500` | `INTERNAL_SERVER_ERROR` / `GEMINI_UNKNOWN_ERROR` | Erro interno inesperado |

---

## 🤝 Contribuição e Licença

Contribuições são bem-vindas! Consulte o [Guia de Contribuição](./CONTRIBUTING.md) antes de abrir um Pull Request.

Distribuído sob a licença **MIT**. Veja [LICENSE](./LICENSE) para mais informações.
