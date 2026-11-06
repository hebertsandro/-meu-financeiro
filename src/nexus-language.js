// NEXUS LANGUAGE — camada composicional de comunicação em português brasileiro.
// Interpreta intenção, contexto, pragmática e ambiguidade. Não é um LLM e não presume
// que uma palavra isolada revele o estado emocional ou a intenção real de alguém.

const fold = value => String(value || '').toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s!?.,'’-]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

const VARIANTS = {
  voce:['vc','cê','ce'], voces:['vcs'], porque:['pq','pk','porq','pqq'], que:['q'],
  tambem:['tb','tbm','tmb'], nao:['nn','n','naum'], hoje:['hj'], depois:['dps','dp'],
  agora:['agr','ag'], comigo:['cmg'], contigo:['ctg'], quando:['qnd','qdo'],
  quanto:['qto','qta','qts'], mesmo:['msm'], muito:['mt','mto','mta'], tudo:['td'],
  todos:['tds'], ninguem:['ngm','nmg'], obrigado:['obg','obgd','obgda'],
  valeu:['vlw'], beleza:['blz'], por favor:['pfv','pf'], queria:['qria'],
  estou:['to','tô','tou'], esta:['ta','tá'], certeza:['ctz'], verdade:['vdd'],
  nada:['nd'], demais:['dms'], saudades:['sdds'], mensagem:['msg','msgs'],
  meu deus:['mds'], papo reto:['pprt'], sei la:['sla'], relaxa:['rlx'],
  tamo junto:['tmj'], pode crer:['pdc'], demorou:['dmr'], brincadeira:['brinks'],
  zoeira:['zuera'], parceiro:['parça'], fim de semana:['fds'], parabens:['parabens'], ansiedade:['ansied']
};
const VARIANT_MAP = new Map(Object.entries(VARIANTS).flatMap(([canonical, variants]) =>
  variants.map(variant => [fold(variant), canonical])
));

export const NEXUS_LEXICON = [
  ...Object.entries(VARIANTS).map(([canonical, variants]) => ({
    canonical, variants, meanings:[canonical.replace(/_/g,' ')], acts:[], tone:'casual',
    ambiguity:['beleza','porque','fds','mds','pprt','sla'].includes(canonical)?'high':'low'
  })),
  ...[
    ['mano','vocativo informal'],['véi','vocativo ou surpresa'],['cara','vocativo'],['mó','intensificador'],
    ['slk','surpresa ou admiração'],['aff','frustração possível'],['eita','surpresa'],['vixi','surpresa ou preocupação'],
    ['poxa','empatia ou desapontamento'],['nossa','surpresa ou ênfase'],['top','avaliação positiva'],
    ['massa','avaliação positiva'],['show','aprovação'],['suave','tranquilidade ou concordância'],
    ['de boa','tranquilidade ou indiferença'],['fechou','acordo'],['tanto faz','indiferença ou flexibilidade'],
    ['faz o que quiser','permissão, frustração ou desistência'],['imagina','resposta a agradecimento ou minimização'],
    ['é sobre isso','concordância ou resignação'],['amostradinho','provocação informal'],['cringe','avaliação social'],
    ['flopou','não teve sucesso'],['hype','expectativa elevada'],['ranço','antipatia'],['shippar','torcer por casal'],
    ['f','expressão de respeito ou pesar'],['pprt','sinceridade'],['paia','ruim ou desagradável'],
    ['tá ligado','pedido de confirmação'],['qual foi','questionamento ou reprovação'],['papo','conversa'],
    ['vacilo','erro ou falta de consideração'],['mancada','atitude desagradável'],['dar um perdido','evitar alguém'],
    ['meter o louco','agir sem preocupação ou fingir'],['passar pano','defender ou minimizar erro'],
    ['ficar','envolvimento afetivo sem definição única'],['crush','pessoa por quem há interesse'],
    ['ghosting','interrupção de contato sem explicação'],['red flag','sinal de alerta'],['green flag','sinal positivo'],
    ['tóxico','padrão prejudicial, depende do contexto'],['recíproco','sentimento ou atitude correspondida'],
    ['indireta','mensagem não explícita dirigida a alguém'],['sarcasmo','ironia com possível crítica'],
    ['ironia','sentido diferente ou oposto ao literal'],['saudade','falta afetiva ou lembrança'],
    ['limite','fronteira pessoal'],['respeito','consideração pelos limites e dignidade'],
    ['confiança','segurança relacional'],['ciúme','receio de perder atenção ou vínculo'],
    ['insegurança','dúvida sobre si ou sobre uma situação'],['carinho','afeto demonstrado'],
    ['frieza','distanciamento percebido'],['sumir','interromper contato'],['visualizou','viu uma mensagem'],
    ['vácuo','não responder a uma mensagem'],['terminar','encerrar vínculo ou relação'],
    ['reconciliar','tentar reparar um conflito'],['discutir','ter conflito verbal'],['brigar','conflito'],
    ['desabafar','compartilhar algo que pesa'],['acolher','ouvir sem julgar'],['zoar','brincar ou provocar'],
    ['tirar onda','brincar ou provocar'],['debochar','ridicularizar'],['lacrar','buscar efeito ou aprovação social'],
    ['meme','conteúdo humorístico compartilhável'],['kkkk','risada escrita'],['hahaha','risada escrita'],
    ['rsrs','risada escrita'],['emoji','sinal expressivo digital'],['story','publicação temporária'],
    ['direct','mensagem privada em rede social'],['status','publicação ou estado'],['print','captura de tela'],
    ['trend','tendência digital'],['viralizar','espalhar-se amplamente'],['cancelar','reprovar publicamente'],
    ['ranço','antipatia'],['sdds','saudades'],['mds','surpresa ou ênfase'],['pprt','sinceridade'],['parabens','reconhecimento positivo'],['ansied','abreviação informal de ansiedade']
  ].map(([canonical, meaning])=>({canonical,variants:[],meanings:[meaning],acts:[],tone:'contextual',ambiguity:'medium'}))
];

