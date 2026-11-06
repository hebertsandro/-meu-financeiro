import test from 'node:test';
import assert from 'node:assert/strict';
import { NEXUS_LEXICON, normalizeLanguageText, analyzeLanguage, getLanguageResponse } from './nexus-language.js';

test('normaliza abreviações comuns sem alterar a mensagem original', () => {
  assert.equal(normalizeLanguageText('vc tá bem hj?'), 'voce esta bem hoje');
});

test('mantém um vocabulário estruturado com significado, tom e ambiguidade', () => {
  const entry = NEXUS_LEXICON.find(item => item.canonical === 'beleza');
  assert.ok(entry);
  assert.ok(entry.meanings.length > 0);
  assert.equal(entry.ambiguity, 'high');
});

test('identifica uma pergunta recíproca informal', () => {
  const result = analyzeLanguage('E vc?');
  assert.ok(result.possibleActs.includes('reciprocal_question'));
  assert.match(getLanguageResponse('E vc?'), /pronta para conversar/);
});

test('identifica agradecimento e pedido de desculpas', () => {
  assert.ok(analyzeLanguage('vlw demais').possibleActs.includes('gratitude'));
  assert.ok(analyzeLanguage('foi mal').possibleActs.includes('apology'));
});

test('reconhece risada sem concluir que a pessoa está feliz', () => {
  const result = analyzeLanguage('KAKAKAK');
  assert.equal(result.laughter, true);
  assert.equal(result.emotions.length, 0);
});

test('marca expressões ambíguas para pedir contexto', () => {
  const result = analyzeLanguage('Faz o que quiser');
  assert.equal(result.ambiguousPhrases[0]?.needsContext, true);
  assert.ok(result.confidence < 0.5);
});

test('não presume emoção a partir de uma expressão ambígua', () => {
  const result = analyzeLanguage('tanto faz');
  assert.equal(result.emotions.length, 0);
  assert.equal(result.ambiguousPhrases.length, 1);
});

test('preserva palavras ainda não cadastradas para análise posterior', () => {
  const result = analyzeLanguage('Hoje descobri uma palavra inventada');
  assert.ok(result.unknownTokens.includes('inventada'));
});

test('não intercepta pedidos que precisam de resposta especializada', () => {
  assert.equal(getLanguageResponse('Me explica fotossíntese'), null);
});

test('reconhece limites pessoais sem tratar o limite como hostilidade', () => {
  const result = analyzeLanguage('Não quero conversar sobre isso');
  assert.ok(result.possibleActs.includes('boundary'));
});
