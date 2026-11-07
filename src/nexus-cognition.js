import { getLanguageResponse, analyzeLanguage, buildConversationState } from './nexus-language.js';
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
  ['topic_change', /^(vamos|bora|quero|podemos) (falar|conversar|trocar|mudar) (sobre )?(outra coisa|outro assunto|outro tema|de assunto)|^(muda|troca) de assunto\b/],
  ['greeting', /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|tudo bom)\b/],
  ['definition', /^(o que e|oq e|o que significa|que significa|o que quer dizer|define|defina)\b/],
  ['explanation', /^(por que|porque|como funciona|como acontece|me explica|explique|explica|qual a causa|qual o motivo)\b/],
  ['procedure', /^(como faco|como fazer|como posso|qual o passo|passo a passo|me ensina|ensina)\b/],
  ['comparison', /\b(qual e melhor|qual compensa|vale mais a pena|compare|comparar|diferenca entre)\b/],
  ['summary', /\b(resuma|resumir|faz um resumo|me resume|sintetiza)\b/],
  ['writing', /\b(escreva|escreve|redija|monta uma mensagem|me ajuda a responder|como responder|o que eu falo)\b/],
  ['advice', /\b(o que eu faco|o que devo fazer|o que voce recomenda|o que voce recomendaria|oque voce recomenda|oque voce recomendaria|qual conselho|me aconselha|preciso de conselho|como lidar|como devo agir|o que voce faria|oque vc recomendaria)\b/],
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
  distante: ['fria','frio','afastada','afastado','sumida','sumido','menos presente'],
  comunicacao: ['conversa','papo','contato','responde','mensagem','direct'],
  triste: ['pra baixo','na pior','desanimado','sem animo','abatido','chateado'],
  feliz: ['contente','animado','empolgado','realizado','de bem com a vida'],
  ansiedade: ['nervosismo','apreensao','aflicao','preocupacao','inquietacao','ansioso'],
  dinheiro: ['grana','dindin','verba','condicao financeira'],
  trabalho: ['trampo','servico','expediente','emprego'],
  amizade: ['parceria','coleguismo','vinculo de amizade'],
  namorada: ['parceira','minha garota','minha menina'],
  namorado: ['parceiro','meu garoto','meu menino'],
  amigo: ['parceiro','colega'],
  estudar: ['revisar','aprender','se preparar','estou estudando'],
  medo: ['receio','temor','inseguranca'],
  briga: ['discussao','desentendimento','conflito','atrito']
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
  // Pedidos explícitos têm prioridade mesmo quando terminam com interrogação.
  if (/^(me ajuda|me ajude|pode me ajudar|me ajuda a|me ajude a|pode me|queria saber|quero saber|me explica|me ensina|preciso de ajuda|preciso que voce|quero que voce)\b/.test(text)) return 'request';
  if (intent !== 'statement') return intent;
  // Desejos narrados ("eu queria estudar") não são automaticamente pedidos ao assistente.
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
  const turns = Array.isArray(history) ? history.slice(-60) : [];
  const previousUser = turns.filter(m => m.role === 'user').map(m => normalizeNexusText(m.content || m.text || ''));
  // O histórico recebido pelo App já contém a mensagem atual; não a use como
  // antecedente da própria referência.
  if (previousUser.length && previousUser.at(-1) === text) previousUser.pop();
  const combined = previousUser.slice(-12).join(' ');
  const hasReference = /\b(ela|ele|eles|elas|isso|isto|aquilo|essa|esse|aquele|aquela|la|dela|dele)\b/.test(text);
  if (!hasReference || !combined) return null;
  const recentEntities = extractEntities(combined);
  const people = recentEntities.filter(x => x.type === 'person');
  const latestTopic = [...previousUser].reverse()
    .map(turn => TOPICS.map(([topic, terms]) => ({topic,score:countHits(turn,terms)}))
      .filter(item=>item.score>0).sort((a,b)=>b.score-a.score)[0])
    .find(Boolean);
  const distinctPeople=[...new Set(people.map(person=>person.value))];
  return {
    hasReference: true,
    likelyPerson: distinctPeople.length===1?distinctPeople[0]:people.at(-1)?.value||null,
    likelyTopic: latestTopic?.topic || null,
    ambiguous: distinctPeople.length > 1,
    candidates: distinctPeople,
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
  const selected = markers
    .filter(item => {
      if (item.type !== 'time') return true;
      const before = source.slice(Math.max(0, item.start - 28), item.start);
      return !/\b(sinto falta de|tenho saudade de|lembro de|me recordo de|gosto de)\s*$/.test(before);
    })
    .filter((item, i, list) => !list.slice(0, i).some(prev => item.start < prev.end && item.end > prev.start));
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
    .replace(/\s+/g, ' ')
    .trim();
  const greeting = /^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)( nexus)?( tudo bem| tudo bom| tudo certo| como voce esta| como esta| como vai)?$/.test(socialText);
  if (greeting) {
    return 'Oii! 😊 Tudo bem por aqui! E você, como está hoje?';
  }
  const socialQuestion = /^(e voce|e vc|como voce esta|tudo bem com voce|tudo bem|tudo bom|como vai voce)$/.test(socialText);
  if (socialQuestion) {
    return 'Estou aqui, funcionando e pronta para conversar com você! 😊 Como está sendo seu dia?';
  }
  const social = normalizeNexusText(String(message || '').replace(/[,.!?]/g, ' '))
    .replace(/\bsim{2,}\b/g, 'sim')
    .replace(/\bbem{2,}\b/g, 'bem')
    .replace(/\b(otim|legal|tranquilo|tranquila)\1{1,}\b/g, '$1')
    .replace(/\s+/g, ' ').trim();

  // Conversa cotidiana não é um pedido de solução. Trate mudança de assunto e
  // comentários sobre o dia como convites sociais, antes de classificadores genéricos.
  const socialWithoutVocative = social
    .replace(/\b(nexus|nexos)\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(vamos|bora|podemos|quero) (falar|conversar|trocar|mudar) (sobre )?(uma )?(outra coisa|outro assunto|outro tema|de assunto)$/.test(socialWithoutVocative)
      || /^(muda|troca) (de )?assunto$/.test(socialWithoutVocative)) {
    return 'Claro! 😄 Mudamos de assunto. Vamos deixar aquele assunto de lado e conversar sobre qualquer coisa. Quer que eu puxe um assunto aleatório ou tem algo em mente?';
  }
  // Marcadores coloquiais como "pior q", "cara" e "mano" não mudam
  // a intenção da frase; removemos só a abertura para interpretar o comentário.
  const socialCore = social.replace(/^(?:pior (?:que|q)|cara|mano|puts|aff)[, ]+/i, '').trim();
  if (/^(aconteceu )?nada (de )?interessante (hoje|por aqui)?$/.test(socialCore)
      || /^(hoje )?nao aconteceu nada (de )?interessante( hoje)?$/.test(socialCore)
      || /^nao teve nada (de )?interessante hoje$/.test(socialCore)) {
    return 'Tem dia que é assim mesmo KKKK. São aqueles dias bem comuns, sem nada marcante; parece que o relógio anda e nada acontece. 😅 Foi um dia mais parado em casa ou você saiu e a rotina foi normal?';
  }

  // Relatos simples do cotidiano são compartilhamentos, não pedidos de suporte escolar.
  // O tópico "escola" só deve acionar ajuda acadêmica quando houver um pedido explícito.
  if (/^(?:eu )?(?:fui|voltei|cheguei|saí|sai) (?:pra|para|para a|na) escola(?: hoje)?$/.test(social)
      || /^(?:hoje )?(?:eu )?(?:tive|tenho) aula(?: hoje)?$/.test(social)) {
    return 'Aaa, foi pra escola hoje! 😄 Como foi por lá? Teve alguma coisa diferente ou foi um dia normal de aula? KKKK';
  }

  const assistantTurns = Array.isArray(history) ? history.filter(turn => turn?.role === 'assistant') : [];
  const previousAssistantTurn = assistantTurns[assistantTurns.length - 1];
  const previousAssistant = previousAssistantTurn?.content || previousAssistantTurn?.text || '';
  const previousAssistantNormalized = normalizeNexusText(previousAssistant);
  const userTurns = Array.isArray(history) ? history.filter(turn => turn?.role === 'user') : [];
  // O histórico recebido inclui a mensagem atual; a anterior ajuda a interpretar correções.
  const lastHistoryTurn = Array.isArray(history) ? history[history.length - 1] : null;
  const previousUserIndex = lastHistoryTurn?.role === 'user' ? userTurns.length - 2 : userTurns.length - 1;
  const previousUserMessage = previousUserIndex >= 0
    ? normalizeNexusText(userTurns[previousUserIndex]?.content || userTurns[previousUserIndex]?.text || '')
    : '';
  const assistantAskedAboutUser = /(?:e voce )?como esta( hoje)?|como voce esta( hoje)?|como esta sendo seu dia|como foi seu dia|como esta hoje/.test(previousAssistantNormalized);
  const userPreviouslySaidTheyWereWell = /^(eu )?(estou|to|tou) bem( sim+)?$/.test(previousUserMessage);

  // Uma correção explícita é reconhecida mesmo se a resposta errada da NEXUS
  // tiver substituído, no histórico imediato, a pergunta que iniciou a sequência.
  if ((assistantAskedAboutUser || userPreviouslySaidTheyWereWell) && /^(eu )?(disse|falei) que estou bem( sim)?$/.test(social)) {
    return 'Você tem razão — perguntou como você estava e você respondeu que está bem. Desculpa por não ter acompanhado sua resposta. 😊 Que bom que você está bem!';
  }

  // A resposta à pergunta anterior tem prioridade sobre classificadores genéricos.
  if (assistantAskedAboutUser && /^(estou|to|tou)? ?(bem|otimo|otima|legal|tranquilo|tranquila|de boa)( sim)?( tambem)?$/.test(social)) {
    return 'Que bom saber disso! 😊 E o que você está fazendo hoje? Está sendo um dia tranquilo ou aconteceu alguma coisa interessante?';
  }
  if (assistantAskedAboutUser && /^(mais ou menos|assim assim|nao muito bem|nao estou bem|to mal|estou mal|cansado|cansada|desanimado|desanimada)$/.test(social)) {
    return 'Poxa, sinto muito que não esteja sendo um dia tão bom. 💙 Se quiser, pode me contar o que está acontecendo. Foi algo específico ou é só aquele cansaço acumulado?';
  }

  // Reconhece relatos emocionais em primeira pessoa antes do fallback de "não entendi".
  const emotionPatterns = [
    { re: /^(?:eu )?(?:estou|to|tou|me sinto) (?:muito |bem |super )?(feliz|contente|animado|animada|empolgado|empolgada|realizado|realizada)\b/, kind: 'joy' },
    { re: /^(?:eu )?(?:estou|to|tou|me sinto) (?:muito |bem |super )?(triste|chateado|chateada|desanimado|desanimada|pra baixo|mal)\b/, kind: 'sadness' },
    { re: /^(?:eu )?(?:estou|to|tou|me sinto) (?:muito |bem |super )?(ansioso|ansiosa|preocupado|preocupada|nervoso|nervosa|com medo)\b/, kind: 'anxiety' },
    { re: /^(?:eu )?(?:estou|to|tou|me sinto) (?:muito |bem |super )?(com raiva|irritado|irritada|revoltado|revoltada)\b/, kind: 'anger' }
  ];
  const emotionalDisclosure = emotionPatterns.map(item => ({ ...item, match: social.match(item.re) })).find(item => item.match);
  if (emotionalDisclosure) {
    const reason = String(message || '').match(/\b(?:porque|pois|já que|depois que|quando)\b\s+(.+)/i)?.[1]?.replace(/[.!?]+$/, '');
    const naturalReason = reason?.replace(/^passei\b/i, 'você passou').replace(/^consegui\b/i, 'você conseguiu').replace(/^ganhei\b/i, 'você ganhou');
    if (emotionalDisclosure.kind === 'joy') {
      return reason
        ? 'Que notícia boa! 😊 Você está feliz porque ' + naturalReason + '. O que isso significa para você?'
        : 'Que bom ler isso! 😊 Fico contente que você esteja vivendo um momento feliz. Aconteceu alguma coisa especial ou é uma felicidade que já vinha crescendo?';
    }
    if (emotionalDisclosure.kind === 'sadness') return reason
      ? 'Sinto muito que você esteja passando por isso. 💙 Você comentou que isso tem relação com ' + reason + '. Quer me contar um pouco mais?'
      : 'Poxa, sinto muito que você esteja se sentindo assim. 💙 Quer me contar o que aconteceu? Vou te ouvir sem julgar.';
    if (emotionalDisclosure.kind === 'anxiety') return 'Entendo. Quando a ansiedade ou a preocupação aparece, pode ser difícil organizar tudo. O que está te deixando assim neste momento?';
    return 'Parece que alguma coisa te irritou bastante. Quer me contar o que aconteceu? Podemos pensar nisso com calma, sem tirar conclusões antes de entender a situação.';
  }

  const languageReply = getLanguageResponse(message, history);
  if (languageReply) return languageReply;
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


