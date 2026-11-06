// NEXUS LANGUAGE — biblioteca inicial de comunicação cotidiana em português brasileiro.
// É uma camada de interpretação, não um dicionário completo nem um modelo de linguagem.

const fold = value => String(value || '').toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N\s!?.,'’-]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

export const NEXUS_LEXICON = [
  { canonical:'voce', variants:['vc','cê','ce'], meanings:['pronome de tratamento informal'], acts:[], tone:'neutral', ambiguity:'low' },
  { canonical:'porque', variants:['pq','pk','porq'], meanings:['causa','pergunta causal'], acts:['explanation'], tone:'neutral', ambiguity:'medium' },
  { canonical:'tambem', variants:['tb','tbm','tmb'], meanings:['adição','concordância'], acts:['agreement','addition'], tone:'neutral', ambiguity:'low' },
  { canonical:'nao', variants:['nn','n','naum'], meanings:['negação'], acts:['disagreement','boundary'], tone:'neutral', ambiguity:'low' },
  { canonical:'hoje', variants:['hj'], meanings:['tempo presente'], acts:[], tone:'neutral', ambiguity:'low' },
  { canonical:'depois', variants:['dps','dp'], meanings:['tempo posterior'], acts:[], tone:'neutral', ambiguity:'low' },
  { canonical:'agora', variants:['agr'], meanings:['tempo presente'], acts:[], tone:'neutral', ambiguity:'low' },
  { canonical:'beleza', variants:['blz'], meanings:['saudação','confirmação','estado positivo'], acts:['greeting','agreement'], tone:'casual', ambiguity:'high' },
  { canonical:'valeu', variants:['vlw'], meanings:['agradecimento','despedida informal'], acts:['gratitude','farewell'], tone:'casual', ambiguity:'medium' },
  { canonical:'obrigado', variants:['obg','obgd','obgda'], meanings:['agradecimento'], acts:['gratitude'], tone:'warm', ambiguity:'low' },
  { canonical:'por favor', variants:['pfv','pf'], meanings:['pedido educado'], acts:['request'], tone:'polite', ambiguity:'low' },
  { canonical:'estou', variants:['to','tô','tou'], meanings:['estado atual'], acts:[], tone:'casual', ambiguity:'low' },
  { canonical:'esta', variants:['ta','tá'], meanings:['forma informal do verbo estar'], acts:[], tone:'casual', ambiguity:'low' },
  { canonical:'muito', variants:['mt','mto','mta'], meanings:['intensidade'], acts:[], tone:'casual', ambiguity:'low' },
  { canonical:'ninguém', variants:['ngm','nmg'], meanings:['ausência de pessoas'], acts:[], tone:'neutral', ambiguity:'low' },
  { canonical:'meu deus', variants:['mds'], meanings:['surpresa','espanto','ênfase'], acts:['surprise'], tone:'expressive', ambiguity:'high' },
  { canonical:'saudades', variants:['sdds'], meanings:['falta afetiva','lembrança'], acts:['disclosure'], tone:'emotional', ambiguity:'medium' },
  { canonical:'demais', variants:['dms'], meanings:['intensidade elevada'], acts:[], tone:'casual', ambiguity:'low' },
  { canonical:'papo reto', variants:['pprt'], meanings:['pedido de sinceridade','ênfase'], acts:['boundary','request'], tone:'direct', ambiguity:'medium' },
  { canonical:'sei la', variants:['sla'], meanings:['incerteza','desconhecimento'], acts:['uncertainty'], tone:'casual', ambiguity:'high' },
  { canonical:'cara', variants:['mano','véi','vei'], meanings:['vocativo informal','ênfase'], acts:[], tone:'casual', ambiguity:'high' },
  { canonical:'risada', variants:['kkk','kkkk','kakaka','hahaha','haha','rsrs'], meanings:['riso','leveza','nervosismo possível'], acts:['humor'], tone:'playful', ambiguity:'high' },
  { canonical:'aff', variants:['afff'], meanings:['irritação','cansaço','frustração'], acts:['emotion'], tone:'expressive', ambiguity:'high' },
  { canonical:'slk', variants:['seloko'], meanings:['surpresa','admiração','espanto'], acts:['surprise'], tone:'slang', ambiguity:'high' }
];

const VARIANT_MAP = new Map(NEXUS_LEXICON.flatMap(entry =>
  entry.variants.map(variant => [fold(variant), entry.canonical])
));

export function normalizeLanguageText(value = '') {
  return fold(value).split(' ').map(word => VARIANT_MAP.get(word) || word).join(' ').replace(/\s+/g, ' ').trim();
}

const ACT_PATTERNS = [
  ['greeting', /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|fala|salve)\b/],
  ['reciprocal_question', /^(e voce|e vc|e contigo|e com voce|como voce esta|tudo bem com voce)\b/],
  ['gratitude', /^(obrigado|obrigada|valeu|muito obrigado|agradeco)\b/],
  ['apology', /^(desculpa|foi mal|perdao|me perdoa)\b/],
  ['farewell', /^(tchau|ate mais|falou|fui|ate logo)\b/],
  ['agreement', /^(sim|concordo|exato|isso mesmo|verdade|pode ser|beleza|ok|certo)\b/],
  ['disagreement', /^(nao|discordo|de jeito nenhum|nem pensar)\b/],
  ['uncertainty', /^(nao sei|sei la|talvez|acho que|nao faço ideia)\b/],
  ['request', /\b(me ajuda|me ajude|pode me ajudar|quero saber|me explica|me ensina|faz para mim)\b/],
  ['boundary', /\b(nao quero|nao gosto|para com|prefiro que nao|nao me sinto confortavel)\b/],
  ['humor', /^(risada|kkkk+|kakaka+|hahaha+|haha+|rsrs+)$/],
  ['disclosure', /\b(eu sinto|estou sentindo|aconteceu comigo|hoje eu|eu passei por)\b/]
];

