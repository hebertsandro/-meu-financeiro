import { getLanguageResponse } from './nexus-language.js';
// NEXUS COGNITION — interpretador local composicional.
// Este módulo não é um modelo de linguagem: usa análise linguística, contexto e estratégias
// determinísticas para generalizar melhor sem enviar mensagens para serviços externos.

const fold = (value = '') => String(value)
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/([!?.,])\1+/g, '$1')
  .replace(/[^\p{L}\p{N}\s!?.,:;'"()%-]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

const INFORMAL = {
  vc: 'voce', vcs: 'voces', cê: 'voce', ce: 'voce', pq: 'porque', pk: 'porque',
  q: 'que', oq: 'o que', qq: 'que que', tb: 'tambem', tbm: 'tambem', tmb: 'tambem',
  nn: 'nao', naum: 'nao', hj: 'hoje', dps: 'depois', dp: 'depois', agr: 'agora',
  cmg: 'comigo', ctg: 'contigo', qnd: 'quando', qdo: 'quando', qto: 'quanto',
  msm: 'mesmo', mt: 'muito', mto: 'muito', mta: 'muita', td: 'tudo',
  tds: 'todos', ngm: 'ninguem', ninguem: 'ninguem', obg: 'obrigado',
  vlw: 'valeu', blz: 'beleza', pfv: 'por favor', pf: 'por favor',
  qria: 'queria', queria: 'queria', to: 'estou', ta: 'esta', tava: 'estava',
  vcs: 'voces', ctz: 'certeza', pq: 'porque', pprt: 'papo reto', nd: 'nada',
  cm: 'com', tb: 'tambem', dms: 'demais', tipo: 'tipo', vdd: 'verdade',
  sdds: 'saudades', mds: 'meu deus', msg: 'mensagem', fds: 'fim de semana',
  ta: 'esta', to: 'estou', tou: 'estou'
};

export function normalizeNexusText(value = '') {
  return fold(value).split(' ').map((word, index) => {
    if (word === 'pra') return 'para';
    if (word === 'pro') return 'para o';
    return INFORMAL[word] || word;
  }).join(' ').replace(/\s+/g, ' ').trim();
}

const TOPICS = [
  ['estudos', ['escola','prova','estudar','materia','matematica','enem','professor','faculdade','aula','nota']],
  ['relacionamentos', ['namoro','namorada','namorado','relacionamento','ficante','crush','terminar','ciume','confianca','briga']],
  ['familia', ['familia','mae','pai','irmao','irma','responsavel','pais']],
  ['amizades', ['amigo','amiga','amizade','grupo','fofoca','bullying','excluido']],
  ['trabalho e carreira', ['emprego','trabalho','chefe','entrevista','curriculo','salario','carreira','profissao']],
  ['financas', ['dinheiro','gasto','despesa','divida','cartao','fatura','juros','economizar','poupar','orcamento']],
  ['tecnologia', ['celular','computador','internet','aplicativo','site','codigo','programar','javascript','ia']],
  ['saude e bem-estar', ['saude','dor','sintoma','sono','ansiedade','ansioso','medico','remedio','cansaco']],
  ['sentimentos', ['triste','medo','preocupado','preocupada','sozinho','sozinha','confuso','confusa','desanimado','inseguro']],
  ['ciencias', ['ciencia','fisica','quimica','biologia','gravidade','atomo','celula','energia','planeta']],
  ['sociedade', ['historia','geografia','politica','democracia','globalizacao','guerra','sociedade','direitos']],
  ['criatividade e cultura', ['musica','filme','serie','anime','livro','jogo','desenho','arte','historia ficticia']]
];

const INTENTS = [
  ['greeting', /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|tudo bom)\b/],
  ['definition', /^(o que e|oq e|o que significa|que significa|o que quer dizer|define|defina)\b/],
  ['explanation', /^(por que|porque|como funciona|como acontece|me explica|explique|explica|qual a causa|qual o motivo)\b/],
  ['procedure', /^(como faco|como fazer|como posso|qual o passo|passo a passo|me ensina|ensina)\b/],
  ['comparison', /\b(qual e melhor|qual compensa|vale mais a pena|compare|comparar|diferenca entre)\b/],
  ['summary', /\b(resuma|resumir|faz um resumo|me resume|sintetiza)\b/],
  ['writing', /\b(escreva|escreve|redija|monta uma mensagem|me ajuda a responder|como responder|o que eu falo)\b/],
  ['advice', /\b(o que eu faco|o que devo fazer|me aconselha|preciso de conselho|como lidar|como devo agir)\b/],
  ['ideas', /\b(me de ideias|me da ideias|sugestoes|ideias para|brainstorm)\b/],
  ['planning', /\b(monta um plano|me ajuda a planejar|organiza para mim|cria um cronograma|quero um plano)\b/],
  ['calculation', /\b(quanto e|calcule|calcula|qual o resultado|quanto sobra|quanto falta)\b/],
  ['translation', /\b(traduza|traduz|como se diz|em ingles|em portugues)\b/],
  ['opinion', /\b(o que voce acha|qual sua opiniao|na sua opiniao|faz sentido)\b/]
];

const tokenize = text => text.match(/[\p{L}\p{N}]+/gu) || [];
const hasTerm = (text, term) => {
  const padded = ' ' + text + ' ';
  return padded.includes(' ' + term + ' ');
};
const countHits = (text, terms) => terms.reduce((n, term) => n + (hasTerm(text, term) ? 1 : 0), 0);

const EMOTION_LEXICON = {
  sadness: ['triste','chateado','chateada','deprimido','deprimida','vazio','vazia','chorar','saudade','perdi'],
  anxiety: ['ansioso','ansiosa','ansiedade','medo','nervoso','nervosa','preocupado','preocupada','apreensivo'],
  anger: ['raiva','irritado','irritada','odio','revoltado','revoltada','furioso','furiosa'],
  joy: ['feliz','animado','animada','empolgado','empolgada','contente','amei','adorei'],
  confusion: ['confuso','confusa','perdido','perdida','nao entendi','sem entender','duvida'],
  shame: ['vergonha','culpa','envergonhado','envergonhada','me sinto mal']
};
const DISCOURSE_MARKERS = {
  contrast: ['mas','porem','contudo','so que','entretanto'],
  cause: ['porque','pois','ja que','por causa','devido'],
  consequence: ['entao','portanto','por isso','assim','logo'],
  condition: ['se','caso','desde que'],
  addition: ['tambem','alem disso','e ainda'],
  time: ['antes','depois','ontem','hoje','amanha','agora','recentemente']
};
const SYNONYMS = {
  'namorada': ['parceira','minha garota'], 'namorado': ['parceiro','meu garoto'],
  'triste': ['pra baixo','na pior','desanimado'], 'dinheiro': ['grana','dindin'],
  'trabalho': ['trampo','servico'], 'amigo': ['parceiro','colega'],
  'estudar': ['revisar','aprender','estou estudando'], 'medo': ['receio','temor'],
  'briga': ['discussao','desentendimento','conflito']
};
function detectEmotion(text) {
  return Object.entries(EMOTION_LEXICON)
    .map(([emotion, terms]) => ({ emotion, score: countHits(text, terms) }))
    .filter(item => item.score > 0).sort((a,b) => b.score-a.score)[0] || null;
}
function detectRelations(text) {
  return Object.entries(DISCOURSE_MARKERS)
    .filter(([, terms]) => terms.some(term => text.includes(term)))
    .map(([relation]) => relation);
}
function inferSpeechAct(text, intent) {
  if (intent !== 'statement') return intent;
  // Desejos narrados ("eu queria estudar") não são automaticamente pedidos ao assistente.
  if (/^(me ajuda|me ajude|pode me|queria saber|quero saber|me explica|me ensina|preciso de ajuda|preciso que voce|quero que voce)\b/.test(text)) return 'request';
  if (/\b(aconteceu comigo|hoje eu|ontem eu|eu sinto|estou sentindo)\b/.test(text)) return 'personal_disclosure';
  if (/\b(nao sei|to perdido|estou perdido|estou confuso|estou confusa)\b/.test(text)) return 'uncertainty';
  return 'statement';
}
function extractEntities(text) {
  const entities = [];
  const patterns = [
    ['person', /\b(minha namorada|meu namorado|minha mae|meu pai|minha amiga|meu amigo|minha professora|meu professor)\b/g],
    ['time', /\b(hoje|ontem|amanha|amanha|semana passada|mes passado|desde ontem|ha\s+\d+\s+dias)\b/g],
    ['number', /\b\d+(?:[.,]\d+)?\b/g],
    ['negation', /\b(nao|nunca|jamais|nem|ninguem|nada)\b/g]
  ];
  for (const [type, regex] of patterns) {
    for (const match of text.matchAll(regex)) entities.push({ type, value: match[0], index: match.index });
  }
  return entities.sort((a,b) => a.index - b.index);
}

function classify(text) {
  const scores = TOPICS.map(([topic, terms]) => ({ topic, score: countHits(text, terms) }))
    .sort((a,b) => b.score - a.score);
  const intent = INTENTS.find(([, regex]) => regex.test(text))?.[0] || (text.includes('?') ? 'question' : 'statement');
  const topic = scores[0]?.score > 0 ? scores[0].topic : null;
  const confidence = Math.min(0.98, (scores[0]?.score || 0) * 0.22 + (intent !== 'statement' ? 0.24 : 0.08));
  return {
    topic, intent, confidence, topicScores: scores.filter(x => x.score),
    entities: extractEntities(text), emotion: detectEmotion(text),
    discourseRelations: detectRelations(text), speechAct: inferSpeechAct(text, intent),
    isNegated: /\b(nao|nunca|jamais|nem)\b/.test(text),
    isFollowUp: /^(e|mas|entao|ta|ok|certo|por que|como assim|e se|e depois|e agora|isso|ela|ele)\b/.test(text)
  };
}

function resolveReferences(text, history) {
  const turns = Array.isArray(history) ? history.slice(-10) : [];
  const previousUser = turns.filter(m => m.role === 'user').map(m => normalizeNexusText(m.content || m.text || ''));
  const combined = previousUser.slice(-5).join(' ');
  const hasReference = /\b(ela|ele|eles|elas|isso|isto|aquilo|essa|esse|aquele|aquela|la|dela|dele)\b/.test(text);
  if (!hasReference || !combined) return null;
  const recentEntities = extractEntities(combined);
  const people = recentEntities.filter(x => x.type === 'person');
  const topics = TOPICS.map(([topic, terms]) => ({ topic, score: countHits(combined, terms) }))
    .filter(x => x.score > 0).sort((a,b) => b.score-a.score);
  return {
    hasReference: true,
    likelyPerson: people.at(-1)?.value || null,
    likelyTopic: topics[0]?.topic || null,
    ambiguous: people.length > 1 && people.at(-1).value !== people.at(-2)?.value,
    previousUserMessage: previousUser.at(-1) || null
  };
}


const RELATION_PATTERNS = [
  { type: 'condition', regex: /\b(se|caso|desde que)\b/g },
  { type: 'contrast', regex: /\b(mas|porem|contudo|entretanto|so que)\b/g },
  { type: 'cause', regex: /\b(porque|pois|ja que|uma vez que|por causa de|devido a)\b/g },
  { type: 'consequence', regex: /\b(por isso|portanto|entao|consequentemente|assim)\b/g },
  { type: 'addition', regex: /\b(alem disso|tambem|alem do mais)\b/g },
  { type: 'time', regex: /\b(depois que|antes que|quando|enquanto|assim que)\b/g }
];

// Divide a mensagem em proposições e preserva o conector que explica a relação.
// É uma análise estrutural: não presume que a relação expressa pelo usuário seja um fato.
export function parseLogicalStructure(text) {
  const source = normalizeNexusText(text);
  const patterns = RELATION_PATTERNS.map(item => ({ type: item.type, regex: new RegExp(item.regex.source, 'g') }));
  const markers = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.regex)) markers.push({ type: pattern.type, connector: match[0], start: match.index, end: match.index + match[0].length });
  }
  markers.sort((a, b) => a.start - b.start);
  const selected = markers.filter((item, i) => !markers.slice(0, i).some(prev => item.start < prev.end && item.end > prev.start));
  const clauses = [];
  const relations = [];
  let cursor = 0;
  let previous = null;
  const addClause = raw => {
    const value = raw.replace(/^[,;.\s]+|[,;.\s]+$/g, '').trim();
    if (!value) return null;
    const canonical = normalizeNexusText(value);
    const duplicate = clauses.find(clause => normalizeNexusText(clause.text) === canonical);
    if (duplicate) return duplicate.index;
    const index = clauses.length;
    const demonstrative = /\b(esse|essa|esses|essas|aquele|aquela|aquilo)\b/.test(value);
    const ignored = new Set(['essa','esse','esses','essas','aquele','aquela','aquilo','isso','esta','este','para','porque','quando','muito','muita','mesmo','minha','minhas','meu','meus','voce','tirei','ficou','ficaram','estava','estavam','consegui','conseguia','fiquei','ficou']);
    const terms = tokenize(canonical).filter(word => word.length >= 4 && !ignored.has(word));
    let referenceTo = null;
    if (demonstrative) {
      for (let i = clauses.length - 1; i >= 0; i--) {
        const earlierTerms = new Set(tokenize(normalizeNexusText(clauses[i].text)).filter(word => word.length >= 4 && !ignored.has(word)));
        if (terms.some(word => earlierTerms.has(word))) { referenceTo = clauses[i].referenceTo ?? clauses[i].index; break; }
      }
    }
    clauses.push({ index, text: value, negated: /\b(nao|nunca|jamais|nem)\b/.test(value), question: /[?]$/.test(value), referenceTo });
    return index;
  };
  for (const marker of selected) {
    const beforeIndex = addClause(source.slice(cursor, marker.start));
    if (beforeIndex !== null) previous = beforeIndex;
    cursor = marker.end;
    if (marker.type === 'condition' && marker.start === 0) {
      const comma = source.indexOf(',', cursor);
      if (comma >= 0) {
        const conditionIndex = addClause('se ' + source.slice(cursor, comma).trim());
        cursor = comma + 1;
        const nextComma = source.indexOf(',', cursor);
        const resultEnd = nextComma < 0 ? source.length : nextComma;
        const resultIndex = addClause(source.slice(cursor, resultEnd));
        if (conditionIndex !== null && resultIndex !== null) relations.push({ type: 'condition', connector: marker.connector, fromClause: conditionIndex, toClause: resultIndex, direction: 'condition_to_result' });
        previous = resultIndex;
        cursor = resultEnd;
        continue;
      }
    }
    const nextMarker = selected.find(item => item.start >= cursor);
    const limit = nextMarker ? nextMarker.start : source.length;
    const segment = source.slice(cursor, limit);
    const punctuation = segment.search(/[.;!?]/);
    const clauseEnd = punctuation < 0 ? limit : cursor + punctuation;
    const afterIndex = addClause(source.slice(cursor, clauseEnd));
    if (previous !== null && afterIndex !== null) {
      let fromClause = previous, toClause = afterIndex, direction = 'left_to_right';
      toClause = clauses[toClause]?.referenceTo ?? toClause;
      if (marker.type === 'cause') { fromClause = clauses[afterIndex]?.referenceTo ?? afterIndex; toClause = clauses[previous]?.referenceTo ?? previous; direction = 'cause_to_effect'; }
      if (marker.type === 'consequence') direction = 'cause_to_effect';
      if (marker.type === 'condition') direction = 'condition_to_result';
      relations.push({ type: marker.type, connector: marker.connector, fromClause, toClause, direction });
    }
    previous = afterIndex === null ? previous : afterIndex;
    cursor = clauseEnd;
    if (/[.;!?]/.test(source[cursor] || '')) cursor++;
  }
  const finalIndex = addClause(source.slice(cursor));
  const negations = clauses.map(clause => ({ clauseIndex: clause.index, negated: clause.negated, markers: (clause.text.match(/\b(nao|nunca|jamais|nem)\b/g) || []) }));
  return { clauses, relations, negations, hasMultiplePropositions: clauses.length > 1, relationTypes: [...new Set(relations.map(item => item.type))], causalChains: relations.filter(item => item.type === 'cause' || item.type === 'consequence').map(item => ({ causeClause: item.fromClause, effectClause: item.toClause })) };
}
function summarizeLogicalStructure(structure) {
  if (!structure?.hasMultiplePropositions || !structure.relations.length) return null;
  const clauses = structure.clauses;
  const causal = structure.causalChains || [];
  if (causal.length > 1) {
    const steps = causal.map((edge, index) => {
      const cause = clauses[edge.causeClause]?.text || 'causa não identificada';
      const effect = clauses[edge.effectClause]?.text || 'consequência não identificada';
      return (index + 1) + '. “' + cause + '” aparece relacionado a “' + effect + '”.';
    });
    return 'Percebi uma cadeia com várias relações de causa e consequência. Pelo que você relatou — sem assumir que todas as ligações já estão comprovadas — temos:\n' + steps.join('\n') + '\n\nPodemos conferir cada ligação e descobrir onde existe uma causa confirmada, uma possibilidade ou alguma informação faltando.';
  }
  const relation = structure.relations[0];
  const first = clauses[relation.fromClause]?.text || clauses[0]?.text || '';
  const second = clauses[relation.toClause]?.text || '';
  if (!first || !second) return null;
  if (relation.type === 'cause') {
    return 'Você apresentou “' + first + '” e relacionou isso a “' + second + '” como causa ou explicação. Vou tratar essa ligação como a sua hipótese, não como algo comprovado.';
  }
  if (relation.type === 'consequence') {
    return 'Você descreveu “' + first + '” e depois “' + second + '” como consequência. Precisamos conferir se essa consequência realmente decorre do primeiro ponto.';
  }
  if (relation.type === 'condition') {
    return 'Você colocou uma condição — “' + first + '” — ligada a “' + second + '”. Então a segunda parte depende de a condição ser satisfeita.';
  }
  if (relation.type === 'contrast') {
    return 'Você colocou duas ideias em contraste: “' + first + '” e “' + second + '”. As duas podem ser verdadeiras ao mesmo tempo, mesmo que exista uma tensão entre elas.';
  }
  if (relation.type === 'addition') {
    return 'Além de “' + first + '”, você acrescentou “' + second + '”. Vou considerar os dois pontos, sem reduzir a situação a apenas um deles.';
  }
  if (relation.type === 'time') {
    return 'Você organizou os acontecimentos em uma relação temporal: “' + first + '” e “' + second + '”. A ordem dos fatos pode ser importante para entender o que ocorreu.';
  }
  return null;
}

