import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanTextForTTS,
  isCalmMode,
  isDarkSuspenseMode,
  isModelRefusalResponse,
  normalizePitch,
  normalizeRate,
  normalizeVolume,
  prepareSSMLText,
  resolveVoice,
  splitTextIntoSafeChunks
} from '../src/services/tts/ttsTextProcessor.js';

describe('ttsTextProcessor (funções puras de voz e texto)', () => {
  it('resolveVoice deve resolver aliases dark e vozes Azure pagas para vozes oficiais do Edge', () => {
    assert.equal(resolveVoice('dark_mystery'), 'pt-BR-AntonioNeural');
    assert.equal(resolveVoice('dark_female'), 'pt-BR-FranciscaNeural');
    assert.equal(resolveVoice('pt-BR-JulioNeural'), 'pt-BR-AntonioNeural');
    assert.equal(resolveVoice('pt-BR-VozInexistente'), 'pt-BR-AntonioNeural');
    assert.equal(resolveVoice(''), 'pt-BR-AntonioNeural');
  });

  it('normalizadores de prosódia devem limitar valores extremos e converter Hz/palavras-chave', () => {
    assert.equal(normalizePitch('-10Hz'), '-8%');
    assert.equal(normalizePitch('+80%'), '+25%');
    assert.equal(normalizePitch('invalido'), '+0%');

    assert.equal(normalizeRate('-25%'), '-25%');
    assert.equal(normalizeRate('-90%'), '-50%');
    assert.equal(normalizeRate('+150%'), '+100%');

    assert.equal(normalizeVolume('soft'), '-20%');
    assert.equal(normalizeVolume('x-soft'), '-35%');
    assert.equal(normalizeVolume('+80%'), '+50%');
  });

  it('cleanTextForTTS deve limpar Markdown e expandir moedas/unidades preservando parágrafos', () => {
    const raw = '# Título\n\nTexto em **negrito** com [link](https://example.com) custando R$ 45 e 80% a 100 km/h.\n```js\ncode();\n```';
    const cleaned = cleanTextForTTS(raw);

    assert.ok(!cleaned.includes('**'));
    assert.ok(!cleaned.includes('https://example.com'));
    assert.ok(!cleaned.includes('code()'));
    assert.ok(cleaned.includes('45 reais'));
    assert.ok(cleaned.includes('80 por cento'));
    assert.ok(cleaned.includes('100 quilômetros por hora'));
    assert.ok(cleaned.includes('\n\n'));
  });

  it('prepareSSMLText deve escapar XML e converter tags <break> sem deixar XML inválido', () => {
    const input = 'Parte 1 & introdução.<break time="1200ms"/>Parte 2 <break time="300ms"/> final.';
    const output = prepareSSMLText(input, { modo: 'sono' });

    assert.ok(output.includes('&amp;'));
    assert.ok(!output.includes('<break'));
    assert.ok(output.includes('\n\n'));
    assert.ok(output.includes('...'));
  });

  it('splitTextIntoSafeChunks deve manter texto curto unido e dividir textos longos respeitando limite', () => {
    assert.deepEqual(splitTextIntoSafeChunks('Texto curto.', 2500), ['Texto curto.']);

    const longPara1 = 'Frase um de teste. '.repeat(20).trim();
    const longPara2 = 'Frase dois de teste. '.repeat(20).trim();
    const chunks = splitTextIntoSafeChunks(`${longPara1}\n\n${longPara2}`, 450);

    assert.ok(chunks.length >= 2);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 450);
    }
  });

  it('detectores de modo e recusa devem classificar amostras corretamente', () => {
    assert.equal(isCalmMode('sono'), true);
    assert.equal(isCalmMode('', 'Meditação guiada para dormir'), true);
    assert.equal(isDarkSuspenseMode('suspense'), true);
    assert.equal(isModelRefusalResponse('Desculpe, como um modelo de linguagem não posso ajudar.'), true);
    assert.equal(isModelRefusalResponse('A história da aviação começou no século XIX com diversos experimentos documentados.'), false);
  });
});
