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
  valeu:['vlw'], beleza:['blz'], 'por favor':['pfv','pf'], queria:['qria'],
  estou:['to','tô','tou'], esta:['ta','tá'], certeza:['ctz'], verdade:['vdd'],
  nada:['nd'], demais:['dms'], saudades:['sdds'], mensagem:['msg','msgs'],
  'meu deus':['mds'], 'papo reto':['pprt'], 'sei la':['sla'], relaxa:['rlx'],
  'tamo junto':['tmj'], 'pode crer':['pdc'], demorou:['dmr'], brincadeira:['brinks'],
  zoeira:['zuera'], parceiro:['parça'], 'fim de semana':['fds'], parabens:['parabens'], ansiedade:['ansied']
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
  ['greeting',/^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)( nexus)?( tudo bem| tudo bom| como voce esta| como esta| como vai)?[!?.,]*$/],
  ['reciprocal_question',/^(e voce|e contigo|e com voce|como voce esta|tudo bem com voce|tudo bem|tudo bom|como vai voce)[!?.,]*$/],
  ['gratitude',/^(obrigado|obrigada|valeu|muito obrigado|agradeco)( demais)?$/],
  ['apology',/^(desculpa|foi mal|perdao|me perdoa)$/],
  ['farewell',/^(tchau|ate mais|falou|fui|ate logo|boa noite)$/],
  ['agreement',/^(sim|concordo|exato|isso mesmo|verdade|pode ser|beleza|ok|certo|fechou)$/],
  ['disagreement',/^(nao|discordo|de jeito nenhum|nem pensar|nao e bem assim)$/],
  ['uncertainty',/^(nao sei|sei la|talvez|acho que|nao faco ideia)$/],
  ['humor',/^(kkkk+|(?:ka){2,}k*|hahaha+|haha+|rsrs+)$/],
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
function historyText(turn) {
  return String(turn?.content ?? turn?.text ?? '');
}
function getConversationContext(history=[]) {
  const turns=Array.isArray(history)?history:[];
  const lastAssistant=[...turns].reverse().find(turn=>turn?.role==='assistant');
  const userTurns=turns.filter(turn=>turn?.role==='user');
  const previousUser=userTurns.length>1?historyText(userTurns[userTurns.length-2]):'';
  const lastQuestion=historyText(lastAssistant);
  const questionType=/como voce esta( hoje)?|como esta se sentindo|como voce se sente/.test(fold(lastQuestion))
    ? 'wellbeing'
    : /como esta sendo seu dia|como foi seu dia|como esta seu dia/.test(fold(lastQuestion))
      ? 'day'
      : /o que aconteceu|o que houve|quer me contar/.test(fold(lastQuestion))
        ? 'event'
        : /qual deles|qual delas|de quem voce esta falando/.test(fold(lastQuestion))
          ? 'clarification'
          : /pode explicar|pode dar um exemplo|o que voce quis dizer/.test(fold(lastQuestion))
            ? 'clarification'
            : /quer uma explicacao|quer uma orientacao|quer ajuda/.test(fold(lastQuestion))
              ? 'choice'
              : lastQuestion.includes('?') ? 'open_question' : null;
  const recentUserText=userTurns.slice(-12).map(historyText).join(' ');
  const recentTopics=topicsFor(recentUserText);
  const currentUser=historyText(userTurns[userTurns.length-1]);
  const priorUser=historyText(userTurns[userTurns.length-2]);
  return {
    lastAssistant:lastQuestion,
    previousUser:priorUser,
    currentUser,
    questionType,
    activeTopic:recentTopics[0]?.topic||null,
    recentTopics,
    userTurnCount:userTurns.length,
    hasConversation:userTurns.length>1||Boolean(lastAssistant)
  };
}

