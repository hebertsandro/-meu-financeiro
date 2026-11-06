import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogicalStructure, analyzeNexusMessage, analyzeHypotheses, improveNexusFallback } from './nexus-cognition.js';

test('identifica causa e separa as duas proposições', () => {
  const result = parseLogicalStructure('Fui mal na prova porque não consegui estudar.');
  assert.equal(result.relations[0]?.type, 'cause');
  assert.equal(result.clauses.length, 2);
  assert.match(result.clauses[1].text, /nao consegui estudar/);
  assert.equal(result.clauses[1].negated, true);
});

test('identifica contraste sem apagar nenhum dos lados', () => {
  const result = parseLogicalStructure('Eu gosto dela, mas estou magoado.');
  assert.equal(result.relations[0]?.type, 'contrast');
  assert.equal(result.clauses.length, 2);
  assert.match(result.clauses[0].text, /gosto dela/);
  assert.match(result.clauses[1].text, /estou magoado/);
});

test('identifica condição e consequência condicional', () => {
  const result = parseLogicalStructure('Se eu conseguir um emprego, vou guardar dinheiro.');
  assert.equal(result.relations[0]?.type, 'condition');
  assert.equal(result.clauses.length, 2);
});

test('não inventa relação lógica quando há apenas uma proposição', () => {
  const result = parseLogicalStructure('Hoje estou cansado.');
  assert.equal(result.hasMultiplePropositions, false);
  assert.equal(result.relations.length, 0);
});

test('a análise pública inclui a estrutura composicional', () => {
  const result = analyzeNexusMessage('Eu queria estudar, mas fiquei muito ansioso.');
  assert.equal(result.logicalStructure.relations[0]?.type, 'contrast');
  assert.equal(result.logicalStructure.clauses.length, 2);
});

test('a condição inicial preserva condição e resultado em partes distintas', () => {
  const result = parseLogicalStructure('Se eu conseguir um emprego, vou guardar dinheiro.');
  assert.equal(result.relations[0]?.type, 'condition');
  assert.equal(result.clauses.length, 2);
  assert.match(result.clauses[0].text, /^se eu conseguir um emprego$/);
  assert.match(result.clauses[1].text, /vou guardar dinheiro/);
});

test('a resposta genérica passa a considerar o contraste da mensagem', () => {
  const reply = improveNexusFallback(
    'Eu gosto dela, mas estou magoado.',
    [{ role: 'user', content: 'Eu gosto dela, mas estou magoado.' }],
    'Pode falar do seu jeito.'
  );
  assert.match(reply, /duas ideias em contraste/);
});

test('reconstrói várias relações causais numa mensagem com várias frases', () => {
  const message = 'Minha mãe ficou brava porque tirei uma nota baixa. Eu tirei essa nota porque não consegui estudar. Não consegui estudar porque estava trabalhando.';
  const result = parseLogicalStructure(message);
  assert.equal(result.causalChains.length, 3);
  assert.equal(result.clauses.length, 5);
  assert.ok(result.causalChains.every(edge => edge.causeClause !== edge.effectClause));
  assert.equal(result.clauses[2].referenceTo, 1);
  assert.ok(result.causalChains.some(edge => edge.causeClause === 3 && edge.effectClause === 1));
  assert.ok(result.causalChains.some(edge => edge.causeClause === 4 && edge.effectClause === 3));
});

test('a resposta apresenta uma cadeia causal como hipóteses não comprovadas', () => {
  const message = 'Fui mal porque não estudei. Não estudei porque trabalhei.';
  const reply = improveNexusFallback(
    message,
    [{ role: 'user', content: message }],
    'Quero entender exatamente o que você quis dizer.'
  );
  assert.match(reply, /hipóteses, não conclusões comprovadas/);
  assert.match(reply, /trabalhei/);
});

test('responde naturalmente a “estou bem, e vc?” após um cumprimento', () => {
  const history = [
    { role: 'user', content: 'Oi, como está?' },
    { role: 'assistant', content: 'Oii! Como você está hoje?' },
    { role: 'user', content: 'Estou bem, e vc?' }
  ];
  const reply = improveNexusFallback('Estou bem, e vc?', history, 'Entendi que sua mensagem envolve sentimentos.');
  assert.match(reply, /Que bom saber que você está bem/);
  assert.match(reply, /não tenho sentimentos como uma pessoa/);
});

test('responde a uma pergunta social curta sem depender de tópico', () => {
  const reply = improveNexusFallback('E vc?', [], 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply, /pronta para conversar/);
});

test('transforma uma relação causal relatada em hipótese não comprovada', () => {
  const result = analyzeHypotheses('Fui mal na prova porque não consegui estudar.');
  assert.equal(result.hypotheses.length, 1);
  assert.equal(result.hypotheses[0].certainty, 'unconfirmed');
  assert.match(result.missingInformation, /falta verificar/);
});

test('identifica afirmações opostas e pede esclarecimento', () => {
  const result = analyzeHypotheses('Eu gosto dela. Eu não gosto dela.');
  assert.equal(result.contradictions.length, 1);
  assert.equal(result.requiresClarification, true);
});


test('integra a saudação informal no fluxo completo usado pelo aplicativo', () => {
  const reply = improveNexusFallback(
    'Oii nexus tudo bem ?',
    [{role:'user',content:'Oii nexus tudo bem ?'}],
    'Quero entender exatamente o que você quis comunicar.'
  );
  assert.match(reply, /Tudo bem por aqui/);
  assert.match(reply, /E você, como está hoje/);
  assert.doesNotMatch(reply, /base suficiente|dar um exemplo/);
});
