import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogicalStructure, analyzeNexusMessage, analyzeHypotheses, improveNexusFallback, buildAdaptiveResponse, buildReasoningPlan } from './nexus-cognition.js';
import { buildConversationState, buildConversationMemory } from './nexus-language.js';

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
  assert.match(reply,/tem dia que é assim mesmo/i);
  assert.match(reply,/dia tranquilo|suas coisas normalmente|dia mais parado|rotina foi normal/i);
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
    assert.match(reply, /dias bem comuns|nada marcante|parece que o dia passa/i);
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
  assert.match(reply, /quero sair com meus amigos/i);
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


test('associa expressões diferentes ao mesmo conceito sem exigir palavra idêntica', () => {
  const plan = buildReasoningPlan('Ela anda fria e quase não puxa papo comigo.', [
    {role:'user',content:'Minha namorada está distante ultimamente.'},
    {role:'assistant',content:'O que mudou entre vocês?'}
  ]);
  assert.ok(plan.semanticConcepts.includes('distante'));
  assert.ok(plan.semanticConcepts.includes('comunicacao'));
  assert.equal(plan.sameTopic, true);
});

test('memória de diálogo recupera acontecimentos relatados sem tratá-los como certeza', () => {
  const history = [
    {role:'user',content:'Minha namorada mudou de escola.'},
    {role:'assistant',content:'Isso mudou a rotina de vocês?'},
    {role:'user',content:'Depois disso ela quase não conversa comigo.'}
  ];
  const plan = buildReasoningPlan('Por que ela ficou assim?', history);
  assert.ok(plan.memory.people.includes('namorada'));
  assert.ok(plan.memory.events.includes('menos_conversa'));
  assert.ok(plan.evidence.every(item => item.certainty === 'user_reported'));
  assert.equal(plan.reasoning.avoidCertainty, true);
});

test('o plano distingue intenção atual de assunto antigo', () => {
  const history = [
    {role:'user',content:'Estou preocupado com minha namorada.'},
    {role:'assistant',content:'Quer me contar o que aconteceu?'}
  ];
  const plan = buildReasoningPlan('Como funciona juros compostos?', history);
  assert.equal(plan.currentTopic, 'financas');
  assert.equal(plan.sameTopic, false);
});

test('o plano registra contradições para conferir antes de concluir', () => {
  const history = [
    {role:'user',content:'Eu gosto de conversar com ela.'},
    {role:'assistant',content:'Entendi.'},
    {role:'user',content:'Eu não gosto de conversar com ela.'}
  ];
  const plan = buildReasoningPlan('Eu não gosto de conversar com ela.', history);
  assert.ok(Array.isArray(plan.contradictions));
  assert.equal(plan.contradictions.length, 1);
});


test('resolve referência indireta usando semântica e memória do diálogo', () => {
  const plan = buildReasoningPlan('Ela está menos presente e quase não responde.', [
    {role:'user',content:'Minha namorada anda distante.'},
    {role:'assistant',content:'O que você percebeu?'}
  ]);
  assert.equal(plan.sameTopic, true);
  assert.ok(plan.semanticConcepts.includes('distante'));
  assert.ok(plan.semanticConcepts.includes('comunicacao'));
});


test('trata ida à escola como relato cotidiano, não como pedido de ajuda acadêmica', () => {
  const reply = improveNexusFallback('Eu fui pra escola', [], 'Entendi: o assunto são seus estudos. Vamos localizar exatamente o que você precisa.');
  assert.match(reply, /foi pra escola hoje/i);
  assert.match(reply, /Como foi por lá/);
  assert.doesNotMatch(reply, /matéria|prova|exercício|organização do tempo/i);
});

test('reconhece variação informal de relato sobre aula', () => {
  const reply = improveNexusFallback('Hoje tive aula', [], 'fallback genérico');
  assert.match(reply, /Como foi por lá/);
  assert.doesNotMatch(reply, /qual matéria|qual exercício/i);
});

test('entende comentário cotidiano com marcador informal como "pior q"', () => {
  const reply = improveNexusFallback(
    'Pior q não aconteceu nada de interessante hoje',
    [],
    'Quero responder ao que você realmente quis dizer. O que é mais importante nessa mensagem?'
  );
  assert.match(reply, /tem dia que é assim mesmo/i);
  assert.match(reply, /KKKK/);
  assert.doesNotMatch(reply, /resolver uma situação|tomar uma decisão|ser ouvido/);
  assert.doesNotMatch(reply, /Você mencionou|como isso apareceu no seu dia/);
});