// Estado conversacional explícito: resume o diálogo como uma situação em evolução,
// em vez de tratar o histórico como um saco de mensagens sem ordem.
export function buildConversationState(history=[]) {
  const turns=(Array.isArray(history)?history:[]).filter(turn=>turn?.role==='user'||turn?.role==='assistant')
    .map(turn=>({...turn,text:historyText(turn)})).filter(turn=>turn.text.trim()).slice(-60);
  const userTurns=turns.filter(turn=>turn.role==='user');
  const assistantTurns=turns.filter(turn=>turn.role==='assistant');
  const lastUser=userTurns.at(-1)?.text||'';
  const lastAssistant=assistantTurns.at(-1)?.text||'';
  const lastRole=turns.at(-1)?.role||null;
  const lastUserFold=fold(lastUser);
  const lastAssistantFold=fold(lastAssistant);
  const topicChange=/\b(muda(r)? de assunto|troca(r)? de assunto|vamos falar sobre outra coisa|outro assunto|deixa esse assunto|esquece esse assunto)\b/.test(lastUserFold);
  const farewell=/^(tchau|ate mais|falou|fui|ate logo|boa noite|vou nessa|preciso ir)[!. ]*$/.test(lastUserFold);
  const assistantFarewell=/\b(ate mais|quando quiser continuar|estarei por aqui|boa noite)\b/.test(lastAssistantFold);
  const topicTrail=[];
  for(const turn of userTurns){
    const text=fold(turn.text);
    if(/\b(muda(r)? de assunto|troca(r)? de assunto|vamos falar sobre outra coisa|outro assunto|deixa esse assunto)\b/.test(text)){
      topicTrail.push({topic:null,action:'topic_change',source:turn.text});
      continue;
    }
    const found=topicsFor(text)[0]?.topic||null;
    if(found) topicTrail.push({topic:found,action:'topic_mentioned',source:turn.text});
  }
  const activeTopic=topicChange?null:(topicTrail.at(-1)?.topic||null);
  const lastAssistantQuestion=lastAssistant.includes('?')?lastAssistant:null;
  const pendingQuestion=lastRole==='assistant'&&lastAssistantQuestion
    ? {text:lastAssistantQuestion,status:'awaiting_user_response'}
    : null;
  const correctionTurn=[...userTurns].reverse().find(turn=>
    /\b(na verdade|quis dizer|me expressei mal|me confundi|corrigindo|o correto e|nao foi .* foi)\b/.test(fold(turn.text))
  );
  const references=/\b(ela|ele|eles|elas|isso|aquilo|essa|esse|dela|dele|la|de novo|como eu falei|aquilo que eu disse)\b/.test(lastUserFold);
  const answeredAssistantQuestion=Boolean(lastAssistantQuestion&&lastRole==='user');
  const status=farewell?'ended':assistantFarewell&&lastRole==='assistant'?'ended':'active';
  return {
    status,
    activeTopic,
    topicChanged:topicChange,
    topicTrail:topicTrail.slice(-12),
    pendingQuestion,
    lastAssistantQuestion:lastAssistantQuestion?{
      text:lastAssistantQuestion,
      status:answeredAssistantQuestion?'user_has_replied':'awaiting_user_response'
    }:null,
    latestCorrection:correctionTurn?{text:correctionTurn.text,status:'latest_user_correction'}:null,
    references:{present:references,source:lastUser},
    lastUserMessage:lastUser,
    lastAssistantMessage:lastAssistant,
    turnCount:userTurns.length,
    lastSpeaker:lastRole,
    conversationEnded:status==='ended',
    endingEvidence:farewell?'user_farewell':assistantFarewell?'assistant_farewell':null
  };
}

