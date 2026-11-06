import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogicalStructure, analyzeNexusMessage } from './nexus-cognition.js';

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
