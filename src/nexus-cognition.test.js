import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogicalStructure, analyzeNexusMessage, analyzeHypotheses, improveNexusFallback, buildAdaptiveResponse } from './nexus-cognition.js';

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


test('fluxo real chamado pelo App responde a "Oii nexus tudo bem ?" como saudação', () => {
  const reply = improveNexusFallback(
    'Oii nexus tudo bem ?',
    [{role:'user',content:'Oii nexus tudo bem ?'}],
    'Quero entender exatamente o que você quis comunicar.'
  );
  assert.match(reply, /Tudo bem por aqui/);
  assert.match(reply, /E você, como está hoje/);
  assert.doesNotMatch(reply, /base suficiente|dar um exemplo|explicar o que espera/);
});

test('fluxo principal reconhece saudação mesmo com pontuação e vocativo', () => {
  for (const message of ['Oi, Nexus!','Oiii Nexus, tudo bom?','Bom dia, Nexus','E aí Nexus!']) {
    const reply = improveNexusFallback(message,[{role:'user',content:message}],'fallback genérico');
    assert.match(reply,/Tudo bem por aqui/);
  }
});

test('fluxo principal responde pergunta social curta', () => {
  const reply = improveNexusFallback('E vc?',[{role:'user',content:'E vc?'}],'fallback genérico');
  assert.match(reply,/pronta para conversar/);
});

test('continua a conversa quando a pessoa responde que está bem também', () => {
  const history = [
    { role: 'user', content: 'Oi nexus tudo bom?' },
    { role: 'assistant', content: 'Oii! Tudo bem por aqui! E você, como está hoje?' },
    { role: 'user', content: 'Estou bem também' },
    { role: 'assistant', content: 'Como está sendo seu dia?' }
  ];
  const reply = improveNexusFallback('Estou bem também', history, 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply, /Que bom saber disso/);
  assert.match(reply, /o que você está fazendo hoje/);
  assert.doesNotMatch(reply, /base suficiente|dar um exemplo|estrutura da frase/);
});

test('acolhe uma resposta negativa sem encerrar nem banalizar a conversa', () => {
  const history = [
    { role: 'assistant', content: 'Como você está hoje?' }
  ];
  const reply = improveNexusFallback('Mais ou menos', history, 'fallback genérico');
  assert.match(reply, /sinto muito/);
  assert.match(reply, /pode me contar/);
});

test('reconhece relato positivo em primeira pessoa e desenvolve a conversa', () => {
  const reply = improveNexusFallback('Estou muito feliz', [{role:'user',content:'Estou muito feliz'}], 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply, /Que bom ler isso/);
  assert.match(reply, /Aconteceu alguma coisa especial/);
  assert.doesNotMatch(reply, /base suficiente|estrutura da frase|dar um exemplo/);
});

test('aproveita o motivo quando a pessoa explica por que está feliz', () => {
  const reply = improveNexusFallback('Estou muito feliz porque passei na prova', [{role:'user',content:'Estou muito feliz porque passei na prova'}], 'fallback genérico');
  assert.match(reply, /passou na prova/);
  assert.match(reply, /O que isso significa para você/);
});

test('prioriza continuidade contextual antes de respostas genéricas da linguagem', () => {
  const history = [
    {role:'assistant',content:'E você, como está hoje?'},
    {role:'user',content:'Estou bem também'}
  ];
  const reply = improveNexusFallback('Estou bem também',history,'fallback genérico');
  assert.match(reply,/Que bom saber disso/);
});

test('fallback conversa de forma aberta sem dizer que não tem base para entender', () => {
  const reply = improveNexusFallback('Hoje aconteceu uma coisa muito diferente comigo', [{role:'user',content:'Hoje aconteceu uma coisa muito diferente comigo'}], 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply, /Entendi o que você está compartilhando|Tô acompanhando/);
  assert.doesNotMatch(reply, /não tenho base suficiente|estrutura da frase|dar um exemplo|explicar o que espera de mim/);
});

test('fallback recebe uma pergunta inédita sem exigir reformulação imediata', () => {
  const reply = improveNexusFallback('Por que algumas decisões parecem tão difíceis?', [{role:'user',content:'Por que algumas decisões parecem tão difíceis?'}], 'Quero entender exatamente o que você quis comunicar.');
  assert.doesNotMatch(reply, /não tenho base suficiente|reformule a pergunta|dar um exemplo/);
  assert.match(reply, /Boa pergunta|vamos falar/);
});

test('entende pedido de recomendação no meio de uma conversa sobre namoro', () => {
  const history = [
    {role:'user',content:'Eu e minha namorada estamos estranhos'},
    {role:'assistant',content:'Entendi que você está falando de relacionamento. O que mudou entre vocês?'},
    {role:'user',content:'Eu quero conversar com ela, oque vc recomendaria?'}
  ];
  const reply = improveNexusFallback('Eu quero conversar com ela, oque vc recomendaria?', history, 'Estou relacionando isso ao assunto de relacionamentos que apareceu antes. Para responder sem inventar detalhes, qual parte desse assunto você está retomando?');
  assert.match(reply,/chama ela para conversar|conversar num momento tranquilo/);
  assert.match(reply,/sem começar cobrando|sem começar acusando/);
  assert.match(reply,/escuta o lado dela/);
  assert.doesNotMatch(reply,/qual parte desse assunto|não tenho base suficiente/);
});