// Memória semântica leve: registra fatos relatados e ordem temporal sem tratá-los
// como verdades verificadas nem transformar sequência em causalidade.
export function buildConversationMemory(history=[]) {
  const turns=(Array.isArray(history)?history:[])
    .filter(turn=>turn?.role==='user')
    .map(historyText).filter(Boolean).slice(-30);
  const joined=turns.join(' ').toLocaleLowerCase('pt-BR');
  const people=[
    ['namorada',/\b(minha namorada|a namorada|minha parceira)\b/],
    ['namorado',/\b(meu namorado|o namorado|meu parceiro)\b/],
    ['amiga',/\b(minha amiga|a amiga)\b/],
    ['amigo',/\b(meu amigo|o amigo)\b/],
    ['mãe',/\b(minha mae|minha mãe)\b/],
    ['pai',/\b(meu pai)\b/],
    ['irmã',/\b(minha irma|minha irmã)\b/],
    ['irmão',/\b(meu irmao|meu irmão)\b/]
  ].filter(([,re])=>re.test(fold(joined))).map(([person])=>person);
  const eventPatterns=[
    ['distanciamento',/\b(esta distante|anda distante|ficou distante|se afastou|esta mais fria|esta mais frio)\b/],
    ['menos_conversa',/\b(quase nao fala|nao conversa|parou de falar|fala menos|responde menos)\b/],
    ['mudanca_escola',/\b(mudou de escola|trocou de escola|nova escola)\b/],
    ['mudanca_cidade',/\b(mudou de cidade|foi morar em outra cidade)\b/],
    ['conflito',/\b(brigou|brigamos|discutiu|discutimos|tivemos uma briga)\b/],
    ['termino',/\b(terminou comigo|terminamos|terminou o namoro)\b/],
    ['contato_interrompido',/\b(sumiu|parou de responder|me deixou no vacuo|nao respondeu)\b/],
    ['reaproximacao',/\b voltou a falar|se reaproximou|voltamos a conversar\b/]
  ];
  const events=eventPatterns.filter(([,re])=>re.test(fold(joined))).map(([event])=>event);
  const temporalMarkers=['depois que','depois de','desde que','a partir de','antes de','quando','naquela epoca','nesse periodo'];
  const temporalEvidence=turns.flatMap((text,index)=>{
    const normalized=fold(text);
    const marker=temporalMarkers.find(item=>normalized.includes(item));
    return marker?[{turn:index+1,marker,text:text.trim()}]:[];
  });
  const causalMarkers=['porque','por causa de','ja que','devido a'];
  const causalEvidence=turns.flatMap((text,index)=>{
    const normalized=fold(text);
    const marker=causalMarkers.find(item=>normalized.includes(item));
    return marker?[{turn:index+1,marker,text:text.trim(),status:'relato_nao_verificado'}]:[];
  });
  const facts=turns.slice(-30).map((text,index)=>({text:text.trim(),sequence:Math.max(1,turns.length-7)+index}));
  return {
    people:[...new Set(people)],
    events:[...new Set(events)],
    facts,
    temporalEvidence,
    causalEvidence,
    activeTopic:topicsFor(joined)[0]?.topic||null,
    turnCount:turns.length,
    limitations:'Memória baseada apenas no que foi escrito; sequência temporal não comprova causa.'
  };
}

function composeTimelineReply(message, history, memory) {
  const text=fold(message);
  const hasTemporalStart=/^(depois que|depois de|desde que|a partir de|quando|foi depois que)\b/.test(text);
  const hasRelationshipContext=memory.activeTopic==='relacionamento'||
    memory.people.includes('namorada')||memory.people.includes('namorado');
  const refersToSchool=/mudou de escola|trocou de escola|nova escola/.test(text);
  if(hasTemporalStart&&hasRelationshipContext) {
    const detail=refersToSchool?'ela ter mudado de escola':String(message).trim().replace(/[.!?]+$/,'');
    return 'Entendi. Você está situando o distanciamento depois de ' + detail + '. Isso mostra a ordem em que as coisas aconteceram, mas ainda não confirma que uma coisa causou a outra. O que mudou no contato ou na rotina de vocês naquela época?';
  }
  return null;
}

