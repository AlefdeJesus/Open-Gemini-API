export const DEFAULT_VOICE = 'pt-BR-AntonioNeural';
export const SLEEP_CALM_DEFAULT_VOICE = 'pt-BR-FranciscaNeural';

// Vozes exclusivas do Azure Cognitive Speech pago (ex: pt-BR-JulioNeural) não existem no
// Microsoft Edge Read Aloud gratuito e fecham o WebSocket imediatamente se enviadas sem mapeamento.
export const EDGE_VOICE_ALIASES = Object.freeze({
  dark_mystery: 'pt-BR-AntonioNeural',
  dark_cinema: 'pt-BR-AntonioNeural',
  dark_ancient: 'pt-PT-DuarteNeural',
  dark_female: 'pt-BR-FranciscaNeural',
  dark_hollywood: 'en-US-AndrewMultilingualNeural',

  'pt-BR-JulioNeural': 'pt-BR-AntonioNeural',
  'pt-BR-FabioNeural': 'pt-BR-AntonioNeural',
  'pt-BR-NicolauNeural': 'pt-BR-AntonioNeural',
  'pt-BR-ValerioNeural': 'pt-BR-AntonioNeural',
  'pt-BR-BrendaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-ElzaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-GiovannaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-LeilaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-ManuelaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-YaraNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-ThalitaNeural': 'pt-BR-ThalitaMultilingualNeural'
});

export const EDGE_OFFICIAL_VOICES = new Set([
  'pt-BR-AntonioNeural',
  'pt-BR-FranciscaNeural',
  'pt-BR-ThalitaMultilingualNeural',
  'pt-PT-DuarteNeural',
  'pt-PT-RaquelNeural',
  'en-US-AndrewMultilingualNeural',
  'en-US-BrianMultilingualNeural',
  'en-US-AvaMultilingualNeural',
  'en-US-ChristopherNeural',
  'en-US-GuyNeural'
]);

export const VOICES_CATALOG_PAYLOAD = Object.freeze({
  sucesso: true,
  padrao: DEFAULT_VOICE,
  vozesRecomendadasDark: [
    {
      voice: 'pt-BR-AntonioNeural',
      alias: 'dark_mystery',
      genero: 'Masculino',
      idioma: 'pt-BR',
      estilo: 'Suspense & Mistério Nacional',
      destaque: 'Narrador clássico de canais dark brasileiros. Voz encorpada, solene e cinematográfica.'
    },
    {
      voice: 'pt-PT-DuarteNeural',
      alias: 'dark_ancient',
      genero: 'Masculino',
      idioma: 'pt-PT',
      estilo: 'Sobrenatural Antigo & Gótico',
      destaque: 'Sotaque português antigo e aristocrático. Muito usado para lendas do mar, maldições, arquivos históricos e terror.'
    },
    {
      voice: 'en-US-AndrewMultilingualNeural',
      alias: 'dark_hollywood',
      genero: 'Masculino',
      idioma: 'Multilíngue (Lê pt-BR)',
      estilo: 'Trailer de Cinema / Barítono Profundo',
      destaque: 'Voz ultra-grave e imersiva de trailer de cinema, com dicção perfeita lendo em português.'
    },
    {
      voice: 'pt-BR-FranciscaNeural',
      alias: 'dark_female',
      genero: 'Feminino',
      idioma: 'pt-BR',
      estilo: 'True Crime & Arquivo Oculto',
      destaque: 'Locução fria, séria e distante, estilo documentários investigativos e casos não solucionados da Netflix.'
    }
  ],
  outrasVozes: [
    {
      voice: 'en-US-BrianMultilingualNeural',
      genero: 'Masculino',
      idioma: 'Multilíngue',
      destaque: 'Locução narrativa e intimista para teorias da conspiração'
    },
    {
      voice: 'pt-BR-ThalitaMultilingualNeural',
      genero: 'Feminino',
      idioma: 'pt-BR',
      destaque: 'Voz moderna e expressiva'
    },
    {
      voice: 'pt-PT-RaquelNeural',
      genero: 'Feminino',
      idioma: 'pt-PT',
      destaque: 'Locução em Português de Portugal (feminina)'
    }
  ],
  dicaCalibracaoDark: {
    rateRecomendado: '-3% a -2%',
    pitchRecomendado: '-3% a -4%',
    pausasRecomendadas: {
      paragrafos: '1200ms a 1400ms',
      pontos: '800ms a 900ms',
      virgulas: '300ms a 350ms',
      reticencias: '900ms a 1000ms'
    },
    observacao: "A API injeta automaticamente pausas SSML humanizadas (<break time='...'>) nos pontos e parágrafos para simular respiração real. Você pode personalizar esses tempos via 'pausePonto', 'pauseParagrafo', 'pauseVirgula' ou pelo parâmetro 'modo': 'suspense' / 'dinamico'."
  }
});