// Respostas sociais têm prioridade sobre referências vagas e classificações de tópico.
function composeConversationalReply(message, history = []) {
  // Porta de entrada social no mesmo módulo chamado diretamente pelo App.jsx.
  // Não depende da classificação temática nem do fallback do motor financeiro.
  const socialText = normalizeNexusText(message)
    .replace(/[!?.,:;]+/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
  const greeting = /^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)( nexus)?( tudo bem| tudo bom| tudo certo| como voce esta| como esta| como vai)?$/.test(socialText);
  if (greeting) {
    return 'Oii! 😊 Tudo bem por aqui! E você, como está hoje?';
  }
  const socialQuestion = /^(e voce|e vc|como voce esta|tudo bem com voce|tudo bem|tudo bom|como vai voce)$/.test(socialText);
  if (socialQuestion) {
    return 'Estou aqui, funcionando e pronta para conversar com você! 😊 Como está sendo seu dia?';
  }
  const languageReply = getLanguageResponse(message, history);
  if (languageReply) return languageReply;
  const social = normalizeNexusText(String(message || '').replace(/[,.!?]/g, ' ')).replace(/\s+/g, ' ').trim();
  const previousAssistant = Array.isArray(history)
    ? history.filter(turn => turn?.role === 'assistant').at(-1)?.content || history.filter(turn => turn?.role === 'assistant').at(-1)?.text || ''
    : '';
  const assistantAskedAboutUser = /como voce esta|como esta voce|como voce esta hoje|como esta sendo seu dia|como foi seu dia|como esta hoje/.test(normalizeNexusText(previousAssistant));

  // Continuidade social: interpreta a resposta à pergunta anterior e avança a conversa.
  // Não trata "estou bem também" como uma frase sem contexto.
  if (assistantAskedAboutUser && /^(estou|to|tou)? ?(bem|otimo|otima|legal|tranquilo|tranquila|de boa)( tambem)?$/.test(social)) {
    return 'Que bom saber disso! 😊 E o que você está fazendo hoje? Está sendo um dia tranquilo ou aconteceu alguma coisa interessante?';
  }
  if (assistantAskedAboutUser && /^(mais ou menos|assim assim|nao muito bem|nao estou bem|to mal|estou mal|cansado|cansada|desanimado|desanimada)$/.test(social)) {
    return 'Poxa, sinto muito que não esteja sendo um dia tão bom. 💙 Se quiser, pode me contar o que está acontecendo. Foi algo específico ou é só aquele cansaço acumulado?';
  }
  if (/^(estou|to) bem e voce$/.test(social)) {
    return 'Que bom saber que você está bem! 😊 Eu não tenho sentimentos como uma pessoa, mas estou funcionando direitinho e pronta para conversar com você. Como está sendo seu dia?';
  }
  if (/^(estou|to) (bem|legal|otimo|otima|tranquilo|tranquila|mais ou menos) e voce$/.test(social)) {
    return 'Obrigado por perguntar! 😊 Eu não tenho um estado emocional como uma pessoa, mas estou aqui e pronta para conversar. Quer me contar mais sobre seu dia?';
  }
  if (/^(e voce|como voce esta|tudo bem com voce)$/.test(social)) {
    return 'Estou funcionando direitinho e pronta para conversar! 😊 E você, como está?';
  }
  if (/^(estou|to) bem$/.test(social)) {
    return 'Que bom! 😊 Como está sendo seu dia?';
  }
  return null;
}