const phrase = value => fold(value).replace(/[!?.,]+/g,' ').replace(/\s+/g,' ').trim();
const contains = (text, term) => (' '+phrase(text)+' ').includes(' '+phrase(term)+' ');
const tokenSet = text => new Set(phrase(text).split(' ').filter(Boolean));
const TOPIC_TERMS = {
  relacionamento:['namoro','namorada','namorado','relacionamento','ficante','crush','ciume','confianca','terminar','terminou','brigamos','casal','ex'],
  amizade:['amigo','amiga','amizade','grupo','fofoca','bullying','colega'],
  familia:['mae','pai','irmao','irma','familia','responsavel','pais'],
  escola:['escola','prova','estudar','professor','aula','enem','nota','colegio'],
  trabalho:['trabalho','emprego','chefe','salario','entrevista','curriculo'],
  financas:['dinheiro','gasto','despesa','divida','cartao','fatura','juros','salario'],
  tecnologia:['celular','computador','internet','aplicativo','site','codigo','programar','ia'],
  sentimentos:['triste','medo','ansioso','ansiedade','sozinho','inseguro','cansado','feliz'],
  saude:['saude','dor','sintoma','medico','remedio','sono'],
  lazer:['musica','filme','serie','anime','livro','jogo','futebol']
};
const ACTS = [
  ['greeting',/^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)( tudo bem| tudo bom| como voce esta| como esta)?$/],
  ['reciprocal_question',/^(e voce|e contigo|e com voce|como voce esta|tudo bem com voce)$/],
  ['gratitude',/^(obrigado|obrigada|valeu|muito obrigado|agradeco)( demais)?$/],
  ['apology',/^(desculpa|foi mal|perdao|me perdoa)$/],
  ['farewell',/^(tchau|ate mais|falou|fui|ate logo|boa noite)$/],
  ['agreement',/^(sim|concordo|exato|isso mesmo|verdade|pode ser|beleza|ok|certo|fechou)$/],
  ['disagreement',/^(nao|discordo|de jeito nenhum|nem pensar|nao e bem assim)$/],
  ['uncertainty',/^(nao sei|sei la|talvez|acho que|nao faco ideia)$/],
  ['humor',/^(kkkk+|kakaka+|hahaha+|haha+|rsrs+)$/],
  ['boundary',/\b(nao quero|nao gosto|para com|prefiro que nao|nao me sinto confortavel|me deixa em paz)\b/],
  ['request',/\b(me ajuda|me ajude|pode me ajudar|quero saber|me explica|me ensina|faz para mim)\b/],
  ['disclosure',/\b(eu sinto|estou sentindo|aconteceu comigo|hoje eu|eu passei por|preciso desabafar)\b/]
];

export function normalizeLanguageText(value='') {
  return phrase(value).split(' ').map(word => VARIANT_MAP.get(word) || word).join(' ').trim();
}

