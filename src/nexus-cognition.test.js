import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogicalStructure, analyzeNexusMessage, improveNexusFallback } from './nexus-cognition.js';

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
  assert.equal(result.clauses.length, 6);
  assert.ok(result.causalChains.every(edge => edge.causeClause !== edge.effectClause));
});

test('a resposta reconhece uma cadeia sem afirmar que a causa está comprovada', () => {
  const message = 'Fui mal porque não estudei. Não estudei porque trabalhei.';
  const reply = improveNexusFallback(
    message,
    [{ role: 'user', content: message }],
    'Quero entender exatamente o que você quis dizer.'
  );
  assert.match(reply, /cadeia com várias relações/);
  assert.match(reply, /sem assumir que todas as ligações já estão comprovadas/);
});