const EMOTIONS = {
  joy:['feliz','animado','animada','empolgado','contente','amei','adorei'],
  sadness:['triste','chateado','chateada','pra baixo','desanimado','saudade'],
  anxiety:['ansioso','ansiosa','preocupado','preocupada','nervoso','com medo'],
  anger:['com raiva','irritado','irritada','com odio','revoltado'],
  confusion:['confuso','confusa','perdido','perdida','nao entendi'],
  shame:['com vergonha','culpado','culpada','me sinto mal']
};

export function analyzeLanguage(message, history = []) {
  const original = String(message || '');
  const normalized = normalizeLanguageText(original);
  const tokens = normalized.split(' ').filter(Boolean);
  const matched = NEXUS_LEXICON.filter(entry =>
    entry.variants.some(v => new RegExp('(^|\\s)' + fold(v).replace(/[.*+?^{}()|[\]\\]/g,'\\$&') + '(?=\\s|$)').test(fold(original)))
  );
  const acts = ACT_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(([act]) => act);
  const emotions = Object.entries(EMOTIONS).flatMap(([emotion, words]) =>
    words.filter(word => normalized.includes(fold(word))).map(word => ({ emotion, evidence:word }))
  );
  const laughter = /\b(kkkk+|kakaka+|hahaha+|haha+|rsrs+)\b/.test(normalized);
  const ambiguousPhrases = [];
  if (/\bfaz o que quiser\b/.test(normalized)) ambiguousPhrases.push({ phrase:'faz o que quiser', possibilities:['permissão genuína','frustração','desistência','ironia'], needsContext:true });
  if (/\btanto faz\b/.test(normalized)) ambiguousPhrases.push({ phrase:'tanto faz', possibilities:['indiferença','flexibilidade','desânimo'], needsContext:true });
  const recent = Array.isArray(history) ? history.slice(-6) : [];
  const previousAssistant = [...recent].reverse().find(turn => turn?.role === 'assistant')?.content || '';
  const unknownTokens = tokens.filter(token => token.length > 3 && !NEXUS_LEXICON.some(entry => entry.canonical === token || entry.variants.includes(token)));
  return {
    original, normalized, tokens, matchedEntries:matched.map(({canonical,meanings,acts,tone,ambiguity})=>({canonical,meanings,acts,tone,ambiguity})),
    possibleActs:acts, emotions, laughter, ambiguousPhrases, unknownTokens,
    contextAvailable:recent.length > 0, previousAssistant,
    confidence: ambiguousPhrases.length ? 0.35 : acts.length ? 0.78 : 0.25,
    caution: emotions.length > 0 || ambiguousPhrases.length > 0
  };
}

export function getLanguageResponse(message, history = []) {
  const analysis = analyzeLanguage(message, history);
  const text = analysis.normalized;
  if (analysis.possibleActs.includes('greeting')) return 'Oii! 😊 Que bom conversar com você. Como você está hoje?';
  if (analysis.possibleActs.includes('reciprocal_question')) return 'Estou aqui, funcionando e pronta para conversar com você! 😊 E como está sendo seu dia?';
  if (analysis.possibleActs.includes('gratitude')) return 'Por nada! 💙 Fico feliz em poder ajudar.';
  if (analysis.possibleActs.includes('apology')) return 'Tudo bem. Obrigada por falar comigo. Quer me contar o que aconteceu?';
  if (analysis.possibleActs.includes('farewell')) return 'Até mais! 😊 Quando quiser continuar, estarei por aqui.';
  if (analysis.possibleActs.includes('humor') || analysis.laughter) return 'KAKAKAKA 😄 Parece que algo teve graça! O que aconteceu?';
  if (analysis.ambiguousPhrases.length) return 'Essa expressão pode ter mais de um sentido dependendo do tom e do que aconteceu antes. Você está falando com sinceridade, está chateado(a) ou foi uma brincadeira?';
  if (analysis.possibleActs.includes('uncertainty')) return 'Tudo bem não ter certeza agora. 💙 Quer me contar qual parte está difícil de entender? Podemos pensar nisso por etapas.';
  if (analysis.possibleActs.includes('agreement')) return 'Entendi! Vou considerar isso na conversa. Quer acrescentar mais alguma coisa?';
  if (analysis.possibleActs.includes('disagreement')) return 'Entendi que você não concorda. Quero compreender seu ponto antes de continuar. O que você vê de diferente?';
  if (analysis.possibleActs.includes('boundary')) return 'Entendi seu limite e vou respeitá-lo. Quer me explicar o que seria mais confortável para você?';
  if (analysis.possibleActs.includes('request')) return null;
  if (analysis.emotions.length) return 'Percebi palavras que podem indicar um sentimento importante, mas não quero presumir como você está. O que aconteceu para você se sentir assim?';
  return null;
}