function topicsFor(text) {
  return Object.entries(TOPIC_TERMS).map(([topic,terms])=>({
    topic, score:terms.reduce((n,term)=>n+(contains(text,term)?1:0),0)
  })).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
}
function getUserTurns(history) {
  return (Array.isArray(history)?history:[]).filter(turn=>turn?.role==='user')
    .map(turn=>String(turn.content||turn.text||'')).filter(Boolean);
}
function detectIrony(text) {
  const t=phrase(text);
  const markers=['aham sei','nossa que novidade','parabens hein','que beleza','so que nao','confia','ta bom entao','claro que sim','imagina'];
  const cues=markers.filter(item=>contains(t,item));
  const contrast=/\b(otimo|maravilhoso|perfeito|adorei|amei)\b/.test(t) &&
    /\b(deu tudo errado|perdi|quebrou|atrasou|foi horrivel|ninguem respondeu)\b/.test(t);
  const laughter=/\b(kkk+|hahaha+|rsrs+)\b/.test(t);
  return {possible:cues.length>0||contrast, cues, contrast, laughter, confidence:cues.length||contrast?0.58:0.18};
}
function detectIndirectness(text) {
  const t=phrase(text);
  const patterns=[
    ['indirect_criticism',/\b(tem gente que|certas pessoas|engracado como|tem pessoas que)\b/],
    ['unspoken_need',/\b(queria que|seria bom se|ninguem percebe|deixa pra la|esquece)\b/],
    ['relationship_hint',/\b(nao vou correr atras|quem quer da um jeito|se importasse|tanto faz pra mim)\b/],
    ['double_meaning',/\b(duvido voce|vai nessa|aham|sei|ta bom)\b/]
  ];
  return patterns.filter(([,re])=>re.test(t)).map(([kind])=>kind);
}
function detectEmotion(text) {
  const lex={
    joy:['feliz','animado','empolgado','contente','amei','adorei'],
    sadness:['triste','chateado','pra baixo','desanimado','saudade','chorando'],
    anxiety:['ansioso','ansiedade','preocupado','nervoso','com medo'],
    anger:['com raiva','irritado','com odio','revoltado'],
    confusion:['confuso','perdido','nao entendi'],
    shame:['com vergonha','culpado','me sinto mal']
  };
  return Object.entries(lex).flatMap(([emotion,terms])=>terms.filter(term=>contains(text,term)).map(evidence=>({emotion,evidence})));
}
export function analyzeLanguage(message, history=[]) {
  const original=String(message||'');
  const normalized=normalizeLanguageText(original);
  const turns=getUserTurns(history);
  const prior=turns.slice(-5);
  const currentTopics=topicsFor(normalized);
  const previousTopics=topicsFor(prior.join(' '));
  const currentTopic=currentTopics[0]?.topic||null;
  const previousTopic=previousTopics[0]?.topic||null;
  const changedTopic=Boolean(currentTopic&&previousTopic&&currentTopic!==previousTopic&&currentTopics[0].score>=1);
  const acts=ACTS.filter(([,re])=>re.test(normalized)).map(([act])=>act);
  const laughter=/\b(kkkk+|kakaka+|hahaha+|haha+|rsrs+)\b/.test(normalized);
  const ambiguousPhrases=[];
  for(const item of ['faz o que quiser','tanto faz','ta bom entao','deixa pra la','imagina','beleza']){
    if(contains(normalized,item)) ambiguousPhrases.push({phrase:item,needsContext:true});
  }
  const unknownTokens=normalized.split(' ').filter(token=>token.length>3&&!NEXUS_LEXICON.some(entry=>entry.canonical===token||entry.variants.includes(token)));
  const priorAssistant=[...(Array.isArray(history)?history:[])].reverse().find(turn=>turn?.role==='assistant')?.content||'';
  const irony=detectIrony(normalized);
  const indirectness=detectIndirectness(normalized);
  const references=/(\b(ela|ele|eles|elas|isso|aquilo|essa|esse|dela|dele|la)\b)/.test(normalized);
  const repeatedTerms=[...tokenSet(normalized)].filter(token=>token.length>3&&prior.some(turn=>contains(turn,token)));
  const followUp=normalized.split(' ').length<=7&&(references||/^(e|mas|entao|por que|como assim|e agora|e depois|isso|ela|ele)\b/.test(normalized));
  return {
    original,normalized,tokens:normalized.split(' ').filter(Boolean),
    matchedEntries:NEXUS_LEXICON.filter(entry=>entry.variants.some(v=>contains(original,v))||contains(normalized,entry.canonical))
      .slice(0,30).map(({canonical,meanings,tone,ambiguity})=>({canonical,meanings,tone,ambiguity})),
    possibleActs:acts,emotions:detectEmotion(normalized),laughter,irony,indirectness,
    ambiguousPhrases,unknownTokens,topics:currentTopics,topic:currentTopic,previousTopic,
    changedTopic, references, repeatedTerms, followUp, contextAvailable:prior.length>0,
    previousAssistant, confidence:irony.possible||ambiguousPhrases.length?0.45:acts.length?0.78:currentTopic?0.62:0.25,
    caution:irony.possible||ambiguousPhrases.length>0||indirectness.length>0
  };
}

