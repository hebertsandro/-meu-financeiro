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

test('continua a conversa quando a pessoa responde que o dia está sendo bom', () => {
  const history = [{ role:'assistant', content:'Como está sendo seu dia?' }];
  const reply = getLanguageResponse('Está sendo bom', history);
  assert.match(reply, /O que aconteceu de bom hoje/);
});

test('continua com respostas neutras considerando a pergunta anterior', () => {
  const history = [{ role:'assistant', content:'Como está sendo seu dia?' }];
  assert.match(getLanguageResponse('Mais ou menos', history), /dias que são mais neutros/);
});

test('acolhe uma resposta negativa sem mudar de assunto', () => {
  const history = [{ role:'assistant', content:'Como está sendo seu dia?' }];
  assert.match(getLanguageResponse('Está sendo ruim', history), /Quer me contar o que aconteceu/);
});

test('entende formas informais com pontuação', () => {
  assert.equal(normalizeLanguageText('VC tá bem, hj?'), 'voce esta bem hoje');
});

test('expande o vocabulário cotidiano em várias categorias', () => {
  for (const word of ['tmj','rlx','vdd','qnd','parabens','ansied']) {
    assert.ok(NEXUS_LEXICON.some(entry => entry.variants.includes(word)), word);
  }
});

test('não deixa um cumprimento apagar uma pergunta importante', () => {
  assert.equal(getLanguageResponse('Oi, me explica fotossíntese'), null);
  assert.match(getLanguageResponse('Oi, como está?'), /Como você está hoje/);
});

test('detecta marcadores de possível sarcasmo sem afirmar intenção como certeza', () => {
  const result = analyzeLanguage('Nossa, que ótimo, deu tudo errado');
  assert.equal(result.irony.possible, true);
  assert.match(getLanguageResponse('Nossa, que ótimo, deu tudo errado'), /ironia ou sarcasmo/);
});

test('identifica possíveis indiretas sem inventar destinatário', () => {
  const result = analyzeLanguage('Tem gente que só lembra da gente quando precisa');
  assert.ok(result.indirectness.includes('indirect_criticism'));
});

test('detecta mudança de assunto e libera o motor especializado', () => {
  const history = [{role:'user',content:'Minha namorada está distante'}];
  const result = analyzeLanguage('Como funciona o cartão de crédito?', history);
  assert.equal(result.changedTopic, true);
  assert.equal(getLanguageResponse('Como funciona o cartão de crédito?', history), null);
});

test('reconhece vocabulário de relacionamento sem concluir o que a outra pessoa sente', () => {
  const result = analyzeLanguage('Meu crush visualizou e me deixou no vácuo');
  assert.equal(result.topic, 'relacionamento');
  assert.ok(result.matchedEntries.some(item => item.canonical === 'crush'));
});

test('usa o contexto da pergunta anterior para continuar uma conversa', () => {
  const history = [{role:'assistant',content:'Como está sendo seu dia?'}];
  assert.match(getLanguageResponse('Mais ou menos', history), /dia mais ou menos/);
});

test('não transforma uma pergunta inédita em resposta social genérica', () => {
  assert.equal(getLanguageResponse('Por que as folhas mudam de cor no outono?'), null);
});
