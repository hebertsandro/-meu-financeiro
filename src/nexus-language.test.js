import test from 'node:test';
import assert from 'node:assert/strict';
import { NEXUS_LEXICON, normalizeLanguageText, analyzeLanguage, getLanguageResponse, buildConversationMemory } from './nexus-language.js';

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


test('reconhece resposta informal com prefixo e letra repetida', () => {
  const history = [{ role:'assistant', content:'Como você está hoje?' }];
  assert.match(getLanguageResponse('Estou bemm', history), /Fico feliz em saber/);
});

test('reconhece resposta curta mesmo quando o histórico usa campo text', () => {
  const history = [{ role:'assistant', text:'Como você está hoje?' }];
  assert.match(getLanguageResponse('Tô bem', history), /Fico feliz em saber/);
});

test('continua naturalmente depois de uma resposta positiva', () => {
  const history = [{ role:'assistant', content:'Como você está hoje?' }];
  assert.match(getLanguageResponse('Estou muito bem 😊', history), /Como está sendo seu dia/);
});


test('entende resposta curta à pergunta "Como você está hoje?"', () => {
  const history = [
    { role:'assistant', content:'Oii! Estou aqui para conversar. Como você está hoje?' },
    { role:'user', content:'Estou bemm' }
  ];
  assert.match(getLanguageResponse('Estou bemm', history), /Fico feliz em saber/);
});

test('expõe o fio da conversa com assunto ativo e tipo da pergunta anterior', () => {
  const history = [
    { role:'user', content:'Minha namorada anda distante' },
    { role:'assistant', content:'O que aconteceu entre vocês?' },
    { role:'user', content:'Ela quase não fala comigo' },
    { role:'assistant', content:'Como você se sente com essa distância?' }
  ];
  const result = analyzeLanguage('Estou triste', history);
  assert.equal(result.context.questionType, 'wellbeing');
  assert.equal(result.context.activeTopic, 'relacionamento');
  assert.equal(result.context.hasConversation, true);
});

test('mantém continuidade quando a pessoa responde a uma pergunta sobre o que houve', () => {
  const history = [
    { role:'user', content:'Hoje estou meio estranho' },
    { role:'assistant', content:'Quer me contar o que aconteceu?' },
    { role:'user', content:'Briguei com um amigo' },
    { role:'assistant', content:'O que aconteceu na discussão?' }
  ];
  const reply = getLanguageResponse('Nada não', history);
  assert.match(reply, /Não precisa contar mais do que quiser/);
});

test('não trata mudança explícita de assunto como continuação forçada', () => {
  const history = [
    { role:'user', content:'Estou preocupado com minha namorada' },
    { role:'assistant', content:'Quer me contar o que aconteceu?' }
  ];
  assert.equal(getLanguageResponse('Como funciona juros compostos?', history), null);
});


test('constrói memória com pessoas, acontecimentos e evidências temporais', () => {
  const history = [
    { role:'user', content:'Minha namorada está distante' },
    { role:'assistant', content:'O que mudou?' },
    { role:'user', content:'Ela quase não conversa comigo' },
    { role:'assistant', content:'Isso começou quando?' }
  ];
  const memory = buildConversationMemory(history);
  assert.ok(memory.people.includes('namorada'));
  assert.ok(memory.events.includes('distanciamento'));
  assert.ok(memory.events.includes('menos_conversa'));
  assert.equal(memory.activeTopic, 'relacionamento');
});

test('relaciona mudança de escola à ordem temporal sem afirmar causalidade', () => {
  const history = [
    { role:'user', content:'Minha namorada está distante' },
    { role:'assistant', content:'Isso começou recentemente?' }
  ];
  const reply = getLanguageResponse('Depois que ela mudou de escola', history);
  assert.match(reply, /ordem em que as coisas aconteceram/);
  assert.match(reply, /não confirma que uma coisa causou a outra/);
  assert.match(reply, /O que mudou no contato ou na rotina/);
});

test('guarda evidência causal como relato não verificado', () => {
  const memory = buildConversationMemory([
    { role:'user', content:'Minha amiga parou de falar comigo porque mudou de turma' }
  ]);
  assert.ok(memory.causalEvidence.some(item => item.status === 'relato_nao_verificado'));
});

test('não inventa pessoa nem acontecimento quando não foram mencionados', () => {
  const memory = buildConversationMemory([
    { role:'user', content:'Hoje foi um dia comum' }
  ]);
  assert.deepEqual(memory.people, []);
  assert.deepEqual(memory.events, []);
});