// Modelo de situação: fatos relatados, estado atual, incertezas e correções.
// Cada afirmação permanece atribuída ao relato do usuário, não como verdade objetiva.
export function analyzeSituation(history=[]) {
  const turns=(Array.isArray(history)?history:[]).filter(turn=>turn?.role==='user').map(historyText).filter(Boolean).slice(-30);
  const facts=[];
  const corrections=[];
  const patterns=[
    ['relationship_distance',/\b(namorada|namorado|parceira|parceiro)\b.*\b(distante|fria|frio|afastada|afastado)\b/],
    ['communication_drop',/\b(quase nao conversa|quase nao fala|parou de falar|responde menos|nao me responde)\b/],
    ['school_change',/\b(mudou de escola|trocou de escola|nova escola)\b/],
    ['conflict',/\b(brigamos|briguei|brigou|discutimos|discuti|tivemos uma briga)\b/],
    ['positive_feeling',/\b(estou feliz|to feliz|estou bem|to bem)\b/],
    ['negative_feeling',/\b(estou triste|to triste|estou mal|to mal|estou ansioso|to ansioso)\b/]
  ];
  turns.forEach((raw,index)=>{
    const text=fold(raw);
    const correction=/\b(na verdade|quis dizer|me expressei mal|me confundi|corrigindo|o correto e|nao foi .* foi )\b/.test(text);
    if(correction){
      const previous=turns.slice(0,index).reverse().find(item=>item.trim());
      corrections.push({turn:index+1,text:raw,previousStatement:previous||null,status:'user_correction'});
      if(previous){
        const previousText=fold(previous);
        for(const fact of facts){
          if(fact.status==='active' && (previousText.includes(fact.key.replace(/_/g,' ')) || fact.source===previous)){
            fact.status='superseded_by_correction';
            fact.supersededAt=index+1;
          }
        }
      }
    }
    for(const [key,re] of patterns){
      if(re.test(text)){
        const negated=/\b(nao|nunca|jamais)\b/.test(text);
        facts.push({
          key,source:raw,turn:index+1,
          polarity:negated?'denied':'reported',
          status:'active',
          certainty:'user_reported'
        });
      }
    }
  });
  const activeFacts=facts.filter(fact=>fact.status==='active');
  const latestByKey={};
  for(const fact of activeFacts) latestByKey[fact.key]=fact;
  return {
    facts,
    currentFacts:Object.values(latestByKey),
    corrections,
    people:buildConversationMemory((Array.isArray(history)?history:[])).people,
    topic:buildConversationMemory((Array.isArray(history)?history:[])).activeTopic,
    unresolved:corrections.length?['Confirmar qual versão corrigida deve substituir a anterior']:[],
    turnCount:turns.length,
    principle:'Correções explícitas mais recentes prevalecem; relatos não são tratados como fatos verificados.'
  };
}

function composeCorrectionReply(message, situation) {
  const text=fold(message);
  const isCorrection=/\b(na verdade|quis dizer|me expressei mal|me confundi|corrigindo|o correto e)\b/.test(text);
  if(!isCorrection) return null;
  const previous=situation.corrections.at(-1)?.previousStatement;
  if(previous){
    return 'Entendi, obrigado por corrigir. Vou atualizar minha interpretação e considerar o que você acabou de esclarecer, em vez de continuar usando a informação anterior. Só para confirmar: a versão correta é “' + String(message).trim().replace(/[.!?]+$/,'') + '”, certo?';
  }
  return 'Entendi que você está corrigindo uma informação anterior. Vou corrigir minha interpretação e dar prioridade ao que acabou de esclarecer. Qual é a versão correta que devo considerar?';
}

// Motor de raciocínio contextual: separa pergunta, evidências, lacunas e próximos passos.
export function analyzeContextualReasoning(message, history=[]) {
  const normalized=fold(String(message||''));
  const situation=analyzeSituation(history);
  const memory=buildConversationMemory(history);
  const current=topicsFor(normalized)[0]?.topic||null;
  const asksCause=/\b(por que|porque|qual o motivo|o que fez|o que pode ter causado)\b/.test(normalized);
  const asksAction=/\b(o que eu faco|como devo agir|o que fazer|qual minha atitude|como resolver)\b/.test(normalized);
  const asksMeaning=/\b(o que isso significa|o que quer dizer|como interpretar|isso quer dizer)\b/.test(normalized);
  const asksPrediction=/\b(vai dar certo|sera que|será que|o que vai acontecer|tem chance)\b/.test(normalized);
  const asksComparison=/\b(ou|melhor|pior|qual a diferenca|vale mais a pena)\b/.test(normalized);
  const evidence=situation.currentFacts.map(f=>({fact:f.key,source:f.source,certainty:f.certainty,polarity:f.polarity}));
  const unknowns=[];
  if(memory.people.length===0 && /ela|ele|essa pessoa|essa pessoa/.test(normalized)) unknowns.push('identidade da pessoa mencionada');
  if(asksCause&&!evidence.length) unknowns.push('acontecimentos concretos que antecederam a situação');
  if(asksAction) unknowns.push('objetivo que a pessoa deseja alcançar e limites envolvidos');
  if(asksPrediction) unknowns.push('informações suficientes para estimar cenários futuros');
  const possibleExplanations=[];
  if(asksCause){
    if(evidence.some(e=>e.fact==='school_change')) possibleExplanations.push('a mudança de rotina ou de disponibilidade pode ter influenciado o contato');
    if(evidence.some(e=>e.fact==='conflict')) possibleExplanations.push('algum conflito pode ter afetado a comunicação');
    if(evidence.some(e=>e.fact==='communication_drop')) possibleExplanations.push('pode haver uma mudança na forma ou frequência de comunicação');
    possibleExplanations.push('também podem existir motivos pessoais que ainda não foram mencionados');
  }
  const reasoningType=asksCause?'cause':asksAction?'action':asksMeaning?'meaning':asksPrediction?'prediction':asksComparison?'comparison':/\?$/.test(String(message||''))?'question':'reflection';
  return {
    reasoningType,topic:current||memory.activeTopic||situation.topic,
    evidence,possibleExplanations:[...new Set(possibleExplanations)],
    unknowns:[...new Set(unknowns)],
    requiresClarification:unknowns.length>0,
    avoidCertainty:asksCause||asksPrediction,
    userGoal:asksAction?'understand_next_step':asksCause?'understand_possible_causes':asksMeaning?'interpret_situation':'understand_question',
    principle:'As hipóteses são possibilidades, não conclusões; evidências novas podem alterar a interpretação.'
  };
}