// Organiza relações causais como hipóteses, sem converter relato em prova.
export function analyzeHypotheses(message, history = []) {
  const structure = parseLogicalStructure(message);
  const hypotheses = (structure.causalChains || []).map((edge, index) => ({
    id: index + 1,
    cause: structure.clauses[edge.causeClause]?.text || '',
    effect: structure.clauses[edge.effectClause]?.text || '',
    status: 'user_reported_hypothesis',
    certainty: 'unconfirmed'
  })).filter(item => item.cause && item.effect);

  const statements = [
    ...structure.clauses.map(clause => clause.text),
    ...(Array.isArray(history) ? history.filter(turn => turn?.role === 'user').slice(-5).map(turn => normalizeNexusText(turn.content || turn.text || '')) : [])
  ].flatMap(value => value.split(/[.!?]+/).map(part => part.trim()).filter(Boolean));
  const polarity = statement => {
    const normalized = normalizeNexusText(statement);
    const negated = /\b(nao|nunca|jamais)\b/.test(normalized);
    const core = normalized.replace(/\b(nao|nunca|jamais)\b/g, '').replace(/[,.!?]/g, ' ').replace(/\s+/g, ' ').trim();
    return { core, negated };
  };
  const contradictions = [];
  for (let i = 0; i < statements.length; i++) {
    for (let j = i + 1; j < statements.length; j++) {
      const left = polarity(statements[i]);
      const right = polarity(statements[j]);
      if (left.core.length >= 8 && left.core === right.core && left.negated !== right.negated) {
        if (!contradictions.some(item => item.core === left.core)) {
          contradictions.push({ core: left.core, statements: [statements[i], statements[j]], status: 'needs_clarification' });
        }
      }
    }
  }
  return {
    hypotheses,
    contradictions,
    missingInformation: hypotheses.length
      ? 'Ainda falta verificar se a causa relatada explica o resultado e se existem outros fatores.'
      : null,
    requiresClarification: hypotheses.length > 0 || contradictions.length > 0
  };
}