test('entende a mesma fala sem exigir escrita formal ou abreviação específica', () => {
  const reply = improveNexusFallback('Pior que não aconteceu nada de interessante hoje', [], 'fallback genérico');
  assert.match(reply, /tem dia que é assim mesmo/i);
  assert.doesNotMatch(reply, /questionário|o que é mais importante/i);
});

test('reconhece resposta positiva informal depois de perguntar como a pessoa está', () => {
  const history = [
    {role:'assistant',content:'Oii! 😊 Tudo bem por aqui! E você, como está hoje?'}
  ];
  const reply = improveNexusFallback('Estou bem simm', history, 'fallback genérico');
  assert.match(reply, /Que bom saber disso/);
  assert.doesNotMatch(reply, /Você mencionou|ideia que ficou na sua cabeça/);
});

test('entende correção explícita sem transformar a correção em outro assunto', () => {
  const history = [
    {role:'assistant',content:'Oii! 😊 Tudo bem por aqui! E você, como está hoje?'},
    {role:'user',content:'Estou bem simm'},
    {role:'assistant',content:'Entendi o que você está compartilhando: Você mencionou simm.'}
  ];
  const reply = improveNexusFallback('Eu disse q estou bem', history, 'fallback genérico');
  assert.match(reply, /Você tem razão/);
  assert.match(reply, /você respondeu que está bem/);
  assert.doesNotMatch(reply, /Você mencionou|ideia que ficou na sua cabeça/);
});


test('prioriza intenção de compartilhar em relatos inéditos sobre qualquer tema', () => {
  const cases = [
    ['Hoje peguei um ônibus lotado e cheguei atrasado.', /ônibus|atrasado/i],
    ['Meu irmão apareceu aqui do nada ontem.', /irmão|apareceu/i],
    ['Passei a tarde ouvindo música e pensando na vida.', /música|pensando/i],
    ['Comprei um lanche diferente na saída.', /lanche|diferente/i]
  ];
  for (const [message, expected] of cases) {
    const reply = improveNexusFallback(message, [], 'Entendi que o assunto são seus estudos. Como posso ajudar?');
    assert.match(reply, expected);
    assert.doesNotMatch(reply, /qual matéria|como posso ajudar|o que você precisa resolver/i);
  }
});

test('não transforma relato cotidiano em pedido de conselho só por citar namoro', () => {
  const reply = improveNexusFallback(
    'Ontem eu e minha namorada fomos dar uma volta no shopping.',
    [],
    'Vou dar algumas dicas para melhorar seu relacionamento.'
  );
  assert.match(reply, /namorada|shopping|volta/i);
  assert.doesNotMatch(reply, /você deveria|recomendo|conselho/i);
});

test('mantém ajuda explícita quando a pessoa realmente pede', () => {
  const reply = improveNexusFallback(
    'Me ajuda a estudar matemática para a prova de amanhã?',
    [],
    'fallback genérico'
  );
  assert.match(reply, /etapas|estudar|explicar/i);
});

test('muda de assunto sem carregar o tema anterior para a resposta', () => {
  const history = [
    {role:'user',content:'Estou preocupado com minha namorada.'},
    {role:'assistant',content:'Quer me contar o que aconteceu?'}
  ];
  const reply = improveNexusFallback('Agora quero falar de música.', history, 'fallback genérico');
  assert.doesNotMatch(reply, /namorada|relacionamento/i);
});

test('responde a uma continuação curta usando a pergunta imediatamente anterior', () => {
  const history = [
    {role:'assistant',content:'Como foi seu dia na escola?'}
  ];
  const reply = improveNexusFallback('Foi cansativo, tive duas provas.', history, 'fallback genérico');
  assert.match(reply, /provas|cansativo/i);
  assert.doesNotMatch(reply, /qual matéria você precisa de ajuda/i);
});


// Conversas longas: a memória precisa sobreviver a 10, 20 e 30 mensagens do usuário.
test('mantém fatos do começo de uma conversa de 30 mensagens', () => {
  const history = [];
  for (let i = 1; i <= 30; i++) {
    history.push({ role: 'user', content: i === 1
      ? 'Minha irmã começou um curso de fotografia em janeiro.'
      : 'Mensagem cotidiana número ' + i + ' sobre minha rotina.' });
    history.push({ role: 'assistant', content: 'Entendi. E o que aconteceu depois?' });
  }
  const plan = buildReasoningPlan('Você lembra do curso que minha irmã começou?', history);
  assert.ok(plan.memory.people.includes('irmã'));
  assert.ok(plan.memory.facts.some(fact => /curso de fotografia/.test(fact.text)));
  assert.equal(plan.memory.turnCount, 31);
});

