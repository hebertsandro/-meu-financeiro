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
  if (/\\b(preciso|queria|quero|pode me|me ajuda|me ajude)\\b/.test(text)) return 'request';
  if (/\\b(aconteceu|aconteceu comigo|hoje eu|ontem eu|eu sinto|estou sentindo)\\b/.test(text)) return 'personal_disclosure';
  if (/\\b(nao sei|não sei|to perdido|estou perdido|estou confuso)\\b/.test(text)) return 'uncertainty';
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
    isNegated: /\\b(nao|nunca|jamais|nem)\\b/.test(text),
    isFollowUp: /^(e|mas|entao|ta|ok|certo|por que|como assim|e se|e depois|e agora|isso|ela|ele)\\b/.test(text)
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

function composeReply(text, frame, references) {
  const clean = text.trim();
  const { topic, intent } = frame;
  if (intent === 'greeting') return 'Oii! 😊 Estou aqui para conversar. Como você está hoje?';
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
  if (topic) return 'Entendi que sua mensagem envolve ' + topic + '. Não quero presumir que uma palavra isolada explica tudo. Você quer uma explicação, uma orientação prática ou está contando o que aconteceu?';
  return 'Quero entender exatamente o que você quis comunicar. Consigo identificar a estrutura da frase, mas ainda não tenho base suficiente para afirmar o significado sem arriscar uma resposta fora do assunto. Você pode dar um exemplo ou explicar o que espera de mim?';
}

// Retorna um quadro semântico que pode ser usado por outras partes do núcleo.
export function analyzeNexusMessage(message, history = []) {
  const normalized = normalizeNexusText(message);
  const frame = classify(normalized);
  const references = resolveReferences(normalized, history);
  return {
    original: String(message || ''),
    normalized,
    tokens: tokenize(normalized),
    entities: frame.entities,
    topic: frame.topic,
    emotion: frame.emotion,
    discourseRelations: frame.discourseRelations,
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
  const analysis = analyzeNexusMessage(message, history);
  const generic = /quero entender direito|estou aqui para conversar|pode falar do seu dia|quer uma explicacao|quer uma explicação|nao entendi sua mensagem|não entendi sua mensagem/i.test(String(legacyReply || ''));
  if (generic || (!analysis.topic && analysis.intent !== 'statement' && analysis.confidence < 0.5)) {
    return analysis.fallbackReply;
  }
  return legacyReply;
}