// Constrói um plano intermediário antes da resposta: conceitos associados,
// fatos lembrados, intenção atual, evidências e lacunas. O plano evita que o tópico
// antigo substitua o pedido que a pessoa acabou de fazer.
export function buildReasoningPlan(message, history = []) {
  const normalized = normalizeNexusText(message);
  const language = analyzeLanguage(message, history);
  const semanticText = normalized.replace(/[!?.,:;]+/g, ' ').replace(/\\s+/g, ' ').trim();
  const semanticConcepts = Object.entries(SYNONYMS)
    .filter(([concept, variants]) => {
      const terms = [concept, ...variants].map(normalizeNexusText);
      return terms.some(term => term && (' ' + semanticText + ' ').includes(' ' + term + ' '));
    })
    .map(([concept]) => concept);
  const memory = language.memory || { people: [], events: [], facts: [], activeTopic: null };
  const conversationState = language.conversationState || null;
  const suppliedHistory = Array.isArray(history) ? history : [];
  const lastHistoryTurn = suppliedHistory.at(-1);
  const lastHistoryText = normalizeNexusText(lastHistoryTurn?.content || lastHistoryTurn?.text || '');
  const historyIncludesCurrent = lastHistoryTurn?.role === 'user' && lastHistoryText === normalized;
  const previousConversationState = buildConversationState(
    historyIncludesCurrent ? suppliedHistory.slice(0, -1) : suppliedHistory
  );
  const situation = language.situation || { currentFacts: [], corrections: [], topic: null };
  const reasoning = language.reasoning || { reasoningType: 'reflection', evidence: [], unknowns: [] };
  const contradiction = analyzeHypotheses(message, history).contradictions;
  const currentTopic = language.topic || null;
  const activeTopic = conversationState ? conversationState.activeTopic : (memory.activeTopic || situation.topic || null);
  const topicAliases = {
    relacionamentos: 'relacionamento',
    amizades: 'amizade',
    estudos: 'escola',
    'trabalho e carreira': 'trabalho',
    financas: 'financas'
  };
  const priorTopic = previousConversationState.activeTopic;
  const topicMatches = Boolean(currentTopic && priorTopic &&
    (currentTopic === priorTopic || topicAliases[currentTopic] === priorTopic || topicAliases[priorTopic] === currentTopic));
  const relationshipSemanticMatch = priorTopic === 'relacionamento' &&
    semanticConcepts.some(concept => ['distante','comunicacao','namorada','namorado'].includes(concept));
  const sameTopic = topicMatches || relationshipSemanticMatch || (!currentTopic && Boolean(previousConversationState.activeTopic && /\\b(ela|ele|eles|elas|isso|aquilo|dela|dele)\\b/.test(normalized)));
  return {
    normalized,
    intent: language.primaryAct || 'statement',
    currentTopic,
    activeTopic,
    conversationState,
    sameTopic,
    semanticConcepts,
    memory,
    situation,
    reasoning,
    contradictions: contradiction,
    evidence: reasoning.evidence || [],
    unknowns: reasoning.unknowns || [],
    confidence: Math.min(0.96,
      (currentTopic ? 0.35 : 0.12) +
      semanticConcepts.length * 0.12 +
      (sameTopic ? 0.18 : 0) +
      ((reasoning.evidence || []).length ? 0.12 : 0))
  };
}