test('mantém a referência à pergunta anterior mesmo após 20 mensagens', () => {
  const history = [];
  for (let i = 1; i <= 20; i++) {
    history.push({ role: 'user', content: i === 1 ? 'Estou preocupado com minha namorada.' : 'Outra mensagem ' + i });
    history.push({ role: 'assistant', content: i === 20 ? 'O que aconteceu entre vocês?' : 'Estou acompanhando.' });
  }
  const reply = buildAdaptiveResponse('Ela ficou distante de novo.', history);
  assert.match(reply, /distância|conversa|vocês|namorada/i);
});


test('estado conversacional identifica assunto ativo e trilha de tópicos', () => {
  const state = buildConversationState([
    {role:'user',content:'Minha namorada anda distante.'},
    {role:'assistant',content:'O que mudou entre vocês?'},
    {role:'user',content:'Ela responde bem menos.'}
  ]);
  assert.equal(state.activeTopic,'relacionamento');
  assert.equal(state.status,'active');
  assert.equal(state.references.present,true);
  assert.equal(state.lastAssistantQuestion.status,'user_has_replied');
});

test('mudança explícita de assunto desativa o tópico anterior sem apagar a trilha', () => {
  const state = buildConversationState([
    {role:'user',content:'Estou preocupado com minha namorada.'},
    {role:'assistant',content:'Quer me contar o que aconteceu?'},
    {role:'user',content:'Vamos falar sobre música agora.'}
  ]);
  assert.equal(state.activeTopic,'lazer');
  assert.equal(state.topicChanged,false);
  const changed = buildConversationState([
    {role:'user',content:'Estou preocupado com minha namorada.'},
    {role:'assistant',content:'Quer me contar o que aconteceu?'},
    {role:'user',content:'Vamos falar sobre outra coisa.'}
  ]);
  assert.equal(changed.activeTopic,null);
  assert.equal(changed.topicChanged,true);
  assert.ok(changed.topicTrail.some(item=>item.topic==='relacionamento'));
});

test('estado conversacional registra correção recente e não confunde pausa com encerramento', () => {
  const state = buildConversationState([
    {role:'user',content:'Minha irmã vai mudar de escola.'},
    {role:'assistant',content:'Quando isso acontece?'},
    {role:'user',content:'Na verdade, é meu irmão.'}
  ]);
  assert.equal(state.latestCorrection.status,'latest_user_correction');
  assert.equal(state.conversationEnded,false);
  assert.equal(state.status,'active');
});

test('estado conversacional reconhece despedida explícita', () => {
  const state = buildConversationState([
    {role:'user',content:'Gostei de conversar.'},
    {role:'assistant',content:'Também gostei!'},
    {role:'user',content:'Falou, até mais.'}
  ]);
  assert.equal(state.status,'ended');
  assert.equal(state.conversationEnded,true);
  assert.equal(state.endingEvidence,'user_farewell');
});

test('pergunta do assistente fica pendente somente quando a última fala é dele', () => {
  const waiting = buildConversationState([
    {role:'user',content:'Meu dia foi estranho.'},
    {role:'assistant',content:'O que aconteceu?'}
  ]);
  assert.equal(waiting.pendingQuestion.status,'awaiting_user_response');
  const replied = buildConversationState([
    {role:'user',content:'Meu dia foi estranho.'},
    {role:'assistant',content:'O que aconteceu?'},
    {role:'user',content:'Briguei com um amigo.'}
  ]);
  assert.equal(replied.pendingQuestion,null);
});


test('estado cronológico troca o assunto ativo sem deixar a frequência antiga dominar', () => {
  const history = [
    {role:'user',content:'Minha namorada está distante.'},
    {role:'assistant',content:'O que aconteceu?'},
    {role:'user',content:'Ela quase não conversa comigo.'},
    {role:'assistant',content:'Isso deve estar sendo difícil.'},
    {role:'user',content:'A gente já conversou sobre isso várias vezes.'},
    {role:'assistant',content:'Entendi.'},
    {role:'user',content:'Agora quero falar de música.'},
    {role:'assistant',content:'Qual música você está ouvindo?'},
    {role:'user',content:'Essa música é muito boa.'}
  ];
  assert.equal(buildConversationState(history).activeTopic,'lazer');
  assert.equal(buildReasoningPlan('Essa música é muito boa.',history).activeTopic,'lazer');
});