function composeHypothesisReply(result) {
  if (result.contradictions.length) {
    const item = result.contradictions[0];
    return 'Percebi duas afirmações que parecem entrar em conflito: “' + item.statements[0] + '” e “' + item.statements[1] + '”. Pode me ajudar a entender se você está falando de momentos diferentes ou se uma delas precisa ser corrigida?';
  }
  if (!result.hypotheses.length) return null;
  const lines = result.hypotheses.map((item, index) =>
    (index + 1) + '. Talvez “' + item.cause + '” esteja relacionado a “' + item.effect + '”, como você relatou.'
  );
  return 'Vou separar o que foi relatado do que ainda precisamos verificar. Estas são hipóteses, não conclusões comprovadas:\\n' +
    lines.join('\\n') +
    '\\n\\nPara avaliar melhor, precisamos conferir se essa relação realmente explica o resultado e se houve outros fatores envolvidos. O que mais aconteceu nesse período?';
}

function composeReply(text, frame, references) {
  const clean = text.trim();
  const { topic, intent, emotion, speechAct, discourseRelations = [], logicalStructure } = frame;
  const logicalSummary = summarizeLogicalStructure(logicalStructure);
  if (intent === 'greeting') return 'Oii! 😊 Estou aqui para conversar. Como você está hoje?';
  if (logicalSummary && ['statement', 'personal_disclosure'].includes(speechAct)) {
    return logicalSummary + '\n\nQual parte dessa ligação você quer que eu analise primeiro?';
  }
  if (speechAct === 'personal_disclosure' && emotion) {
    const emotionNames = { sadness: 'tristeza', anxiety: 'preocupação ou ansiedade', anger: 'irritação', joy: 'alegria', confusion: 'dúvida ou confusão', shame: 'culpa ou vergonha' };
    const feeling = emotionNames[emotion.emotion] || 'um sentimento importante';
    return 'Pelo que você escreveu, pode haver ' + feeling + ' envolvida. Não quero presumir exatamente como você está se sentindo. O que aconteceu antes disso?';
  }

  if (discourseRelations.includes('contrast') && topic) {
    return 'Entendi que você está colocando dois lados dessa situação em contraste. Quero considerar tanto o que aconteceu quanto o que mudou ou entrou em conflito. Qual dos dois pontos pesa mais para você agora?';
  }
  if (intent === 'opinion') return 'Posso te dar uma opinião fundamentada, mas quero considerar os detalhes em vez de concordar automaticamente. Qual parte você quer que eu avalie?';
  if (intent === 'definition') return 'Vou explicar de forma direta: para definir isso corretamente, preciso identificar o conceito exato que você está perguntando. Pode me dizer o termo ou a expressão que quer entender?';
  if (intent === 'explanation') return 'Quero explicar o mecanismo, não só repetir uma definição. Ainda não tenho informação suficiente para responder com segurança sobre esse ponto específico. Se você indicar o fenômeno ou colar o trecho, consigo analisar melhor.';
  if (intent === 'procedure') return 'Vamos transformar isso em etapas claras. Primeiro identificamos o objetivo, depois os recursos e as restrições, e então montamos um procedimento verificável. O que exatamente você está tentando fazer?';
  if (intent === 'comparison') return 'Para comparar com justiça, vou considerar objetivo, custo, benefícios, riscos, prazo e limitações. Quais são as opções que você quer colocar lado a lado?';
  if (intent === 'summary') return 'Claro — envie o texto ou indique o conteúdo que deseja resumir. Vou separar ideia central, pontos de apoio e conclusão.';
  if (intent === 'writing') return 'Posso ajudar a escrever de um jeito natural. Qual é o destinatário, o que precisa ser comunicado e qual tom você quer transmitir?';
  if (intent === 'advice') return 'Posso pensar nisso com você sem julgar nem decidir por você. Vamos separar o que aconteceu, o que você sentiu, o que está sob seu controle e quais consequências cada opção pode ter. O que aconteceu exatamente?';
  if (intent === 'ideas') return 'Vamos gerar opções diferentes e depois filtrar pelas que são viáveis. Qual é o objetivo, para quem é a ideia e quais limites precisamos respeitar?';
  if (intent === 'planning') return 'Vamos montar um plano realista com objetivo, etapas, prazo, recursos e uma forma de acompanhar o progresso. O que você quer alcançar e até quando?';
  if (intent === 'translation') return 'Envie a frase e indique o idioma de destino. Vou preservar o sentido e adaptar a expressão ao contexto, não apenas traduzir palavra por palavra.';
  if (references?.ambiguous) return 'Quero acompanhar a conversa sem confundir as pessoas. Quando você diz “' + clean + '”, está falando de qual delas?';
  if (references?.hasReference && references.likelyTopic) return 'Estou relacionando isso ao assunto de ' + references.likelyTopic + ' que apareceu antes. Para responder sem inventar detalhes, qual parte desse assunto você está retomando?';
  if (topic && intent === 'question') return 'Sua pergunta parece estar relacionada a ' + topic + '. Para responder diretamente, preciso identificar exatamente o ponto que você quer esclarecer. Pode reformular a pergunta em uma frase ou dar um exemplo?';
  if (topic) return 'Entendi que sua mensagem envolve ' + topic + '. ' + (emotion ? 'Também percebi sinais de ' + (emotion.emotion === 'sadness' ? 'tristeza' : emotion.emotion === 'anxiety' ? 'preocupação' : emotion.emotion === 'anger' ? 'irritação' : emotion.emotion === 'joy' ? 'alegria' : 'dúvida') + ', mas posso estar interpretando errado. ' : '') + 'Você quer uma explicação, uma orientação prática ou está contando o que aconteceu?';
  return 'Quero entender exatamente o que você quis comunicar. Consigo identificar a estrutura da frase, mas ainda não tenho base suficiente para afirmar o significado sem arriscar uma resposta fora do assunto. Você pode dar um exemplo ou explicar o que espera de mim?';
}