function recentConversation(history = []) {
  const turns = Array.isArray(history) ? history.slice(-60) : [];
  const lastUser = [...turns].reverse().find(turn => turn?.role === 'user');
  const lastAssistant = [...turns].reverse().find(turn => turn?.role === 'assistant');
  return {
    lastUser: normalizeNexusText(lastUser?.content || lastUser?.text || ''),
    lastAssistant: normalizeNexusText(lastAssistant?.content || lastAssistant?.text || ''),
    userTurns: turns.filter(turn => turn?.role === 'user').length
  };
}

// Motor composicional: extrai o núcleo semântico da mensagem e escolhe um movimento
// conversacional a partir do ato de fala, das relações e do histórico. As frases são
// montadas com partes da mensagem atual; não são respostas integrais cadastradas.
export function buildAdaptiveResponse(message, history = []) {
  const original = String(message || '').trim();
  const normalized = normalizeNexusText(original);
  if (!normalized) return null;
  const frame = classify(normalized);
  const context = recentConversation(history);
  const reasoningPlan = buildReasoningPlan(original, history);
  const structure = parseLogicalStructure(normalized);
  const clauses = structure.clauses.map(item => item.text).filter(Boolean);
  const meaningful = tokenize(normalized).filter(word =>
    word.length > 3 && !['estou','estava','muito','hoje','tambem','porque','entao','assim','sobre','coisa','isso','aquela','aquele','minha','meu','para','mais','menos','aconteceu','diferente','comigo','coisa','alguma','algum','tive','hoje'].includes(word)
  );
  const salient = [...new Set(meaningful)].slice(0, 5);
  const subject = clauses.length > 1 ? clauses.slice(0, 2).join(' — ') : (clauses[0] || original);
  const hasQuestion = /\?/.test(original);
  const turns = Array.isArray(history) ? history : [];
  const previousTurn = turns.length >= 2 ? turns[turns.length - 2] : null;
  const previousAsked = previousTurn?.role === 'assistant' &&
    /\b(como|o que|qual|por que|quando|onde)\b/.test(context.lastAssistant) &&
    /\?/.test(context.lastAssistant);
  const conversationState = reasoningPlan.conversationState || null;
  const activeTopic = conversationState?.activeTopic || null;
  // O assunto ativo vem da linha do tempo, não da frequência de palavras antigas.
  // Uma referência curta pode continuar o assunto anterior; um tema explícito novo o substitui.
  const sameTopic = Boolean(activeTopic && (
    !frame.topic || frame.topic === activeTopic ||
    (frame.topic === 'relacionamento' && activeTopic === 'relacionamentos') ||
    (frame.topic === 'estudos' && activeTopic === 'escola')
  ));
  const rememberedEvents = reasoningPlan.memory.events || [];
  const eventLabels = {distanciamento:'o distanciamento que você percebeu',menos_conversa:'a diminuição das conversas',mudanca_escola:'a mudança de escola',mudanca_cidade:'a mudança de cidade',conflito:'o conflito que você contou',termino:'o término',contato_interrompido:'a interrupção do contato',reaproximacao:'a reaproximação'};
  const semanticFocus = reasoningPlan.semanticConcepts.slice(0, 2);

  if (frame.speechAct === 'request') {
    if (/estudar|prova|matematica|materia|enem/.test(normalized)) {
      return 'Claro! Vamos estudar isso juntos. Podemos revisar a matéria e depois praticar com questões. Qual conteúdo vai cair na prova?';
    }
    return 'Claro, posso te ajudar com isso. Me conta qual resultado você quer alcançar e eu acompanho com você, passo a passo.';
  }

  // Pergunta curta que responde à pergunta anterior: interpretar a função no diálogo.
  if (previousAsked && /^(nada|nada nao|nao sei|normal|mais ou menos|sei la|de boa|bem|muito bem|otimo|otima|tranquilo|tranquila|feliz|mal|triste|cansado|cansada)$/.test(normalized)) {
    return normalized.startsWith('nada')
      ? 'Entendi. Então não teve nada específico que tenha marcado esse momento. Às vezes é só um dia comum mesmo. Quer continuar nesse assunto ou prefere que eu puxe outro?'
      : 'Tudo bem não ter uma resposta fechada. Podemos ir descobrindo enquanto conversamos; o que vem primeiro à sua cabeça quando pensa nisso?';
  }

  if (frame.speechAct === 'personal_disclosure' || frame.speechAct === 'statement' || frame.speechAct === 'uncertainty') {
    // Primeiro acompanha o que a pessoa contou; só oferece solução quando ela pede.
    // A resposta usa o conteúdo da fala, não um formulário de interpretação.
    if (structure.relations.length) {
      const relation = structure.relations[0];
      const left = clauses[relation.fromClause] || clauses[0] || subject;
      const right = clauses[relation.toClause] || clauses[1] || '';
      const bridge = relation.type === 'contrast' ? 'São duas coisas que podem coexistir, mesmo criando um conflito'
        : relation.type === 'cause' ? 'Você está relacionando uma coisa à outra'
        : relation.type === 'condition' ? 'Então existe uma condição importante aí'
        : relation.type === 'addition' ? 'E ainda tem esse outro lado'
        : 'Você está contando como uma coisa levou à outra';
      return bridge + ': “' + left + '” e “' + right + '”. ' +
        (frame.emotion ? 'Imagino que isso possa mexer com você. ' : '') +
        'Qual parte ficou mais forte na sua cabeça?';
    }
    const rememberedEvent = rememberedEvents.length ? rememberedEvents.at(-1) : null;
    const memoryHint = rememberedEvent && sameTopic
      ? 'Isso se conecta ao que você já vinha contando sobre ' + (eventLabels[rememberedEvent] || 'essa situação') + '. '
      : '';
    const reflection = semanticFocus.includes('distante') ? 'Você está percebendo uma distância entre vocês.'
      : semanticFocus.includes('comunicacao') ? 'Essa conversa parece ter ficado na sua cabeça.'
      : semanticFocus.includes('ansiedade') ? 'Parece que isso está ocupando seus pensamentos.'
      : 'Tô acompanhando o que você contou: “' + original.replace(/[.!?]+$/,'') + '”.';
    if (/futuro|escolhas/.test(normalized)) {
      return memoryHint + 'Você comentou: “' + original.replace(/[.!?]+$/,'') + '”. O que fez isso ganhar importância hoje?';
    }
    const followUp = sameTopic
      ? 'O que mudou desde a última vez?'
      : frame.emotion ? 'Quer me contar o que aconteceu antes de você se sentir assim?'
      : previousAsked ? 'E como você se sentiu com isso?'
      : 'Como isso apareceu no seu dia?';
    return memoryHint + reflection + ' ' + followUp;
  }

  if (hasQuestion && frame.intent === 'question') {
    const priorContext = context.lastUser && sameTopic
      ? ' Considerando o que você comentou antes,'
      : '';
    return 'Boa, vamos pensar nisso.' + priorContext + ' A pergunta é sobre “' + subject + '”. Posso começar separando o que sabemos do que ainda é hipótese: qual aspecto dessa questão você considera mais importante?';
  }
  return null;
}