function composeReasoningReply(message, reasoning) {
  const clean=String(message||'').trim();
  if(reasoning.reasoningType==='cause' && reasoning.topic==='relacionamento'){
    if(reasoning.possibleExplanations.length){
      return 'Não dá para saber o motivo com certeza só pelo que temos até agora. Algumas possibilidades são: '+reasoning.possibleExplanations.join('; ')+'. O que sabemos é o que você observou; ainda falta entender como a outra pessoa está vendo a situação. Você percebeu alguma mudança concreta além da frequência das conversas?';
    }
    return 'Posso ajudar a investigar, mas não quero inventar um motivo. O que aconteceu antes dessa mudança? Houve alguma conversa, discussão ou alteração na rotina?';
  }
  if(reasoning.reasoningType==='action' && reasoning.topic==='relacionamento'){
    return 'Antes de decidir, vale separar três coisas: o que aconteceu de fato, o que você está imaginando que pode significar e o que você gostaria que mudasse. Um primeiro passo seguro costuma ser conversar com calma, falar do que você percebeu sem acusar e ouvir o lado da outra pessoa. O que você quer principalmente: entender o que houve, recuperar a proximidade ou definir um limite?';
  }
  if(reasoning.reasoningType==='prediction'){
    return 'Não consigo prever isso com segurança. Posso ajudar a pensar em cenários: o que favorece que dê certo, o que pode dificultar e o que está ao seu alcance. Qual é o resultado que você espera?';
  }
  if(reasoning.reasoningType==='meaning' && reasoning.topic==='relacionamento'){
    return 'Isso pode ter mais de uma interpretação. É importante distinguir o comportamento que você observou da intenção que está atribuindo à pessoa. O que ela fez ou disse exatamente, e em que contexto?';
  }
  return null;
}