export function getLanguageResponse(message,history=[]) {
  const a=analyzeLanguage(message,history);
  const t=a.normalized;
  const prev=fold(a.previousAssistant);
  const askedDay=/como esta sendo seu dia|como foi seu dia|como esta seu dia/.test(prev);
  const askedHow=/como voce esta|como esta se sentindo/.test(prev);
  if(askedDay){
    if(/^(esta sendo bom|esta bom|esta otimo|esta legal|foi bom|foi legal)$/.test(t)) return 'Que bom saber disso! 😊 O que aconteceu de bom hoje?';
    if(/^(mais ou menos|assim assim|nem bom nem ruim|normal|nada demais)$/.test(t)) return 'Entendi! Tem dias que são mais neutros mesmo. Aconteceu algo específico ou foi só um dia comum?';
    if(/^(esta ruim|esta sendo ruim|foi ruim|nao muito bem)$/.test(t)) return 'Poxa, sinto muito. Quer me contar o que aconteceu? Estou acompanhando você.';
    if(/^(cansativo|foi cansativo|muito corrido)$/.test(t)) return 'Imagino que tenha sido puxado. O que mais tomou sua energia hoje?';
  }
  if(askedHow){
    if(/^(bem|muito bem|otimo|otima|tranquilo|tranquila|feliz|animado)$/.test(t)) return 'Que bom! 😊 O que te deixou assim hoje?';
    if(/^(mais ou menos|assim assim|nao sei)$/.test(t)) return 'Tudo bem não saber explicar de primeira. Quer me contar como foi seu dia até agora?';
    if(/^(mal|ruim|triste|cansado|cansada|ansioso|ansiosa)$/.test(t)) return 'Sinto muito que você esteja assim. Quer me contar o que aconteceu?';
  }
  if(a.changedTopic) return null; // deixa o motor principal responder ao novo assunto, sem forçar continuidade.
  if(a.irony.possible) return 'Pode ter ironia ou sarcasmo no que você escreveu, mas o tom depende do contexto. Você está falando literalmente ou quis dizer o contrário?';
  if(a.indirectness.length) return 'Parece que talvez exista uma mensagem indireta ou algo que você não quis dizer de forma explícita. Não quero presumir para quem ou sobre o quê. O que você gostaria que eu entendesse dessa frase?';
  if(a.ambiguousPhrases.length) return 'Essa expressão pode ter sentidos diferentes dependendo do tom e do que aconteceu antes. Você quis dizer isso de verdade, está chateado(a) ou foi uma brincadeira?';
  if(a.possibleActs.includes('greeting')) return 'Oii! 😊 Que bom conversar com você. Como você está hoje?';
  if(a.possibleActs.includes('reciprocal_question')) return 'Estou aqui, funcionando e pronta para conversar com você! 😊 E como está sendo seu dia?';
  if(a.possibleActs.includes('gratitude')) return 'Por nada! 💙 Fico feliz em poder ajudar.';
  if(a.possibleActs.includes('apology')) return 'Tudo bem. Obrigada por falar comigo. Quer me contar o que aconteceu?';
  if(a.possibleActs.includes('farewell')) return 'Até mais! 😊 Quando quiser continuar, estarei por aqui.';
  if(a.laughter) return 'KAKAKAKA 😄 Parece que você achou algo engraçado! O que aconteceu?';
  if(a.possibleActs.includes('uncertainty')) return 'Tudo bem não ter certeza agora. 💙 Qual parte está difícil de entender? Podemos pensar nisso por etapas.';
  if(a.possibleActs.includes('agreement')) return 'Entendi! Vou considerar isso na conversa. Quer acrescentar mais alguma coisa?';
  if(a.possibleActs.includes('disagreement')) return 'Entendi que você não concorda. Quero compreender seu ponto antes de continuar. O que você vê de diferente?';
  if(a.possibleActs.includes('boundary')) return 'Entendi seu limite e vou respeitá-lo. Não precisa explicar além do que se sentir confortável.';
  if(a.possibleActs.includes('request')) return null;
  if(a.emotions.length) return 'Percebi palavras que podem indicar um sentimento importante, mas não quero presumir como você está. O que aconteceu para você se sentir assim?';
  return null;
}