// Retorna um quadro semântico que pode ser usado por outras partes do núcleo.
export function analyzeNexusMessage(message, history = []) {
  const normalized = normalizeNexusText(message);
  const frame = classify(normalized);
  frame.logicalStructure = parseLogicalStructure(normalized);
  const references = resolveReferences(normalized, history);
  return {
    original: String(message || ''),
    normalized,
    tokens: tokenize(normalized),
    entities: frame.entities,
    topic: frame.topic,
    emotion: frame.emotion,
    discourseRelations: frame.discourseRelations,
    logicalStructure: parseLogicalStructure(normalized),
    speechAct: frame.speechAct,
    isFollowUp: frame.isFollowUp,
    isNegated: frame.isNegated,
    intent: frame.intent,
    confidence: frame.confidence,
    references,
    negated: frame.entities.some(entity => entity.type === 'negation'),
    isQuestion: /\?/.test(String(message || '')) || ['definition','explanation','procedure','comparison','question'].includes(frame.intent),
    hasUnseenVocabulary: tokenize(normalized).some(word => word.length > 5 && !TOPICS.some(([,terms]) => terms.includes(word))),
    semanticSignals: Object.entries(SYNONYMS).filter(([,synonyms]) => synonyms.some(s => normalized.includes(fold(s)))).map(([concept]) => concept),
    fallbackReply: composeReply(normalized, frame, references)
  };
}

// Estratégia de resposta conservadora para mensagens que o núcleo legado não reconhece.
// Só intervém quando a resposta antiga seria o fallback genérico, evitando sobrescrever
// respostas específicas já existentes (cálculos, finanças e conhecimento curado).
export function improveNexusFallback(message, history, legacyReply) {
  // Primeiro resolve a intenção social explícita, antes de tentar inferir tópicos ou referências.
  const socialReply = composeConversationalReply(message, history);
  if (socialReply) return socialReply;

  const analysis = analyzeNexusMessage(message, history);
  const generic = /quero entender direito|quero entender exatamente|estou aqui para conversar|pode falar do seu dia|pode falar do seu jeito|quer me contar|quer uma explicacao|quer uma explicação|nao entendi sua mensagem|não entendi sua mensagem/i.test(String(legacyReply || ''));
  if (generic || (!analysis.topic && analysis.intent !== 'statement' && analysis.confidence < 0.5)) {
    const hypothesisReply = composeHypothesisReply(analyzeHypotheses(message, history));
    return hypothesisReply || analysis.fallbackReply;
  }
  return legacyReply;
}