export function analyzeLanguage(message, history=[]) {
  const original=String(message||'');
  const normalized=normalizeLanguageText(original);
  const turns=getUserTurns(history);
  const prior=turns.slice(-6);
  const context=getConversationContext(history);
  const conversationState=buildConversationState(history);
  const memory=buildConversationMemory(history);
  const situation=analyzeSituation(history);
  const reasoning=analyzeContextualReasoning(message,history);
  const currentTopics=topicsFor(normalized);
  const previousTopics=topicsFor(prior.slice(0,-1).join(' '));
  const currentTopic=currentTopics[0]?.topic||null;
  const previousTopic=previousTopics[0]?.topic||context.activeTopic;
  const changedTopic=Boolean(currentTopic&&previousTopic&&currentTopic!==previousTopic&&currentTopics[0].score>=1);
  const acts=ACTS.filter(([,re])=>re.test(normalized)).map(([act])=>act);
  const laughter=/(?:\bkkk+\b|\b(?:ka){2,}k*\b|\bhahaha+\b|\bhaha+\b|\brsrs+\b)/.test(normalized);
  const ambiguousPhrases=[];
  for(const item of ['faz o que quiser','tanto faz','ta bom entao','deixa pra la','esquece','imagina','beleza']){
    if(contains(normalized,item)) ambiguousPhrases.push({phrase:item,needsContext:true});
  }
  const unknownTokens=normalized.split(' ').filter(token=>token.length>3&&!NEXUS_LEXICON.some(entry=>entry.canonical===token||entry.variants.includes(token)));
  const irony=detectIrony(normalized);
  const indirectness=detectIndirectness(normalized);
  const references=/\b(ela|ele|eles|elas|isso|aquilo|essa|esse|dela|dele|la)\b/.test(normalized);
  const repeatedTerms=[...tokenSet(normalized)].filter(token=>token.length>3&&prior.slice(0,-1).some(turn=>contains(turn,token)));
  const followUp=normalized.split(' ').length<=10&&(references||/^(e|mas|entao|por que|como assim|e agora|e depois|isso|ela|ele|tambem|ai)\b/.test(normalized));
  const answerKind=/^(eu )?(estou |to |tou )?(bem|muito bem|otimo|otima|tranquilo|tranquila|feliz|animado|animada)$/.test(normalized.replace(/m{2,}$/,'m'))?'positive'
    :/^(eu )?(estou |to |tou )?(mal|ruim|triste|cansado|cansada|ansioso|ansiosa|preocupado|preocupada)$/.test(normalized)?'negative'
    :/^(mais ou menos|assim assim|normal|nada demais|nao sei)$/.test(normalized)?'neutral'
    :/^(sim|nao|claro|com certeza|acho que sim|acho que nao)$/.test(normalized)?'yes_no'
    :null;
  const primaryAct=acts.includes('greeting')?'greeting'
    :acts.includes('reciprocal_question')?'reciprocal_question'
    :acts.includes('farewell')?'farewell'
    :acts.includes('gratitude')?'gratitude'
    :acts.includes('apology')?'apology'
    :acts.includes('boundary')?'boundary'
    :acts.includes('request')?'request'
    :acts.includes('disclosure')?'disclosure'
    :acts.includes('humor')?'humor'
    :answerKind?'answer'
    :acts.includes('agreement')?'agreement'
    :acts.includes('disagreement')?'disagreement'
    :acts.includes('uncertainty')?'uncertainty'
    :currentTopic?'topic_message'
    :String(original).includes('?')?'question'
    :'statement';
  return {
    original,normalized,tokens:normalized.split(' ').filter(Boolean),
    conversationState,
    matchedEntries:NEXUS_LEXICON.filter(entry=>entry.variants.some(v=>contains(original,v))||contains(normalized,entry.canonical))
      .slice(0,30).map(({canonical,meanings,tone,ambiguity})=>({canonical,meanings,tone,ambiguity})),
    possibleActs:acts,primaryAct,emotions:detectEmotion(normalized),laughter,irony,indirectness,
    ambiguousPhrases,unknownTokens,topics:currentTopics,topic:currentTopic,previousTopic,
    changedTopic,references,repeatedTerms,followUp,answerKind,context,memory,situation,reasoning,
    contextAvailable:context.hasConversation,
    previousAssistant:context.lastAssistant,confidence:irony.possible||ambiguousPhrases.length?0.45:acts.length?0.78:currentTopic?0.62:0.25,
    caution:irony.possible||ambiguousPhrases.length>0||indirectness.length>0
  };
}
export function getLanguageResponse(message,history=[]) {
  const a=analyzeLanguage(message,history);
  const t=a.normalized;
  const prev=fold(a.previousAssistant);
  // Um cumprimento no início não deve esconder um pedido ou pergunta que vem depois.
  // A camada social só assume a mensagem quando o restante também é uma saudação.
  const greetingPrefix=/^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)(?: nexus)?\s*/;
  const greetingRemainder=t.replace(greetingPrefix,'').trim();
  const onlySocialGreeting=!greetingRemainder || /^(tudo bem|tudo bom|tudo certo|como voce esta|como esta|como vai)$/.test(greetingRemainder);
  if(greetingPrefix.test(t) && !onlySocialGreeting) return null;
  const askedDay=/como esta sendo seu dia|como foi seu dia|como esta seu dia/.test(prev);
  const askedHow=/como voce esta( hoje)?|como esta se sentindo|como voce se sente|como voce ta( hoje)?/.test(prev);
  // Respostas espontâneas podem vir com "estou", abreviações e letras repetidas
  // ("bemmm", "bemm"). Removemos o prefixo antes de interpretar o estado.
  const answer= t.replace(/^(eu )?(estou|to|tou) /,'').replace(/m{2,}$/,'m');

  // Prioridade máxima para atos sociais explícitos. Uma saudação não deve cair
  // no fallback genérico nem ser confundida com uma pergunta sem contexto.
  const directGreeting=/^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|fala|salve|hey)( nexus)?( tudo bem| tudo bom| tudo certo| como voce esta| como esta| como vai)?$/.test(t);
  const directSocialQuestion=/^(e voce|e contigo|e com voce|como voce esta|tudo bem com voce|tudo bem|tudo bom|como vai voce)$/.test(t);
  if(directGreeting) return 'Oii! 😊 Tudo bem por aqui, obrigada por perguntar! E você, como está hoje?';
  if(directSocialQuestion) return 'Estou aqui, funcionando e pronta para conversar com você! 😊 E como está sendo seu dia?';
  if(askedDay){
    if(/^(esta sendo bom|esta bom|esta otimo|esta legal|foi bom|foi legal)$/.test(t)) return 'Que bom saber disso! 😊 O que aconteceu de bom hoje?';
    if(/^(mais ou menos|assim assim|nem bom nem ruim|normal|nada demais)$/.test(t)) return 'Entendi! Parece um dia mais ou menos; tem dias que são mais neutros mesmo. Aconteceu algo específico ou foi só um dia comum?';
    if(/^(esta ruim|esta sendo ruim|foi ruim|nao muito bem)$/.test(t)) return 'Poxa, sinto muito. Quer me contar o que aconteceu? Estou acompanhando você.';
    if(/^(cansativo|foi cansativo|muito corrido)$/.test(t)) return 'Imagino que tenha sido puxado. O que mais tomou sua energia hoje?';
  }
  if(askedHow){
    if(/^(bem|muito bem|otimo|otima|tranquilo|tranquila|feliz|animado|animada)$/.test(answer)) return 'Que bom! 😊 Fico feliz em saber. Como está sendo seu dia?';
    if(/^(mais ou menos|assim assim|nao sei)$/.test(answer)) return 'Entendi. Tem dias que a gente fica assim mesmo. Aconteceu alguma coisa ou está tudo só meio normal hoje?';
    if(/^(mal|ruim|triste|cansado|cansada|ansioso|ansiosa|preocupado|preocupada)$/.test(answer)) return 'Poxa, sinto muito. Quer me contar o que aconteceu? Estou aqui para te ouvir.';
  }
  // Respostas curtas a perguntas anteriores devem ser interpretadas pelo papel
  // que exercem na conversa, não como frases isoladas.
  const correctionReply=composeCorrectionReply(message,a.situation);
  const reasoningReply=composeReasoningReply(message,a.reasoning);
  if(reasoningReply) return reasoningReply;
  if(correctionReply) return correctionReply;
  const timelineReply=composeTimelineReply(message,history,a.memory);
  if(timelineReply) return timelineReply;
  if(a.context.questionType==='event' && /^(nada|nada nao|nao sei|foi isso|so isso)$/.test(t)) {
    return 'Tudo bem. Não precisa contar mais do que quiser. Quer conversar sobre outra coisa ou prefere ficar nesse assunto?';
  }
  if(a.context.questionType==='clarification' && a.followUp) {
    return 'Obrigado por esclarecer. Vou usar esse detalhe para continuar, sem voltar a perguntar a mesma coisa.';
  }
  if(a.changedTopic) return null; // deixa o motor principal responder ao novo assunto, sem forçar continuidade.
  if(a.irony.possible) return 'Pode ter ironia ou sarcasmo no que você escreveu, mas o tom depende do contexto. Você está falando literalmente ou quis dizer o contrário?';
  if(a.indirectness.length) return 'Parece que talvez exista uma mensagem indireta ou algo que você não quis dizer de forma explícita. Não quero presumir para quem ou sobre o quê. O que você gostaria que eu entendesse dessa frase?';
  if(a.ambiguousPhrases.length) return 'Essa expressão pode ter sentidos diferentes dependendo do tom e do que aconteceu antes. Você quis dizer isso de verdade, está chateado(a) ou foi uma brincadeira?';

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