test('despedida do assistente não encerra a conversa por conta própria', () => {
  const state = buildConversationState([
    {role:'user',content:'Obrigado pela conversa.'},
    {role:'assistant',content:'Por nada! Quando quiser continuar, estarei por aqui.'}
  ]);
  assert.equal(state.conversationEnded,false);
  assert.equal(state.status,'active');
});

test('correção de parentesco substitui a entidade anterior na memória', () => {
  const memory = buildConversationMemory([
    {role:'user',content:'Minha irmã vai mudar de escola.'},
    {role:'assistant',content:'Entendi.'},
    {role:'user',content:'Na verdade, é meu irmão.'}
  ]);
  assert.ok(memory.people.includes('irmão'));
  assert.ok(!memory.people.includes('irmã'));
});

test('pedido explícito com interrogação continua sendo pedido', () => {
  const reply = improveNexusFallback(
    'Me ajuda a estudar matemática para a prova de amanhã?',
    [],
    'fallback genérico'
  );
  assert.match(reply,/vamos estudar|revisar a matéria|questões/i);
});

test('resposta cotidiana não enumera palavras soltas da mensagem', () => {
  const reply = buildAdaptiveResponse('Hoje peguei um ônibus lotado e cheguei atrasado.');
  assert.doesNotMatch(reply,/Você trouxe peguei|Você trouxe hoje|onibus, lotado, cheguei/i);
  assert.match(reply,/Hoje peguei um ônibus lotado e cheguei atrasado|ônibus lotado/i);
});

test('relato simples sobre escola aceita a forma normalizada para escola', () => {
  const reply = improveNexusFallback('Eu fui pra escola', [], 'Entendi: o assunto são seus estudos. Vamos localizar exatamente o que você precisa.');
  assert.match(reply,/Como foi por lá/);
});


test('roteador prefere compreensão contextual a fallback antigo aparentemente específico', () => {
  const reply = improveNexusFallback(
    'Hoje fui ao mercado e encontrei um amigo antigo.',
    [],
    'Entendi: o assunto são suas compras. Vamos localizar exatamente o que você precisa.'
  );
  assert.match(reply,/Hoje fui ao mercado|encontrei um amigo antigo/i);
  assert.doesNotMatch(reply,/vamos localizar exatamente/i);
});

test('resposta curta responde à pergunta imediatamente anterior', () => {
  const history = [
    {role:'assistant',content:'Como você está hoje?'},
    {role:'user',content:'Bem'}
  ];
  const reply = buildAdaptiveResponse('Bem',history);
  assert.match(reply,/Que bom|bom saber/i);
  assert.doesNotMatch(reply,/Como isso apareceu no seu dia/);
});

test('mensagem atual não é usada como antecedente da própria referência', () => {
  const analysis = analyzeNexusMessage('Ela mudou mesmo?',[
    {role:'user',content:'Minha namorada mudou de escola.'},
    {role:'assistant',content:'Como foi essa mudança?'},
    {role:'user',content:'Ela mudou mesmo?'}
  ]);
  assert.equal(analysis.references?.previousUserMessage,'minha namorada mudou de escola');
});

test('assunto ativo segue a mudança recente mesmo após muitas mensagens de outro tema', () => {
  const history = [
    {role:'user',content:'Minha namorada está distante.'},
    {role:'assistant',content:'O que aconteceu?'},
    ...Array.from({length:10},(_,i)=>[
      {role:'user',content:'Ela quase não conversa comigo.'},
      {role:'assistant',content:'Entendi.'}
    ]).flat(),
    {role:'user',content:'Quero falar de música agora.'},
    {role:'assistant',content:'Qual estilo você gosta?'},
    {role:'user',content:'Gosto de rock.'}
  ];
  assert.equal(buildReasoningPlan('Gosto de rock.',history).activeTopic,'lazer');
});


test('pedido genérico de conselho não recebe conselho romântico fora de contexto', () => {
  const reply = improveNexusFallback(
    'O que eu devo fazer agora?',
    [],
    'fallback genérico'
  );
  assert.match(reply,/qual decisão|o que aconteceu|limites da situação/i);
  assert.doesNotMatch(reply,/chama ela|relacionamento|vocês/i);
});

test('mudança explícita de assunto limpa o tema ativo anterior', () => {
  const state = buildConversationState([
    {role:'user',content:'Minha namorada está distante.'},
    {role:'assistant',content:'O que aconteceu?'},
    {role:'user',content:'Vamos falar de outra coisa.'}
  ]);
  assert.equal(state.activeTopic,null);
  assert.equal(state.topicChanged,true);
});