test('reconhece pedido de recomendação mesmo com abreviação e erro informal', () => {
  const reply = improveNexusFallback('oque vc recomendaria?', [], 'fallback genérico');
  assert.match(reply,/Eu começaria de um jeito simples/);
});

test('aceita naturalmente quando a pessoa quer mudar de assunto', () => {
  const reply = improveNexusFallback('Vamos falar sobre outra coisa nexus', [], 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply,/Claro!/);
  assert.match(reply,/Mudamos de assunto/);
  assert.doesNotMatch(reply,/base suficiente|dar um exemplo|qual parte desse assunto/);
});

test('responde com naturalidade quando a pessoa diz que nada interessante aconteceu hoje', () => {
  const reply = improveNexusFallback('Aconteceu nada de interessante hoje', [], 'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply,/Tem dia que é assim mesmo/);
  assert.match(reply,/dia tranquilo|suas coisas normalmente/);
  assert.doesNotMatch(reply,/base suficiente|estrutura da frase/);
});

test('reconhece outras formas comuns de pedir mudança de assunto', () => {
  const reply = improveNexusFallback('Bora trocar de assunto', [], 'fallback genérico');
  assert.match(reply,/Claro!/);
  assert.match(reply,/Mudamos de assunto/);
});


test('entende mudança de assunto mesmo com Nexus no fim da frase', () => {
  for (const message of ['Vamos falar sobre outra coisa nexus', 'Bora trocar de assunto, Nexus', 'Vamos mudar de assunto Nexus']) {
    const reply = improveNexusFallback(message, [{role:'user',content:message}], 'Quero entender exatamente o que você quis comunicar.');
    assert.match(reply, /Vamos deixar aquele assunto de lado/);
    assert.doesNotMatch(reply, /qual parte desse assunto|base suficiente|dar um exemplo/);
  }
});

test('trata comentário cotidiano como conversa, não como pedido de solução', () => {
  for (const message of ['Aconteceu nada de interessante hoje', 'Não aconteceu nada de interessante hoje', 'Hoje não aconteceu nada interessante']) {
    const reply = improveNexusFallback(message, [{role:'user',content:message}], 'Quero entender exatamente o que você quis comunicar.');
    assert.match(reply, /dias bem comuns|nada marcante/);
    assert.match(reply, /dia mais parado|rotina de sempre/);
    assert.doesNotMatch(reply, /base suficiente|estrutura da frase|dar um exemplo/);
  }
});


test('motor composicional aproveita conteúdo novo em vez de devolver acolhimento vazio', () => {
  const reply = buildAdaptiveResponse('Hoje fiquei pensando muito no meu futuro e nas escolhas que preciso fazer.');
  assert.ok(reply);
  assert.match(reply, /futuro|escolhas/);
  assert.match(reply, /Como isso apareceu no seu dia|O que fez isso ganhar importância/);
  assert.doesNotMatch(reply, /não tenho base suficiente|explique melhor|reformule/);
});

test('motor composicional usa histórico para conectar uma nova mensagem ao assunto anterior', () => {
  const history = [
    {role:'user',content:'Eu e minha namorada estamos meio distantes ultimamente.'},
    {role:'assistant',content:'O que mudou entre vocês?'},
    {role:'user',content:'A gente quase não conversa durante o dia.'}
  ];
  const reply = buildAdaptiveResponse('Sinto falta de quando a gente conversava mais.');
  // Sem histórico não deve inventar contexto; com histórico, a continuidade é explícita.
  const contextual = buildAdaptiveResponse('Sinto falta de quando a gente conversava mais.', history);
  assert.ok(reply);
  assert.match(contextual, /se conecta ao que você já vinha contando/);
  assert.match(contextual, /O que mudou desde a última vez/);
});

test('motor composicional preserva relações entre ideias sem tratar hipótese como fato', () => {
  const reply = buildAdaptiveResponse('Quero sair com meus amigos, mas estou sem dinheiro.');
  assert.match(reply, /duas coisas que podem coexistir/);
  assert.match(reply, /Quero sair com meus amigos/);
  assert.match(reply, /estou sem dinheiro/);
});

test('motor composicional pode desenvolver conversa sem transformar tudo em conselho', () => {
  const reply = buildAdaptiveResponse('Hoje vi um cachorro muito engraçado na rua.');
  assert.match(reply, /cachorro|engraçado/);
  assert.match(reply, /Como isso apareceu no seu dia/);
  assert.doesNotMatch(reply, /você deveria|recomendo que/);
});

test('integra motor adaptativo quando o núcleo antigo devolve fallback robótico', () => {
  const message = 'Fiquei lembrando de uma conversa que tive ontem.';
  const reply = improveNexusFallback(message,[{role:'user',content:message}],'Quero entender exatamente o que você quis comunicar.');
  assert.match(reply,/lembrando|conversa/);
  assert.doesNotMatch(reply,/Quero entender exatamente/);
});