function composeReply(text, frame, references) {
  const clean = text.trim();
  const { topic, intent, emotion, speechAct, discourseRelations = [], logicalStructure } = frame;
  const logicalSummary = summarizeLogicalStructure(logicalStructure);
  if (intent === 'topic_change') return 'Claro! 😊 Mudamos de assunto. Sobre o que você está com vontade de conversar agora? Pode ser qualquer coisa — algo divertido, uma curiosidade, música, planos ou simplesmente jogar conversa fora.';
  if (/^(aconteceu )?nada de interessante (hoje|por aqui)?$|^hoje nao aconteceu nada de interessante$/.test(text)) {
    return 'Tem dia que é assim mesmo, tudo meio comum. 😄 Às vezes até é bom ter um dia tranquilo. Você ficou mais de boa em casa ou foi fazendo suas coisas normalmente?';
  }
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
  if (intent === 'explanation' && !topic) return 'Boa pergunta. Muitas coisas parecem difíceis porque envolvem várias partes ao mesmo tempo, consequências que ainda não conhecemos ou escolhas que importam para nós. Qual dessas possibilidades chega mais perto do que você está pensando?';
  if (intent === 'explanation') return 'Quero explicar o mecanismo, não só repetir uma definição. Ainda não tenho informação suficiente para responder com segurança sobre esse ponto específico. Se você indicar o fenômeno ou colar o trecho, consigo analisar melhor.';
  if (intent === 'procedure') return 'Vamos transformar isso em etapas claras. Primeiro identificamos o objetivo, depois os recursos e as restrições, e então montamos um procedimento verificável. O que exatamente você está tentando fazer?';
  if (intent === 'comparison') return 'Para comparar com justiça, vou considerar objetivo, custo, benefícios, riscos, prazo e limitações. Quais são as opções que você quer colocar lado a lado?';
  if (intent === 'summary') return 'Claro — envie o texto ou indique o conteúdo que deseja resumir. Vou separar ideia central, pontos de apoio e conclusão.';
  if (intent === 'writing') return 'Posso ajudar a escrever de um jeito natural. Qual é o destinatário, o que precisa ser comunicado e qual tom você quer transmitir?';
  if (intent === 'advice') return 'Vamos pensar nisso considerando o que você quer alcançar, o que já tentou e quais são os limites da situação. Não quero presumir que o assunto seja relacionamento nem te dar um conselho pronto sem contexto. O que aconteceu e qual decisão você está tentando tomar?';
  if (intent === 'ideas') return 'Vamos gerar opções diferentes e depois filtrar pelas que são viáveis. Qual é o objetivo, para quem é a ideia e quais limites precisamos respeitar?';
  if (intent === 'planning') return 'Vamos montar um plano realista com objetivo, etapas, prazo, recursos e uma forma de acompanhar o progresso. O que você quer alcançar e até quando?';
  if (intent === 'translation') return 'Envie a frase e indique o idioma de destino. Vou preservar o sentido e adaptar a expressão ao contexto, não apenas traduzir palavra por palavra.';
  if (references?.ambiguous) return 'Quero acompanhar a conversa sem confundir as pessoas. Quando você diz “' + clean + '”, está falando de qual delas?';
  if (references?.hasReference && references.likelyTopic) return 'Estou relacionando isso ao assunto de ' + references.likelyTopic + ' que apareceu antes. Para responder sem inventar detalhes, qual parte desse assunto você está retomando?';
  if (topic && intent === 'question') return 'Sua pergunta parece estar relacionada a ' + topic + '. Para responder diretamente, preciso identificar exatamente o ponto que você quer esclarecer. Pode reformular a pergunta em uma frase ou dar um exemplo?';
  if (topic) {
    const topicName = topic;
    const emotionText = emotion
      ? ({ sadness: 'Parece que isso veio acompanhado de tristeza.', anxiety: 'Parece que isso está trazendo preocupação.', anger: 'Dá para perceber que isso mexeu com você.', joy: 'Dá para perceber sua alegria.', confusion: 'Parece que você está tentando organizar algumas dúvidas.' }[emotion.emotion] || '')
      : '';
    if (speechAct === 'personal_disclosure' || speechAct === 'statement') {
      return 'Entendi. Você está trazendo algo sobre ' + topicName + '. ' + emotionText + ' Me conta um pouco mais do que aconteceu — quero acompanhar seu raciocínio e conversar sobre isso com você.';
    }
    return 'Entendi, vamos falar sobre ' + topicName + '. ' + emotionText + ' Vou começar pelo ponto principal e a gente aprofunda conforme a conversa avançar. O que você considera mais importante nessa situação?';
  }
  // Resposta aberta: a NEXUS assume uma primeira interpretação plausível em vez de
  // transferir todo o esforço para a pessoa ou declarar que não entendeu a frase.
  if (intent === 'question') {
    return 'Boa pergunta. Vou tentar construir uma resposta com o que já temos, em vez de pedir que você reformule tudo. O que eu consigo inferir até aqui é que você quer entender melhor esse assunto. Me dá só um pouco do contexto e eu sigo com você.';
  }
  if (speechAct === 'personal_disclosure' || speechAct === 'statement') {
    return 'Entendi o que você está compartilhando. Não precisa explicar tudo perfeitamente: podemos organizar as ideias juntos. O que aconteceu depois disso?';
  }
  return 'Tô acompanhando. Pode falar do seu jeito, até se a ideia estiver incompleta ou meio confusa. Vou tentar entender pelo contexto e conversar com você; se faltar uma peça importante, pergunto só o necessário.';
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
  // Intenções sociais explícitas e mudanças de assunto são resolvidas primeiro.
  const socialReply = composeConversationalReply(message, history);
  if (socialReply) return socialReply;

  const analysis = analyzeNexusMessage(message, history);
  // Pedidos de conselho não devem cair em um conselho romântico universal.
  if (analysis.intent === 'advice') return analysis.fallbackReply;
  if (analysis.speechAct === 'request') {
    const requested = buildAdaptiveResponse(message, history);
    if (requested) return requested;
  }

  // Relações lógicas explícitas passam pela verificação de hipóteses antes
  // do motor conversacional, para não serem achatadas em uma reflexão genérica.
  if (analysis.logicalStructure.relations.length) {
    const hypothesisReply = composeHypothesisReply(analyzeHypotheses(message, history));
    if (hypothesisReply) return hypothesisReply;
    return analysis.fallbackReply;
  }

  const legacyText = String(legacyReply || '');
  const legacyIsGeneric = /quero entender direito|quero entender exatamente|estou aqui para conversar|pode falar do seu dia|pode falar do seu jeito|quer me contar|quer uma explicacao|quer uma explicação|nao entendi sua mensagem|não entendi sua mensagem|estou relacionando isso ao assunto|qual parte desse assunto voce esta retomando|voce trouxe .{1,90} para a conversa|você trouxe .{1,90} para a conversa|entendi: o assunto sao seus|entendi: o assunto são seus|vamos localizar exatamente o que voce precisa|vamos localizar exatamente o que você precisa|me diga exatamente o que voce precisa|fallback generico|fallback genérico/i.test(legacyText);
  const adaptive = buildAdaptiveResponse(message, history);
  const explicitTask = ['definition','explanation','procedure','comparison','summary','writing','advice','ideas','planning','calculation','translation','opinion','topic_change'].includes(analysis.intent) || analysis.speechAct === 'request';

  // Prioridade do roteador:
  // 1) conversa social; 2) pedidos explícitos; 3) relatos pessoais e continuidade;
  // 4) conhecimento especializado do motor financeiro legado.
  if (analysis.speechAct === 'request' && adaptive) return adaptive;
  if (!explicitTask && adaptive && ['statement','personal_disclosure','uncertainty'].includes(analysis.speechAct)) return adaptive;
  if (legacyIsGeneric && adaptive) return adaptive;
  if (legacyIsGeneric) return analysis.fallbackReply;
  if (analysis.intent === 'advice' && (!legacyText || /fallback generico|fallback genérico/i.test(legacyText))) return analysis.fallbackReply;

  if (analysis.logicalStructure.relations.length) {
    const hypothesisReply = composeHypothesisReply(analyzeHypotheses(message, history));
    if (hypothesisReply) return hypothesisReply;
  }
  // O motor legado só mantém prioridade quando entregou uma resposta realmente
  // específica para uma tarefa ou domínio, não apenas porque mencionou um tópico.
  return legacyReply;
}
