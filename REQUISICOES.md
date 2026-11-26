# 📖 Guia Completo de Requisições - Gemini Custom REST API

Este documento reúne todas as formas de realizar requisições para **cada tipo de solicitação** disponível na API.

---

## 📌 Sumário Rápido

1. [Configurações e Autenticação](#-configurações-e-autenticação)
2. [1. Health Check (Monitoramento)](#1-health-check-público)
3. [2. Catálogo de Vozes Neurais (Edge TTS)](#2-catálogo-de-vozes-neurais-público)
4. [3. Geração de Texto](#3-geração-de-texto)
5. [4. Geração de Áudio - Narração Direta (TTS de Roteiro / n8n)](#4-geração-de-áudio---narração-direta-tts-sem-ia)
6. [5. Geração de Áudio - Criação com Gemini + Narração](#5-geração-de-áudio---criação-com-gemini--narração-modo-dark)
7. [6. Geração de Imagem](#6-geração-de-imagem)
8. [7. Geração de Vídeo (.mp4)](#7-geração-de-vídeo-mp4)
9. [8. Deep Research (Pesquisa Aprofundada)](#8-deep-research-pesquisa-aprofundada)
10. [9. Download e Streaming de Mídias](#9-download-e-streaming-de-mídias)
11. [10. Configuração no n8n (HTTP Request)](#10-configuração-no-n8n-para-automações)

---

## 🔑 Configurações e Autenticação

### URLs Base
- **Local:** `http://localhost:3333/api2`
- **Produção (VPS):** `https://api.example.com/api2`

### Formas de Enviar a Chave de Autenticação
Todas as rotas sob proteção aceitam qualquer uma das duas opções abaixo:

1. **Via cabeçalho `x-api-key`:**
   ```http
   x-api-key: SUA_CHAVE_AQUI
   ```
2. **Via cabeçalho padrão `Authorization: Bearer`:**
   ```http
   Authorization: Bearer SUA_CHAVE_AQUI
   ```

---

## 1. Health Check (Público)

Verifica a saúde da API, status dos serviços, uptime e URL base resolvida.

- **Método:** `GET`
- **Rota:** `/api2/health`
- **Autenticação:** Não requer chave

### cURL (Linux / macOS / Git Bash)
```bash
curl -X GET "http://localhost:3333/api2/health"
```

### PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/api2/health" -Method Get
```

### JavaScript (Node.js 18+ / Browser Fetch)
```javascript
const response = await fetch("http://localhost:3333/api2/health");
const data = await response.json();
console.log(data);
```

### Python (requests)
```python
import requests

response = requests.get("http://localhost:3333/api2/health")
print(response.json())
```

### Exemplo de Resposta (200 OK)
```json
{
  "sucesso": true,
  "status": "online",
  "baseUrl": "http://localhost:3333/api2",
  "timestamp": "2026-09-19T11:55:00.000Z",
  "uptime": "142.30s",
  "versao": "1.0.0",
  "servico": "Gemini Custom REST API"
}
```

---

## 2. Catálogo de Vozes Neurais (Público)

Retorna a lista de vozes disponíveis para síntese neural (Edge TTS), incluindo vozes otimizadas para Canais Dark, suspense, documentários e cinema.

- **Método:** `GET`
- **Rota:** `/api2/voices`
- **Autenticação:** Não requer chave

### cURL
```bash
curl -X GET "http://localhost:3333/api2/voices"
```

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/api2/voices" -Method Get
```

### JavaScript
```javascript
const response = await fetch("http://localhost:3333/api2/voices");
const data = await response.json();
console.log(data.vozesRecomendadasDark);
```

### Python
```python
import requests

response = requests.get("http://localhost:3333/api2/voices")
print(response.json()["padrao"])
```

---

## 3. Geração de Texto

Gera respostas textuais, artigos, explicações e conteúdos utilizando o Gemini.

- **Método:** `POST`
- **Rota:** `/api2/generate-text`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: SUA_CHAVE_AQUI` (ou `Authorization: Bearer SUA_CHAVE_AQUI`)
- **Body:**
  - `prompt` *(string, obrigatório)*: Instrução ou pergunta.
  - `systemMessage` *(string, opcional)*: Instrução de sistema/persona (ex: tom de voz, regras do canal dark).
  - `model` *(string, opcional)*: Especificação de modelo alternativo.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/generate-text" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -d '{
    "systemMessage": "Você é um roteirista de suspense.",
    "prompt": "Explique computação quântica em 3 tópicos diretos e objetivos."
  }'
```

### PowerShell
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key"    = "SUA_CHAVE_AQUI"
}

$body = @{
  systemMessage = "Você é um roteirista de suspense."
  prompt        = "Explique computação quântica em 3 tópicos diretos e objetivos."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/api2/generate-text" -Method Post -Headers $headers -Body $body
```

### JavaScript (Node.js / Frontend)
```javascript
const response = await fetch("http://localhost:3333/api2/generate-text", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
  },
  body: JSON.stringify({
    systemMessage: "Você é um roteirista de suspense.",
    prompt: "Explique computação quântica em 3 tópicos diretos e objetivos."
  })
});

const data = await response.json();
console.log(data.output);
```

### Python
```python
import requests

url = "http://localhost:3333/api2/generate-text"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
}
payload = {
    "systemMessage": "Você é um roteirista de suspense.",
    "prompt": "Explique computação quântica em 3 tópicos diretos e objetivos."
}

res = requests.post(url, json=payload, headers=headers)
print(res.json()["output"])
```

### Exemplo de Resposta (200 OK)
```json
{
  "sucesso": true,
  "output": "1. Qubits: Diferente dos bits clássicos (0 ou 1), os qubits podem existir em múltiplos estados simultaneamente...\n2. Superposição...\n3. Entrelaçamento...",
  "texto": "1. Qubits: Diferente dos bits clássicos (0 ou 1), os qubits podem existir em múltiplos estados simultaneamente...\n2. Superposição...\n3. Entrelaçamento...",
  "prompt": "Você é um roteirista de suspense.\n\nExplique computação quântica em 3 tópicos diretos e objetivos.",
  "dados": {
    "texto": "1. Qubits: Diferente dos bits clássicos (0 ou 1), os qubits podem existir em múltiplos estados simultaneamente...\n2. Superposição...\n3. Entrelaçamento...",
    "pensamentos": null,
    "candidatosTotal": 1
  }
}
```

---

## 4. Geração de Áudio - Narração Direta (TTS sem IA)

Ideal para **n8n**, scripts prontos, automações ou roteiros já gerados anteriormente. Pula o processamento do Gemini e executa imediatamente a síntese com voz neural ultra-realista.

- **Método:** `POST`
- **Rota:** `/api2/generate-audio`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: SUA_CHAVE_AQUI`
- **Body:**
  - `text` *(string, obrigatório - ou `roteiro`)*: O roteiro que deve ser lido.
  - `voice` *(string, opcional)*: Voz a utilizar. Exemplos:
    - `pt-BR-AntonioNeural` (Padrão, suspense/mistério) ou alias `dark_mystery`
    - `pt-BR-FranciscaNeural` ou alias `dark_female` (Voz feminina investigativa)
    - `pt-BR-ThalitaMultilingualNeural` (Voz multilíngue brasileira ultra-natural)
    - `pt-PT-DuarteNeural` ou alias `dark_ancient` (Sotaque clássico/gótico)
    - `en-US-AndrewMultilingualNeural` ou alias `dark_hollywood` (Trailer de cinema)
  - `rate` *(string, opcional)*: Velocidade da fala (`"-3%"`, `"+0%"`, `"+5%"`).
  - `pitch` *(string, opcional)*: Tom da voz (`"-3%"`, `"-4%"`, `"+0%"`).
  - `volume` *(string, opcional)*: Volume (`"soft"`, `"x-soft"`, `"loud"` ou porcentagem como `"-15%"`).
  - `pausePonto` *(string, opcional)*: Ajusta a cadência em pontos finais (`>=400ms` aplica reticências suaves; `>=1100ms` insere transição de parágrafo).
  - `modo` *(string, opcional)*: `"suspense"` (ritmo lento e tenso), `"sono"` (calmo/meditação), `"dinamico"` (rápido para Reels/TikTok) ou `"padrao"`.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/generate-audio" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -d '{
    "text": "Documentos recém-desclassificados revelam relatos perturbadores sobre o caso.\n\nMoradores locais relataram avistamentos recorrentes, feixes luminosos e marcas inexplicáveis.",
    "voice": "pt-BR-AntonioNeural",
    "modo": "suspense",
    "rate": "-3%",
    "pitch": "-3%",
    "pausePonto": "800ms",
    "pauseParagrafo": "1200ms",
    "pauseVirgula": "300ms"
  }'
```

### PowerShell
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key"    = "SUA_CHAVE_AQUI"
}

$body = @{
  text  = "Documentos recém-desclassificados revelam relatos perturbadores sobre o caso da Operação Prato na Amazônia."
  voice = "pt-BR-AntonioNeural"
  rate  = "-2%"
  pitch = "-3%"
  modo  = "suspense"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/api2/generate-audio" -Method Post -Headers $headers -Body $body
```

### JavaScript
```javascript
const response = await fetch("http://localhost:3333/api2/generate-audio", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
  },
  body: JSON.stringify({
    text: "Documentos recém-desclassificados revelam relatos perturbadores sobre o caso da Operação Prato na Amazônia.",
    voice: "pt-BR-AntonioNeural",
    rate: "-2%",
    pitch: "-3%",
    modo: "suspense"
  })
});

const data = await response.json();
console.log("Link do áudio gerado:", data.audioUrl);
```

### Python
```python
import requests

url = "http://localhost:3333/api2/generate-audio"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
}
payload = {
    "text": "Documentos recém-desclassificados revelam relatos perturbadores sobre o caso da Operação Prato na Amazônia.",
    "voice": "pt-BR-AntonioNeural",
    "rate": "-2%",
    "pitch": "-3%",
    "modo": "suspense"
}

res = requests.post(url, json=payload, headers=headers)
print("Áudio URL:", res.json()["audioUrl"])
```

### Exemplo de Resposta (200 OK)
```json
{
  "sucesso": true,
  "tipo": "narracao_voz",
  "origem": "texto_direto",
  "estilo": "canal_dark_suspense",
  "provedor": "microsoft_edge_neural",
  "voz": "pt-BR-AntonioNeural",
  "modulacao": {
    "velocidade": "-2%",
    "tomGrave": "-3%"
  },
  "audioUrl": "http://localhost:3333/api2/media/audio_direto_1726746800000_a1b2c3d4.mp3",
  "nomeArquivo": "audio_direto_1726746800000_a1b2c3d4.mp3",
  "textoNarrado": "Documentos recém-desclassificados..."
}
```

---

## 5. Geração de Áudio - Criação com Gemini + Narração (Modo Dark)

O Gemini cria a história cinematográfica completa com base no tema fornecido e, em seguida, a API sintetiza a narração automaticamente em `.mp3`.

- **Método:** `POST`
- **Rota:** `/api2/generate-audio`
- **Body:**
  - `prompt` *(string, obrigatório)*: Tema ou premissa da narração.
  - `voice` *(string, opcional)*: Voz desejada.
  - `modo` *(string, opcional)*: `"suspense"`, `"dark_channel"` ou `"militar"`.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/generate-audio" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -d '{
    "prompt": "Crie uma história de suspense e mistério sobre transmissões de rádio fantasma captadas na Antártida.",
    "modo": "suspense",
    "voice": "pt-BR-AntonioNeural"
  }'
```

### JavaScript
```javascript
const response = await fetch("http://localhost:3333/api2/generate-audio", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
  },
  body: JSON.stringify({
    prompt: "Crie uma história de suspense e mistério sobre transmissões de rádio fantasma captadas na Antártida.",
    modo: "suspense",
    voice: "pt-BR-AntonioNeural"
  })
});

const data = await response.json();
console.log("Texto criado pelo Gemini:", data.textoNarrado);
console.log("Arquivo MP3 gerado:", data.audioUrl);
```

---

## 6. Geração de Imagem

Gera imagens fotorrealistas ou ilustrações a partir do prompt descritivo.

- **Método:** `POST`
- **Rota:** `/api2/generate-image` (ou `/api2/generate-image?stream=true` para retorno do binário direto no n8n)
- **Query Params (opcional):**
  - `stream=true`: Retorna diretamente o arquivo binário da imagem (`Content-Type: image/jpeg`), ideal para automações no n8n que salvam direto no disco ou no Google Drive sem precisar de outro nó.
- **Body:**
  - `prompt` *(string, obrigatório)*: Descrição da imagem.
  - `aspectRatio` *(string, opcional)*: Proporção desejada (ex: `"16:9"`, `"1:1"`).
  - `model` *(string, opcional)*: Modelo Gemini desejado (ex: `"gemini-3-pro-advanced"`, `"unspecified"`). Gerado exclusivamente via Gemini Pro.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/generate-image" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -d '{
    "prompt": "Foto cinematográfica e hiper-realista de uma base militar abandonada na neve à noite sob aurora boreal, iluminação dramática, 8k."
  }'
```

### PowerShell
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "x-api-key"    = "SUA_CHAVE_AQUI"
}

$body = @{
  prompt = "Foto cinematográfica e hiper-realista de uma base militar abandonada na neve à noite sob aurora boreal, iluminação dramática, 8k."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/api2/generate-image" -Method Post -Headers $headers -Body $body
```

### Python
```python
import requests

url = "http://localhost:3333/api2/generate-image"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
}
payload = {
    "prompt": "Foto cinematográfica de astronauta solitário na superfície de Marte, tempestade de poeira ao fundo, fotorrealista."
}

res = requests.post(url, json=payload, headers=headers)
print("Link da Imagem:", res.json()["imageUrl"])
```

### Integração com n8n e Google Drive
Para salvar a imagem diretamente no **Google Drive** usando o **n8n**:

1. **No nó HTTP Request do n8n:**
   - **Method:** `POST`
   - **URL:** `https://api.example.com/api2/generate-image?stream=true`
   - **Headers:** `x-api-key: SUA_CHAVE_AQUI` e `Content-Type: application/json`
   - **Body (JSON):**
     ```json
     {
       "prompt": "Foto cinematográfica de um guerreiro medieval em uma floresta sombria, 8k",
       "aspectRatio": "16:9"
     }
     ```
   - **Response Format (crucial):** Mude de `JSON` para `File` (Binary) — nome padrão da propriedade binária: `data`.

2. **No nó seguinte do Google Drive no n8n:**
   - **Resource:** `File`
   - **Operation:** `Upload`
   - **Binary File:** Ative `Input Binary Field` e informe `data`
   - **Parent Folder:** Escolha a pasta desejada no seu Google Drive.

> 💡 **Nota:** Se você não usar `?stream=true`, a API retornará um JSON contendo a URL pública (`imageUrl`). O nó do Google Drive no n8n exige um arquivo binário para fazer upload; por isso, usar `stream=true` envia o arquivo JPEG pronto para gravação imediata no Google Drive.

---

## 7. Geração de Vídeo (.mp4)

Gera vídeos curtos em alta resolução com o Gemini Advanced e salva o arquivo `.mp4` no servidor.
> ⚠️ **Atenção:** A renderização de vídeos pode levar entre **60 e 180 segundos**. Configure o timeout do seu cliente para no mínimo 300 segundos (5 minutos).

- **Método:** `POST`
- **Rota:** `/api2/generate-video`
- **Body:**
  - `prompt` *(string, obrigatório)*: Descrição da cena em vídeo.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/generate-video" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_CHAVE_AQUI" \
  --max-time 300 \
  -d '{
    "prompt": "Gere um vídeo cinematográfico em câmera lenta de ondas bioluminescentes quebrando em uma praia deserta à meia-noite."
  }'
```

### JavaScript (com AbortSignal / Timeout estendido)
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos

try {
  const response = await fetch("http://localhost:3333/api2/generate-video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer SUA_CHAVE_AQUI"
    },
    body: JSON.stringify({
      prompt: "Gere um vídeo cinematográfico em câmera lenta de ondas bioluminescentes."
    }),
    signal: controller.signal
  });

  const data = await response.json();
  console.log("Vídeo MP4 gerado:", data.videoUrl);
} finally {
  clearTimeout(timeoutId);
}
```

### Python
```python
import requests

url = "http://localhost:3333/api2/generate-video"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
}
payload = {
    "prompt": "Gere um vídeo cinematográfico em câmera lenta de ondas bioluminescentes."
}

# Timeout de 300s (5 minutos)
res = requests.post(url, json=payload, headers=headers, timeout=300)
data = res.json()
print("URL do Vídeo:", data.get("videoUrl"))
```

### Exemplo de Resposta (200 OK)
```json
{
  "sucesso": true,
  "videoUrl": "http://localhost:3333/api2/media/video_1726747000000_b3c4d5e6.mp4",
  "nomeArquivo": "video_1726747000000_b3c4d5e6.mp4",
  "thumbnailUrl": "https://contribution.usercontent.google.com/...",
  "prompt": "Gere um vídeo cinematográfico em câmera lenta..."
}
```

---

## 8. Deep Research (Pesquisa Aprofundada)

Executa pesquisas aprofundadas com agentes de busca autônoma do Gemini e compila um dossiê/relatório completo em Markdown.

- **Método:** `POST`
- **Rota:** `/api2/research`
- **Body:**
  - `query` *(string, obrigatório - ou `prompt`)*: O tema da investigação.

### cURL
```bash
curl -X POST "http://localhost:3333/api2/research" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  --max-time 300 \
  -d '{
    "query": "Dossiê completo sobre a evolução e avanços práticos da computação quântica até 2026."
  }'
```

### Python
```python
import requests

url = "http://localhost:3333/api2/research"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "SUA_CHAVE_AQUI"
}
payload = {
    "query": "Principais casos não resolvidos da aviação comercial no século XXI."
}

res = requests.post(url, json=payload, headers=headers, timeout=300)
print(res.json()["relatorio"])
```

### Exemplo de Resposta (200 OK)
```json
{
  "sucesso": true,
  "query": "Dossiê completo sobre a evolução...",
  "relatorio": "# Relatório de Deep Research: Computação Quântica\n\n## 1. Introdução e Estado da Arte\n..."
}
```

---

## 9. Download e Streaming de Mídias

Os arquivos gerados são servidos estaticamente e podem ser consumidos diretamente via navegador, player de vídeo/áudio ou baixados no disco.

- **Método:** `GET`
- **Rota:** `/api2/media/:nomeDoArquivo` (ou `/media/:nomeDoArquivo`)
- **Autenticação:** Pública (não requer chave)
- **Tempo de Retenção:** 4 horas (limpeza automática programada)

### Baixar com cURL
```bash
curl -O "http://localhost:3333/api2/media/audio_direto_1726746800000_a1b2c3d4.mp3"
```

### Baixar com PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3333/api2/media/video_1726747000000_b3c4d5e6.mp4" -OutFile "video.mp4"
```

### Uso Direto em HTML / Frontend
```html
<!-- Player de Áudio -->
<audio controls>
  <source src="http://localhost:3333/api2/media/audio_direto_1726746800000_a1b2c3d4.mp3" type="audio/mp3">
</audio>

<!-- Player de Vídeo -->
<video controls width="640">
  <source src="http://localhost:3333/api2/media/video_1726747000000_b3c4d5e6.mp4" type="video/mp4">
</video>

<!-- Imagem -->
<img src="http://localhost:3333/api2/media/image_1726746900000_0_e5f6a7b8.png" alt="Gerada por IA" />
```

---

## 10. Configuração no n8n para Automações

Se você utiliza o **n8n** para criar vídeos ou podcasts automáticos de canais dark:

1. Adicione um nó **HTTP Request**.
2. Configure os campos principais:
   - **Method:** `POST`
   - **URL:** `http://localhost:3333/api2/generate-audio` (ou sua URL de produção)
   - **Authentication:** `Generic Credential Type` -> `Header Auth` (ou adicione direto nos Headers)
   - **Headers:**
     - `Content-Type`: `application/json`
     - `x-api-key`: `{{ $env.API_SECRET_KEY }}`
   - **Body Parameters (JSON):**
     ```json
     {
       "text": "={{ $json.roteiro }}",
       "voice": "pt-BR-AntonioNeural",
       "rate": "-2%",
       "pitch": "-3%",
       "modo": "suspense"
     }
     ```
3. O nó retornará `audioUrl`. No próximo nó do n8n, você pode baixar o áudio ou enviar para renderizadores de vídeo (como Shotstack, Creatomate ou FFmpeg).

---

## 11. Auto-Renovação de Cookies do Gemini (Puppeteer)

A API inclui um sistema de auto-renovação de cookies em segundo plano com perfil de navegador persistente (`storage/chrome-profile/`).

- **Rotina Automática em Produção:** O servidor HTTP (`server.js`) executa a cada 3 horas por padrão (configurável via `COOKIE_REFRESH_HOURS`) uma renovação silenciosa em modo headless, atualizando os cookies no `.env` e na memória sem intervenção manual.
- **Login Inicial Interativo (1ª vez):**
  ```bash
  npm run login
  ```
  Abre o Chrome com interface gráfica para autenticar a conta Google (e 2FA se aplicável). Uma vez logado, a sessão fica salva no perfil para sempre.
- **Renovação Manual Teste (Headless):**
  ```bash
  npm run refresh-cookies
  ```
  Renova os cookies imediatamente em segundo plano e valida a gravação.

---

## 🛑 Códigos de Erro Comuns

| Código HTTP | Código da API | Significado e Solução |
|:---|:---|:---|
| **401 Unauthorized** | `MISSING_API_KEY` | Nenhum cabeçalho `x-api-key` ou `Authorization` foi fornecido. |
| **401 Unauthorized** | `INVALID_API_KEY` | A chave fornecida não confere com a `API_SECRET_KEY` do `.env`. |
| **401 Unauthorized** | `GEMINI_AUTH_EXPIRED` | O cookie `__Secure-1PSID` expirou na Google. Renove no `.env`. |
| **400 Bad Request** | `INVALID_PARAM_PROMPT` | O campo `prompt` está vazio ou não foi enviado. |
| **400 Bad Request** | `INVALID_PARAM_AUDIO` | Nenhum campo `text` ou `prompt` foi informado na rota de áudio. |
| **429 Too Many Requests** | `RATE_LIMIT_EXCEEDED` | Limite de 100 req/15min por IP foi excedido. Aguarde alguns minutos. |
| **422 Unprocessable Entity**| `NO_VIDEO_GENERATED` | A conta Google não possui plano Gemini Advanced ou o modelo recusou o prompt. |
