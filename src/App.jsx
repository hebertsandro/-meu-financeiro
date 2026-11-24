import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import './nexus-arcade-expansions.css';
import SpaceNexusGame from './SpaceNexus.jsx';
import FinanceFlapGame from './FinanceFlap.jsx';
// Após uma atualização do site, o celular pode ter a versão antiga na memória e pedir um arquivo que mudou.
// Nesse caso recarregamos uma única vez para pegar a versão nova.
const lazyRetry = (load) => React.lazy(() => load().then(m => { try { sessionStorage.removeItem('mf_chunk_reload'); } catch {} return m; }).catch(err => {
  let already = false;
  try { already = sessionStorage.getItem('mf_chunk_reload') === '1'; sessionStorage.setItem('mf_chunk_reload', '1'); } catch {}
  if (!already) { window.location.reload(); return new Promise(() => {}); }
  throw err;
}));
const NexusSocial = lazyRetry(() => import('./NexusSocial'));
const PlayerPostGrid = lazyRetry(() => import('./NexusSocial').then(module => ({ default: module.PlayerPostGrid })));
const NexusCompetition = lazyRetry(() => import('./NexusCompetition'));
const NexusArcadeGames = lazyRetry(() => import('./NexusArcadeGames'));
import NexusGameLibrary from './NexusGameLibrary';
let lootWarnAt=0;
const NexusProgression = lazyRetry(() => import('./NexusProgression'));
const NexusCollection = lazyRetry(() => import('./NexusProgression').then(m=>({default:m.NexusCollection})));
const PushNotifications = lazyRetry(() => import('./PushNotifications'));
const ReportsChart = lazyRetry(() => import('./ReportsChart.jsx'));
const SalaryCenter = lazyRetry(() => import('./SalaryAndReports.jsx').then(module => ({ default: module.SalaryCenter })));
const ReportsDashboard = lazyRetry(() => import('./SalaryAndReports.jsx').then(module => ({ default: module.ReportsDashboard })));
import {
  Activity, ArrowLeft, ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChartNoAxesCombined, Search, SlidersHorizontal, Power, Flag,
  Check, ChevronRight, CircleDollarSign, CreditCard, LayoutDashboard, LockKeyhole, Pencil, CalendarClock, Bot, Sparkles, Send,
  Gamepad2, Trophy, Coins, Brain, Gift, ClipboardList, Star, Zap, Flame, MessageCircle, Newspaper, Shield, ChevronDown,
  LogOut, Menu, Plus, ReceiptText, ShieldCheck, Target, TrendingUp, Wallet, X, Users, Ban, UserCheck, KeyRound, RefreshCw, Trash2
} from 'lucide-react';

const brl = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = () => localDate();
const monthStart = () => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`;
const ADMIN_EMAIL = 'hebertsandro877@gmail.com'; // Apenas controla a exibição; a Edge Function valida o acesso no servidor.
const menu = [
  ['Visão geral',LayoutDashboard,'overview'],['Cartões e compromissos',CreditCard,'cards'],
  ['Movimentações',Activity,'transactions'],['Planejamento',Target,'planning'],
  ['Relatórios',ChartNoAxesCombined,'reports'],['Salário e 13º',Wallet,'salary'],['Jogos',Gamepad2,'games'],['Competição',Trophy,'competition'],['Oportunidades',Gift,'opportunities']
];
const financeMenu=menu.filter(([,Icon,key])=>['overview','transactions','cards','planning','reports','salary'].includes(key));
const nexusMenu=menu.filter(([,Icon,key])=>['games','competition','opportunities'].includes(key));
const socialMenu=[['Conversas',MessageCircle,'social-conversations'],['Feed',Newspaper,'social-feed']];


const gameQuestions = [
 {category:"ORÇAMENTO",question:"Você recebeu R$ 1.000 e gastou R$ 750. Quanto sobrou?",options:["R$ 150","R$ 250","R$ 350"],correct:1,explanation:"R$ 1.000 − R$ 750 = R$ 250. Acompanhar entradas e saídas mostra o que realmente sobra."},
 {category:"PARCELAMENTO",question:"Uma compra de R$ 600 será dividida em 6 parcelas iguais, sem juros. Quanto fica cada parcela?",options:["R$ 60","R$ 100","R$ 120"],correct:1,explanation:"R$ 600 ÷ 6 = R$ 100 por parcela. Confira se cabe no orçamento."},
 {category:"RESERVA",question:"Qual atitude ajuda a criar uma reserva de emergência?",options:["Guardar um valor possível todo mês","Usar todo o limite do cartão","Esperar sobrar muito dinheiro"],correct:0,explanation:"Guardar um valor realista e recorrente ajuda a construir uma reserva."},
 {category:"ASSINATURAS",question:"Uma assinatura custa R$ 30 por mês. Quanto representa em um ano?",options:["R$ 180","R$ 300","R$ 360"],correct:2,explanation:"R$ 30 × 12 = R$ 360. Pequenos valores recorrentes também pesam."},
 {category:"CARTÃO",question:"O que significa pagar apenas o mínimo da fatura?",options:["Quitar toda a dívida","Deixar parte da fatura para financiar com juros","Aumentar o limite automaticamente"],correct:1,explanation:"O saldo restante entra no crédito rotativo ou em parcelamento, com juros."},
 {category:"JUROS",question:"Você pegou R$ 200 emprestados e devolveu R$ 220. Quanto pagou de juros?",options:["R$ 10","R$ 20","R$ 30"],correct:1,explanation:"R$ 220 − R$ 200 = R$ 20 de juros."},
 {category:"METAS",question:"Uma meta é juntar R$ 500. Você já guardou R$ 175. Quanto falta?",options:["R$ 275","R$ 325","R$ 375"],correct:1,explanation:"R$ 500 − R$ 175 = R$ 325."},
 {category:"CONSUMO",question:"Antes de comprar algo por impulso, qual atitude é mais prudente?",options:["Comparar com o orçamento e esperar um pouco","Parcelar sem olhar a fatura","Comprar porque está em promoção"],correct:0,explanation:"Uma pausa e a comparação com o orçamento ajudam a evitar compras impulsivas."},
 {category:"INFLAÇÃO",question:"Quando os preços sobem e seu dinheiro compra menos, isso é:",options:["Inflação","Deflação","Investimento"],correct:0,explanation:"Inflação é o aumento generalizado dos preços e reduz o poder de compra."},
 {category:"PIX",question:"Uma transferência via Pix para desconhecido deve ser feita:",options:["Após conferir destinatário e dados","Só pelo nome exibido","Sem conferir, se houver urgência"],correct:0,explanation:"Confira nome, instituição e valor antes de confirmar qualquer transferência."},
 {category:"GOLPES",question:"Alguém pede seu código de autenticação por mensagem. O que fazer?",options:["Enviar rapidamente","Não compartilhar e confirmar pelo canal oficial","Publicar para pedir ajuda"],correct:1,explanation:"Códigos de autenticação são pessoais. Nunca compartilhe."},
 {category:"INVESTIMENTO",question:"Qual é uma característica importante antes de escolher um investimento?",options:["Entender risco, prazo e liquidez","Escolher só pela promessa de retorno alto","Investir todo o dinheiro de uma vez"],correct:0,explanation:"Risco, prazo e liquidez devem combinar com seu objetivo."},
 {category:"DESCONTO",question:"Um produto de R$ 100 tem desconto de 10%. Qual o preço final?",options:["R$ 80","R$ 90","R$ 95"],correct:1,explanation:"10% de R$ 100 são R$ 10; preço final: R$ 90."},
 {category:"RENDA",question:"Qual é a diferença entre receita e lucro de um negócio?",options:["São sempre iguais","Lucro é o que sobra após descontar custos e despesas","Receita é sempre o dinheiro guardado"],correct:1,explanation:"Lucro considera o que sobra depois dos custos e despesas."},
 {category:"ORÇAMENTO",question:"Se suas despesas são maiores que suas receitas, seu orçamento está:",options:["Superavitário","Equilibrado","Deficitário"],correct:2,explanation:"Quando sai mais dinheiro do que entra, há déficit."},
 {category:"FATURA",question:"Por que é importante acompanhar a data de fechamento do cartão?",options:["Para planejar compras e entender em qual fatura entram","Para cancelar automaticamente parcelas","Para não precisar pagar a fatura"],correct:0,explanation:"O fechamento ajuda a prever em qual fatura uma compra será cobrada."},
 {category:"EMERGÊNCIA",question:"Uma reserva de emergência deve priorizar:",options:["Liquidez e baixo risco","Retorno máximo a qualquer custo","Dinheiro bloqueado por muitos anos"],correct:0,explanation:"A reserva precisa estar acessível quando surgir um imprevisto."},
 {category:"PARCELAS",question:"Uma compra de R$ 480 em 8 parcelas sem juros custa quanto por mês?",options:["R$ 40","R$ 60","R$ 80"],correct:1,explanation:"R$ 480 ÷ 8 = R$ 60 por mês."},
 {category:"PLANEJAMENTO",question:"Qual é um bom primeiro passo para organizar as finanças?",options:["Anotar receitas e despesas","Ignorar gastos pequenos","Usar crédito para cobrir tudo"],correct:0,explanation:"Conhecer entradas e saídas dá base para planejar."},
 {category:"SEGURANÇA",question:"Onde é mais seguro buscar informações sobre uma cobrança bancária suspeita?",options:["No link enviado por desconhecido","No aplicativo ou canal oficial do banco","Respondendo com sua senha"],correct:1,explanation:"Use sempre o aplicativo ou os canais oficiais, sem clicar em links suspeitos."}
];

function generateNexusReply(question, finance={}, history=[]) {
  // NEXUS CORE — motor local de linguagem por regras, contexto e conhecimento estruturado.
  // Não usa APIs, modelos externos, serviços pagos ou envia a conversa para outro servidor.
  const raw = String(question || '').trim();
  const normalize = value => String(value || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s?.,!]/gu,' ')
    .replace(/\s+/g,' ').trim();
  // Tradutor de linguagem informal: expande abreviações comuns antes da interpretação.
  // Mantém a mensagem original em "raw" para exibição; só a versão interna é normalizada.
  const expandInformal = value => {
    const dictionary = {
      'vc':'voce','vcs':'voces','cê':'voce','ce':'voce',' vcs':' voces',
      'pq':'porque','pqq':'porque','porq':'porque','pk':'porque',
      'q':'que','oq':'o que','oql':'o que','qq':'que que',
      'tb':'tambem','tbm':'tambem','tmb':'tambem','tamb':'tambem',
      'nn':'nao','n':'nao','naum':'nao','num':'nao',
      'hj':'hoje','hje':'hoje','hr':'hora','hrs':'horas',
      'dps':'depois','dp':'depois','agr':'agora','ag':'agora',
      'cmg':'comigo','ctg':'contigo','c/':'com','p/':'para',
      ' obg ':' obrigado ','obgd':'obrigado','obgda':'obrigada','vlw':'valeu',
      'blz':'beleza','bjs':'beijos','bj':'beijo','flw':'falou',
      'msg':'mensagem','msgs':'mensagens','qnd':'quando','qd':'quando',
      'qto':'quanto','qta':'quanta','qts':'quantos','qtas':'quantas',
      'msm':'mesmo','mt':'muito','mto':'muito','mta':'muita','mtooo':'muito',
      'td':'tudo','tds':'todos','pprt':' papo reto ','sdds':'saudades',
      'fds':'fim de semana','mds':'meu deus','slk':'cê é louco',
      'pqpp':'caramba','pfv':'por favor','pf':'por favor',
      'nd':'nada','ngm':'ninguem','nmg':'ninguem','alguem':'alguem',
      'eh':'e','ehh':'e'
    };
    return String(value || '').toLocaleLowerCase('pt-BR')
      .replace(/(^|[^\p{L}\p{N}])([\p{L}\p{N}]+)(?=$|[^\p{L}\p{N}])/gu,
        (full,before,word) => before + (dictionary[word] || word))
      .replace(/\b(to|tô|tou)\b/giu,'estou')
      .replace(/\b(ta|tá)\b/giu,'esta')
      .replace(/\b(pro|pra)\b/giu,'para')
      .replace(/\b(p vcs|pra vcs)\b/giu,'para voces')
      .replace(/\b(nao|n)\s+([aeiou])\b/giu,'nao $2')
      .replace(/([!?])\1{1,}/g,'$1')
      .replace(/\s+/g,' ').trim();
  };
  const q = normalize(expandInformal(raw));
  const words = q.split(/\s+/).filter(Boolean);
  const searchableText = q.replace(/[?.,!]/g,' ').replace(/\s+/g,' ').trim();
  const has = (...terms) => terms.some(term => {
    const phrase = normalize(term).replace(/[?.,!]/g,' ').replace(/\s+/g,' ').trim();
    return phrase.length > 0 && (' '+searchableText+' ').includes(' '+phrase+' ');
  });
  const match = regex => regex.test(q);
  const money = brl;
  const transactions = Array.isArray(finance.transactions) ? finance.transactions : [];
  const cards = Array.isArray(finance.cards) ? finance.cards : [];
  const debts = Array.isArray(finance.debts) ? finance.debts : [];
  const goals = Array.isArray(finance.goals) ? finance.goals : [];
  const installments = Array.isArray(finance.installments) ? finance.installments : [];
  const previous = Array.isArray(history) ? history.slice(-12) : [];
  const historyBeforeCurrent = previous.length && previous[previous.length-1].role === 'user' ? previous.slice(0,-1) : previous;
  const lastUser = [...historyBeforeCurrent].reverse().find(m => m.role === 'user')?.content || '';
  const lastAssistant = [...previous].reverse().find(m => m.role === 'assistant')?.content || '';
  const userTurns = previous.filter(m => m.role === 'user').length;
  const monthKey = new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
  const monthTx = transactions.filter(t => String(t.date || '').slice(0,7) === monthKey);
  const sum = (list, predicate) => list.filter(predicate).reduce((total,item) => total + Number(item.amount || 0),0);
  const income = sum(monthTx,t=>t.type==='entrada');
  const expenses = sum(monthTx,t=>t.type==='gasto');
  const allIncome = sum(transactions,t=>t.type==='entrada');
  const allExpenses = sum(transactions,t=>t.type==='gasto');
  const pendingDebts = debts.filter(d => normalize(d.status) !== 'pago');
  const debtTotal = sum(pendingDebts,()=>true);
  const cardLimit = cards.reduce((s,c)=>s+Number(c.limit || c.limit_amount || 0),0);
  const cardUsed = cards.reduce((s,c)=>s+Number(c.used || 0),0);
  const activeParts = installments.filter(i=>Number(i.paid || i.paid_count || 0)<Number(i.count || i.installment_count || 0));
  const monthlyParts = activeParts.reduce((s,i)=>s+Number(i.amount || i.total_amount || 0)/Math.max(1,Number(i.count || i.installment_count || 1)),0);
  const categories = monthTx.filter(t=>t.type==='gasto').reduce((acc,t)=>{
    const key=t.category || 'Outros'; acc[key]=(acc[key]||0)+Number(t.amount||0); return acc;
  },{});
  const topCategory = Object.entries(categories).sort((a,b)=>b[1]-a[1])[0];
  const name = String(finance.profile?.name || '').trim().split(/\s+/)[0];
  const greet = name ? name+', ' : '';
  const answer = (text) => text;
  const ask = (text, questionText='O que você acha?') => text+'\n\n'+questionText;
  // MEMÓRIA DE REFERÊNCIAS: acompanha pessoas, assuntos e acontecimentos mencionados
  // nos turnos recentes para interpretar "ela", "ele", "isso", "aquilo" e perguntas elípticas.
  const recentUserMessages = historyBeforeCurrent.filter(m=>m.role==='user').slice(-6).map(m=>String(m.content||''));
  const recentAssistantMessages = previous.filter(m=>m.role==='assistant').slice(-4).map(m=>String(m.content||''));
  const recentConversationText = recentUserMessages.join(' ').toLocaleLowerCase('pt-BR');
  const referenceLexicon = [
    {id:'namorada',terms:['minha namorada','a namorada','namorada','ela']},
    {id:'namorado',terms:['meu namorado','o namorado','namorado','ele']},
    {id:'mae',terms:['minha mae','minha mãe','mae','mãe']},
    {id:'pai',terms:['meu pai','pai']},
    {id:'amigo',terms:['meu amigo','minha amiga','amigo','amiga']},
    {id:'professor',terms:['professor','professora']},
    {id:'prova',terms:['prova','avaliação','avaliacao','teste']},
    {id:'escola',terms:['escola','sala de aula','colégio','colegio']},
    {id:'trabalho',terms:['emprego','trabalho','chefe','entrevista','vaga']},
    {id:'dinheiro',terms:['dinheiro','gastos','dívida','divida','cartão','cartao','fatura']},
    {id:'site',terms:['site','aplicativo','app','sistema','código','codigo']}
  ];
  const recentReferences = referenceLexicon
    .map(item=>({...item,hits:item.terms.filter(term=>recentConversationText.includes(term))}))
    .filter(item=>item.hits.length>0)
    .sort((a,b)=>Math.max(...b.hits.map(x=>x.length))-Math.max(...a.hits.map(x=>x.length)));
  const hasPronounReference = /\b(ela|ele|eles|elas|isso|isto|aquilo|essa|esse|essa pessoa|aquele|aquela)\b/.test(q);
  const isEllipticalFollowUp = /^(e\s+)?(ela|ele|isso|aquilo|essa|esse|e agora|e depois|por que|porque|o que faço|oq faço|como assim|é normal|isso mesmo)[?! .]*$/.test(q)
    || /\b(e\s+ela|e\s+ele|e\s+isso|por que ela|por que ele|o que faço agora|o que eu faço agora|isso e normal|isso é normal)\b/.test(q);
  const recentTopicWords = [
    ['relacionamento',['namorada','namorado','namoro','relacionamento','ciúme','ciume','briga','brigamos']],
    ['estudos',['prova','escola','estudar','matéria','materia','matemática','matematica','professor']],
    ['família',['mãe','mae','pai','família','familia','irmão','irmao']],
    ['amizades',['amigo','amiga','amizade','bullying']],
    ['trabalho',['emprego','trabalho','chefe','entrevista','vaga']],
    ['dinheiro',['dinheiro','gastos','dívida','divida','cartão','cartao','fatura']],
    ['tecnologia',['site','aplicativo','código','codigo','celular','computador']]
  ];
  const recentTopic = recentTopicWords
    .map(([topic,terms])=>({topic,score:terms.filter(term=>recentConversationText.includes(term)).length}))
    .sort((a,b)=>b.score-a.score)[0];
  const referenceSubject = recentReferences[0]?.id || null;
  const hasRecentContext = recentUserMessages.length>0;
  const referenceContext = {
    subject:referenceSubject,
    topic:recentTopic?.score>0?recentTopic.topic:null,
    recentUserMessages,
    lastAssistantPrompt:recentAssistantMessages.at(-1)||'',
    ambiguous:recentReferences.length>1 && recentReferences[0].hits.length===recentReferences[1].hits.length
  };
  const referenceFollowUp = isEllipticalFollowUp || (hasPronounReference && words.length<=7);

  const topicContinuation = /^(sim|nao|não|isso|exato|verdade|pode ser|talvez|acho que|e agora|como assim|por que|porque|pq|continua|me explica|entendi|mas|tambem|também|kkkk+|rs+|haha+)[.!? ]*$/.test(q)
    || /^(e se|mas e|e quando|nesse caso|por exemplo)\b/.test(q);
  const greeting = /^(oi|ola|e ai|opa|hey|bom dia|boa tarde|boa noite|tudo bem|tudo bom)\b/.test(q);
  const questionMark = raw.includes('?');
  const short = words.length <= 4;
  const emotional = match(/\b(ansios|ansiedade|cansad|sobrecarreg|triste|desanim|medo|preocup|frustrad|sozinh|solidao|chatead|nervos|pressionad|chorando|mal hoje|nao aguento)\b/);
  const urgentRisk = match(/\b(quero morrer|me matar|tirar minha vida|suicid|me machucar|me cortar|acabar com tudo|nao quero mais viver)\b/);

  // Responde a referências curtas usando o antecedente recente, sem fingir certeza.
  if (referenceFollowUp && hasRecentContext) {
    if (referenceContext.ambiguous) {
      return 'Quero acompanhar direitinho. 💙 Quando você diz isso, está falando de '+referenceContext.topic+' ou de outra pessoa/situação que apareceu na conversa?';
    }
    if (referenceContext.subject || referenceContext.topic) {
      const subject=referenceContext.subject?(' '+referenceContext.subject):'';
      const topic=referenceContext.topic||'assunto anterior';
      if (/\b(e agora|o que faço|oq faço|o que eu faço|como devo agir)\b/.test(q)) {
        return 'Pensando no que você contou sobre '+topic+subject+', eu não quero sugerir algo sem entender a parte que mudou. O próximo passo mais seguro é separar o que você sabe do que está supondo. O que aconteceu depois da última coisa que você me contou?';
      }
      if (/\b(é normal|isso é normal|e normal)\b/.test(q)) {
        return 'Sobre '+topic+subject+': pode haver várias explicações, então não dá para afirmar que é normal ou concluir algo só com o contexto atual. Qual comportamento ou acontecimento específico você quer avaliar?';
      }
      return 'Estou relacionando sua mensagem ao que você comentou sobre '+topic+subject+'. Para não interpretar errado, você quer saber por que isso aconteceu, o que fazer agora ou como conversar sobre a situação?';
    }
  }

  // 0. Habilidades fundamentais: matemática simples e conversa social natural.
  // Avalia apenas expressões aritméticas permitidas; nunca usa eval() ou executa código.
  const mathPrompt = raw.match(/^(?:quanto\s+(?:e|é)\s+|calcule\s+|resolva\s+)?([\d\s.,()+*/-]+)[?!. ]*$/i);
  if (mathPrompt && /\d/.test(mathPrompt[1]) && /[+*/-]/.test(mathPrompt[1])) {
    const expr = mathPrompt[1].replace(/,/g,'.').trim();
    if (/^[\d\s.()+*/-]+$/.test(expr)) {
      const tokens = expr.match(/\d+(?:\.\d+)?|[()+*/-]/g) || [];
      let index = 0;
      const factor = () => {
        const t = tokens[index++];
        if (t === '+') return factor();
        if (t === '-') return -factor();
        if (t === '(') { const v = expression(); if (tokens[index++] !== ')') throw new Error('parentese'); return v; }
        if (!t || !/^\d+(?:\.\d+)?$/.test(t)) throw new Error('numero');
        return Number(t);
      };
      const term = () => { let v=factor(); while(tokens[index]==='*'||tokens[index]==='/'){const op=tokens[index++],n=factor();if(op==='/'&&n===0)throw new Error('zero');v=op==='*'?v*n:v/n;} return v; };
      const expression = () => { let v=term(); while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],n=term();v=op==='+'?v+n:v-n;} return v; };
      try {
        const answer=expression();
        if(index===tokens.length&&Number.isFinite(answer)) return 'Vamos calcular! 😊\n\n'+expr+' = '+Number(answer.toFixed(8)).toLocaleString('pt-BR')+'\n\nSe quiser, posso mostrar o passo a passo.';
      } catch {}
    }
  }
  if (/^(como\s+vc\s+ta|como\s+voce\s+ta|como\s+você\s+está|como\s+esta\s+voce|como\s+está\s+você|e\s+ai\s+como\s+vc\s+ta)[?! .]*$/i.test(raw)) {
    return 'Tô por aqui, pronta para conversar! 😊 Obrigada por perguntar. E você, como está de verdade hoje? Seu dia está tranquilo ou aconteceu alguma coisa?';
  }
  if (/^(to|tô|estou)\s+bem\s*(e\s+(vc|voce|você))?[?! .]*$/i.test(raw)) {
    return 'Que bom saber! 😊 Meu papel é estar aqui para te ajudar e conversar. O que você está fazendo hoje?';
  }

  // 1. Segurança, acolhimento e limites — especialmente importante para usuários jovens.
  if (urgentRisk) return 'Sinto muito que esteja doendo tanto. Obrigada por me contar. 💙 Você não precisa enfrentar isso sozinho(a), e sua segurança vem primeiro. Se existe risco de você se machucar agora, procure imediatamente um adulto de confiança que esteja perto, fique acompanhado(a) e ligue para o SAMU (192) ou vá a uma UPA/pronto-socorro. No Brasil, o CVV atende pelo 188, 24 horas. Você está em perigo neste momento ou já pensou em como faria isso?';
  if (match(/\b(abuso|abusad|violencia|violento|ameac|assedi|chantag|me bate|apanho|tenho medo dele|tenho medo dela)\b/)) return 'Quero levar isso a sério. Você merece estar em segurança e não tem culpa por alguém ultrapassar seus limites. 💙 Se houver perigo imediato, vá para perto de uma pessoa segura e procure ajuda de um adulto de confiança ou dos serviços de emergência. Se você for menor de idade, não precisa resolver isso sozinho(a). Quer me contar apenas o que se sentir confortável em compartilhar?';
  if (match(/\b(nudes|foto intima|foto íntima|me pediu foto|vazou foto|exposicao intima|sextorsao)\b/)) return 'Isso é delicado, e você não precisa enviar, produzir ou manter qualquer imagem íntima para provar carinho. Se alguém estiver pressionando ou ameaçando divulgar algo, não pague nem envie mais conteúdo; preserve as mensagens e procure um adulto de confiança e ajuda oficial. Se você for menor de idade, peça apoio de um responsável seguro. Quer me contar se alguém está te pressionando agora?';
  // NEXUS CONTEXT ENGINE v2 — constrói uma leitura da frase antes de escolher a resposta.
  // Extrai sinais de assunto, ação, negação, tempo, pergunta e intenção.
  // Usa mais de um indício para reduzir respostas disparadas por uma palavra isolada.
  const frame = (() => {
    const text = ' '+q+' ';
    const includes = phrase => text.includes(' '+normalize(phrase)+' ') || text.includes(' '+normalize(phrase)+'? ');
    const topicDefinitions = [
      {id:'relationship',label:'relacionamento',terms:['namorada','namorado','namoro','relacionamento','ficante','crush','terminar','terminou','terminamos','ciume','ciúme','confianca','confiança','me ignorou','nao responde','não responde','brigamos','discuti','estranha','estranho','distante','fria','frio','mudou comigo','me evita','parou de falar','sumiu']},
      {id:'school',label:'estudos',terms:['escola','prova','estudar','estudo','materia','matéria','matematica','matemática','enem','professor','professora','nota','trabalho escolar','faculdade','aula','exercicio','exercício']},
      {id:'family',label:'família',terms:['familia','família','mae','mãe','pai','irmao','irmão','irma','irmã','responsavel','responsável','em casa']},
      {id:'friendship',label:'amizades',terms:['amigo','amiga','amizade','grupo de amigos','me excluiu','me excluem','fofoca','bullying']},
      {id:'work',label:'trabalho',terms:['emprego','trabalho','chefe','entrevista','curriculo','currículo','salario','salário','jovem aprendiz','vaga']},
      {id:'finance',label:'dinheiro',terms:['dinheiro','gasto','gastos','salario','salário','cartao','cartão','divida','dívida','juros','fatura','economizar','poupar','renda']},
      {id:'technology',label:'tecnologia',terms:['celular','computador','internet','aplicativo','site','programa','programar','codigo','código','javascript','html','wifi','wi-fi']},
      {id:'health',label:'saúde e bem-estar',terms:['sono','dormir','cansaco','cansaço','ansiedade','triste','dor','alimentacao','alimentação','exercicio','exercício','saude','saúde']},
      {id:'science',label:'ciências',terms:['fotossintese','fotossíntese','gravidade','atomo','átomo','celula','célula','evolucao','evolução','energia','planeta','quimica','química','fisica','física']},
      {id:'society',label:'história e sociedade',terms:['historia','história','guerra','revolucao','revolução','globalizacao','globalização','democracia','politica','política','geografia','desigualdade']}
    ];
    const ranked = topicDefinitions.map(topic => {
      const hits = topic.terms.filter(term=>includes(term));
      return {...topic,score:hits.reduce((n,term)=>n+(term.includes(' ')?2:1),0),hits};
    }).sort((a,b)=>b.score-a.score);
    const primary = ranked[0]?.score>0 ? ranked[0] : null;
    const negated = /\b(nao|nunca|jamais|nem)\b/.test(q);
    const question = questionMark || /^(como|porque|por que|pq|o que|oq|qual|quais|quando|onde|quem|quanto|quantos)\b/.test(q);
    const request = /\b(me ajuda|ajuda|pode me|poderia|quero saber|quero entender|me explica|explique|como faco|como faço|o que faco|o que faço|o que fazer|devo|vale a pena)\b/.test(q);
    const personal = /\b(eu|meu|minha|comigo|me|estou|to|tô|fui|senti|aconteceu|ontem|hoje)\b/.test(q);
    const temporal = /\b(ontem|hoje|amanha|amanhã|agora|desde|faz dias|semana passada|ultimamente)\b/.test(q);
    const asksStep = /\b(passo a passo|mostra como|me ensina|ensina do zero)\b/.test(q);
    const intent = asksStep?'learn':request?'help':question?'question':personal?'personal_story':'statement';
    const confidence = primary ? Math.min(1,primary.score/3 + (question?0.1:0) + (personal?0.1:0)) : 0;
    return {text:q,words,primary,ranked,intent,negated,question,request,personal,temporal,confidence};
  })();

  // Se há sinais suficientes, responde ao significado combinado — não a um termo solto.
  if (frame.primary && (frame.primary.score >= 2 || (frame.primary.score >= 1 && frame.personal && ['relationship','school','family','friendship','health'].includes(frame.primary.id)))) {
    const topic=frame.primary.id;
    if (topic==='relationship' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='personal_story')) {
      return 'Entendi que você está falando de relacionamento e parece haver uma situação específica por trás disso. 💙 Não vou presumir o que a outra pessoa pensa nem quem está certo. O que aconteceu, o que você percebeu de diferente e o que você gostaria que acontecesse agora?';
    }
    if (topic==='school' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='personal_story'||frame.intent==='learn')) {
      return 'Entendi: o assunto são seus estudos. Vamos localizar exatamente o que você precisa. É uma matéria ou questão que não entendeu, uma prova para se preparar, uma dificuldade com alguém na escola ou organização do tempo? Se mandar o exercício ou o conteúdo, posso explicar por etapas.';
    }
    if (topic==='family' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='personal_story')) {
      return 'Parece que isso envolve alguém da sua família. Quero entender o que foi dito ou feito, sem tirar conclusões precipitadas. Foi uma discussão, uma regra com a qual você não concorda ou algo que fez você se sentir magoado(a)? Você se sente seguro(a) em casa?';
    }
    if (topic==='friendship' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='personal_story')) {
      return 'Entendi que a situação envolve amizade. Ser deixado de lado ou ter um conflito pode mexer bastante com a gente. O que aconteceu concretamente: alguém falou algo, te excluiu de alguma coisa ou vocês se desentenderam?';
    }
    if (topic==='work' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='learn')) {
      return 'O assunto é trabalho ou oportunidade profissional. Posso ajudar com currículo, primeiro emprego, entrevista, direitos básicos e comparação de propostas. Você está procurando uma vaga, participando de uma seleção ou tentando resolver algo no trabalho?';
    }
    if (topic==='finance' && (frame.intent==='help'||frame.intent==='question')) {
      return 'Entendi que sua pergunta envolve dinheiro. Para não responder outra coisa, vou separar: você quer fazer uma conta, entender uma dívida ou juros, organizar gastos, controlar cartão ou planejar uma economia? Se mandar os valores, faço o cálculo com você.';
    }
    if (topic==='technology' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='learn')) {
      return 'Entendi que sua dúvida é sobre tecnologia. Posso explicar como algo funciona ou ajudar a resolver um problema. Qual aparelho, aplicativo ou código está envolvido, o que você tentou fazer e o que aconteceu?';
    }
    if (topic==='health' && (frame.intent==='help'||frame.intent==='question'||frame.intent==='personal_story')) {
      return 'Entendi que você está falando de saúde ou bem-estar. Posso compartilhar informações gerais, mas não fazer diagnóstico. O que você está sentindo, há quanto tempo e isso está piorando? Se for intenso, repentino ou houver risco imediato, procure atendimento presencial.';
    }
    if (topic==='science' && (frame.intent==='question'||frame.intent==='learn')) {
      return 'Vamos entender esse assunto de ciências. Posso explicar o conceito, como funciona, por que acontece e dar um exemplo simples. Você quer uma explicação rápida ou uma aula passo a passo?';
    }
    if (topic==='society' && (frame.intent==='question'||frame.intent==='learn')) {
      return 'Vamos analisar esse tema de história ou sociedade separando contexto, causas, acontecimentos e consequências. Qual período, acontecimento ou conceito você quer entender?';
    }
  }
  // Em frases com negação, preserva o "não": não confunde "não estou triste" com tristeza declarada.
  if (frame.negated && frame.primary && frame.primary.id==='health' && /\bnao\s+(estou|to|tô|me sinto)\s+(triste|ansioso|ansiosa|cansado|cansada)\b/.test(q)) {
    return 'Entendi — você está dizendo que não está se sentindo assim. Obrigada por esclarecer. O que você gostaria de conversar ou resolver?';
  }
  if (emotional) return 'Ei, vamos com calma. 💙 Você não precisa fingir que está tudo bem nem resolver tudo de uma vez. Posso te ouvir sem te julgar e ajudar a separar o que aconteceu, o que você está sentindo e qual pode ser o próximo passo. Você quer desabafar ou prefere pensar em uma solução comigo?';

  // 2. Conversa, intenção e continuidade.
  if (greeting) return 'Oii! 😊 Eu sou a NEXUS. Pode conversar comigo sobre sua vida, estudos, sentimentos, amizades, família, tecnologia, sonhos e também dinheiro. Não precisa escrever de um jeito formal. Como você está hoje?';
  if (has('quem e voce','qual seu nome','o que voce faz','como voce funciona')) return 'Eu sou a NEXUS AI, uma assistente criada para conversar, explicar ideias e ajudar a organizar decisões. Meu funcionamento atual é baseado em código próprio, regras de interpretação, contexto e uma base de conhecimentos — não sou uma pessoa nem um modelo de linguagem como o ChatGPT. Se eu não entender algo, pode reformular e eu tento por outro caminho.';
  if (has('obrigado','obrigada','valeu','tmj','agradeco')) return 'Imagina! 💙 Fico feliz em ajudar. E pode voltar ao assunto quando quiser.';
  if (has('tchau','ate mais','vou sair','falou','fui')) return 'Até mais! 💙 Cuide de você. Quando voltar, podemos continuar de onde paramos.';
  if (has('o que posso perguntar','como posso usar','no que voce ajuda','que assuntos')) return 'Pode falar comigo de forma natural. Posso ajudar com escola, ENEM, matemática, escrita, tecnologia, criatividade, carreira, amizades, família, relacionamentos, sentimentos, hábitos, organização, ideias de projetos e educação financeira. Também posso ouvir quando você só quiser conversar. Quanto mais contexto você me der, melhor consigo direcionar a resposta.';
  if (has('voce lembra','lembra do que eu disse','sobre o que falamos')) {
    if (lastUser && lastAssistant) return 'Nesta conversa, consigo usar o contexto recente. A última coisa que você comentou foi: “'+String(lastUser).slice(0,180)+'”. É disso que você quer continuar falando?';
    return 'Consigo usar as mensagens recentes que estão disponíveis nesta conversa, mas não quero inventar lembranças. Me dá uma pista do assunto?';
  }
  if (topicContinuation && lastAssistant) {
    if (has('sim','isso','exato','verdade','pode ser')) return 'Entendi. Então vamos continuar a partir daí. '+(lastAssistant.length<260?lastAssistant:'Qual parte você quer aprofundar primeiro?');
    if (has('nao','não')) return 'Tudo bem — não quero presumir o que você pensa. O que você mudaria na ideia ou o que aconteceu de verdade?';
    return 'Entendi. Você está continuando o assunto anterior. '+(lastUser?'Você tinha comentado: “'+String(lastUser).slice(0,120)+'”. ':'')+'Me conta mais um pouco para eu não tirar conclusões precipitadas.';
  }

  // 3. Educação financeira com cálculos feitos localmente a partir dos registros.
  if (has('saldo','quanto sobrou','quanto resta','quanto tenho registrado','diferenca entre entrada')) return 'Pelos lançamentos registrados neste mês:\n• Entradas: '+money(income)+'\n• Gastos: '+money(expenses)+'\n• Diferença: '+money(income-expenses)+'\n\nNo histórico completo, a diferença registrada é '+money(allIncome-allExpenses)+'. Isso não consulta sua conta bancária em tempo real; considera somente os dados cadastrados.';
  if (has('gasto','gastos','despesa','despesas','economizar','economia','onde gasto','onde estou gastando','categoria')) return 'Vamos olhar seus números. 💡\n• Entradas neste mês: '+money(income)+'\n• Gastos neste mês: '+money(expenses)+'\n• Diferença: '+money(income-expenses)+(topCategory?'\n• Categoria com maior gasto: '+topCategory[0]+' ('+money(topCategory[1])+')':'\n• Ainda não há gastos categorizados neste mês.')+(income>0?'\n• Gastos equivalem a '+(expenses/income*100).toFixed(1).replace('.',',')+'% das entradas.':'')+'\n\nUm bom começo é separar gastos essenciais, importantes e que podem ser reduzidos. Quer analisar uma categoria específica?';
  if (has('cartao','cartoes','limite','credito','crédito','fatura')) return cards.length?'Seus cartões cadastrados:\n• Limite total: '+money(cardLimit)+'\n• Utilizado: '+money(cardUsed)+'\n• Disponível estimado: '+money(cardLimit-cardUsed)+'\n\nEsse é um cálculo com os dados cadastrados no site. Confira a fatura e o limite atualizado no aplicativo do banco antes de comprar.':'Ainda não há cartões cadastrados. Você pode adicionar na área “Cartões e compromissos”.';
  if (has('divida','dividas','conta atrasada','contas','vencimento','pendencia','pendencias','devo')) return pendingDebts.length?'Encontrei '+pendingDebts.length+' compromisso(s) ainda não marcado(s) como pago(s), totalizando '+money(debtTotal)+'.\n\nPara organizar, compare vencimento, juros, risco de corte/negativação e importância da despesa. Não escolha apenas pelo valor: uma dívida pequena com juros altos pode crescer rápido.':'Não encontrei compromissos pendentes cadastrados. Confira se todos foram registrados.';
  if (has('parcela','parcelas','parcelamento','prestacao','prestacoes')) return activeParts.length?'Há '+activeParts.length+' parcelamento(s) em andamento. A estimativa mensal somada é '+money(monthlyParts)+'.\n\nAntes de assumir uma nova parcela, some as parcelas antigas com as despesas fixas e veja se ainda sobra margem.':'Não encontrei parcelamentos em andamento cadastrados.';
  if (has('meta','metas','objetivo','objetivos','guardar','juntar','poupar','reserva')) return goals.length?'Suas metas cadastradas:\n'+goals.map(g=>'• '+g.name+': '+money(g.saved)+' de '+money(g.target)+' ('+(Number(g.target)>0?Math.min(100,Number(g.saved||0)/Number(g.target)*100).toFixed(0):0)+'%). Faltam '+money(Math.max(0,Number(g.target)-Number(g.saved||0)))+'.').join('\n')+'\n\nUma meta fica mais alcançável quando você divide o total pelo prazo e escolhe uma contribuição que não comprometa o básico.':'Você ainda não cadastrou metas. Uma boa primeira meta pode ser pequena e concreta, como guardar um valor possível por semana.';
  if (has('orcamento','orçamento','planejamento financeiro','planejar minhas finanças','organizar dinheiro','por onde comeco')) return 'Vamos montar uma base simples:\n1. Anote quanto entra e quando entra.\n2. Liste moradia, alimentação, transporte e outras despesas essenciais.\n3. Separe dívidas e parcelas com seus vencimentos.\n4. Defina um limite realista para gastos variáveis.\n5. Reserve algo para imprevistos, mesmo que comece pequeno.\n\nPelos seus registros deste mês, entraram '+money(income)+' e saíram '+money(expenses)+'. Qual é sua prioridade agora: sair das dívidas, controlar gastos ou juntar para um objetivo?';

  // 4. INTERPRETADOR DE MENSAGEM: identifica assunto + intenção + relação entre as palavras.
  // Não dispara apenas porque uma palavra apareceu: exige sinais combinados e dá prioridade
  // ao que a pessoa está fazendo com a frase (perguntar, contar, negar, pedir ajuda, comparar).
  const hasAnyWord = list => list.some(term => has(term));
  const hasNegation = has('nao','nunca','jamais','nem');
  const asksMeaning = /^(o que significa|oq significa|que significa|o que e|oq e|o que quer dizer|qual o significado)/.test(q);
  const asksHow = /^(como|de que jeito|de que forma|qual o jeito)/.test(q);
  const asksWhy = /^(por que|porque|pq|qual motivo|por qual razao)/.test(q);
  const asksWhatToDo = hasAnyWord(['o que eu faço','o que fazer','como resolver','como posso resolver','me ajuda']);
  const tellsExperience = /^(eu|meu|minha|ontem|hoje|agora|aconteceu|estou|to|tô|fui|recebi|vi|senti)\b/.test(q);
  const topicScores = [
    {name:'estudos',keys:['prova','estudar','escola','materia','matematica','matemática','enem','professor','nota','trabalho escolar','faculdade','aprender','aula']},
    {name:'relacionamento',keys:['namoro','namorada','namorado','relacionamento','ficante','crush','terminar','ciume','ciúme','briga','brigamos','discuti','confianca','confiança','mensagem dele','mensagem dela']},
    {name:'amizades',keys:['amigo','amiga','amizade','grupo','excluido','excluida','fofoca','bullying']},
    {name:'familia',keys:['familia','família','mae','mãe','pai','irmao','irmão','irma','irmã','responsavel','responsável']},
    {name:'trabalho',keys:['emprego','trabalho','chefe','entrevista','curriculo','currículo','salario','salário','jovem aprendiz']},
    {name:'dinheiro',keys:['dinheiro','gasto','gastos','salario','salário','cartao','cartão','divida','dívida','juros','fatura','economizar','poupar']},
    {name:'tecnologia',keys:['celular','computador','internet','aplicativo','site','programa','programar','codigo','código','javascript','html','wifi','wi-fi']},
    {name:'saude e bem-estar',keys:['sono','dormir','cansaco','cansaço','ansiedade','triste','dor','alimentacao','alimentação','exercicio','exercício','saude','saúde']},
    {name:'sentimentos',keys:['medo','triste','ansioso','ansiosa','sozinho','sozinha','preocupado','preocupada','confuso','confusa','desanimado','desanimada','pressionado','pressionada']},
    {name:'ciencias',keys:['fotossintese','fotossíntese','gravidade','atomo','átomo','celula','célula','evolucao','evolução','energia','planeta','quimica','química','fisica','física']},
    {name:'historia e sociedade',keys:['historia','história','guerra','revolucao','revolução','globalizacao','globalização','democracia','politica','política','geografia','racismo','desigualdade']}
  ];
  const rankedTopics = topicScores.map(topic=>({
    name:topic.name,
    score:topic.keys.reduce((score,key)=>score+(has(key)?(key.includes(' ')?2:1):0),0)
  })).sort((a,b)=>b.score-a.score);
  const mainTopic = rankedTopics[0]?.score>0 ? rankedTopics[0].name : null;
  const intent = asksMeaning?'meaning':asksWhy?'why':asksHow?'how':asksWhatToDo?'help':questionMark?'question':tellsExperience?'experience':'statement';
  // Respostas por combinação semântica. A pergunta de esclarecimento é específica ao tema,
  // em vez de devolver uma pergunta genérica desconectada.
  if (mainTopic==='estudos' && (asksWhatToDo || intent==='experience' || hasAnyWord(['nao entendo','não entendo','nao consigo','não consigo','tenho dificuldade','estou perdido','to perdido']))) {
    return 'Entendi que você está falando dos estudos. 💙 '+(hasAnyWord(['prova','amanha','amanhã','nota'])?'Como existe uma avaliação envolvida, vale priorizar o que mais cai e praticar questões. ':'')+'Vamos localizar a dificuldade: é para entender a explicação, memorizar o conteúdo, resolver exercícios ou organizar o tempo?';
  }
  if (mainTopic==='relacionamento' && (asksWhatToDo || intent==='experience' || hasAnyWord(['brigou','brigamos','discuti','terminou','terminamos','me ignorou','nao responde','não responde']))) {
    return 'Entendi: você está falando de uma situação de relacionamento. Não vou presumir quem está certo só por uma frase. O que aconteceu concretamente, como isso te afetou e o que você gostaria que mudasse? Posso ajudar a pensar numa conversa respeitosa e em limites saudáveis.';
  }
  if (mainTopic==='amizades' && (asksWhatToDo || intent==='experience' || hasAnyWord(['me excluiu','me excluem','me zoa','me zoaram','brigou','brigamos']))) {
    return 'Parece que o assunto são suas amizades. Quero entender o que aconteceu, sem minimizar nem tirar conclusões cedo demais: alguém fez ou falou algo específico, ou você vem se sentindo deixado(a) de lado há algum tempo?';
  }
  if (mainTopic==='familia' && (asksWhatToDo || intent==='experience' || hasAnyWord(['brigou','brigamos','discuti','nao deixa','não deixa','proibiu','proibiram']))) {
    return 'Entendi que isso envolve sua família. 💙 Conflitos em casa podem misturar regras, cuidado e sentimentos. O que a pessoa fez ou disse, e você se sente seguro(a) para conversar com ela?';
  }
  if (mainTopic==='trabalho' && (asksWhatToDo || asksHow || intent==='question')) {
    return 'Você está falando de trabalho ou oportunidade profissional. Posso ajudar a avaliar requisitos, preparar currículo, treinar entrevista ou comparar propostas. Qual é a situação concreta: procurando a primeira vaga, participando de seleção ou já trabalhando?';
  }
  if (mainTopic==='dinheiro' && (asksHow || asksWhatToDo || intent==='question')) {
    return 'Entendi que sua dúvida envolve dinheiro. Para responder corretamente, preciso distinguir se você quer calcular um valor, organizar gastos, entender uma dívida ou comparar opções. Qual desses pontos está no centro da sua pergunta?';
  }
  if (mainTopic==='tecnologia' && (asksHow || asksWhy || asksMeaning || intent==='question')) {
    return 'Você está perguntando sobre tecnologia. Posso explicar o conceito, orientar a configuração ou ajudar a encontrar um erro. Qual aparelho, aplicativo ou parte do sistema você está usando e o que acontece quando tenta?';
  }
  if (mainTopic==='saude e bem-estar' && (asksWhatToDo || intent==='experience' || intent==='question')) {
    return 'Entendi que a questão é sobre saúde ou bem-estar. Posso compartilhar informações gerais, mas não consigo diagnosticar. O que você está sentindo, há quanto tempo e existe algum sinal intenso ou repentino? Se for grave ou urgente, procure atendimento presencial.';
  }
  if (mainTopic==='sentimentos' && (intent==='experience' || asksWhatToDo || intent==='question')) {
    return 'Parece que você está falando de como está se sentindo. Não quero colocar um rótulo no que você vive. O que aconteceu antes desse sentimento aparecer? Você quer primeiro desabafar ou prefere pensar em algo que possa ajudar agora?';
  }
  if (mainTopic==='ciencias' && (asksMeaning || asksWhy || asksHow || intent==='question')) {
    return 'Sua pergunta parece ser sobre ciências. Posso explicar a ideia central, o mecanismo por trás dela e um exemplo do cotidiano. Qual parte você quer entender: o que é, como funciona ou por que acontece?';
  }
  if (mainTopic==='historia e sociedade' && (asksMeaning || asksWhy || asksHow || intent==='question')) {
    return 'Entendi que o assunto é história ou sociedade. Para não misturar conceitos, posso explicar o contexto, as causas, os acontecimentos e as consequências. Qual acontecimento ou ideia você quer analisar?';
  }
  // Se a pessoa contou algo, não converter automaticamente o relato em um pedido de plano.
  if (tellsExperience && !mainTopic && words.length>5) {
    return 'Quero ter certeza de que entendi o que você contou. Qual é a parte mais importante para você nessa situação: o que aconteceu, como você se sentiu ou o que gostaria de fazer agora?';
  }

  // 5. Núcleo de conhecimento geral: respostas explicativas e orientação por domínio.
  const knowledge = [
    {keys:['matematica','matemática','equacao','equação','porcentagem','fracoes','frações','geometria','algebra','álgebra'],reply:'Posso te ajudar a entender matemática passo a passo. Primeiro identificamos o que a questão pede, depois os dados, a operação e por fim conferimos o resultado. Se você mandar o enunciado, explico sem pular etapas — e também posso mostrar um jeito mais fácil de lembrar.'},
    {keys:['enem','redacao','redação','vestibular','prova','estudar','estudo','escola','faculdade','professor','trabalho escolar'],reply:'Vamos transformar isso em algo estudável. 😊 Podemos dividir o assunto em: o que você precisa saber, conceitos principais, exemplo resolvido e uma questão para praticar. Se for redação, posso ajudar com tese, argumentos, repertório, coesão e proposta de intervenção, sem tirar sua autoria.'},
    {keys:['namoro','namorad','relacionamento','ficante','crush','termin','ciume','ciúme','paquera'],reply:'Relacionamento envolve sentimentos, limites, confiança e conversa. Não existe uma resposta automática para todo casal. Tente separar o que aconteceu de fato, o que você sentiu, o que precisa e o que gostaria de pedir. Posso ajudar a pensar sem escolher por você e sem normalizar controle, pressão ou desrespeito.'},
    {keys:['amizade','amigo','amiga','grupo','excluido','excluida','sozinho','sozinha','fofoca','bullying','zoacao'],reply:'Amizades podem ser muito boas, mas também podem machucar. Vale observar se existe respeito, reciprocidade e liberdade para ser você. Se alguém te humilha, ameaça ou te exclui repetidamente, isso não é algo que você precisa aceitar sozinho(a). O que aconteceu?'},
    {keys:['familia','família','mae','mãe','pai','irmao','irmão','irma','irmã','responsavel','responsável','pais'],reply:'Questões familiares podem ser complicadas porque existe afeto, convivência e às vezes conflito ao mesmo tempo. Podemos pensar em como falar, escolher um momento seguro e explicar o que você sente sem transformar a conversa numa disputa. O que você gostaria que sua família entendesse?'},
    {keys:['ansiedade','ansioso','ansiosa','estresse','pressao','pressão','autoestima','inseguranca','insegurança','tristeza','motivacao','motivação'],reply:'O que você sente merece atenção, sem vergonha. Uma coisa que pode ajudar é dar nome ao sentimento, perceber o que aconteceu antes dele e escolher um passo pequeno para agora — respirar, beber água, sair um pouco do ambiente ou conversar com alguém confiável. Isso não substitui apoio profissional quando o sofrimento é frequente ou intenso.'},
    {keys:['tecnologia','programacao','programação','codigo','código','site','aplicativo','celular','iphone','android','computador','internet'],reply:'Posso ajudar a entender tecnologia, planejar um projeto, explicar código e investigar erros. O melhor caminho é separar objetivo, ferramentas, etapas e possíveis falhas. Se você estiver criando algo, me diga o que quer que aconteça e o que está acontecendo de verdade.'},
    {keys:['carreira','profissao','profissão','emprego','trabalho','curriculo','currículo','entrevista','dinheiro extra','empreender','negocio','negócio'],reply:'Podemos pensar em carreira e projetos de um jeito prático: interesses, habilidades, oportunidades, custos, riscos e primeiro teste pequeno. Não precisa decidir a vida inteira agora. Qual área ou ideia está chamando sua atenção?'},
    {keys:['deus','igreja','biblia','bíblia','fe','fé','oracao','oração','jesus','religiao','religião','espiritualidade'],reply:'Posso conversar sobre fé e espiritualidade com respeito, distinguindo interpretação, contexto e opinião. Se estivermos falando de um texto bíblico, podemos olhar o trecho, o contexto histórico e outras passagens relacionadas, sem fingir que existe uma única leitura em todos os casos.'},
    {keys:['musica','música','filme','serie','série','anime','livro','jogo','game','futebol','basquete','hobby'],reply:'Esse assunto também vale! 😄 Posso conversar sobre histórias, personagens, estilos, jogos, esportes e ideias. Me diz o que você está curtindo ou o que quer descobrir.'},
    {keys:['saude','saúde','dor','sintoma','remedio','remédio','medicamento','sono','alimentacao','alimentação','treino','academia'],reply:'Posso compartilhar informações gerais e ajudar a organizar dúvidas, mas não consigo diagnosticar nem substituir um profissional de saúde. Se houver sintoma intenso, piora rápida ou risco imediato, procure atendimento. O que você quer entender?'}
  ];
  // Conversa cotidiana: responder à intenção social, não tratar toda frase como problema.
  if (/^(to bem e vc|estou bem e voce|tudo bem e voce|bem e voce|bem e vc|e vc|e voce|e você)[.!? ]*$/.test(q)) {
    return 'Estou aqui e pronta para conversar! 😊 Que bom que você está bem. Como está sendo seu dia? Aconteceu alguma coisa legal ou está sendo um dia tranquilo?';
  }
  if (/^(to|estou|tô) (bem|legal|mais ou menos|cansado|cansada)[.!? ]*$/.test(q)) {
    return 'Entendi 😊 Quer me contar como foi seu dia ou prefere conversar sobre algum assunto que esteja na sua cabeça?';
  }
  if (/^(e voce|e você|e vc|como voce esta|como você está|tudo bem com voce)[.!? ]*$/.test(q)) {
    return 'Estou funcionando direitinho e feliz em continuar nossa conversa! 💙 E o que tem ocupado seus pensamentos hoje?';
  }

  // Conhecimento ampliado: respostas introdutórias concretas por domínio.
  // São explicações-base curadas no código, não uma enciclopédia nem conhecimento atualizado em tempo real.
  const deepKnowledge = [
    {keys:['fotossintese','fotossíntese','clorofila'],reply:'**Fotossíntese** é o processo pelo qual plantas, algas e algumas bactérias usam energia da luz para produzir matéria orgânica. Nas plantas, a clorofila capta luz; água e gás carbônico participam das reações; e são produzidos açúcares, com liberação de oxigênio. Em resumo: a luz fornece energia para transformar substâncias simples em alimento químico. Quer ver a equação simplificada e entender as duas etapas (fase clara e ciclo de Calvin)?'},
    {keys:['gravidade','gravidade','newton','forca da gravidade','força da gravidade'],reply:'**Gravidade** é a interação pela qual corpos com massa se atraem. Na experiência cotidiana, a Terra atrai os objetos em direção ao seu centro. A gravidade também mantém a Lua em órbita e ajuda a organizar sistemas planetários. Na física de Newton ela é descrita como força; na relatividade geral, como efeito da curvatura do espaço-tempo. Quer uma explicação com exemplos e contas simples?'},
    {keys:['evolucao','evolução','selecao natural','seleção natural','darwin'],reply:'**Evolução biológica** é a mudança das características hereditárias das populações ao longo das gerações. A seleção natural é um dos mecanismos: variações herdáveis que favorecem sobrevivência ou reprodução tendem a se tornar mais comuns em determinado ambiente. Indivíduos não evoluem porque “precisam”; populações mudam ao longo de muitas gerações. Quer exemplos com bactérias, animais ou seres humanos?'},
    {keys:['atomo','átomo','eletron','elétron','proton','próton','neutron','nêutron'],reply:'**Átomo** é a unidade básica que mantém a identidade química de um elemento. Ele tem um núcleo com prótons (carga positiva) e nêutrons (sem carga), cercado por elétrons (carga negativa) distribuídos em regiões de probabilidade chamadas orbitais. O número de prótons define o elemento; mudanças no número de elétrons formam íons. Quer entender tabela periódica, ligações químicas ou modelos atômicos?'},
    {keys:['clima','aquecimento global','efeito estufa','mudanca climatica','mudança climática'],reply:'**Efeito estufa** é um fenômeno natural: gases da atmosfera absorvem e reemitem parte da radiação infravermelha emitida pela superfície, mantendo a Terra aquecida. O problema atual é a intensificação desse efeito por atividades humanas, principalmente pela emissão de gases como dióxido de carbono e metano, que contribui para o aquecimento global e mudanças no clima. Quer separar tempo, clima, efeito estufa e aquecimento global?'},
    {keys:['democracia','politica','política','eleicao','eleição','cidadania'],reply:'**Democracia** é um sistema em que o poder político depende da participação e da legitimidade dadas pelos cidadãos. Pode envolver eleições livres, pluralismo, direitos fundamentais, separação de poderes, liberdade de expressão e instituições que fiscalizam o governo. Votar é importante, mas cidadania também inclui acompanhar decisões públicas, cobrar transparência e respeitar direitos. Quer entender os três poderes e como funcionam no Brasil?'},
    {keys:['revolucao industrial','revolução industrial','industrializacao','industrialização'],reply:'A **Revolução Industrial** foi um conjunto de transformações econômicas, tecnológicas e sociais iniciado na Grã-Bretanha no século XVIII. Máquinas, fábricas, novas fontes de energia e transportes ampliaram a produção, mas também mudaram o trabalho, as cidades e as relações sociais. Houve crescimento econômico e, ao mesmo tempo, jornadas longas, exploração e conflitos trabalhistas. Quer uma linha do tempo ou uma explicação voltada ao ENEM?'},
    {keys:['globalizacao','globalização'],reply:'**Globalização** é o aumento das conexões entre países por comércio, finanças, tecnologia, cultura, migrações e circulação de informação. Ela aproxima mercados e pessoas, acelera a comunicação e espalha inovações, mas seus benefícios e custos são distribuídos de forma desigual. Para analisar o tema, observe empresas transnacionais, cadeias produtivas, dependência econômica, cultura e desigualdade. Quer exemplos atuais ou um resumo para redação do ENEM?'},
    {keys:['gramatica','gramática','pontuacao','pontuação','crase','virgula','vírgula','interpretacao de texto','interpretação de texto'],reply:'Na língua portuguesa, entender o sentido vem antes de decorar regras. **Pontuação** organiza relações entre as partes da frase; a vírgula marca estruturas sintáticas e não deve separar sujeito de verbo. **Crase** é, em geral, a fusão da preposição “a” com o artigo “a” ou início de demonstrativos. Se você mandar uma frase, explico a regra aplicada e por que as outras opções não funcionam.'},
    {keys:['ingles','inglês','traducao','tradução','vocabulario','vocabulário'],reply:'Posso ajudar com inglês desde o básico: vocabulário em contexto, pronúncia aproximada, gramática, leitura e conversação. Em vez de traduzir palavra por palavra, é melhor entender a função da expressão na frase. Mande uma frase ou diga seu nível e monto uma explicação com exemplos e prática.'},
    {keys:['logica','lógica','algoritmo','algoritmos','javascript','react','html','css','python','programar','programacao','programação'],reply:'Em programação, um **algoritmo** é uma sequência finita e organizada de passos para resolver um problema. Uma boa solução identifica entradas, regras, decisões, repetições e saídas; depois testa casos normais e casos extremos. Posso explicar conceitos, revisar trechos de código e ajudar a depurar erros. Qual linguagem ou projeto você está usando?'},
    {keys:['juros compostos','juros simples','juros','taxa de juros'],reply:'**Juros** são o custo de usar dinheiro emprestado ou a remuneração por deixar dinheiro aplicado. Nos juros simples, o cálculo incide sobre o capital inicial; nos compostos, os juros de cada período entram na base do período seguinte (“juros sobre juros”). Antes de comparar crédito, confira taxa mensal e anual, CET, tarifas, prazo e valor total pago. Quer um exemplo numérico?'},
    {keys:['curriculo','currículo','primeiro emprego','jovem aprendiz','entrevista de emprego'],reply:'Para buscar o primeiro emprego, destaque escolaridade, projetos, cursos, trabalhos voluntários, atividades e habilidades demonstráveis — mesmo sem experiência formal. Um currículo inicial deve ser claro, verdadeiro e adaptado à vaga. Nunca invente experiência nem compartilhe documentos ou dados sensíveis com contatos não verificados. Quer montar um currículo simples ou treinar uma entrevista?'},
    {keys:['fake news','noticia falsa','notícia falsa','desinformacao','desinformação','checar fonte'],reply:'Para avaliar uma informação, não fique só no título. Confira quem publicou, data, autoria, evidências, contexto e se veículos independentes confiáveis confirmam. Procure a publicação original, desconfie de imagens fora de contexto e não compartilhe algo só porque combina com sua opinião. Se mandar a alegação ou o texto, posso ajudar a analisar sinais de confiabilidade — sem garantir verificação em tempo real.'},
    {keys:['direitos do adolescente','estatuto da crianca','estatuto da criança','eca','direitos de adolescente'],reply:'No Brasil, o Estatuto da Criança e do Adolescente (ECA) estabelece direitos e proteções para crianças e adolescentes, incluindo dignidade, educação, saúde, convivência familiar e proteção contra negligência, discriminação, exploração e violência. A aplicação depende dos fatos e da legislação vigente; em situações concretas, procure um adulto seguro, Conselho Tutelar ou orientação jurídica adequada. Quer entender algum direito específico?'},
    {keys:['habito','hábito','procrastinacao','procrastinação','disciplina','rotina','organizacao pessoal','organização pessoal'],reply:'Para construir um hábito, reduza o tamanho da primeira ação e associe-a a um momento concreto. Em vez de “estudar mais”, experimente “abrir o caderno depois do lanche e resolver uma questão”. Acompanhe consistência, ajuste o ambiente e trate recaídas como informação, não como prova de incapacidade. Quer montar uma rotina realista para sua semana?'}
  ];
  // Busca por relevância, não pela primeira palavra coincidente.
  // Expressões específicas valem mais que termos genéricos; vários sinais coerentes
  // aumentam a pontuação. Empates próximos são tratados com cautela.
  const rankKnowledge = entries => entries.map((item,index)=>{
    const matched = (item.keys||[]).filter(key=>has(key));
    const score = matched.reduce((total,key)=>{
      const normalizedKey=normalize(key);
      const tokenCount=normalizedKey.split(/\s+/).length;
      return total + (tokenCount>=4?5:tokenCount===3?4:tokenCount===2?3:1.15);
    },0) + Math.min(matched.length,4)*0.35;
    return {item,index,score,matched};
  }).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score);
  const deepRanked=rankKnowledge(deepKnowledge);
  const knowledgeRanked=rankKnowledge(knowledge);
  const bestDeep=deepRanked[0];
  const bestGeneral=knowledgeRanked[0];
  const bestKnowledge=bestDeep && (!bestGeneral || bestDeep.score>=bestGeneral.score) ? bestDeep : bestGeneral;
  const runnerUp=bestDeep && bestGeneral ? (bestKnowledge===bestDeep?bestGeneral:bestDeep) : null;
  const knowledgeIsClear=bestKnowledge && (!runnerUp || bestKnowledge.score-runnerUp.score>=0.8 || bestKnowledge.score>=4);
  if (knowledgeIsClear) return bestKnowledge.item.reply;

  // 5. CAMADA DE COMPREENSÃO — interpreta intenção, contexto e necessidade antes de responder.
  // É um sistema determinístico: amplia a cobertura e a qualidade das perguntas, mas não
  // aprende sozinho nem substitui a capacidade generativa de um modelo de linguagem.
  const containsAny = (list) => list.some(term => has(term));
  // Continuação contextual: quando a pessoa pede o passo a passo do cálculo anterior.
  if (containsAny(['mostre passo a passo','mostra passo a passo','passo a passo','como chegou nesse resultado','como fez essa conta'])) {
    const previousMath = String(lastUser || '').match(/(?:quanto\s+(?:e|é)\s+|calcule\s+|resolva\s+)?([\d.]+)\s*([+*/-])\s*([\d.]+)/i);
    if (previousMath) {
      const a=Number(previousMath[1].replace(/\./g,'')), b=Number(previousMath[3].replace(/\./g,''));
      const op=previousMath[2];
      const result=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:b!==0?a/b:NaN;
      if (Number.isFinite(result)) {
        const names={'+':'somamos','-':'subtraímos','*':'multiplicamos','/':'dividimos'};
        return 'Claro! Vamos por partes. 😊\n\n1. Primeiro, identificamos os números: '+a.toLocaleString('pt-BR')+' e '+b.toLocaleString('pt-BR')+'.\n2. A operação é '+(op==='+'?'adição':op==='-'?'subtração':op==='*'?'multiplicação':'divisão')+'.\n3. Então, '+names[op]+' os valores.\n\nResultado: '+result.toLocaleString('pt-BR')+'.';
      }
    }
  }
  // Prioridade de intenção: pedidos de explicação sobre a mensagem anterior não são pedidos de planejamento.
  const asksStepByStep = containsAny(['mostre passo a passo','mostra passo a passo','passo a passo','como chegou nesse resultado','como fez essa conta','me explica essa conta']);
  if (asksStepByStep && lastUser) {
    const previousExpression = String(lastUser).match(/([\d.]+)\s*([+*/-])\s*([\d.]+)/);
    if (previousExpression) {
      const left=Number(previousExpression[1].replace(/\./g,'')), right=Number(previousExpression[3].replace(/\./g,''));
      const op=previousExpression[2];
      const value=op==='+'?left+right:op==='-'?left-right:op==='*'?left*right:right!==0?left/right:NaN;
      if (Number.isFinite(value)) {
        const explanation=op==='+'?'somamos':op==='-'?'subtraímos':op==='*'?'multiplicamos':'dividimos';
        return 'Claro! 😊\n\n1. Identificamos os números: '+left.toLocaleString('pt-BR')+' e '+right.toLocaleString('pt-BR')+'.\n2. A operação é '+(op==='+'?'adição':op==='-'?'subtração':op==='*'?'multiplicação':'divisão')+'.\n3. '+(op==='+'?'A soma':op==='-'?'A diferença':op==='*'?'O produto':'O quociente')+' é obtido quando '+explanation+' esses valores.\n\n**Resultado: '+value.toLocaleString('pt-BR')+'**';
      }
    }
  }
  const asksForAdvice = containsAny(['o que eu faço','o que devo fazer','me aconselha','preciso de um conselho','qual atitude','como devo agir','como lidar']);
  const asksForExplanation = containsAny(['me explica','explique','por que isso','como isso funciona','qual a diferenca','o que significa','nao entendi','não entendi']);
  const asksForPlan = containsAny(['me ajuda a planejar','monta um plano','por onde começo','por onde comeco','quero melhorar','quero mudar','como posso começar','passo a passo']);
  const asksForComparison = containsAny(['qual e melhor','qual é melhor','qual compensa','vale mais a pena','compare','comparar','vantagem e desvantagem']);
  const asksForValidation = containsAny(['estou errado','to errado','fui errado','estou exagerando','sou estranho','isso e normal','isso é normal']);
  const asksForWriting = containsAny(['me ajuda a responder','como responder','o que eu falo','o que dizer','escreve para mim','escreva para mim']);
  const uncertainty = containsAny(['nao sei o que fazer','não sei o que fazer','estou confuso','to confuso','não consigo decidir','nao consigo decidir','minha cabeça está cheia','minha cabeca esta cheia']);
  const relationshipConflict = containsAny(['brigamos','a gente brigou','discuti com','discutimos','me ignorou','me deixou no vácuo','me deixou no vacuo','perdi a confiança','perdi a confianca','não me escuta','nao me escuta']);
  const schoolDifficulty = containsAny(['não consigo aprender','nao consigo aprender','tenho dificuldade','não entendo a matéria','nao entendo a materia','vou reprovar','estou atrasado na escola','procrastino para estudar']);
  const socialPressure = containsAny(['estão me pressionando','estao me pressionando','tenho medo de decepcionar','medo do que vão pensar','medo do que vao pensar','todo mundo espera','me sinto obrigado','me sinto obrigada']);
  const lowSelfWorth = containsAny(['não sou bom o suficiente','nao sou bom o suficiente','não sou suficiente','nao sou suficiente','me odeio','me acho um lixo','não gosto de mim','nao gosto de mim','me sinto inferior','ninguém gosta de mim','ninguem gosta de mim']);
  const wantsToLearn = containsAny(['quero aprender','me ensina','ensina do zero','quero entender melhor','me explica do começo','me explica do comeco']);
  const asksForIdeas = containsAny(['me dá ideias','me de ideias','sugestões','sugestoes','o que posso fazer','me ajuda com uma ideia']);
  const recentTopicText = lastUser ? String(lastUser).slice(0,220) : '';
  const gentleClarifier = 'Para eu não presumir coisas sobre você, me conta um pouco mais do contexto?';
  const structuredAdvice = (topic) => 'Vamos pensar em '+topic+' sem decidir tudo no impulso.\n\n1. **Fato:** o que aconteceu, sem interpretar ainda?\n2. **Sentimento:** como isso te afetou?\n3. **Necessidade:** o que você precisa que mude?\n4. **Opções:** quais caminhos existem e quais consequências podem trazer?\n5. **Próximo passo:** qual atitude pequena, segura e realista você consegue tomar agora?\n\n'+gentleClarifier;
  if (urgentRisk) return 'Eu quero levar o que você está dizendo muito a sério. Você merece apoio de verdade, agora, e não precisa lidar com isso sozinho(a). Se houver risco imediato, afaste-se de qualquer coisa que possa usar para se machucar, fique perto de alguém de confiança e procure ajuda presencial urgente (SAMU 192 ou UPA). No Brasil, o CVV atende pelo 188. Se for possível, diga agora a um adulto seguro: “não estou bem e preciso que fique comigo”. Você está em segurança neste momento?';
  if (lowSelfWorth) return 'Sinto muito que você esteja se enxergando desse jeito. 💙 Um pensamento muito duro sobre si mesmo não é uma definição de quem você é. Você não precisa provar seu valor sendo perfeito, agradando todo mundo ou dando conta de tudo. Quero entender de onde veio esse sentimento: aconteceu alguma coisa hoje, alguém falou algo, ou isso vem se acumulando há um tempo?';
  if (relationshipConflict) return structuredAdvice('essa situação com essa pessoa');
  if (schoolDifficulty) return 'Ter dificuldade em uma matéria não significa que você seja incapaz. Às vezes falta uma explicação diferente, uma base anterior ou um método que combine com você. Podemos descobrir onde a compreensão trava e reconstruir do ponto certo: **qual matéria é, qual assunto e em que parte você começa a se perder?** Se quiser, eu explico do zero, com exemplos e exercícios graduais.';
  if (socialPressure) return 'É pesado sentir que precisa corresponder às expectativas de todo mundo. Mas a opinião dos outros não precisa decidir sua vida inteira. Podemos separar o que é uma responsabilidade real, o que é uma expectativa externa e o que você realmente deseja. Existe alguém seguro com quem você consiga conversar sem medo de ser humilhado(a)?';
  if (uncertainty || asksForAdvice) return structuredAdvice('o que está acontecendo');
  if (asksForValidation) return 'Posso te ajudar a olhar para isso com equilíbrio, sem te julgar e sem concordar automaticamente só para agradar. Uma situação pode ter sentimentos legítimos e, ao mesmo tempo, atitudes que precisam ser revistas. O que aconteceu exatamente, e o que você está questionando em si mesmo(a)?';
  if (asksForWriting) return 'Claro. Posso montar uma resposta que soe natural e pareça sua, não uma mensagem artificial. Me diga para quem é, o que a pessoa falou e o que você quer transmitir. Posso deixar carinhosa, firme, respeitosa, curta ou mais detalhada.';
  if (asksForComparison) return 'Vamos comparar pelo que realmente importa, não só escolher a opção que parece mais bonita. Posso avaliar: objetivo, custo, benefício, riscos, esforço, prazo e possibilidade de voltar atrás. Quais são as opções?';
  if (asksForPlan) return 'Vamos transformar isso em um plano possível, sem exigir uma mudança gigante de uma vez. Primeiro definimos o objetivo; depois identificamos onde você está hoje, o que está no seu controle, os recursos disponíveis e uma primeira ação pequena. **O que você quer conseguir e qual é sua maior dificuldade neste momento?**';
  if (wantsToLearn) return 'Bora aprender de verdade. Posso adaptar a explicação ao seu nível: começo com uma ideia simples, dou um exemplo do cotidiano, aprofundo o conceito e depois proponho um exercício para conferir se fez sentido. Qual assunto você quer aprender?';
  if (asksForIdeas) return 'Vamos criar opções que sejam úteis e possíveis de executar. Posso sugerir caminhos mais simples, criativos e ambiciosos, depois comparar esforço, custo e resultado esperado. Para não jogar ideias aleatórias: qual é o objetivo e quais limites você tem (tempo, dinheiro ou ferramentas)?';
  if (asksForExplanation) return 'Vou tentar explicar sem complicar: primeiro a ideia central, depois por que ela acontece, um exemplo concreto e o que costuma ser confundido com ela. Qual é exatamente o assunto ou trecho que você quer entender?';
  if (asksForAdvice && recentTopicText) return 'Pelo contexto, parece que você quer orientação sobre “'+recentTopicText+'”. Não quero tirar conclusões sem conhecer os detalhes. O que aconteceu depois disso?';

  // 6. Detecção de mensagens vagas e continuidade conversacional.
  if (words.length <= 3 && !greeting) return 'Pode falar do seu jeito, mesmo que seja só uma frase ou uma ideia pela metade. 💙 Você quer me contar algo que aconteceu, fazer uma pergunta ou pensar em alguma coisa comigo?';
  if (questionMark || words.length > 7) return 'Quero responder ao que você realmente quis dizer, não apenas às palavras. Pelo que entendi, você trouxe: “'+raw.slice(0,180)+'”. Posso estar interpretando errado. O que é mais importante nessa mensagem: entender o assunto, resolver uma situação, tomar uma decisão ou simplesmente ser ouvido(a)?';

  // 7. Pedidos de escrita, criatividade, decisão e explicação.
  if (has('escreva','escrever','mensagem','texto para','carta','legenda','bio','convite','pedido de desculpas','parabens','parabéns')) return 'Posso ajudar a escrever isso com a sua voz. Para não ficar genérico, pense em três coisas: para quem é, o que você realmente quer transmitir e qual tom combina com você (carinhoso, direto, formal, engraçado ou emocionante). Me diga o contexto e eu preparo uma versão que você pode adaptar.';
  if (has('ideia','ideias','criativo','criatividade','inventar','projeto')) return 'Vamos explorar possibilidades! Posso gerar ideias, comparar vantagens e dificuldades e transformar uma delas em etapas concretas. Uma boa ideia precisa combinar com seu objetivo, recursos e tempo. O que você quer criar ou melhorar?';
  if (has('decidir','decisao','decisão','escolher','qual e melhor','qual é melhor','vale a pena')) return 'Posso te ajudar a decidir sem tomar a decisão por você. Vamos comparar: o que importa mais, quais são as opções, o que você ganha, o que pode perder e qual escolha é reversível. Quais são as opções que você está considerando?';
  if (has('explica','explicar','o que significa','como funciona','por que','porque')) return 'Quero te explicar de um jeito que faça sentido, não só jogar uma definição. Me diga o tema ou a parte que te deixou com dúvida. Posso começar pelo básico, dar um exemplo do cotidiano e depois aprofundar.';
  if (has('nao sei','não sei','confuso','confusa','perdido','perdida','nao consigo','não consigo')) return 'Tudo bem ainda não saber. 💙 Vamos diminuir o tamanho do problema: o que aconteceu, o que está sob seu controle e qual é a menor próxima ação possível? Se nem isso estiver claro, pode começar contando do seu jeito.';
  if (match(/\b(kkkk+|haha+|rsrs+|legal|massa|top|bacana|boa|amei)\b/)) return 'Hahaha 😄 Que bom! Quer continuar nessa ideia ou mudar de assunto?';
  if (questionMark || words.length > 7) return 'Quero entender direito para não te responder com algo inventado. Pelo que consegui captar, você está falando de: “'+raw.slice(0,180)+'”. Você quer uma explicação, um conselho, ajuda para fazer algo ou só conversar sobre isso?';
  return greet+'Estou aqui para conversar. 💙 Pode falar do seu dia, de uma dúvida, de uma ideia ou de algo que esteja te preocupando. Não precisa escrever perfeitamente — eu tento entender e, se faltar contexto, pergunto.';
}
function BrandMark({compact=false,animated=false}) {
  return <span className={'brand-icon mf-brand-mark'+(compact?' compact':'')} aria-label="Meu Financeiro" style={{background:'transparent',border:0,boxShadow:'none',width:compact?32:54,height:compact?32:54,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <svg className={animated?'mf-three-bars-animated':''} viewBox="0 0 64 64" role="img" aria-hidden="true" style={{display:'block',width:'100%',height:'100%'}}>
      <defs><linearGradient id="mf-three-bars" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#C7B5FF"/><stop offset=".58" stopColor="#9275FF"/><stop offset="1" stopColor="#55D9EA"/></linearGradient></defs>
      <rect className="mf-bar-one" x="9" y="39" width="12" height="16" rx="3.5" fill="url(#mf-three-bars)"/>
      <rect className="mf-bar-two" x="26" y="25" width="12" height="30" rx="3.5" fill="url(#mf-three-bars)"/>
      <rect className="mf-bar-three" x="43" y="9" width="12" height="46" rx="3.5" fill="url(#mf-three-bars)"/>
    </svg>
  </span>;
}

class ProfileRenderBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('Falha ao renderizar Meu perfil:',error,info);}
  render(){
    if(this.state.error)return <section className="panel profile-render-error" role="alert"><div className="panel-head"><div><h3>Não foi possível abrir seu perfil</h3><p>O restante do aplicativo continua disponível. Detalhe técnico:</p></div></div><code>{String(this.state.error?.message||this.state.error)}</code><button type="button" className="primary" onClick={()=>this.setState({error:null})}>Tentar novamente</button></section>;
    return this.props.children;
  }
}

function App(){
  const [session,setSession]=useState(null), [loading,setLoading]=useState(true);
  const [splashReady,setSplashReady]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setSplashReady(true),1600);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{const watchdog=window.setTimeout(()=>{setLoading(false);setMaintenanceCheckDone(true);setSplashReady(true);},9000);return()=>window.clearTimeout(watchdog)},[]);
  const activeUserIdRef=React.useRef(null);
  const [page,setPage]=useState(()=>window.location.hash.startsWith('#post-')?'social-feed':'overview'), [mobileMenu,setMobileMenu]=useState(false), [financeExpanded,setFinanceExpanded]=useState(true), [nexusExpanded,setNexusExpanded]=useState(true), [socialExpanded,setSocialExpanded]=useState(false);
  const [data,setData]=useState({transactions:[],cards:[],debts:[],goals:[],installments:[],subscriptions:[],card_limit_history:[],goal_movements:[],notifications:[]});
  const [modal,setModal]=useState(null), [toast,setToast]=useState('');
  const [payModal,setPayModal]=useState(false),[payBusy,setPayBusy]=useState(false);
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authError,setAuthError]=useState(''), [authMode,setAuthMode]=useState('login'), [authNotice,setAuthNotice]=useState('');
  const [authFlow,setAuthFlow]=useState(()=>new URLSearchParams(window.location.search).get('auth')||'');
  const [newPassword,setNewPassword]=useState(''),[confirmNewPassword,setConfirmNewPassword]=useState('');
  const [showOnboarding,setShowOnboarding]=useState(false),[onboardingStep,setOnboardingStep]=useState(0);
  const [signupName,setSignupName]=useState(''),[signupUsername,setSignupUsername]=useState(''),[signupBio,setSignupBio]=useState(''),[playerBioBusy,setPlayerBioBusy]=useState(false);
   const [usernameDraft,setUsernameDraft]=useState(''),[usernameBusy,setUsernameBusy]=useState(false),[usernameChangedAt,setUsernameChangedAt]=useState(null);
  const [busy,setBusy]=useState(false);
  const [adminUsers,setAdminUsers]=useState([]),[adminSocialProfiles,setAdminSocialProfiles]=useState([]),[adminBusy,setAdminBusy]=useState(false),[adminError,setAdminError]=useState(''),[adminMessage,setAdminMessage]=useState(''),[maintenance,setMaintenance]=useState(false),[maintenanceMessage,setMaintenanceMessage]=useState('Estamos realizando uma manutenção. Voltaremos em breve.');
  const [adminTestMode,setAdminTestMode]=useState(()=>window.localStorage.getItem('mf_admin_test_mode')==='true');
  const [adminTab,setAdminTab]=useState('overview');
  const [adminUserSearch,setAdminUserSearch]=useState('');
  const [adminSocialSearch,setAdminSocialSearch]=useState('');
  const [adminReports,setAdminReports]=useState([]);
  const [adminReportFilter,setAdminReportFilter]=useState('open');
  const [adminReportSearch,setAdminReportSearch]=useState('');
  const [adminAnnouncementTitle,setAdminAnnouncementTitle]=useState('');
  const [adminAnnouncementBody,setAdminAnnouncementBody]=useState('');
  const [adminNotificationRecipient,setAdminNotificationRecipient]=useState('');
  const [adminNotificationTitle,setAdminNotificationTitle]=useState('');
  const [adminNotificationBody,setAdminNotificationBody]=useState('');
  const [maintenanceCheckDone,setMaintenanceCheckDone]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [assistantInput,setAssistantInput]=useState('');
  const [assistantBusy,setAssistantBusy]=useState(false);
  const [assistantError,setAssistantError]=useState('');
  const [activeArcadeGame,setActiveArcadeGame]=useState(null);
  const [gameQuestionIndex,setGameQuestionIndex]=useState(0),[gameAnswer,setGameAnswer]=useState(null),[gameFeedback,setGameFeedback]=useState(''),[gameXp,setGameXp]=useState(()=>Number(window.localStorage.getItem('mf_game_xp')||0)),[gameCorrect,setGameCorrect]=useState(()=>Number(window.localStorage.getItem('mf_game_correct')||0)),[roundCorrect,setRoundCorrect]=useState(0);
  const [quizLastPlayed,setQuizLastPlayed]=useState(()=>Number(window.localStorage.getItem('mf_quiz_last')||0)),[quizClock,setQuizClock]=useState(Date.now()),[quizActive,setQuizActive]=useState(false),[roundQuestions,setRoundQuestions]=useState([]);
  const quizStorageKey='mf_quiz_last:'+(session?.user?.id||'guest');
  const [dailyGameXp,setDailyGameXp]=useState(0);const [rewardSummary,setRewardSummary]=useState(null);const [liveGameLoot,setLiveGameLoot]=useState({coins:0,items:[]});
  const [profileEditorOpen,setProfileEditorOpen]=useState(false);
  const [playerProfile,setPlayerProfile]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('mf_player_profile')||'{"name":"Meu jogador","avatar":"👾","frame":"violet","cardFrame":"cyan","username":"","bio":"","title":""}')}catch{return {name:'Meu jogador',avatar:'👾',frame:'violet',cardFrame:'cyan'}}});
  const [profileLoadedUserId,setProfileLoadedUserId]=useState(null);
  const [profileGameMedals,setProfileGameMedals]=useState([]),[profileRankMedals,setProfileRankMedals]=useState([]),[profileMedalsLoading,setProfileMedalsLoading]=useState(false);
  const [profileEquippedMedals,setProfileEquippedMedals]=useState([]),[profileMedalsLoaded,setProfileMedalsLoaded]=useState(false);
  const [profileGameStats,setProfileGameStats]=useState({matches:0,rank:null,coins:0,relics:0,loading:false,seasonName:'Temporada atual'});
  useEffect(()=>{let active=true;const loadProfileMedals=async()=>{if(!session?.user?.id||!supabase){setProfileGameMedals([]);setProfileRankMedals([]);setProfileEquippedMedals([]);setProfileMedalsLoaded(false);return;}setProfileMedalsLoading(true);setProfileMedalsLoaded(false);const [games,ranks,profileMedals]=await Promise.all([supabase.from('competition_game_medals').select('game_key,medals_count').eq('user_id',session.user.id),supabase.from('competition_rank_medals').select('medal_key,medals_count').eq('user_id',session.user.id),supabase.from('social_profiles').select('equipped_medals').eq('user_id',session.user.id).maybeSingle()]);if(!active)return;if(games.error||ranks.error||profileMedals.error){console.warn('Medalhas do perfil:',games.error?.message||ranks.error?.message||profileMedals.error?.message);}setProfileGameMedals(games.data||[]);setProfileRankMedals(ranks.data||[]);setProfileEquippedMedals(Array.isArray(profileMedals.data?.equipped_medals)?profileMedals.data.equipped_medals:[]);setProfileMedalsLoaded(true);setProfileMedalsLoading(false);};loadProfileMedals();return()=>{active=false}},[session?.user?.id,page]);
  useEffect(()=>{window.localStorage.setItem('mf_player_profile',JSON.stringify(playerProfile))},[playerProfile]);
  useEffect(()=>{let active=true;const userId=session?.user?.id;if(!userId||!supabase)return()=>{active=false};(async()=>{const {data}=await supabase.from('social_profiles').select('player_title,avatar_frame,card_frame').eq('user_id',userId).maybeSingle();if(active)setPlayerProfile(p=>({...p,title:data?.player_title||'',frame:data?.avatar_frame||p.frame,cardFrame:data?.card_frame||p.cardFrame}));})();return()=>{active=false}},[session?.user?.id,page]);

  useEffect(()=>{let active=true;const userId=session?.user?.id;if(!userId||!supabase){setProfileGameStats({matches:0,rank:null,coins:0,relics:0,loading:false,seasonName:'Temporada atual'});return()=>{active=false};}const loadStats=async()=>{setProfileGameStats(v=>({...v,loading:true}));const [matches,wallet,season,ownWallet]=await Promise.all([supabase.from('competition_match_history').select('id',{count:'exact',head:true}).eq('user_id',userId),supabase.from('nexus_loot_wallets').select('coins,collection_score').eq('user_id',userId).maybeSingle(),supabase.from('competition_seasons').select('id,name,starts_at,ends_at').eq('status','active').lte('starts_at',new Date().toISOString()).gte('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(1).maybeSingle(),supabase.from('nexus_loot_wallets').select('collection_score').eq('user_id',userId).maybeSingle()]);if(!active)return;let rank=null,relics=0,seasonName='Temporada atual';if(ownWallet.data){const ownScore=Number(ownWallet.data.collection_score||0);const ahead=await supabase.from('nexus_loot_wallets').select('user_id',{count:'exact',head:true}).or('collection_score.gt.'+ownScore+',and(collection_score.eq.'+ownScore+',user_id.lt.'+userId+')');if(!active)return;rank=(ahead.count||0)+1;}if(season.data){seasonName=season.data.name||seasonName;const loot=await supabase.from('nexus_loot_drops').select('quantity').eq('user_id',userId).or('item_type.eq.relic,item_type.eq.seasonal').gte('created_at',season.data.starts_at).lte('created_at',season.data.ends_at);if(!active)return;relics=(loot.data||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||1)),0);}setProfileGameStats({matches:matches.count||0,rank,coins:Number(wallet.data?.coins||0),relics,loading:false,seasonName});};const refreshStats=()=>loadStats().catch(error=>{console.warn('Estatísticas do perfil:',error);if(active)setProfileGameStats(v=>({...v,loading:false}));});refreshStats();const interval=window.setInterval(refreshStats,15000);const channel=supabase.channel('profile-global-rank-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'nexus_loot_wallets'},refreshStats).subscribe();return()=>{active=false;window.clearInterval(interval);supabase.removeChannel(channel)}},[session?.user?.id,page]);

  useEffect(()=>{
    setProfileLoadedUserId(null);
    setGameXp(0);setGameCorrect(0);
    const metadataName=String(session?.user?.user_metadata?.name||'').trim();
    setPlayerProfile({name:metadataName||'Meu jogador',avatar:'👾',frame:'violet',cardFrame:'cyan',username:'',bio:'',title:'',gems:[]});
  },[session?.user?.id]);
  useEffect(()=>{setQuizLastPlayed(Number(window.localStorage.getItem(quizStorageKey)||0));},[quizStorageKey]);
  useEffect(()=>{if(!session?.user?.id||profileLoadedUserId!==session.user.id||!supabase||!profileMedalsLoaded||profileMedalsLoading)return;const timer=window.setTimeout(()=>{supabase.from('social_profiles').update({display_name:String(playerProfile.name||'').trim().slice(0,40),avatar:playerProfile.avatar||'👾',avatar_frame:playerProfile.frame||'violet',card_frame:playerProfile.cardFrame||'cyan',equipped_gems:Array.isArray(playerProfile.gems)?playerProfile.gems:[],equipped_medals:profileEquippedMedals,game_xp:gameXp,game_correct:gameCorrect,updated_at:new Date().toISOString()}).eq('user_id',session.user.id).then(({error})=>{if(error)console.warn('NEXUS Social profile sync:',error.message)})},700);return()=>window.clearTimeout(timer)},[session?.user?.id,profileLoadedUserId,playerProfile,profileEquippedMedals,profileMedalsLoaded,profileMedalsLoading,gameXp,gameCorrect]);
  const nexusWelcomeMessage={role:'assistant',text:'Olá! Eu sou a NEXUS. ⚡ Estou aqui para conversar sobre sua vida, estudos, sentimentos, ideias e também ajudar com suas finanças. Pode falar naturalmente, sem medo de errar!'};
  const nexusStorageKey='mf_nexus_messages:'+(session?.user?.id||'guest');
  const nexusStorageSkipPersist=React.useRef(null);
  const [assistantMessages,setAssistantMessages]=useState(()=>{
    try{
      const saved=JSON.parse(window.localStorage.getItem('mf_nexus_messages:guest')||'null');
      return Array.isArray(saved)&&saved.length?saved:[nexusWelcomeMessage];
    }catch{return [nexusWelcomeMessage]}
  });
  // Mantém a conversa no próprio navegador, separada por conta, sem enviar mensagens ao servidor.
  useEffect(()=>{
    let saved=null;
    try{saved=JSON.parse(window.localStorage.getItem(nexusStorageKey)||'null')}catch{}
    nexusStorageSkipPersist.current=nexusStorageKey;
    setAssistantMessages(Array.isArray(saved)&&saved.length?saved:[nexusWelcomeMessage]);
  },[nexusStorageKey]);
  useEffect(()=>{
    if(nexusStorageSkipPersist.current===nexusStorageKey){
      nexusStorageSkipPersist.current=null;
      return;
    }
    try{window.localStorage.setItem(nexusStorageKey,JSON.stringify(assistantMessages.slice(-120)))}catch{}
  },[assistantMessages,nexusStorageKey]);
  const isAdmin=session?.user?.email?.toLowerCase()===ADMIN_EMAIL;
  useEffect(()=>{window.localStorage.setItem('mf_game_xp',String(gameXp));window.localStorage.setItem('mf_game_correct',String(gameCorrect));},[gameXp,gameCorrect]);
  useEffect(()=>{const timer=setInterval(()=>setQuizClock(Date.now()),30000);return ()=>clearInterval(timer)},[]);

  useEffect(()=>{
    if(!isConfigured){setLoading(false);return}
    let active=true;
    const timeout=new Promise(resolve=>window.setTimeout(()=>resolve({data:{session:null},error:new Error('Tempo limite ao consultar a sessão')}),6000));
    Promise.race([supabase.auth.getSession(),timeout])
      .then(({data,error})=>{
        if(!active)return;
        if(error)console.warn('Sessão Supabase:',error.message);
        const nextSession=data?.session||null;
        setSession(nextSession);
        const n=String(nextSession?.user?.user_metadata?.name||'').trim();
        if(n)setPlayerProfile(p=>({...p,name:n}));
      })
      .catch(error=>{if(active)console.warn('Não foi possível recuperar a sessão:',error)})
      .finally(()=>{if(active)setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{
      if(!active)return;
      setSession(s);
      const n=String(s?.user?.user_metadata?.name||'').trim();
      if(n)setPlayerProfile(p=>({...p,name:n}));
    });
    return ()=>{active=false;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    const user=session?.user;if(!user?.id)return;
    const doneKey='mf_onboarding_done:'+user.id;
    const pendingKey='mf_onboarding_pending:'+String(user.email||'').toLowerCase();
    if(window.localStorage.getItem(doneKey)==='true'){window.localStorage.removeItem(pendingKey);return;}
    if(window.localStorage.getItem(pendingKey)==='true'){setOnboardingStep(0);setPage('overview');setShowOnboarding(true);}
  },[session?.user?.id]);
  useEffect(()=>{
    // Nunca mantenha dados financeiros do usuário anterior visíveis ao trocar de conta.
    activeUserIdRef.current=session?.user?.id||null;
    setData({transactions:[],cards:[],debts:[],goals:[],installments:[],subscriptions:[],card_limit_history:[],goal_movements:[],notifications:[]});
    if(session?.user?.id) loadData();
  },[session?.user?.id]);
  useEffect(()=>{
    const user=session?.user;if(!user?.id||!supabase)return;
    let active=true;
    (async()=>{
      const {data:existing,error}=await supabase.from('social_profiles').select('*').eq('user_id',user.id).maybeSingle();
      if(!active)return;
      if(error){console.warn('NEXUS Social profile load:',error.message);return;}
      if(existing){setPlayerProfile(p=>({...p,name:existing.display_name||p.name,avatar:existing.avatar||'👾',frame:existing.avatar_frame||'violet',cardFrame:existing.card_frame||'cyan',gems:Array.isArray(existing.equipped_gems)?existing.equipped_gems:[],username:existing.username||'',bio:existing.bio||'',title:existing.player_title||''}));setGameXp(Number(existing.game_xp||0));setGameCorrect(Number(existing.game_correct||0));setProfileLoadedUserId(user.id);setUsernameDraft(existing.username||'');setUsernameChangedAt(existing.username_changed_at||null);return;}
      const metadata=user.user_metadata||{};const username=String(metadata.social_username||'').trim().toLowerCase();
      if(!/^[a-z0-9_]{3,20}$/.test(username))return;
      const {data:created,error:createError}=await supabase.from('social_profiles').insert({user_id:user.id,username,display_name:String(playerProfile.name||metadata.name||'Meu jogador').trim().slice(0,40)||'Meu jogador',bio:String(metadata.social_bio||'').trim().slice(0,160),avatar:playerProfile.avatar||'👾',avatar_frame:playerProfile.frame||'violet',card_frame:playerProfile.cardFrame||'cyan',equipped_gems:Array.isArray(playerProfile.gems)?playerProfile.gems:[],game_xp:Number(gameXp||0),game_correct:Number(gameCorrect||0)}).select('*').single();
      if(!active)return;
      if(createError){console.warn('NEXUS Social profile creation:',createError.message);if(createError.code==='23505')notify('Esse @ já está em uso. Abra o NEXUS Social e escolha outro identificador.');else notify('Não foi possível criar seu perfil social: '+createError.message);return;}
      if(created){setPlayerProfile(p=>({...p,name:created.display_name||p.name,avatar:created.avatar||'👾',frame:created.avatar_frame||'violet',cardFrame:created.card_frame||'cyan',gems:Array.isArray(created.equipped_gems)?created.equipped_gems:[],username:created.username||'',bio:created.bio||'',title:created.player_title||''}));setGameXp(Number(created.game_xp||0));setGameCorrect(Number(created.game_correct||0));setProfileLoadedUserId(user.id);setUsernameDraft(created.username||'');setUsernameChangedAt(created.username_changed_at||null);}
    })();
    return()=>{active=false;};
  },[session?.user?.id]);
  useEffect(()=>{
    if(!isConfigured){setMaintenanceCheckDone(true);return}
    let active=true;
    const timeout=new Promise(resolve=>window.setTimeout(()=>resolve({data:null,error:new Error('Tempo limite ao verificar manutenção')}),5000));
    Promise.race([
      supabase.from('app_settings').select('maintenance_mode,maintenance_message').eq('id',true).maybeSingle(),
      timeout
    ]).then(({data,error})=>{
      if(!active)return;
      if(!error&&data){setMaintenance(!!data.maintenance_mode);setMaintenanceMessage(data.maintenance_message||'Estamos realizando uma manutenção. Voltaremos em breve.')}
      if(error)console.warn('Verificação de manutenção:',error.message);
      setMaintenanceCheckDone(true);
    }).catch(error=>{
      if(active){console.warn('Falha ao verificar manutenção:',error);setMaintenanceCheckDone(true)}
    });
    return ()=>{active=false};
  },[]);
  const toastTimerRef=React.useRef(null);
  useEffect(()=>()=>{if(toastTimerRef.current)window.clearTimeout(toastTimerRef.current)},[]);
  const notify=(s)=>{setToast(s);if(toastTimerRef.current)window.clearTimeout(toastTimerRef.current);toastTimerRef.current=window.setTimeout(()=>{toastTimerRef.current=null;setToast('')},3200)};
  const unreadCount=data.notifications.filter(n=>!n.is_read).length;
  async function addNotification(title,message,category='geral'){if(!session?.user?.id)return;const {error}=await supabase.from('notifications').insert({user_id:session.user.id,title,message,category});if(!error){await loadData();supabase.functions.invoke('send-push',{body:{title,body:message,url:'/',tag:category||'meu-financeiro'}}).then(({error:pushError})=>{if(pushError)console.warn('Push notification:',pushError.message)}).catch(error=>console.warn('Push notification:',error))}}
  async function markNotificationRead(id){const {error}=await supabase.from('notifications').update({is_read:true}).eq('id',id).eq('user_id',session.user.id);if(!error)await loadData()}
  async function markAllNotificationsRead(){const {error}=await supabase.from('notifications').update({is_read:true}).eq('user_id',session.user.id).eq('is_read',false);if(!error){await loadData();notify('Todas as notificações foram marcadas como lidas.')}}
  async function requestPasswordReset(e){
    e.preventDefault();setBusy(true);setAuthError('');setAuthNotice('');
    const cleanEmail=email.trim();
    if(!cleanEmail){setAuthError('Informe seu e-mail para receber o link de recuperação.');setBusy(false);return;}
    const {error}=await supabase.auth.resetPasswordForEmail(cleanEmail,{redirectTo:window.location.origin+'/?auth=recovery'});
    if(error)setAuthError('Não foi possível enviar o e-mail agora. Confira o endereço e tente novamente.');
    else setAuthNotice('Se esse e-mail estiver cadastrado, enviaremos um link seguro para criar uma nova senha. Confira também o spam.');
    setBusy(false);
  }
  async function saveNewPassword(e){
    e.preventDefault();setAuthError('');setAuthNotice('');
    if(newPassword.length<8){setAuthError('A nova senha precisa ter pelo menos 8 caracteres.');return;}
    if(newPassword!==confirmNewPassword){setAuthError('As senhas não conferem.');return;}
    setBusy(true);
    const {error}=await supabase.auth.updateUser({password:newPassword});
    if(error)setAuthError('Não foi possível alterar a senha. Solicite um novo link de recuperação.');
    else{setAuthFlow('password-updated');setNewPassword('');setConfirmNewPassword('');window.history.replaceState({},'',window.location.pathname);}
    setBusy(false);
  }
  function closeAuthFlow(){setAuthFlow('');setAuthError('');setAuthNotice('');setPassword('');window.history.replaceState({},'',window.location.pathname);}
  async function handleAuth(e){
    e.preventDefault();setBusy(true);setAuthError('');setAuthNotice('');
    const cleanEmail=email.trim();
    if(authMode==='signup'){
      const cleanName=signupName.trim().replace(/\s+/g,' ').slice(0,40);
      const cleanUsername=signupUsername.trim().toLowerCase();
      const cleanBio=signupBio.trim().slice(0,160);
      if(cleanName.length<2){setAuthError('Informe seu nome (de 2 a 40 caracteres).');setBusy(false);return;}
      if(!/^[a-z0-9_]{3,20}$/.test(cleanUsername)){setAuthError('O @ deve ter de 3 a 20 caracteres: letras, números ou _.');setBusy(false);return;}
      const {data,error}=await supabase.auth.signUp({
        email:cleanEmail,
        password,
        options:{emailRedirectTo:window.location.origin+'/?auth=confirmed',data:{name:cleanName,social_username:cleanUsername,social_bio:cleanBio}}
      });
      if(error){
        const detail=String(error.message||'').toLowerCase();
        setAuthError(detail.includes('social_profiles_username_key')||detail.includes('duplicate key')?'Esse @ já está em uso. Escolha outro identificador.':error.message.includes('Password')?'Use uma senha mais forte, com pelo menos 6 caracteres.':'Não foi possível criar a conta. Confira os dados e tente novamente.');
      } else if(data.session){
        window.localStorage.setItem('mf_onboarding_pending:'+cleanEmail.toLowerCase(),'true');
        setPage('overview');setOnboardingStep(0);setShowOnboarding(true);
        setAuthNotice('Conta criada! Vamos fazer um tour rápido pelo seu espaço.');
      } else {
        window.localStorage.setItem('mf_onboarding_pending:'+cleanEmail.toLowerCase(),'true');
        setAuthNotice('Cadastro iniciado! Confirme seu e-mail. Quando entrar pela primeira vez, vamos mostrar um tour rápido.');
      }
    } else {
      const {error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
      if(error)setAuthError('Não foi possível entrar. Confira o e-mail e a senha.');
    }
    setBusy(false);
  }
  async function savePlayerBio(e){
    e.preventDefault();if(!session?.user?.id||!supabase)return;
    const cleanBio=String(playerProfile.bio||'').trim().slice(0,160);setPlayerBioBusy(true);
    const {data,error}=await supabase.from('social_profiles').update({bio:cleanBio,updated_at:new Date().toISOString()}).eq('user_id',session.user.id).select('username,bio').maybeSingle();
    if(error||!data){notify(error?.message||'Seu perfil social ainda não foi criado. Saia e entre novamente ou conclua seu cadastro social.');}
    else{setPlayerProfile(p=>({...p,username:data.username,bio:data.bio}));notify('Biografia atualizada na Central do Jogador!');}
    setPlayerBioBusy(false);
  }
  async function savePlayerUsername(e){
    e.preventDefault();if(!session?.user?.id||!supabase)return;
    const clean=String(usernameDraft||'').trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(clean)){notify('O @ deve ter de 3 a 20 caracteres: letras, números ou _.');return;}
    if(clean===String(playerProfile.username||'').toLowerCase()){notify('Esse já é seu @ atual.');return;}
    if(usernameChangedAt&&Date.now()-new Date(usernameChangedAt).getTime()<30*86400000){
      const days=Math.ceil((30*86400000-(Date.now()-new Date(usernameChangedAt).getTime()))/86400000);
      notify('Você poderá alterar seu @ novamente em '+days+' dia(s).');return;
    }
    setUsernameBusy(true);
    const {data,error}=await supabase.from('social_profiles').update({username:clean,updated_at:new Date().toISOString()}).eq('user_id',session.user.id).select('username,username_changed_at').maybeSingle();
    if(error||!data){
      const message=String(error?.message||'').toLowerCase();
      notify(error?.code==='23505'||message.includes('duplicate')?'Esse @ já está em uso.':message.includes('30 dias')?'O @ só pode ser alterado uma vez a cada 30 dias.':error?.message||'Não foi possível alterar seu @.');
    }else{
      setPlayerProfile(p=>({...p,username:data.username}));
      setUsernameDraft(data.username);
      setUsernameChangedAt(data.username_changed_at||new Date().toISOString());
      notify('Seu @ do NEXUS Social foi atualizado!');
    }
    setUsernameBusy(false);
  }
  async function loadData(){
    const userId=session?.user?.id;
    if(!userId||!supabase)return;
    try{await supabase.rpc('generate_recurring_income')}catch(error){console.warn('Geração de entradas recorrentes:',error?.message||error)}
    const tables=['transactions','cards','debts','goals','installments','subscriptions','card_limit_history','goal_movements','notifications'];
    const fetchAllUserRows=async(table)=>{
      const rows=[];let offset=0;const pageSize=1000;
      while(true){
        const orderColumn=table==='card_limit_history'?'changed_at':'created_at';
        const {data:page,error}=await supabase.from(table).select('*').eq('user_id',userId).order(orderColumn,{ascending:false}).order('id',{ascending:true}).range(offset,offset+pageSize-1);
        if(error)return {data:null,error};
        rows.push(...(page||[]));
        if(!page||page.length<pageSize)break;
        offset+=pageSize;
      }
      return {data:rows,error:null};
    };
    const results=await Promise.all(tables.map(fetchAllUserRows));
    if(activeUserIdRef.current!==userId)return;
    const next={};const failedTables=[];
    results.forEach((result,i)=>{
      if(result.error){failedTables.push(tables[i]);next[tables[i]]=data[tables[i]]||[];}
      else next[tables[i]]=result.data||[];
    });
    setData(next);
    if(failedTables.length)notify('Não foi possível atualizar: '+failedTables.join(', ')+'. Seus dados anteriores foram preservados.');
  }
  useEffect(()=>{
    if(!session?.user?.id)return;
    const channel=supabase.channel('nexus-in-app-notifications-'+session.user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+session.user.id},()=>loadData())
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[session?.user?.id]);
  async function saveItem(table, values, item=null){
    setBusy(true);
    if(table==='goalMovement'){
      const goal=data.goals.find(g=>g.id===values.goal_id);
      if(!goal){setBusy(false);notify('Meta não encontrada.');return false}
      const nextSaved=Number(goal.saved)+(values.movement_type==='deposito'?1:-1)*Number(values.amount);
      if(nextSaved<0){setBusy(false);notify('A retirada não pode ser maior que o valor guardado.');return false}
      const movement=await supabase.from('goal_movements').insert({...values,user_id:session.user.id}).select('id').single();
      if(movement.error||!movement.data){setBusy(false);notify('Não foi possível registrar a movimentação.');return false}
      const update=await supabase.from('goals').update({saved:nextSaved}).eq('id',goal.id).eq('user_id',session.user.id);
      if(update.error){await supabase.from('goal_movements').delete().eq('id',movement.data.id);setBusy(false);notify('Não foi possível atualizar a meta.');return false}
      setBusy(false);await loadData();setModal(null);notify('Movimentação da meta registrada!');await addNotification(values.movement_type==='deposito'?'Depósito na meta':'Retirada da meta',(values.movement_type==='deposito'?'Você adicionou ':'Você retirou ')+brl(values.amount)+' da meta.','metas');return true;
    }
    let requestValues={...values};
    const recurringSalary=table==='transactions'&&!item&&requestValues.type==='entrada'&&requestValues.recurring_monthly===true;
    delete requestValues.recurring_monthly;
    const request=item
      ? supabase.from(table).update(requestValues).eq('id',item.id).eq('user_id',session.user.id)
      : supabase.from(table).insert({...requestValues,user_id:session.user.id}).select('id').single();
    const {data:inserted,error}=await request;
    if(!error&&recurringSalary){
      const firstDate=new Date(String(requestValues.date)+'T12:00:00');
      const startMonth=new Date(firstDate.getFullYear(),firstDate.getMonth()+1,1);
      const recurrence=await supabase.from('recurring_incomes').insert({user_id:session.user.id,description:requestValues.description,amount:requestValues.amount,category:requestValues.category||'Salário',day_of_month:firstDate.getDate(),start_month:startMonth.toISOString().slice(0,10),active:true});
      if(recurrence.error){await supabase.from('transactions').delete().eq('id',inserted?.id).eq('user_id',session.user.id);setBusy(false);console.error('Recorrência de salário:',recurrence.error);notify('A entrada foi cancelada porque não foi possível ativar a recorrência.');return false;}
    }
    setBusy(false);
    if(error){console.error('Supabase save error:',{table,code:error.code,message:error.message,details:error.details,hint:error.hint});const reason=error.code==='42P01'?'Tabela não encontrada no Supabase.':error.code==='42501'?'Permissão negada pelo RLS do Supabase.':error.code==='23502'?'Há um campo obrigatório sem valor.':error.code==='42703'?'Coluna não encontrada na tabela.':(error.message||'Erro desconhecido');notify((item?'Não foi possível atualizar: ':'Não foi possível salvar: ')+reason);return false}
    await loadData();setModal(null);notify(item?'Atualizado com sucesso!':'Salvo com sucesso!');const messages={transactions:values.type==='entrada'?['Entrada registrada',(values.description||'Sua entrada')+': '+brl(values.amount)+' registrada.','entradas']:['Gasto registrado',(values.description||'Novo gasto')+': '+brl(values.amount)+' registrado.','gastos'],debts:['Conta adicionada',values.title+': '+brl(values.amount)+' cadastrada.','contas'],installments:['Compra parcelada adicionada',values.description+': '+values.installment_count+' parcelas de aproximadamente '+brl(Number(values.total_amount)/Number(values.installment_count))+'.','parcelas'],subscriptions:['Assinatura adicionada',values.name+': '+brl(values.amount)+' cadastrada.','assinaturas'],goals:['Nova meta criada','A meta '+values.name+' foi adicionada.','metas']};if(messages[table]&&!item)await addNotification(...messages[table]);return true;
  }
  async function confirmPayments(selected){
    if(!selected.length)return;
    setPayBusy(true);
    let completed=0;
    for(const item of selected){
      const amount=item.kind==='installment'?Number(item.record.total_amount||0)/Math.max(1,Number(item.record.installment_count||1)):Number(item.record.amount||0);
      const transaction=await supabase.from('transactions').insert({user_id:session.user.id,date:today(),type:'gasto',category:'Contas',description:item.kind==='installment'?'Parcela: '+item.record.description:'Pagamento: '+item.record.title,amount}).select('id').single();
      if(transaction.error){console.error(transaction.error);notify('Não foi possível registrar um dos pagamentos.');break}
      let update;
      if(item.kind==='installment'){
        update=await supabase.from('installments').update({paid_count:Math.min(Number(item.record.installment_count),Number(item.record.paid_count||0)+1)}).eq('id',item.record.id).eq('user_id',session.user.id);
      }else if(item.record.is_continuous){
        update=await supabase.from('debts').update({paid_month:currentMonthKey,status:'Pago'}).eq('id',item.record.id).eq('user_id',session.user.id);
      }else{
        update=await supabase.from('debts').update({status:'Pago'}).eq('id',item.record.id).eq('user_id',session.user.id);
      }
      if(update.error){await supabase.from('transactions').delete().eq('id',transaction.data.id);console.error(update.error);notify('Um pagamento não pôde ser concluído.');break}
      completed++;
    }
    setPayBusy(false);
    if(completed){await loadData();setPayModal(false);notify(completed+' pagamento(s) registrado(s) com sucesso!');}
  }
  async function changeCardLimit(card){
    const raw=window.prompt(`Novo limite total para ${card.name} (R$):`,String(card.limit_amount));
    if(raw===null)return;
    const next=Number(raw.replace(',','.'));
    if(!Number.isFinite(next)||next<0){notify('Digite um limite válido.');return}
    setBusy(true);
    const history=await supabase.from('card_limit_history').insert({user_id:session.user.id,card_id:card.id,previous_limit:Number(card.limit_amount),new_limit:next});
    if(history.error){setBusy(false);notify('Não foi possível registrar o histórico do limite.');return}
    const update=await supabase.from('cards').update({limit_amount:next}).eq('id',card.id).eq('user_id',session.user.id);
    setBusy(false);
    if(update.error){notify('O histórico foi salvo, mas não foi possível atualizar o cartão.');return}
    await loadData();notify('Limite atualizado e histórico registrado!');await addNotification('Limite do cartão alterado',card.name+': '+brl(card.limit_amount)+' → '+brl(next)+'.','cartoes');
  }
  function toggleAdminTestMode(){
    if(!isAdmin)return;
    const keys=['mf_game_xp','mf_game_correct',quizStorageKey,'mf_flap_daily','mf_flap_best','mf_flap_best_infinite','mf_flap_bird','mf_flap_pipe','mf_flap_story_unlocks','mf_player_profile'];
    if(!adminTestMode){
      const backup={};keys.forEach(key=>{backup[key]=window.localStorage.getItem(key)});
      window.localStorage.setItem('mf_admin_test_backup',JSON.stringify(backup));
      window.localStorage.setItem('mf_game_xp','10000');
      window.localStorage.setItem('mf_game_correct','100');
      window.localStorage.setItem(quizStorageKey,'0');
      window.localStorage.setItem('mf_flap_daily',JSON.stringify({day:new Date().toLocaleDateString('en-CA'),xp:0}));
      window.localStorage.setItem('mf_flap_best','100');
      window.localStorage.setItem('mf_flap_best_infinite','100');
      window.localStorage.setItem('mf_flap_bird','galaxy');
      window.localStorage.setItem('mf_flap_pipe','crystal');
      window.localStorage.setItem('mf_flap_story_unlocks',JSON.stringify({easy:true,normal:true,hard:true}));
      const profile={...playerProfile,frame:'chrome',cardFrame:'chrome',gems:['sapphire','amethyst','ruby','prism']};
      window.localStorage.setItem('mf_player_profile',JSON.stringify(profile));
      window.localStorage.setItem('mf_admin_test_mode','true');
      setGameXp(10000);setGameCorrect(100);setQuizLastPlayed(0);setDailyGameXp(0);
      setPlayerProfile(profile);setAdminTestMode(true);
      notify('Modo de testes ativado! XP, níveis, roupas, canos e molduras liberados.');
    }else{
      let backup={};try{backup=JSON.parse(window.localStorage.getItem('mf_admin_test_backup')||'{}')}catch{}
      keys.forEach(key=>{if(backup[key]===null||backup[key]===undefined)window.localStorage.removeItem(key);else window.localStorage.setItem(key,backup[key])});
      window.localStorage.removeItem('mf_admin_test_backup');
      window.localStorage.removeItem('mf_admin_test_mode');
      setGameXp(Number(backup.mf_game_xp||0));setGameCorrect(Number(backup.mf_game_correct||0));
      setQuizLastPlayed(Number(backup[quizStorageKey]||0));
      try{const daily=JSON.parse(backup.mf_flap_daily||'{}');setDailyGameXp(daily.day===new Date().toLocaleDateString('en-CA')?Number(daily.xp||0):0)}catch{setDailyGameXp(0)}
      try{setPlayerProfile(JSON.parse(backup.mf_player_profile||'{"name":"Meu jogador","avatar":"👾","frame":"violet","cardFrame":"cyan","username":"","bio":""}'))}catch{}
      setAdminTestMode(false);
      notify('Progresso original restaurado.');
    }
  }

  async function adminAction(action,userId,extra={}){
    if(action==='update_report_status'){
      const existing=adminReports.find(report=>
        report.report_type===extra.report_type&&String(report.id)===String(extra.report_id)
      );
      // A denúncia pode já estar resolvida (ex.: após atualizar a página).
      // Não envia uma segunda atualização nem deixa a interface entrar em estado de erro.
      if(existing&&existing.status===extra.status){
        setAdminError('');
        setAdminMessage(extra.status==='resolved'?'Esta denúncia já está marcada como resolvida.':'Esta denúncia já está com esse status.');
        return;
      }
    }
    if(action==='delete_user'&&!window.confirm('ATENÇÃO: excluir esta conta é definitivo. Os dados vinculados também poderão ser removidos. Deseja continuar?'))return;
    if(action==='broadcast_announcement'&&!window.confirm('Enviar este comunicado para todos os usuários ativos? Essa ação não pode ser desfeita.'))return;
    if(action==='send_custom_notification'&&!window.confirm('Enviar esta notificação para a conta selecionada? Ela aparecerá no histórico e poderá chegar como push ao celular.'))return;
    if(action==='update_report_status'&&!window.confirm('Confirmar a atualização do status desta denúncia?'))return;
    if(action==='delete_report'&&!window.confirm('Apagar esta denúncia permanentemente? Esta ação não pode ser desfeita.'))return;
    setAdminBusy(true);setAdminError('');setAdminMessage('');
    try{
      const {data:result,error}=await supabase.functions.invoke('admin-panel',{body:{action,user_id:userId,...extra}});
      if(error||result?.error){
        let detail=result?.error||error?.message||'Falha sem detalhes retornados.';
        try{const ctx=error?.context;if(ctx&&typeof ctx.clone==='function'){const payload=await ctx.clone().json();detail=payload?.error||payload?.message||detail}}catch{}
        throw new Error(detail);
      }
      if(action==='list_users'){setAdminUsers(result.users||[]);setAdminMessage('Lista de contas atualizada.');return}
      if(action==='list_social_profiles'){setAdminSocialProfiles(result.profiles||[]);setAdminMessage('Perfis sociais atualizados.');return}
      if(action==='list_reports'){setAdminReports(result.reports||[]);setAdminMessage('Denúncias atualizadas.');return}
      if(action==='update_report_status'){
        const reportType=extra.report_type;
        const reportId=String(extra.report_id||'');
        const nextStatus=extra.status;
        if(!reportId||!['profile','content'].includes(reportType)||!['open','reviewing','resolved','dismissed'].includes(nextStatus)){
          throw new Error('Não foi possível identificar a denúncia ou o novo status.');
        }
        // Atualiza somente o cartão afetado. Evita uma segunda chamada de listagem
        // logo após a alteração, que podia provocar falha durante a atualização da tela.
        setAdminReports(current=>current.map(report=>
          report.report_type===reportType&&String(report.id)===reportId
            ? {...report,status:nextStatus}
            : report
        ));
        setAdminMessage('Status da denúncia atualizado.');
        return;
      }
      if(action==='delete_report'){
        const reportType=extra.report_type;
        const reportId=String(extra.report_id||'');
        setAdminReports(current=>current.filter(report=>
          !(report.report_type===reportType&&String(report.id)===reportId)
        ));
        setAdminMessage('Denúncia apagada.');
        return;
      }
      if(action==='moderate_social_profile'||action==='delete_social_profile'){
        setAdminMessage(action==='delete_social_profile'?'Perfil social removido.':extra.suspended?'Perfil social suspenso.':'Perfil social reativado.');
        const {data:refreshed,error:refreshError}=await supabase.functions.invoke('admin-panel',{body:{action:'list_social_profiles'}});
        if(refreshError||refreshed?.error)throw new Error(refreshed?.error||refreshError?.message||'A alteração foi feita, mas não foi possível atualizar os perfis.');
        setAdminSocialProfiles(refreshed.profiles||[]);
        return;
      }
      if(action==='get_maintenance'){setMaintenance(!!result.settings?.maintenance_mode);setMaintenanceMessage(result.settings?.maintenance_message||'Estamos realizando uma manutenção. Voltaremos em breve.');return}
      if(action==='set_maintenance'){setMaintenance(!!result.maintenance_mode);setAdminMessage(result.maintenance_mode?'Modo manutenção ativado.':'Modo manutenção desativado.');return}
      if(action==='broadcast_announcement'){
        let pushResult=null,pushFailed=false;
        if(extra.send_push){
          try{
            const {data:pushData,error:pushError}=await supabase.functions.invoke('send-push',{body:{title:extra.title,body:extra.message,url:'/',tag:'aviso-geral-meu-financeiro',target_all:true}});
            if(pushError){pushFailed=true;console.warn('Push geral:',pushError.message)}else pushResult=pushData;
          }catch(pushError){pushFailed=true;console.warn('Push geral:',pushError)}
        }
        const pushSent=Number(pushResult?.sent||0);
        const subscriptions=Number(pushResult?.subscriptions||0);
        setAdminMessage('Notificação salva para '+Number(result.sent||0)+' usuários ativos. '+(pushSent>0?'Push enviado para '+pushSent+' aparelhos.':pushFailed?'O push não pôde ser enviado; o aviso continua disponível no sino do app.':subscriptions===0?'Nenhum aparelho tinha push ativo; o aviso continua disponível no sino do app.':'Push não confirmado; o aviso continua disponível no sino do app.'));
        setAdminNotificationTitle('');setAdminNotificationBody('');setAdminAnnouncementTitle('');setAdminAnnouncementBody('');return;
      }
      if(action==='reset_password'){setAdminMessage('Link de redefinição gerado: '+(result.action_link||'Confira o e-mail do usuário.'));return}
      setAdminMessage(action==='ban_user'?'Conta bloqueada.':action==='unban_user'?'Conta desbloqueada.':'Conta excluída definitivamente.');
      const {data:refreshed,error:refreshError}=await supabase.functions.invoke('admin-panel',{body:{action:'list_users'}});
      if(refreshError||refreshed?.error)throw new Error(refreshed?.error||refreshError?.message||'A ação foi feita, mas não foi possível atualizar as contas.');
      setAdminUsers(refreshed.users||[]);
    }catch(err){
      console.error('Falha na ação administrativa:',action,err);
      setAdminError(err?.message||'Não foi possível concluir esta ação. Tente novamente.');
    }finally{setAdminBusy(false)}
  }
  useEffect(()=>{if(session&&isAdmin&&page==='admin'&&!adminUsers.length&&!adminBusy&&!adminError)adminAction('list_users')},[session,page]);

  async function deleteItem(table,id){
    const {error}=await supabase.from(table).delete().eq('id',id).eq('user_id',session.user.id);
    if(error){notify('Não foi possível excluir.');return}
    await loadData();notify('Registro excluído.');
  }

  const quizAvailable=!quizLastPlayed||quizClock-quizLastPlayed>=2*60*60*1000;
  function startQuiz(){if(!quizAvailable)return;const selected=[...gameQuestions].sort(()=>Math.random()-.5).slice(0,5);const now=Date.now();setRoundQuestions(selected);setGameQuestionIndex(0);setGameAnswer(null);setGameFeedback('');setRoundCorrect(0);setQuizLastPlayed(now);window.localStorage.setItem(quizStorageKey,String(now));setQuizActive(true)}
  function answerGame(index){if(gameAnswer!==null||!quizActive)return;setGameAnswer(index);const q=roundQuestions[gameQuestionIndex];if(index===q.correct){setGameXp(v=>v+5);setGameCorrect(v=>v+1);setRoundCorrect(v=>v+1);if(session?.user?.id&&supabase)void supabase.rpc('social_record_clan_game_xp',{target_game:'quiz',xp_delta:5});setGameFeedback('Resposta certa! +5 XP. '+q.explanation)}else{setGameFeedback('Quase! '+q.explanation)}}
  function nextGameQuestion(){if(gameQuestionIndex>=roundQuestions.length-1){setQuizActive(false);setGameFeedback('');void recordCompetitionMatch({gameKey:'quiz',score:roundCorrect,xpEarned:roundCorrect*5,mode:'5-perguntas',won:roundCorrect>=4});return}setGameQuestionIndex(v=>v+1);setGameAnswer(null);setGameFeedback('')}
  async function awardLootDrop(gameKey,sourceKey){if(!session?.user?.id||!supabase)return null;const {data,error}=sourceKey==='coin_pickup'?await supabase.rpc('nexus_award_coin_drop',{selected_game:gameKey}):await supabase.rpc('nexus_award_loot_drop',{selected_game:gameKey,source_key:sourceKey});if(error){console.warn('Loot drop:',error.message);const now=Date.now();if(now-lootWarnAt>30000){lootWarnAt=now;notify('Não conseguimos registrar uma recompensa agora. Seu progresso no jogo foi mantido.')}return null}if(data?.coins){setLiveGameLoot(v=>({...v,coins:v.coins+Number(data.coins||0)}));notify('MOEDAS NEXUS! +'+data.coins+' moedas')}else if(data?.item_name){setLiveGameLoot(v=>({...v,items:[...v.items,data]}));notify('DROP RARO! '+(data.icon||'🎁')+' '+data.item_name+' · +'+Number(data.score_value||0).toLocaleString('pt-BR')+' pontos na coleção')}return data||null}
  async function recordCompetitionMatch({gameKey,score,xpEarned=0,mode='normal',won=false,durationSeconds=0}){
    const earnedXp=Math.max(0,Math.min(1000,Math.floor(Number(xpEarned)||0)));
    const localLoot={coins:Number(liveGameLoot.coins||0),items:[...(liveGameLoot.items||[])]};
    // Mostra o resultado imediatamente; a gravação online não pode bloquear a tela de recompensas.
    setRewardSummary({gameKey,xp:earnedXp,coins:localLoot.coins,items:localLoot.items,score:Number(score)||0,won:!!won,mode,durationSeconds,saving:!!session?.user?.id&&!!supabase});
    if(!session?.user?.id||!supabase)return null;
    const {data:matchId,error}=await supabase.rpc('competition_record_match',{selected_game:gameKey,match_score:Math.max(0,Math.floor(Number(score)||0)),earned_xp:earnedXp,selected_mode:String(mode||'normal'),did_win:!!won,match_duration:Math.max(0,Math.min(7200,Math.floor(Number(durationSeconds)||0)))});
    if(error){
      console.warn('Competition match:',error.message);
      setRewardSummary(prev=>prev?({...prev,saving:false,saveError:true}):prev);
      notify('Não foi possível registrar a partida no ranking. Suas recompensas locais continuam exibidas.');
      return null;
    }
    const {data:drops,error:dropsError}=await supabase.from('nexus_loot_drops').select('item_name,item_type,score_value,icon,quantity,rarity').eq('match_id',matchId).order('score_value',{ascending:false});
    const rewards=drops||[];
    const coins=rewards.filter(d=>d.item_type==='currency').reduce((sum,d)=>sum+Number(d.quantity||0),0);
    const items=rewards.filter(d=>d.item_type!=='currency');
    setRewardSummary(prev=>prev?({...prev,coins:coins+localLoot.coins,items:[...items,...localLoot.items],saving:false,saveError:!!dropsError}):prev);
    return {matchId,coins,items,rewards};
  }
  function awardFlapXp(score,gameKey='piggy-run'){const points=Math.max(0,Math.floor(Number(score)||0));const direct=gameKey==='space-nexus-direct'||gameKey==='piggy-run-direct';const reward=direct?points:gameKey==='space-nexus'?Math.min(35,Math.max(4,Math.floor(points*.8))):Math.min(25,Math.floor(points*.25));if(reward>0){setGameXp(v=>v+reward);if(session?.user?.id&&supabase)void supabase.rpc('social_record_clan_game_xp',{target_game:gameKey==='space-nexus-direct'?'space-nexus':gameKey==='piggy-run-direct'?'piggy-run':gameKey,xp_delta:reward});if(!direct)notify('Mandou bem! +'+reward+' XP no jogo.');return reward}return 0}

  async function sendAssistantMessage(value=assistantInput){
    const question=String(value||'').trim();
    if(!question||assistantBusy)return;
    const previous=assistantMessages.filter(m=>m.role==='user'||m.role==='assistant').slice(-60);
    const nextHistory=[...previous.map(m=>({role:m.role,content:m.text})),{role:'user',content:question}];
    const financeContext={
      transactions:(data.transactions||[]).map(t=>({date:t.date,type:t.type,category:t.category,description:t.description,amount:t.amount})),
      cards:(data.cards||[]).map(c=>({name:c.name,limit:c.limit_amount,used:c.used,dueDay:c.due_day})),
      debts:(data.debts||[]).map(d=>({title:d.title,amount:d.amount,dueDate:d.due_date,status:d.status})),
      goals:(data.goals||[]).map(g=>({name:g.name,target:g.target,saved:g.saved,deadline:g.deadline})),
      installments:(data.installments||[]).map(i=>({description:i.description,amount:i.total_amount,count:i.installment_count,paid:i.paid_count}))
    };
    setAssistantMessages(old=>[...old,{role:'user',text:question}]);
    setAssistantInput('');
    setAssistantBusy(true);
    setAssistantError('');
    try{
      // Dá tempo para o navegador renderizar o estado "NEXUS está pensando…" antes
      // de executar o motor local síncrono. Sem esta pausa, React pode agrupar as
      // atualizações de estado e o indicador desaparecer antes de chegar à tela.
      await new Promise(resolve=>window.setTimeout(resolve,750));
      // Execução inteiramente local no navegador: nenhum texto ou dado financeiro é enviado a uma IA externa.
      const legacyReply=generateNexusReply(question,financeContext,nextHistory);
      // A camada composicional revisa apenas respostas genéricas ou pouco contextualizadas.
      // Todo o processamento permanece no navegador; nenhum modelo/API externo é chamado.
      const { improveNexusFallback } = await import('./nexus-cognition.js');
      const reply=improveNexusFallback(question,nextHistory,legacyReply);
      setAssistantMessages(old=>[...old,{role:'assistant',text:reply}]);
    }catch(error){
      console.error('NEXUS CORE:',error);
      setAssistantError('Tive dificuldade para interpretar essa mensagem. Tente explicar de outro jeito.');
    }finally{setAssistantBusy(false);}
  }

  const flapBestForGems=Math.max(Number(window.localStorage.getItem('mf_flap_best')||0),Number(window.localStorage.getItem('mf_flap_best_infinite')||0));
  let flapStoryForGems={};try{flapStoryForGems=JSON.parse(window.localStorage.getItem('mf_flap_story_unlocks')||'{}')}catch{}
  const gemMissions=[
    {id:'sapphire',name:'Safira da sabedoria',symbol:'💠',rarity:'common',rarityLabel:'COMUM',description:'Acerte sua primeira pergunta no Quiz.',progress:Math.min(1,gameCorrect),target:1,done:gameCorrect>=1},
    {id:'amethyst',name:'Ametista estrategista',symbol:'🔮',rarity:'rare',rarityLabel:'RARO',description:'Acumule 10 respostas corretas no Quiz.',progress:Math.min(10,gameCorrect),target:10,done:gameCorrect>=10},
    {id:'ruby',name:'Rubi do arcade',symbol:'♦️',rarity:'epic',rarityLabel:'ÉPICO',description:'Alcance 30 pontos em uma partida do Asas da Fortuna.',progress:Math.min(30,flapBestForGems),target:30,done:flapBestForGems>=30},
    {id:'prism',name:'Prisma lendário',symbol:'🌈',rarity:'legendary',rarityLabel:'LENDÁRIO',description:'Conclua o modo História na dificuldade Difícil.',progress:flapStoryForGems.hard?1:0,target:1,done:!!flapStoryForGems.hard}
  ];
  const currentMonth=monthStart();
  const currentMonthKey=currentMonth.slice(0,7);
  const income=data.transactions.filter(t=>t.type==='entrada'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const recordedExpenses=data.transactions.filter(t=>t.type==='gasto'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const monthDebts=data.debts.filter(d=>d.is_continuous?(d.paid_month!==currentMonthKey):(d.status!=='Pago'&&(!d.due_date||String(d.due_date).slice(0,7)<=currentMonthKey)));
  const monthDebtOutflow=monthDebts.reduce((sum,d)=>sum+Number(d.amount||0),0);
  const monthInstallments= data.installments.filter(i=>{
    const remaining=Number(i.installment_count||0)-Number(i.paid_count||0);
    if(remaining<=0||!i.first_due_date)return false;
    const due=new Date(String(i.first_due_date).slice(0,10)+'T12:00:00');
    due.setMonth(due.getMonth()+Number(i.paid_count||0));
    return due.toISOString().slice(0,7)<=currentMonthKey;
  });
  const monthInstallmentOutflow=monthInstallments.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);
  const expenses=recordedExpenses+monthDebtOutflow+monthInstallmentOutflow;
  const paidIn=data.transactions.filter(t=>t.type==='entrada').reduce((a,t)=>a+Number(t.amount),0);
  const paidOut=data.transactions.filter(t=>t.type==='gasto').reduce((a,t)=>a+Number(t.amount),0);
  const balance=paidIn-paidOut;
  const openDebts=data.debts.filter(d=>d.is_continuous?d.paid_month!==currentMonthKey:d.status!=='Pago').reduce((a,d)=>a+Number(d.amount),0);
  const cardUsed=data.cards.reduce((a,c)=>a+Number(c.used||0),0);
  const goalTotal=data.goals.reduce((a,g)=>a+Math.max(0,Number(g.target)-Number(g.saved)),0);
  const activeInstallments=data.installments.filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0));
  const openInstallmentCount=activeInstallments.reduce((sum,i)=>sum+Math.max(0,Number(i.installment_count||0)-Number(i.paid_count||0)),0);
  const installmentMonthly=activeInstallments.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);
  const installmentRemaining=activeInstallments.reduce((sum,i)=>sum+(Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)))*Math.max(0,Number(i.installment_count||0)-Number(i.paid_count||0)),0);
  const cardLimit=data.cards.reduce((sum,c)=>sum+Number(c.limit_amount||0),0);
  const cardAvailable=Math.max(0,cardLimit-cardUsed);
  const pendingDebtCount=data.debts.filter(x=>x.is_continuous?x.paid_month!==currentMonthKey:x.status!=='Pago').length;
  const goalSaved=data.goals.reduce((sum,g)=>sum+Number(g.saved||0),0);
  const activeSubscriptions=data.subscriptions.filter(s=>s.status==='Ativa');
  const subscriptionsMonthly=activeSubscriptions.reduce((sum,s)=>sum+Number(s.amount||0)/(s.frequency==='anual'?12:1),0);
  const chartData=useMemo(()=>{
    const months=[];
    for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=d.toISOString().slice(0,7);
      const tx=data.transactions.filter(t=>String(t.date).slice(0,7)===key);
      const recorded=tx.filter(t=>t.type==='gasto').reduce((a,t)=>a+Number(t.amount),0);
      const commitments=key===currentMonthKey?monthDebtOutflow+monthInstallmentOutflow:0;
      months.push({month:d.toLocaleDateString('pt-BR',{month:'short'}),Entradas:tx.filter(t=>t.type==='entrada').reduce((a,t)=>a+Number(t.amount),0),Gastos:recorded+commitments});
    }return months;
  },[data.transactions,data.debts,data.installments,currentMonthKey,monthDebtOutflow,monthInstallmentOutflow]);
  const categories=useMemo(()=>{
    const map={};data.transactions.filter(t=>t.type==='gasto').forEach(t=>map[t.category||'Outros']=(map[t.category||'Outros']||0)+Number(t.amount));
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,5);
  },[data.transactions]);
  const suggestions=[];
  if(income>0&&expenses/income>.8)suggestions.push('Seus gastos já passaram de 80% das entradas deste mês. Vale revisar os gastos variáveis.');
  if(openDebts>0)suggestions.push(`Você tem ${brl(openDebts)} em dívidas/contas ainda não marcadas como pagas.`);
  if(cardUsed>0)suggestions.push(`Você registrou ${brl(cardUsed)} como valor utilizado nos cartões. Confira os limites antes de novas compras.`);
  if(!suggestions.length)suggestions.push('Registre suas entradas e gastos para receber dicas financeiras baseadas nos seus próprios dados.');
  const onboardingSteps=[
    {eyebrow:'BOAS-VINDAS',title:'Seu espaço, sem complicação',body:'Este tour mostra onde encontrar o essencial. Você pode pular a qualquer momento e continuar usando o app normalmente.',page:'overview',icon:Wallet,tip:'A Visão geral reúne seu saldo, entradas, saídas e próximos compromissos.'},
    {eyebrow:'PASSO 1 DE 5',title:'Registre o que entra e sai',body:'Adicione salário, mesada, vendas e gastos. Assim o painel calcula seu saldo e mostra para onde o dinheiro está indo.',page:'transactions',icon:Activity,tip:'Use “Nova movimentação” para registrar sua primeira entrada ou despesa.'},
    {eyebrow:'PASSO 2 DE 5',title:'Organize cartões e parcelas',body:'Cadastre cartões, limites, vencimentos, compras parceladas e assinaturas para acompanhar seus compromissos.',page:'cards',icon:CreditCard,tip:'Você pode começar sem cartão e cadastrar depois.'},
    {eyebrow:'PASSO 3 DE 5',title:'Crie metas possíveis',body:'Defina um objetivo, quanto quer juntar e acompanhe seu progresso. Pequenos passos também contam.',page:'planning',icon:Target,tip:'Exemplo: guardar R$ 20 por semana para uma compra ou reserva.'},
    {eyebrow:'PASSO 4 DE 5',title:'Aprenda jogando',body:'Entre no NEXUS Arcade, complete desafios e evolua seu perfil enquanto aprende sobre finanças.',page:'games',icon:Gamepad2,tip:'Os jogos são opcionais. Seu controle financeiro continua sendo o foco.'},
    {eyebrow:'PASSO 5 DE 5',title:'Conheça a comunidade',body:'No NEXUS Social você pode personalizar seu perfil, acompanhar publicações e interagir com a comunidade.',page:'social-feed',icon:Users,tip:'Compartilhe apenas o que deseja tornar público.'}
  ];
  const currentOnboarding=onboardingSteps[Math.min(onboardingStep,onboardingSteps.length-1)];
  function finishOnboarding(){if(session?.user?.id)window.localStorage.setItem('mf_onboarding_done:'+session.user.id,'true');if(session?.user?.email)window.localStorage.removeItem('mf_onboarding_pending:'+String(session.user.email).toLowerCase());setShowOnboarding(false);}

  if(loading||!maintenanceCheckDone||!splashReady)return <div className="mf-splash mf-launch-screen" role="status" aria-label="Carregando Meu Financeiro" style={{position:'fixed',inset:0,zIndex:2147483000,width:'100%',height:'100dvh',minHeight:'100vh',display:'grid',placeItems:'center',overflow:'hidden',isolation:'isolate',background:'#080D18',color:'#f8faff'}}>
    <style>{`
      .mf-launch-screen .mf-launch-center{position:relative;z-index:2;width:min(88vw,360px);display:flex;flex-direction:column;align-items:center;text-align:center;animation:mfEnter .9s cubic-bezier(.2,.8,.2,1) both}
      .mf-launch-screen .mf-launch-symbol{width:104px;height:104px;display:grid;place-items:center;background:transparent;border:0;box-shadow:none}
      .mf-launch-screen .mf-launch-symbol .brand-icon{width:94px;height:94px;border-radius:0;box-shadow:none;background:transparent}
      .mf-launch-screen .mf-launch-symbol svg{width:100%;height:100%}
      .mf-launch-screen .mf-three-bars-animated rect{transform-box:fill-box;transform-origin:center bottom;animation:mfBarRise .42s cubic-bezier(.18,.78,.25,1) both}
      .mf-launch-screen .mf-three-bars-animated .mf-bar-one{animation-delay:0s}
      .mf-launch-screen .mf-three-bars-animated .mf-bar-two{animation-delay:.34s}
      .mf-launch-screen .mf-three-bars-animated .mf-bar-three{animation-delay:.68s}
      .mf-launch-screen .mf-launch-name{margin-top:25px;font:800 clamp(29px,8vw,39px)/1.05 Manrope,system-ui,sans-serif;letter-spacing:-1.7px;color:#f7f8ff}
      .mf-launch-screen .mf-launch-name span{background:linear-gradient(95deg,#b8a1ff,#8b9cff 55%,#65dce9);-webkit-background-clip:text;background-clip:text;color:transparent}
      .mf-launch-screen .mf-launch-tagline{margin-top:12px;color:#aab6ce;font:600 10px/1.5 Manrope,system-ui,sans-serif;letter-spacing:2.4px}
      .mf-launch-screen .mf-launch-track{width:174px;height:4px;margin-top:38px;border-radius:8px;background:rgba(152,166,199,.18);overflow:hidden}
      .mf-launch-screen .mf-launch-track i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a78bfa,#67ddec);box-shadow:0 0 12px rgba(103,221,236,.7);animation:mfTrack 1.6s ease-in-out infinite}
      .mf-launch-screen .mf-launch-caption{margin-top:15px;color:#7484a2;font:600 9px/1.5 Manrope,system-ui,sans-serif;letter-spacing:1.8px}
      @keyframes mfEnter{from{opacity:0;transform:translateY(16px) scale(.96);filter:blur(5px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
      @keyframes mfBarRise{from{transform:scaleY(0);opacity:.35}to{transform:scaleY(1);opacity:1}}
      @keyframes mfTrack{0%{transform:translateX(-110%)}100%{transform:translateX(300%)}}
      @media(prefers-reduced-motion:reduce){.mf-launch-screen *,.mf-launch-screen:before{animation:none!important}}
    `}</style>
    <div className="mf-launch-center">
      <div className="mf-launch-symbol"><BrandMark animated/></div>
      <div className="mf-launch-name">meu<span>financeiro</span></div>
      <div className="mf-launch-tagline">PLANEJE · EVOLUA · CONQUISTE</div>
      <div className="mf-launch-track"><i/></div>
      <div className="mf-launch-caption">CARREGANDO SEU UNIVERSO FINANCEIRO</div>
    </div>
  </div>;
  if(!isConfigured)return <SetupScreen/>;
  if(maintenance&&!isAdmin)return <div className="setup-shell"><div className="setup-card"><div className="brand"><BrandMark /><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Estamos em manutenção</h1><p>{maintenanceMessage}</p><p>Estamos trabalhando para melhorar sua experiência. Tente novamente mais tarde.</p></div></div>;
  if(authFlow==='recovery')return <div className="auth-shell"><div className="auth-art"><div className="brand"><BrandMark/><span>meu<span className="brand-accent">financeiro</span></span></div><div className="auth-message"><div className="eyebrow"><ShieldCheck size={15}/> ACESSO SEGURO</div><h1>Uma nova senha.<br/><span>Uma nova etapa.</span></h1><p>Crie uma senha forte para voltar ao seu espaço financeiro.</p></div><div className="auth-foot">SUA CONTA PROTEGIDA.</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={saveNewPassword}><div className="lock-circle"><KeyRound size={25}/></div><h2>Redefinir senha</h2><p>Escolha uma nova senha para sua conta.</p><label>Nova senha<input type="password" autoComplete="new-password" minLength="8" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label><label>Confirme a nova senha<input type="password" autoComplete="new-password" minLength="8" required value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} placeholder="Digite novamente"/></label>{authError&&<div className="error">{authError}</div>}<button className="primary wide" disabled={busy}>{busy?'Salvando…':'Salvar nova senha'} <ChevronRight size={18}/></button></form></div></div>;
  if(authFlow==='confirmed'||authFlow==='password-updated')return <div className="auth-shell"><div className="auth-art"><div className="brand"><BrandMark/><span>meu<span className="brand-accent">financeiro</span></span></div><div className="auth-message"><div className="eyebrow"><ShieldCheck size={15}/> CONTA PROTEGIDA</div><h1>Seu acesso.<br/><span>Do seu jeito.</span></h1><p>Estamos felizes em ter você com a gente.</p></div><div className="auth-foot">PLANEJE · EVOLUA · CONQUISTE.</div></div><div className="auth-form-wrap"><section className="auth-form"><div className="lock-circle"><Check size={25}/></div><h2>{authFlow==='confirmed'?'E-mail confirmado!':'Senha alterada!'}</h2><p>{authFlow==='confirmed'?'Tudo certo! Seu endereço de e-mail foi confirmado. Sua conta está pronta para continuar.':'Sua nova senha foi salva com sucesso. Você já pode entrar com ela.'}</p><button className="primary wide" type="button" onClick={()=>{closeAuthFlow();if(!session)setAuthMode('login');else setPage('overview')}}>{session?'Entrar no Meu Financeiro':'Ir para o login'} <ChevronRight size={18}/></button></section></div></div>;
  if(!session)return <div className="auth-shell"><div className="auth-art"><div className="brand"><BrandMark /><span>meu<span className="brand-accent">financeiro</span></span></div><div className="auth-message"><div className="eyebrow"><ShieldCheck size={15}/> SEU ESPAÇO PESSOAL</div><h1>Cuide do seu dinheiro.<br/><span>Do seu jeito.</span></h1><p>Um lugar só seu para organizar suas finanças, acompanhar seus objetivos e tomar decisões melhores.</p><div className="auth-mini-stats"><div><span>Controle</span><b>em suas mãos</b></div><div><span>Acesso</span><b>protegido</b></div></div></div><div className="auth-foot">FINANÇAS MAIS CLARAS, UM DIA DE CADA VEZ.</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={handleAuth}><div className="lock-circle"><LockKeyhole size={25}/></div><h2>{authMode==='login'?'Bem-vindo de volta':'Crie sua conta'}</h2><p>{authMode==='login'?'Entre para acessar seu painel privado.':'Comece a organizar suas finanças em seu espaço particular.'}</p>{authMode==='signup'&&<><label>Seu nome<input type="text" autoComplete="name" required minLength="2" maxLength="40" value={signupName} onChange={e=>setSignupName(e.target.value.slice(0,40))} placeholder="Como você quer ser chamado"/><small>Esse nome aparecerá no seu perfil e para outras pessoas no NEXUS Social.</small></label><label>@ do NEXUS Social<input type="text" autoComplete="username" required minLength="3" maxLength="20" value={signupUsername} onChange={e=>setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="seu_usuario"/><small>De 3 a 20 caracteres · letras, números e _ · único na comunidade.</small></label><label>Biografia inicial<textarea maxLength={160} rows={3} value={signupBio} onChange={e=>setSignupBio(e.target.value)} placeholder="Conte um pouco sobre você..."/><small>{signupBio.length}/160 · Você poderá editar depois na Central do Jogador.</small></label></>}
<label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='login'?'Sua senha':'Crie uma senha (mín. 6 caracteres)'}/></label>{authMode==='login'&&<button type="button" className="auth-switch" style={{alignSelf:'flex-end',marginTop:-8}} onClick={requestPasswordReset} disabled={busy}>Esqueci minha senha</button>}{authError&&<div className="error">{authError}</div>}{authNotice&&<div className="auth-notice">{authNotice}</div>}<button className="primary wide" disabled={busy}>{busy?(authMode==='login'?'Entrando…':'Criando conta…'):(authMode==='login'?'Entrar na minha conta':'Criar minha conta')} <ChevronRight size={18}/></button><button type="button" className="auth-switch" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('');setAuthNotice('')}}>{authMode==='login'?'Ainda não tem conta? Criar cadastro':'Já tem uma conta? Entrar'}</button><div className="secure-note"><ShieldCheck size={15}/> Área privada • Conexão segura</div></form></div></div>;



  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'open':''}`}><div className="brand"><BrandMark /><span>meu<span className="brand-accent">financeiro</span></span><button className="mobile-close icon-btn" onClick={()=>setMobileMenu(false)}><X size={19}/></button></div><div className="side-caption">SEU ESPAÇO</div><nav>{financeMenu.map(([label,Icon,key])=><button key={key} className={`nav-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setMobileMenu(false)}}><Icon size={19}/><span>{label}</span>{page===key&&<span className="nav-dot"/>}</button>)}<div className="side-caption" style={{paddingTop:18}}>NEXUS</div>{nexusMenu.map(([label,Icon,key])=><button key={key} className={`nav-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setMobileMenu(false)}}><Icon size={19}/><span>{label}</span>{page===key&&<span className="nav-dot"/>}</button>)}<button type="button" className={`nav-item nav-group-toggle ${page.startsWith('social-')?'active':''}`} aria-expanded={socialExpanded} onClick={()=>setSocialExpanded(v=>!v)}><Users size={19}/><span>NEXUS Social</span><ChevronDown className={`nav-group-chevron ${socialExpanded?'expanded':''}`} size={16}/></button>{socialExpanded&&<div className="nav-submenu">{socialMenu.map(([label,Icon,key])=><button type="button" key={key} className={`nav-sub-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setMobileMenu(false)}}><Icon size={16}/><span>{label}</span>{page===key&&<i/>}</button>)}</div>}{isAdmin&&<><div className="side-caption" style={{paddingTop:18}}>ADMINISTRAÇÃO</div><button className={`nav-item ${page==='admin'?'active':''}`} onClick={()=>{setPage('admin');setMobileMenu(false)}}><ShieldCheck size={19}/><span>Painel ADM</span>{page==='admin'&&<span className="nav-dot"/>}</button></>}</nav><div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={18}/><div><b>Seus dados, suas regras</b><span>Espaço financeiro pessoal</span></div></div><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sair da conta</button></div></aside>
    {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}/>}
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><div className="crumb">Meu espaço <ChevronRight size={14}/><b>{[...menu,...socialMenu,...(isAdmin?[['Painel ADM',ShieldCheck,'admin']]:[])].find(x=>x[2]===page)?.[0]|| (page==='notifications'?'Notificações':'Visão geral')}</b></div><div className="top-actions"><button className="xp-header-chip" aria-label={`Jogador nível ${Math.floor(gameXp/500)+1}, ${gameXp} XP. Abrir oportunidades`} onClick={()=>setPage("opportunities")}><Zap size={15}/><span><b>{gameXp} XP</b><small>NÍVEL {Math.floor(gameXp/500)+1}</small></span></button><button className="notification-bell" aria-label="Abrir notificações" onClick={()=>setPage("notifications")}><Bell size={18}/>{unreadCount>0&&<i>{unreadCount>9?"9+":unreadCount}</i>}</button><button className={`avatar profile-avatar-button frame-${playerProfile.frame} ${(playerProfile.gems||[]).length===4?"frame-chromatic":""}`} aria-label="Abrir meu perfil" title="Meu perfil" onClick={()=>setPage('profile')}><span>{playerProfile.avatar}</span></button></div></header>
    <div className={page.startsWith("social-")?"content content-social":"content"}>
      <div className="page-heading">{page!=='overview'&&<button type="button" className="page-back-button" onClick={()=>setPage(page==='social-feed'?'social-conversations':'overview')}><ArrowLeft size={16}/> Voltar</button>}<div className="nx2-heading"><h1>{page==='overview'?'Visão geral':page==='admin'?'Painel administrativo':page==='notifications'?'Notificações':page==='profile'?'Meu perfil':page==='social-feed'?'NEXUS Feed':page==='social-conversations'?'Conversas NEXUS':menu.find(x=>x[2]===page)?.[0]}</h1><p>{page==='admin'?'Gerencie contas com acesso administrativo protegido no servidor.':page==='overview'?'Aqui está um resumo da sua vida financeira.':page==='transactions'?'Entradas, gastos e contas a pagar em um só lugar.':page==='cards'?'Cartões, limites, faturas e compromissos futuros.':page==='planning'?'Metas e organização dos seus próximos passos.':page==='opportunities'?'Missões e oportunidades para evoluir.':page==='games'?'Jogos, desafios e XP em uma central exclusiva.':page==='competition'?'Rankings, temporadas, torneios, desafios e medalhas.':page==='social-conversations'?'Suas conversas individuais, grupos privados e solicitações.':page==='social-feed'?'Publicações, ideias e novidades da comunidade.':page==='profile'?'Seu jogador, suas conquistas e sua personalização.':'Entenda seus hábitos financeiros.'}</p></div>{['transactions','cards','planning'].includes(page)&&<button className="primary" aria-label={page==='cards'?'Adicionar cartão':page==='planning'?'Nova meta':'Nova movimentação'} onClick={()=>setModal(page==='planning'?'goals':page)}><Plus size={18}/>{page==='cards'?' Adicionar cartão':page==='planning'?' Nova meta':' Nova movimentação'}</button>}</div>

      {page.startsWith('social-')&&<React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando NEXUS Social...</div>}><NexusSocial view={page==='social-feed'?'feed':'conversations'} session={session} playerProfile={playerProfile} gameXp={gameXp} gameCorrect={gameCorrect} onPlayerProfileChange={setPlayerProfile} onToast={setToast} onOpenPlayerHub={()=>setPage("profile")} onOpenFeed={()=>setPage("social-feed")}/></React.Suspense>}

      {page==='admin'&&isAdmin&&<section className="admin-console">
        <div className="admin-hero">
          <div className="admin-hero-copy">
            <span className="admin-kicker"><ShieldCheck size={14}/> NEXUS CONTROL CENTER</span>
            <h2>Central de comando</h2>
            <p>Gerencie a comunidade, proteja as contas e controle a disponibilidade do Meu Financeiro.</p>
            <div className="admin-hero-meta"><span><i className="admin-live-dot"/> Sessão administrativa ativa</span><span>Operações sensíveis validadas no servidor</span></div>
          </div>
          <div className="admin-hero-emblem"><ShieldCheck size={42}/><span>ADM</span></div>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat"><span><Users size={17}/> CONTAS CARREGADAS</span><b>{adminUsers.length}</b><small>Atualize para consultar a lista completa</small></div>
          <div className="admin-stat"><span><UserCheck size={17}/> PERFIS SOCIAIS</span><b>{adminSocialProfiles.length}</b><small>{adminSocialProfiles.filter(p=>p.is_suspended).length} suspensos nesta consulta</small></div>
          <div className="admin-stat"><span><Activity size={17}/> DISPONIBILIDADE</span><b className={maintenance?'admin-danger-text':'admin-good-text'}>{maintenance?'Manutenção':'Online'}</b><small>Estado atual do modo de manutenção</small></div>
          <div className="admin-stat"><span><Gamepad2 size={17}/> MODO DE TESTE</span><b>{adminTestMode?'Ativado':'Desativado'}</b><small>Somente neste navegador</small></div>
        </div>
        <nav className="admin-tabs" aria-label="Seções administrativas">
          {[['overview','Visão geral',LayoutDashboard],['users','Usuários',Users],['social','NEXUS Social',MessageCircle],['reports','Denúncias',Flag],['announcements','Comunicados',Newspaper],['notifications','Notificações',Bell],['operations','Operações e segurança',ShieldCheck]].map(([key,label,Icon])=><button type="button" key={key} className={adminTab===key?'active':''} onClick={()=>setAdminTab(key)}><Icon size={16}/>{label}</button>)}
        </nav>
        {adminTab==='overview'&&<div className="admin-section-grid">
          <button className="admin-action-tile" onClick={()=>setAdminTab('users')}><span className="admin-tile-icon"><Users size={20}/></span><b>Gerenciar usuários</b><small>Bloqueio, recuperação de acesso e exclusão com confirmação.</small><em>Abrir gerenciamento <ChevronRight size={15}/></em></button>
          <button className="admin-action-tile" onClick={()=>{setAdminTab('social');if(!adminSocialProfiles.length)adminAction('list_social_profiles')}}><span className="admin-tile-icon purple"><MessageCircle size={20}/></span><b>Moderação social</b><small>Revise perfis públicos e suspenda contas que violem as regras.</small><em>Moderar comunidade <ChevronRight size={15}/></em></button>
          <button className="admin-action-tile" onClick={()=>{setAdminTab('reports');if(!adminReports.length)adminAction('list_reports')}}><span className="admin-tile-icon purple"><Flag size={20}/></span><b>Central de denúncias</b><small>Analise denúncias de perfis, publicações e comentários do NEXUS Social.</small><em>Revisar denúncias <ChevronRight size={15}/></em></button>
          <button className="admin-action-tile" onClick={()=>setAdminTab('announcements')}><span className="admin-tile-icon purple"><Newspaper size={20}/></span><b>Central de comunicados</b><small>Envie avisos importantes para todos os usuários ativos.</small><em>Criar comunicado <ChevronRight size={15}/></em></button>
          <button className="admin-action-tile" onClick={()=>{setAdminTab('notifications');if(!adminUsers.length)adminAction('list_users')}}><span className="admin-tile-icon"><Bell size={20}/></span><b>Notificação personalizada</b><small>Envie uma mensagem privada para uma conta e tente entregar como push.</small><em>Enviar notificação <ChevronRight size={15}/></em></button>
          <button className="admin-action-tile" onClick={()=>setAdminTab('operations')}><span className="admin-tile-icon green"><SlidersHorizontal size={20}/></span><b>Operações do site</b><small>Manutenção, aviso aos usuários e ferramentas de teste.</small><em>Configurar operações <ChevronRight size={15}/></em></button>
        </div>}
        {adminTab==='users'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Contas e acesso</h3><p>Gerencie contas sem visualizar ou solicitar senhas dos usuários.</p></div><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_users')}><RefreshCw size={16}/> Atualizar contas</button></div>
          <label className="admin-search"><Search size={17}/><input value={adminUserSearch} onChange={e=>setAdminUserSearch(e.target.value)} placeholder="Buscar por e-mail ou ID da conta"/></label>
          {!adminUsers.length?<Empty icon={Users} title="Nenhuma conta carregada" text="Toque em Atualizar contas para consultar os usuários."/>:<div className="admin-record-list">{adminUsers.filter(u=>(u.email||'').toLowerCase().includes(adminUserSearch.toLowerCase())||(u.id||'').toLowerCase().includes(adminUserSearch.toLowerCase())).map(u=><div className="admin-record" key={u.id}><div className="admin-record-avatar"><Users size={18}/></div><div className="admin-record-main"><b>{u.email||'Sem e-mail'}</b><span>{u.id}</span><small>{u.banned_until&&new Date(u.banned_until)>new Date()?'Bloqueada':'Ativa'} · Criada {u.created_at?new Date(u.created_at).toLocaleDateString('pt-BR'):'—'} · Último acesso {u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('pt-BR'):'Nunca'}</small></div><div className="admin-record-actions"><button className="delete-btn" disabled={adminBusy||u.email?.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction(u.banned_until&&new Date(u.banned_until)>new Date()?'unban_user':'ban_user',u.id)}>{u.banned_until&&new Date(u.banned_until)>new Date()?<><UserCheck size={15}/> Desbloquear</>:<><Ban size={15}/> Bloquear</>}</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('reset_password',u.id)}><KeyRound size={15}/> Recuperar acesso</button><button className="delete-btn danger" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('delete_user',u.id)}><X size={15}/> Excluir</button></div></div>)}</div>}
          <p className="admin-note"><ShieldCheck size={15}/> A conta administradora é protegida contra bloqueio e exclusão por este painel. A exclusão de outras contas é definitiva e exige confirmação.</p>
        </div>}
        {adminTab==='social'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Proteção da comunidade</h3><p>Modere o perfil social sem apagar a conta financeira do usuário.</p></div><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_social_profiles')}><RefreshCw size={16}/> Atualizar perfis</button></div>
          <label className="admin-search"><Search size={17}/><input value={adminSocialSearch} onChange={e=>setAdminSocialSearch(e.target.value)} placeholder="Buscar por nome, @ ou e-mail"/></label>
          {!adminSocialProfiles.length?<Empty icon={Users} title="Perfis ainda não carregados" text="Atualize para consultar os perfis da comunidade."/>:<div className="admin-record-list">{adminSocialProfiles.filter(p=>[p.display_name,p.username,p.email].some(v=>String(v||'').toLowerCase().includes(adminSocialSearch.toLowerCase()))).map(p=><div className="admin-record" key={p.user_id}><div className="admin-record-avatar social">{p.avatar||'👾'}</div><div className="admin-record-main"><b>{p.display_name} · @{p.username}</b><span>{p.email||p.user_id}</span>{p.bio&&<small>{p.bio}</small>}<small className={p.is_suspended?'admin-danger-text':'admin-good-text'}>{p.is_suspended?'Perfil suspenso':'Perfil visível na comunidade'}</small></div><div className="admin-record-actions"><button className="delete-btn" disabled={adminBusy} onClick={()=>adminAction('moderate_social_profile',p.user_id,{suspended:!p.is_suspended})}>{p.is_suspended?<><UserCheck size={15}/> Reativar</>:<><Ban size={15}/> Suspender</>}</button><button className="delete-btn danger" disabled={adminBusy} onClick={()=>{if(window.confirm('Remover somente o perfil social de @'+p.username+'? A conta e os dados financeiros serão mantidos.'))adminAction('delete_social_profile',p.user_id)}}><X size={15}/> Remover perfil</button></div></div>)}</div>}
          <p className="admin-note"><ShieldCheck size={15}/> Suspender oculta o perfil público. Remover perfil social não apaga a conta nem os dados financeiros.</p>
        </div>}
        {adminTab==='reports'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Central de denúncias</h3><p>Revise denúncias de perfis, publicações e comentários. Os dados financeiros dos usuários não são exibidos.</p></div><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_reports')}><RefreshCw size={16}/> Atualizar denúncias</button></div>
          <div className="admin-report-toolbar">
            <label className="admin-search"><Search size={17}/><input value={adminReportSearch} onChange={e=>setAdminReportSearch(e.target.value)} placeholder="Buscar motivo, usuário ou conteúdo"/></label>
            <div className="admin-report-filters">{[['open','Abertas'],['reviewing','Em análise'],['resolved','Resolvidas'],['dismissed','Arquivadas'],['all','Todas']].map(([key,label])=><button type="button" key={key} className={adminReportFilter===key?'active':''} onClick={()=>setAdminReportFilter(key)}>{label}</button>)}</div>
          </div>
          {!Array.isArray(adminReports)||!adminReports.some(r=>r&&typeof r==='object')?<Empty icon={Flag} title="Nenhuma denúncia carregada" text="Toque em Atualizar denúncias para consultar os relatos enviados pela comunidade."/>:
          <div className="admin-report-list">{adminReports.filter(r=>r&&typeof r==='object').filter(r=>(adminReportFilter==='all'||r.status===adminReportFilter)&&[r.category,r.details,r.reporter_name,r.reporter_email,r.reported_name,r.reported_username,r.content_preview].some(v=>String(typeof v==='string'||typeof v==='number'?v:'').toLowerCase().includes(adminReportSearch.toLowerCase()))).map((r,index)=>{const status=['open','reviewing','resolved','dismissed'].includes(r.status)?r.status:'open';const categoryLabels={harassment:'Assédio',spam:'Spam',inappropriate:'Conteúdo impróprio',impersonation:'Falsidade ideológica',other:'Outro'};const category=categoryLabels[r.category]|| (typeof r.category==='string'?r.category:'Denúncia de conteúdo');const safeText=(value,fallback='—')=>typeof value==='string'||typeof value==='number'?String(value):fallback;const date=r.created_at?new Date(r.created_at):null;return <article className="admin-report-card" key={(r.report_type||'report')+':'+(r.id||index)}>
            <div className="admin-report-top"><span className={'admin-report-kind '+(r.report_type==='profile'?'profile':'content')}>{r.report_type==='profile'?'PERFIL':'PUBLICAÇÃO / COMENTÁRIO'}</span><span className={'admin-report-status '+status}>{({open:'Aberta',reviewing:'Em análise',resolved:'Resolvida',dismissed:'Arquivada'})[status]}</span></div>
            <div className="admin-report-reason"><b>{category}</b><time>{date&&!Number.isNaN(date.getTime())?date.toLocaleString('pt-BR'):''}</time></div>
            <p className="admin-report-details">{safeText(r.details,'Nenhum detalhe adicional informado.')}</p>
            <div className="admin-report-parties"><div><small>DENUNCIANTE</small><b>{safeText(r.reporter_name,'Usuário')}</b><span>{safeText(r.reporter_email||r.reporter_id)}</span></div><div><small>ALVO DA DENÚNCIA</small><b>{safeText(r.reported_name,'Conteúdo removido ou indisponível')}</b><span>{r.reported_username?'@'+safeText(r.reported_username):safeText(r.reported_email||r.reported_id)}</span></div></div>
            {typeof r.content_preview==='string'&&r.content_preview&&<div className="admin-report-content"><small>CONTEÚDO DENUNCIADO</small><p>{r.content_preview}</p></div>}
            <div className="admin-report-actions"><label><span>Status</span><select value={status} disabled={adminBusy} onChange={e=>adminAction('update_report_status',null,{report_type:r.report_type,report_id:r.id,status:e.target.value})}><option value="open">Aberta</option><option value="reviewing">Em análise</option><option value="resolved">Resolvida</option><option value="dismissed">Arquivada</option></select></label><button type="button" className="delete-btn danger" disabled={adminBusy} onClick={()=>adminAction('delete_report',null,{report_type:r.report_type,report_id:r.id})}><Trash2 size={14}/> Apagar denúncia</button></div>
          </article>})}</div>}
          <p className="admin-note"><ShieldCheck size={15}/> Alterar o status não bloqueia nem exclui automaticamente ninguém. Ações disciplinares continuam separadas e exigem análise.</p>
        </div>}
        {adminTab==='notifications'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Notificação para todos</h3><p>Envie um aviso oficial para todas as contas ativas do Meu Financeiro.</p></div><span className="admin-secure-pill"><ShieldCheck size={14}/> Acesso restrito</span></div>
          <div className="admin-personal-notification-card">
            <div className="admin-notification-recipient-head"><span className="admin-tile-icon"><Users size={18}/></span><div><b>Todos os usuários ativos</b><small>Uma única mensagem será enviada para toda a comunidade. Contas bloqueadas e a conta administrativa ficam de fora.</small></div></div>
            <div className="admin-notification-preview">
              <span><Bell size={15}/> PRÉVIA DA NOTIFICAÇÃO</span>
              <b>{adminNotificationTitle.trim()||'Título da notificação'}</b>
              <p>{adminNotificationBody.trim()||'Sua mensagem aparecerá aqui.'}</p>
              <small>MEU FINANCEIRO · AVISO OFICIAL</small>
            </div>
            <label className="field-label" htmlFor="admin-notification-title">Título</label>
            <input id="admin-notification-title" value={adminNotificationTitle} maxLength={80} onChange={e=>setAdminNotificationTitle(e.target.value)} placeholder="Ex.: Novidade no Meu Financeiro!"/>
            <div className="admin-announcement-counter">{adminNotificationTitle.length}/80</div>
            <label className="field-label" htmlFor="admin-notification-body">Mensagem</label>
            <textarea id="admin-notification-body" value={adminNotificationBody} maxLength={500} onChange={e=>setAdminNotificationBody(e.target.value)} placeholder="Escreva o aviso que todos os usuários receberão."/>
            <div className="admin-announcement-counter">{adminNotificationBody.length}/500</div>
            <div className="admin-operation-foot"><small>O aviso ficará salvo no sino de todos os usuários ativos. Também tentaremos enviar uma notificação push para os aparelhos que permitiram notificações.</small><button className="primary" disabled={adminBusy||adminNotificationTitle.trim().length<3||adminNotificationBody.trim().length<5} onClick={()=>adminAction('broadcast_announcement',null,{title:adminNotificationTitle.trim(),message:adminNotificationBody.trim(),send_push:true})}><Send size={15}/> Enviar para todos</button></div>
          </div>
        </div>}
        {adminTab==='announcements'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Central de comunicados</h3><p>Publique avisos importantes diretamente na área de notificações dos usuários ativos.</p></div><span className="admin-secure-pill"><ShieldCheck size={14}/> Envio administrativo</span></div>
          <div className="admin-announcement-preview"><span><Newspaper size={17}/> PRÉVIA DO COMUNICADO</span><b>{adminAnnouncementTitle.trim()||'Título do aviso'}</b><p>{adminAnnouncementBody.trim()||'A mensagem aparecerá aqui antes de ser enviada.'}</p><small>MEU FINANCEIRO · COMUNICADO OFICIAL</small></div>
          <div className="admin-announcement-form">
            <label className="field-label" htmlFor="admin-announcement-title">Título do comunicado</label>
            <input id="admin-announcement-title" value={adminAnnouncementTitle} maxLength={80} onChange={e=>setAdminAnnouncementTitle(e.target.value)} placeholder="Ex.: Novidade no NEXUS Social"/>
            <div className="admin-announcement-counter">{adminAnnouncementTitle.length}/80</div>
            <label className="field-label" htmlFor="admin-announcement-body">Mensagem</label>
            <textarea id="admin-announcement-body" value={adminAnnouncementBody} maxLength={500} onChange={e=>setAdminAnnouncementBody(e.target.value)} placeholder="Escreva um aviso claro e objetivo para a comunidade."/>
            <div className="admin-announcement-counter">{adminAnnouncementBody.length}/500</div>
            <div className="admin-operation-foot"><small>O comunicado será salvo no histórico de notificações de cada conta ativa. Não envia e-mail nem push.</small><button className="primary" disabled={adminBusy||adminAnnouncementTitle.trim().length<3||adminAnnouncementBody.trim().length<5} onClick={()=>adminAction('broadcast_announcement',null,{title:adminAnnouncementTitle.trim(),message:adminAnnouncementBody.trim()})}><Send size={15}/> Enviar para usuários ativos</button></div>
          </div>
        </div>}
        {adminTab==='operations'&&<div className="admin-section">
          <div className="admin-section-heading"><div><h3>Operações e segurança</h3><p>Ferramentas administrativas que afetam a disponibilidade e a experiência do site.</p></div><span className="admin-secure-pill"><ShieldCheck size={14}/> Acesso restrito</span></div>
          <div className="admin-operation-card">
            <div className="admin-operation-head"><span className="admin-operation-icon"><Power size={19}/></span><div><b>Disponibilidade do site</b><small>Ative uma manutenção planejada e informe os usuários.</small></div><span className={'admin-state-pill '+(maintenance?'warning':'good')}>{maintenance?'Em manutenção':'Liberado'}</span></div>
            <label className="field-label" htmlFor="maintenance-message">Mensagem pública de manutenção</label><textarea id="maintenance-message" value={maintenanceMessage} maxLength={240} onChange={e=>setMaintenanceMessage(e.target.value)} placeholder="Estamos realizando uma manutenção. Voltaremos em breve."/>
            <div className="admin-operation-foot"><small>{maintenanceMessage.length}/240 caracteres</small><button className={'primary '+(maintenance?'danger-action':'')} disabled={adminBusy} onClick={()=>adminAction('set_maintenance',null,{enabled:!maintenance,message:maintenanceMessage})}>{maintenance?'Desativar manutenção':'Ativar manutenção'}</button></div>
          </div>
          <div className="admin-operation-card">
            <div className="admin-operation-head"><span className="admin-operation-icon violet"><Gamepad2 size={19}/></span><div><b>Ambiente de testes do administrador</b><small>Desbloqueia recursos de demonstração apenas no seu navegador.</small></div><span className={'admin-state-pill '+(adminTestMode?'warning':'good')}>{adminTestMode?'Ativado':'Desativado'}</span></div>
            <div className="admin-operation-foot"><small>O progresso real do jogador é salvo temporariamente e restaurado ao sair do modo de teste.</small><button className={'primary '+(adminTestMode?'danger-action':'')} onClick={toggleAdminTestMode}>{adminTestMode?'Restaurar progresso':'Desbloquear recursos para teste'}</button></div>
          </div>
          <div className="admin-security-info"><ShieldCheck size={20}/><div><b>Camadas de proteção</b><p>As ações administrativas de contas e moderação passam pela Edge Function, que valida a sessão e a identidade do administrador no servidor. Nunca compartilhe senhas, chaves privadas ou links de recuperação em canais públicos.</p><small>O painel não exibe senhas nem disponibiliza acesso direto à chave administrativa.</small></div></div>
        </div>}
        {adminError&&<div className="error">{adminError}</div>}{adminMessage&&<div className="auth-notice">{adminMessage}</div>}
      </section>}
      {page==='overview'&&<><button type="button" className="nx2-xp-strip" onClick={()=>setPage('opportunities')} aria-label={`Nível ${Math.floor(gameXp/500)+1}, ${gameXp%500} de 500 XP. Abrir oportunidades`}><span className="nx2-xp-ico"><Zap size={16}/></span><span className="nx2-xp-copy"><b>Nível {Math.floor(gameXp/500)+1}</b><small>{gameXp%500}/500 XP · explorar oportunidades</small><i className="nx2-xp-track"><i style={{width:`${(gameXp%500)/500*100}%`}}/></i></span><ChevronRight size={18}/></button><section className="overview-unified">
        <div className="unified-balance">
          <div className="unified-balance-top"><span><Wallet size={16}/> RESUMO FINANCEIRO</span><span className="unified-live-dot">ATUALIZADO</span></div>
          <small>Saldo disponível após compromissos</small>
          <strong>{brl(balance-openDebts-installmentMonthly)}</strong>
          <span className="muted">Saldo registrado: {brl(balance)}</span>
          <div className="unified-month-flow">
            <div><span><i className="unified-dot income-dot"/>Entradas do mês</span><b>{brl(income)}</b></div>
            <div><span><i className="unified-dot expense-dot"/>Saídas do mês</span><b>{brl(expenses)}</b></div>
          </div>
        </div>
        <div className="unified-details">
          <button onClick={()=>setPage('cards')}>
            <span className="unified-icon violet"><CalendarClock size={18}/></span>
            <span className="unified-label"><b>Parcelas</b><small>{openInstallmentCount} em aberto · {brl(installmentMonthly)}/mês</small></span>
            <strong>{brl(installmentRemaining)}</strong><ChevronRight size={17}/>
          </button>
          <button onClick={()=>setPage('cards')}>
            <span className="unified-icon blue"><CreditCard size={18}/></span>
            <span className="unified-label"><b>Cartões</b><small>{data.cards.length} cadastrados · {brl(cardUsed)} usados</small></span>
            <strong>{brl(cardAvailable)} <small>livres</small></strong><ChevronRight size={17}/>
          </button>
          <button onClick={()=>setPage('transactions')}>
            <span className="unified-icon coral"><ReceiptText size={18}/></span>
            <span className="unified-label"><b>Contas pendentes</b><small>{pendingDebtCount} aguardando pagamento</small></span>
            <strong>{brl(openDebts)}</strong><ChevronRight size={17}/>
          </button>
          <button onClick={()=>setPage('planning')}>
            <span className="unified-icon green"><Target size={18}/></span>
            <span className="unified-label"><b>Metas</b><small>{data.goals.length} ativas · faltam {brl(goalTotal)}</small></span>
            <strong>{brl(goalSaved)} <small>guardados</small></strong><ChevronRight size={17}/>
          </button>
        </div>
        <div className="unified-footer" style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',gap:12}}>
          <span>Seu panorama financeiro em um só lugar</span>
          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:14,flexWrap:'wrap',marginLeft:'auto'}}>
            <button className="text-button" onClick={()=>setPayModal(true)}><Check size={15}/> Registrar pagamento</button>
            <button onClick={()=>setModal('transactions')}><Plus size={16}/> Nova movimentação</button>
          </div>
        </div>
      </section><section className="cashflow-coach" aria-label="Orientação de orçamento diário">
        <div>
          <span className="coach-kicker"><Activity size={14}/> RADAR DO SEU DINHEIRO</span>
          <h3>Quanto posso usar por dia?</h3>
          <p>{balance-openDebts-installmentMonthly>0?'Uma estimativa simples para ajudar seu dinheiro a durar até o fim do mês, considerando o saldo registrado, contas pendentes e parcelas mensais.':'Seu orçamento está apertado. Antes de assumir novos gastos, revise as contas e os compromissos em aberto.'}</p>
          <div className="coach-actions"><button type="button" onClick={()=>setPage('transactions')}>Revisar minhas contas <ChevronRight size={14}/></button></div>
        </div>
        <div className="coach-value">
          <strong>{brl(Math.max(0,balance-openDebts-installmentMonthly)/Math.max(1,new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()-new Date().getDate()+1))}</strong>
          <small>por dia · estimativa até o fim do mês</small>
          <p style={{marginTop:8,fontSize:10}}>Baseado nos lançamentos cadastrados. Atualize suas contas para melhorar a estimativa.</p>
        </div>
      </section><section className="easy-start-grid" aria-label="Acessos rápidos"><button onClick={()=>setModal('transactions')}><span className="easy-start-icon income"><Plus size={19}/></span><span><b>Adicionar movimentação</b><small>Registre uma entrada ou gasto</small></span><ChevronRight size={17}/></button><button onClick={()=>setPage('cards')}><span className="easy-start-icon card"><CreditCard size={19}/></span><span><b>Meus cartões</b><small>Limites, faturas e parcelas</small></span><ChevronRight size={17}/></button><button onClick={()=>setPage('planning')}><span className="easy-start-icon goal"><Target size={19}/></span><span><b>Minhas metas</b><small>Acompanhe seus objetivos</small></span><ChevronRight size={17}/></button><button onClick={()=>setPage('social-feed')}><span className="easy-start-icon social"><Users size={19}/></span><span><b>NEXUS Social</b><small>Veja a comunidade</small></span><ChevronRight size={17}/></button></section></>}
      {page==='transactions'&&<><section className="panel"><div className="panel-head"><div><h3>Movimentações</h3><p>Entradas e gastos registrados</p></div></div><TransactionList items={data.transactions} onDelete={id=>deleteItem('transactions',id)}/></section><section className="panel"><div className="panel-head"><div><h3>Contas a pagar e dívidas</h3><p>Contas pendentes e compromissos fora dos cartões</p></div><button className="delete-btn" onClick={()=>setModal('debts')}><Plus size={15}/> Adicionar conta</button></div>{data.debts.length?<div className="simple-list">{data.debts.map(d=><div className="simple-row commitment-row" key={d.id}><div className="row-icon"><ReceiptText size={18}/></div><div className="row-main"><b>{d.title}</b><span>{d.is_continuous?'Conta contínua · mensal · sem vencimento':d.due_date?`Vence em ${new Date(d.due_date+'T12:00:00').toLocaleDateString('pt-BR')}`:'Sem vencimento informado'} · {d.is_continuous?(d.paid_month===currentMonthKey?'Paga neste mês':'Pendente neste mês'):d.status}</span></div><strong>{brl(d.amount)}</strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'debts',item:d})}>Editar</button><button className="delete-btn" onClick={async()=>{const isPaid=d.is_continuous?d.paid_month===currentMonthKey:d.status==='Pago';const next=isPaid?'Pendente':'Pago';const update=d.is_continuous?{paid_month:isPaid?null:currentMonthKey,status:next}:{status:next};const {error}=await supabase.from('debts').update(update).eq('id',d.id);if(error)notify('Não foi possível atualizar a conta.');else{await loadData();notify(next==='Pago'?'Conta marcada como paga neste mês.':'Conta reaberta.')}}}>{(d.is_continuous?d.paid_month===currentMonthKey:d.status==='Pago')?'Reabrir':'Marcar paga'}</button><button className="delete-btn" onClick={()=>deleteItem('debts',d.id)}>Excluir</button></div></div>)}</div>:<Empty icon={ReceiptText} title="Nenhuma conta cadastrada" text="Adicione contas e dívidas para acompanhar o que ainda precisa ser pago."/>}</section></>}
      {page==='cards'&&<><section className="panel"><div className="panel-head"><div><h3>Meus cartões</h3><p>Limite, utilização e valor disponível em cada cartão</p></div></div>{data.cards.length?<div className="item-grid">{data.cards.map(c=><div className="finance-item" key={c.id}><div className="item-top"><span className="panel-icon"><CreditCard size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>setModal({type:'cards',item:c})}>Editar cartão</button><button className="delete-btn" onClick={()=>deleteItem('cards',c.id)}>Excluir</button></div></div><h3>{c.name}</h3><div className="item-number">{brl(c.used)} <small>utilizados</small></div><div className="progress"><i style={{width:`${Math.min(100,Number(c.limit_amount)?Number(c.used)/Number(c.limit_amount)*100:0)}%`}}/></div><div className="item-meta"><span>Limite {brl(c.limit_amount)}</span><b>Disponível {brl(Number(c.limit_amount)-Number(c.used))}</b></div>{c.due_day&&<p className="muted">Vencimento: dia {c.due_day}</p>}{(()=>{const open=data.installments.filter(i=>i.card_id===c.id&&Number(i.paid_count||0)<Number(i.installment_count||0));const monthly=open.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);return <div className="goal-history"><b>Compromissos em aberto</b><span>{open.length} compra(s) parcelada(s) · {brl(monthly)}/mês</span></div>})()}<button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards,card_id:c.id})}><Plus size={15}/> Adicionar compromisso parcelado</button></div>)}</div>:<Empty icon={CreditCard} title="Nenhum cartão cadastrado" text="Adicione um cartão para acompanhar limite e uso."/>}{data.card_limit_history.length>0&&<div className="history-box"><h3>Histórico de alterações de limite</h3>{data.card_limit_history.slice(0,8).map(h=><div className="history-row" key={h.id}><span>{data.cards.find(c=>c.id===h.card_id)?.name||'Cartão'}</span><span>{brl(h.previous_limit)} → <b>{brl(h.new_limit)}</b></span><small>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</small></div>)}</div>}</section><section className="panel"><div className="panel-head"><div><h3>Parcelas e compromissos</h3><p>Compras parceladas vinculadas ou não a um cartão</p></div><button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards})}><Plus size={15}/> Adicionar parcela</button></div>{data.installments.length?<div className="simple-list">{data.installments.map(i=>{const monthly=Number(i.total_amount)/Math.max(1,Number(i.installment_count));const remaining=Number(i.installment_count)-Number(i.paid_count||0);const end=new Date(`${i.first_due_date}T12:00:00`);end.setMonth(end.getMonth()+Number(i.installment_count)-1);const card=data.cards.find(c=>c.id===i.card_id);return <div className="simple-row commitment-row" key={i.id}><div className="row-icon"><CalendarClock size={18}/></div><div className="row-main"><b>{i.description}</b><span>{card?card.name+' · ':''}{i.paid_count||0}/{i.installment_count} pagas · faltam {remaining} · termina em {end.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'})}</span><span>{brl(monthly)} por mês · primeira parcela {new Date(i.first_due_date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><strong style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,fontSize:'1.35rem',lineHeight:1.1}}><span>{brl(monthly)}</span><small style={{fontSize:'.72rem',fontWeight:700,opacity:.9}}>por parcela</small><small style={{fontSize:'.68rem',fontWeight:500,opacity:.65}}>Total: {brl(i.total_amount)}</small></strong><div className="row-actions"><button className="delete-btn" onClick={async()=>{const next=Math.min(Number(i.installment_count),Number(i.paid_count||0)+1);const {error}=await supabase.from('installments').update({paid_count:next}).eq('id',i.id);if(error)notify('Não foi possível atualizar as parcelas.');else{await loadData();notify('Parcela marcada como paga.')}}}>Pagar próxima</button><button className="delete-btn" onClick={()=>deleteItem('installments',i.id)}>Excluir</button></div></div>})}</div>:<Empty icon={CalendarClock} title="Nenhum compromisso parcelado" text="Adicione uma compra parcelada para acompanhar pagamentos e previsão de término."/>}</section><section className="panel"><div className="panel-head"><div><h3>Assinaturas</h3><p>Serviços recorrentes e próximas cobranças</p></div><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',cards:data.cards})}><Plus size={15}/> Adicionar assinatura</button></div><div className="subscription-summary"><div><span>Gasto mensal ativo</span><strong>{brl(subscriptionsMonthly)}</strong></div><small>{activeSubscriptions.length} assinatura(s) ativa(s) · valores anuais divididos por 12</small></div>{data.subscriptions.length?<div className="simple-list">{data.subscriptions.map(s=>{const card=data.cards.find(c=>c.id===s.card_id);const monthly=Number(s.amount||0)/(s.frequency==='anual'?12:1);return <div className="simple-row commitment-row" key={s.id}><div className="row-icon"><RefreshCw size={18}/></div><div className="row-main"><b>{s.name}</b><span>{s.frequency==='anual'?'Cobrança anual':'Cobrança mensal'} · {s.status}{card?' · '+card.name:''}</span><span>Próxima cobrança: {new Date(s.next_charge_date+'T12:00:00').toLocaleDateString('pt-BR')} · {brl(monthly)}/mês equivalente</span></div><strong>{brl(s.amount)}<small>{s.frequency==='anual'?' /ano':' /mês'}</small></strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',item:s,cards:data.cards})}>Editar</button>{s.status==='Ativa'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Cancelada'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível cancelar a assinatura.');else{await loadData();notify('Assinatura cancelada.')}}}>Cancelar</button>}{s.status==='Cancelada'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Ativa'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível reativar a assinatura.');else{await loadData();notify('Assinatura reativada.')}}}>Reativar</button>}<button className="delete-btn" onClick={()=>deleteItem('subscriptions',s.id)}>Excluir</button></div></div>})}</div>:<Empty icon={RefreshCw} title="Nenhuma assinatura cadastrada" text="Adicione serviços como streaming, academia ou aplicativos para acompanhar as cobranças recorrentes."/>}</section></>}
      
      
      {page==='planning'&&(()=>{const savedTotal=data.goals.reduce((sum,g)=>sum+Math.max(0,Number(g.saved)||0),0);const targetTotal=data.goals.reduce((sum,g)=>sum+Math.max(0,Number(g.target)||0),0);const completed=data.goals.filter(g=>Number(g.target)>0&&Number(g.saved)>=Number(g.target)).length;const remaining=Math.max(0,targetTotal-savedTotal);const overallPct=targetTotal>0?Math.min(100,savedTotal/targetTotal*100):0;return <section className="nexus-vault-page">
  <div className="nexus-vault-hero">
    <div className="nexus-vault-copy"><span className="nexus-vault-kicker"><LockKeyhole size={14}/> NEXUS SAVINGS SYSTEM</span><h2>Seu futuro começa no cofre.</h2><p>Transforme seus planos em conquistas. Guarde aos poucos, acompanhe sua evolução e chegue mais perto do que deseja.</p><div className="nexus-vault-tags"><span><ShieldCheck size={13}/> Cofrinho virtual</span><span><Sparkles size={13}/> Evolua no seu ritmo</span></div></div>
    <div className="nexus-vault-center" aria-label="Cofre virtual NEXUS"><div className="nexus-vault-orbit nexus-vault-orbit-one"/><div className="nexus-vault-orbit nexus-vault-orbit-two"/><div className="nexus-vault-door"><div className="nexus-vault-door-inner"><div className="nexus-vault-handle"><span/><span/><span/><span/></div><div className="nexus-vault-lock"><LockKeyhole size={27}/></div></div></div><span className="nexus-vault-spark nexus-vault-spark-a">✦</span><span className="nexus-vault-spark nexus-vault-spark-b">✧</span></div>
    <div className="nexus-vault-balance"><span>TOTAL REGISTRADO NAS SUAS METAS</span><strong>{brl(savedTotal)}</strong><div className="nexus-vault-progress"><i style={{width:overallPct+'%'}}/></div><small>{overallPct.toFixed(0)}% do valor planejado · {brl(remaining)} para alcançar tudo</small></div>
  </div>
  <div className="nexus-vault-stats"><div><span><Target size={15}/> METAS ATIVAS</span><b>{data.goals.length}</b></div><div><span><Trophy size={15}/> CONCLUÍDAS</span><b>{completed}</b></div><div><span><Coins size={15}/> FALTA GUARDAR</span><b>{brl(remaining)}</b></div></div>
  <div className="nexus-goals-heading"><div><span>SEUS OBJETIVOS</span><h3>Um passo de cada vez.</h3><p>Escolha uma meta para adicionar ou retirar um valor registrado.</p></div><button type="button" className="primary" onClick={()=>setModal('goals')}><Plus size={17}/> Criar meta</button></div>
  {data.goals.length?<div className="nexus-goals-grid">{data.goals.map(g=>{const pct=Math.min(100,Number(g.target)>0?Number(g.saved||0)/Number(g.target)*100:0);const history=data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3);return <article className="nexus-goal-card" key={g.id}><div className="nexus-goal-card-top"><div className="nexus-goal-icon"><Target size={20}/></div><span className={pct>=100?'nexus-goal-status done':'nexus-goal-status'}>{pct>=100?'META CONCLUÍDA':'EM PROGRESSO'}</span></div><h4>{g.name}</h4><div className="nexus-goal-values"><strong>{brl(g.saved)}</strong><span>de {brl(g.target)}</span></div><div className="nexus-goal-track"><i style={{width:pct+'%'}}/></div><div className="nexus-goal-meta"><span>{pct.toFixed(0)}% alcançado</span><b>{pct>=100?'Objetivo alcançado':'Faltam '+brl(Math.max(0,Number(g.target)-Number(g.saved||0)))}</b></div>{g.deadline&&<div className="nexus-goal-deadline"><CalendarDays size={13}/> Prazo: {new Date(g.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</div>}<div className="nexus-goal-actions"><button type="button" onClick={()=>setModal({type:'goalMovement',goal:g,movement_type:'deposito'})}><Plus size={15}/> Guardar</button><button type="button" onClick={()=>setModal({type:'goalMovement',goal:g,movement_type:'retirada'})}><ArrowUpRight size={15}/> Retirar</button><button type="button" className="nexus-goal-delete" aria-label={'Excluir meta '+g.name} onClick={()=>deleteItem('goals',g.id)}><Trash2 size={15}/></button></div>{history.length>0&&<div className="nexus-goal-history"><b>Movimentações recentes</b>{history.map(m=><span key={m.id}>{m.movement_type==='deposito'?'+':'−'} {brl(m.amount)} <small>· {new Date(m.created_at).toLocaleDateString('pt-BR')}</small></span>)}</div>}</article>})}</div>:<div className="nexus-vault-empty"><div className="nexus-vault-empty-icon"><LockKeyhole size={25}/></div><h3>Seu cofre está esperando a primeira meta</h3><p>Crie um objetivo, escolha quanto deseja juntar e acompanhe cada conquista por aqui.</p><button type="button" className="primary" onClick={()=>setModal('goals')}><Plus size={17}/> Criar minha primeira meta</button></div>}
  <div className="nexus-vault-note"><ShieldCheck size={16}/><span><b>Transparência:</b> os valores desta área são registros virtuais de planejamento. Não representam saldo bancário, depósito ou dinheiro disponível para saque.</span></div>
</section>})()}
      {page==='opportunities'&&<section className="opportunities-page gamer-world">
  <div className="games-welcome"><div><span>OPORTUNIDADES</span><h2>Ganhe além do seu controle financeiro</h2><p>Descubra campanhas, pesquisas e missões que poderão oferecer recompensas reais.</p></div><div className="games-welcome-xp"><Coins size={20}/><b>Saldo real</b><small>ÁREA EM PREPARAÇÃO</small></div></div>
  <div className="gamer-section-heading"><div><span>EM BREVE</span><h3>Oportunidades disponíveis</h3><p>Estamos preparando experiências com parceiros verificados.</p></div></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Coins size={27}/></div><div><b>Pesquisas remuneradas</b><p>Participe de pesquisas, compartilhe sua opinião e confira o valor e as regras antes de começar.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Gift size={27}/></div><div><b>Missões patrocinadas</b><p>Atividades propostas por marcas parceiras, com condições e recompensas explicadas com transparência.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Sparkles size={27}/></div><div><b>Programa de indicação</b><p>Convide pessoas para conhecer o app e acompanhe futuras campanhas de indicação.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="opportunity-safety"><ShieldCheck size={18}/><p><b>Segurança em primeiro lugar.</b> Não será necessário pagar para participar. Recompensas em dinheiro só serão ativadas com parceiros verificados, orçamento reservado, validação antifraude e regras adequadas à idade dos participantes.</p></div>
</section>}
{page==='competition'&&<React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando competições...</div>}><NexusCompetition session={session} gameXp={gameXp} onToast={notify}/></React.Suspense>}
{page==='games'&&<section className="opportunities-page gamer-world">
 {activeArcadeGame&&<div className="games-welcome"><div><span>SEU ESPAÇO DE DIVERSÃO</span><h2>{activeArcadeGame?'Prepare-se para jogar':'Jogos e Competições Premiados'}</h2><p>{activeArcadeGame?'Entre no desafio, divirta-se e acumule experiência.':'Escolha seu próximo desafio e acumule XP a cada conquista.'}</p></div><div className="games-welcome-xp"><Zap size={20}/><b>{gameXp} XP</b><small>NÍVEL {Math.floor(gameXp/500)+1}</small></div></div>
 }{!activeArcadeGame?<><NexusGameLibrary gameXp={gameXp} onOpen={setActiveArcadeGame}/><React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando progressão...</div>}><NexusProgression userId={session?.user?.id} gameXp={gameXp} onToast={notify}/></React.Suspense></>:<><button className="arcade-back-button" onClick={()=>setActiveArcadeGame(null)}><span>←</span> VOLTAR AOS JOGOS</button><div className={'arcade-detail-cover '+(activeArcadeGame==='quiz'?'cover-quiz':activeArcadeGame==='flap'?'cover-flap':activeArcadeGame.startsWith('extra-')?'cover-extra':'cover-space')}><div className="arcade-detail-glow"/><span className="arcade-detail-emoji">{activeArcadeGame==='quiz'?'🧠':activeArcadeGame==='flap'?'🐷':activeArcadeGame==='extra-dungeon'?'⚔️':activeArcadeGame==='extra-gems'?'💎':activeArcadeGame==='extra-race'?'🏎️':activeArcadeGame==='extra-defense'?'🏰':'🚀'}</span><div className="arcade-detail-copy"><span>JOGO · EXPERIÊNCIA INTERATIVA</span><h2>{activeArcadeGame==='quiz'?'Quiz Financeiro':activeArcadeGame==='flap'?'Asas da Fortuna':activeArcadeGame==='extra-dungeon'?'Dungeon Rush':activeArcadeGame==='extra-gems'?'Gem Match':activeArcadeGame==='extra-race'?'Corrida do Dinheiro':activeArcadeGame==='extra-defense'?'Defesa do Cofrinho':'Space Nexus'}</h2><p>{activeArcadeGame==='quiz'?'Responda, aprenda e acumule pontos em desafios rápidos.':activeArcadeGame==='flap'?'Teste seus reflexos e tente superar seu próprio recorde.':activeArcadeGame.startsWith('extra-')?'Uma nova missão do universo NEXUS espera por você.':'Defenda a galáxia em uma aventura cheia de ação.'}</p></div></div>
 {activeArcadeGame==='space'&&<><div className="gamer-section-heading"><div><span>PRIMEIRO LANÇAMENTO · SPACE NEXUS</span><h3>Defenda a galáxia</h3><p>Escolha uma campanha ou sobreviva a ondas infinitas que ficam cada vez mais perigosas.</p></div><div className="arcade-chip"><Gamepad2 size={14}/> AÇÃO ESPACIAL</div></div><SpaceNexusGame onReward={score=>awardFlapXp(score,'space-nexus')} onMatch={recordCompetitionMatch} onLoot={awardLootDrop}/></>}
 {activeArcadeGame==='quiz'&&<section className="quiz-game"><div className="quiz-hero"><div className="quiz-hero-top"><span className="quiz-kicker"><Brain size={15}/> CENTRAL DE CONHECIMENTO</span><span className="quiz-reward-pill"><Zap size={14}/> +5 XP por acerto</span></div><h2>Quiz Financeiro</h2><p>Aprenda a dominar seu dinheiro enquanto sobe de nível.</p></div>{!quizActive?<div className="quiz-start-panel"><div className="quiz-start-copy"><span className="quiz-start-eyebrow">{roundQuestions.length&&gameQuestionIndex>=roundQuestions.length-1&&!gameFeedback?'DESAFIO FINALIZADO':'NOVO DESAFIO DISPONÍVEL'}</span><h3>{roundQuestions.length&&gameQuestionIndex>=roundQuestions.length-1&&!gameFeedback?'Mandou bem! Vamos para mais uma?':'Está pronto para o desafio?'}</h3><p>{quizAvailable?'Responda 5 perguntas sobre orçamento, cartões, juros e segurança. Cada acerto vale experiência.':'Você já jogou recentemente. Uma nova rodada será liberada em breve.'}</p></div><div className="quiz-stats-grid"><div className="quiz-stat-card"><span><Trophy size={15}/></span><strong>{gameCorrect}</strong><small>ACERTOS</small></div><div className="quiz-stat-card"><span><Zap size={15}/></span><strong>{gameXp}</strong><small>XP TOTAL</small></div><div className="quiz-stat-card"><span><Target size={15}/></span><strong>5</strong><small>PERGUNTAS</small></div></div><button className="quiz-start-button" onClick={startQuiz} disabled={!quizAvailable}><span>{quizAvailable?'Começar desafio':'Aguarde para jogar'}</span><ChevronRight size={19}/></button><div className="quiz-start-footnote"><ShieldCheck size={14}/>{quizAvailable?'Escolha a melhor resposta e acumule XP.':'O intervalo evita repetir rodadas em sequência.'}</div></div>:<div className="quiz-question-panel"><div className="quiz-progress-line"><b>PERGUNTA {gameQuestionIndex+1} DE {roundQuestions.length}</b><span>{gameQuestionIndex+1}/{roundQuestions.length}</span></div><div className="flap-progress-track"><i style={{width:((gameQuestionIndex+1)/Math.max(1,roundQuestions.length)*100)+'%'}}/></div>{roundQuestions[gameQuestionIndex]&&<><span className="quiz-category">{roundQuestions[gameQuestionIndex].category}</span><h3>{roundQuestions[gameQuestionIndex].question}</h3><div className="quiz-answer-list">{roundQuestions[gameQuestionIndex].options.map((option,index)=><button key={index} className={'quiz-answer '+(gameAnswer===index?'selected':'')+(gameAnswer!==null&&index===roundQuestions[gameQuestionIndex].correct?' correct':'')+(gameAnswer===index&&index!==roundQuestions[gameQuestionIndex].correct?' incorrect':'')} disabled={gameAnswer!==null} onClick={()=>answerGame(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div>{gameFeedback&&<div className="quiz-feedback"><p>{gameFeedback}</p><button className="primary" onClick={nextGameQuestion}>{gameQuestionIndex===roundQuestions.length-1?'Concluir rodada':'Próxima pergunta'} <ChevronRight size={16}/></button></div>}</>}</div>}</section>}
 {activeArcadeGame==='flap'&&<FinanceFlapGame onReward={awardFlapXp} onMatch={recordCompetitionMatch} onLoot={awardLootDrop}/>}
 {activeArcadeGame.startsWith('extra-')&&<React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Preparando missão...</div>}><NexusArcadeGames gameKey={activeArcadeGame} onReward={awardFlapXp} onMatch={recordCompetitionMatch} onLoot={awardLootDrop}/></React.Suspense>}
 </>}
</section>}
{page==='profile'&&<ProfileRenderBoundary><section className="opportunities-page gamer-world player-profile-page">
        {!profileEditorOpen&&<>
        <div className={`game-world-hero player-card-frame frame-${playerProfile.cardFrame||"cyan"} ${playerProfile.gems?.length===4?"frame-chromatic":""} ${gameXp>=4500?"level-legendary":gameXp>=2000?"level-elite":gameXp>=1000?"level-avatar":gameXp>=500?"level-neon":""}`}>
          <div className="game-world-top player-profile-topline"><span className="world-label"><span className="live-pulse"/> NEXUS PLAYER</span><button type="button" className="player-profile-edit-pencil" onClick={()=>setProfileEditorOpen(true)} aria-label="Editar perfil oficial" title="Editar perfil"><Pencil size={16}/><span>Editar perfil</span></button></div>
          <div className="player-identity player-social-identity-layout">
            <div className={`player-avatar profile-big-avatar frame-${playerProfile.frame} ${(playerProfile.gems||[]).length===4?"frame-chromatic":""}`}><span>{playerProfile.avatar}</span><i><Zap size={12}/></i></div>
            <div className="player-info">
              <span className="player-profile-rank">{gameXp>=4500?"LENDÁRIO":gameXp>=2000?"ELITE":gameXp>=1000?"VETERANO":gameXp>=500?"EXPLORADOR":"JOGADOR"}</span>
              <div className="player-profile-name-row"><h2>{playerProfile.name||"Sua jornada começa aqui"}</h2></div>
              {playerProfile.username&&<div className="player-social-identity"><b>@{playerProfile.username}</b></div>}{playerProfile.title&&<span className="player-title-chip">✦ {playerProfile.title}</span>}
            </div>
          </div>
          <div className="player-profile-stats profile-social-stats">
            <div><b>{gameCorrect}</b><span>Desafios concluídos</span></div>
            <div><b>{Math.floor(gameXp/500)+1}</b><span>Nível atual</span></div>
            <div><b>{(playerProfile.gems||[]).length}</b><span>Joias equipadas</span></div>
          </div>
          {playerProfile.bio&&<p className="player-social-bio profile-social-bio">{playerProfile.bio}</p>}
          {playerProfile.clan&&<div className="player-clan-badge">{playerProfile.clan.clan_emblem} {playerProfile.clan.clan_name} [{playerProfile.clan.clan_tag}] · {playerProfile.clan.clan_role==='leader'?'ADM':playerProfile.clan.clan_role==='officer'?'OFICIAL':'MEMBRO'}</div>}
          <div className="profile-honors-inline" aria-label="Medalhas e honrarias">
            {isAdmin&&<><span className="profile-honor-chip founder">👑 Fundador</span><span className="profile-honor-chip founder">⚡ Fundador NEXUS</span><span className="profile-honor-chip founder">🛡️ Admin oficial</span></>}
            {profileGameMedals.filter(m=>profileEquippedMedals.includes('game:'+m.game_key)).map(m=><span className="profile-honor-chip equipped-honor" key={'inline-g-'+m.game_key}>🏅 {({'space-nexus':'Space Nexus','piggy-run':'Asas da Fortuna',quiz:'Quiz'})[m.game_key]||m.game_key} ×{Number(m.medals_count||0)}</span>)}
            {profileRankMedals.filter(m=>profileEquippedMedals.includes('rank:'+m.medal_key)).map(m=><span className="profile-honor-chip equipped-honor" key={'inline-r-'+m.medal_key}>🏆 {({'global-season':'Campeão global','weekly-tournament':'Campeão semanal','friends-weekly':'Campeão dos amigos'})[m.medal_key]||'Campeão'} ×{Number(m.medals_count||0)}</span>)}
            {!isAdmin&&!profileMedalsLoading&&!profileGameMedals.length&&!profileRankMedals.length&&<span className="profile-honor-empty-inline">Suas medalhas de competição aparecerão aqui.</span>}
          </div>
          <div className="profile-xp-progress">
            <div className="profile-xp-copy"><b>{gameXp} XP</b><span>Nível {Math.floor(gameXp/500)+1} · {gameXp%500}/500 XP para o próximo nível</span></div>
            <div className="player-xp-track"><i style={{width:((gameXp%500)/500*100)+'%'}}/></div>
            {(playerProfile.gems||[]).length>0&&<div className="profile-xp-gems" aria-label="Joias equipadas">{(playerProfile.gems||[]).map(id=><i key={id} className={`gemstone gem-${id}`}/>)}</div>}
          </div>
        </div>
        <React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando publicações...</div>}><PlayerPostGrid userId={session?.user?.id} displayName={playerProfile.name||'jogador'}/></React.Suspense>
        <section className="profile-career-stats" aria-label="Estatísticas da jornada NEXUS"><div className="profile-career-heading"><div><span>JORNADA NEXUS</span><h3>Seu desempenho</h3></div><small>{profileGameStats.seasonName}</small></div><div className="profile-career-grid"><div><span>🎮</span><b>{profileGameStats.loading?'—':profileGameStats.matches.toLocaleString('pt-BR')}</b><small>Partidas jogadas</small></div><div><span>🏆</span><b>{profileGameStats.loading?'—':profileGameStats.rank?('#'+profileGameStats.rank):'—'}</b><small>Ranking global</small></div><div><span>🪙</span><b>{profileGameStats.loading?'—':profileGameStats.coins.toLocaleString('pt-BR')}</b><small>Moedas atuais</small></div><div><span>💎</span><b>{profileGameStats.loading?'—':profileGameStats.relics.toLocaleString('pt-BR')}</b><small>Relíquias na temporada</small></div></div><p>O ranking considera a pontuação da temporada ativa. Suas moedas mostram o saldo atual da carteira.</p></section>
        </>}
 {profileEditorOpen&&<div className="profile-editor profile-editor-social">
  <div className="profile-edit-topbar"><button type="button" aria-label="Voltar ao perfil" onClick={()=>setProfileEditorOpen(false)}>‹</button><h3>Editar perfil</h3><button type="button" onClick={()=>setProfileEditorOpen(false)}>Concluir</button></div>
  <div className="profile-edit-photo">
    <button type="button" className="profile-edit-current-avatar" onClick={()=>document.getElementById('profile-avatar-options')?.scrollIntoView({behavior:'smooth',block:'center'})} aria-label="Escolher foto ou avatar"><span>{playerProfile.avatar||'👾'}</span><i><Pencil size={15}/></i></button>
    <button type="button" className="profile-edit-photo-action" onClick={()=>document.getElementById('profile-avatar-options')?.scrollIntoView({behavior:'smooth',block:'center'})}>Editar foto ou avatar</button>
  </div>
  <div className="profile-edit-fields">
    <div className="profile-edit-row"><label htmlFor="nexus-player-name">Nome</label><div><input id="nexus-player-name" maxLength={24} value={playerProfile.name||''} onChange={e=>setPlayerProfile(p=>({...p,name:e.target.value}))} placeholder="Como quer ser chamado?"/></div></div>
    <div className="profile-edit-row profile-edit-username-row"><label>Nome de usuário</label><div><form onSubmit={savePlayerUsername}><label className="profile-username-label">@ <input maxLength={20} value={usernameDraft} onChange={e=>setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="seu_usuario" disabled={!playerProfile.username||usernameBusy}/></label><div className="profile-edit-inline-action"><small>{usernameChangedAt&&Date.now()-new Date(usernameChangedAt).getTime()<30*86400000?('Disponível em '+Math.ceil((30*86400000-(Date.now()-new Date(usernameChangedAt).getTime()))/86400000)+' dia(s)'):'3–20 caracteres · letras, números e _'}</small><button className="primary" disabled={usernameBusy||!playerProfile.username||usernameDraft.trim().toLowerCase()===String(playerProfile.username||'').toLowerCase()||(usernameChangedAt&&Date.now()-new Date(usernameChangedAt).getTime()<30*86400000)}>{usernameBusy?'Salvando...':'Salvar @'}</button></div></form></div></div>
    <div className="profile-edit-row profile-edit-bio-row"><label htmlFor="nexus-player-bio">Bio</label><div><form onSubmit={savePlayerBio}><textarea id="nexus-player-bio" maxLength={160} rows={3} value={playerProfile.bio||''} onChange={e=>setPlayerProfile(p=>({...p,bio:e.target.value}))} placeholder="Conte um pouco sobre você..."/><div className="profile-edit-inline-action"><small>{(playerProfile.bio||'').length}/160 caracteres</small><button className="primary" disabled={playerBioBusy||!playerProfile.username}>{playerBioBusy?'Salvando...':'Salvar bio'}</button></div></form></div></div>
  </div>
  <div className="profile-edit-shortcuts">
    <button type="button" onClick={()=>document.getElementById('profile-avatar-options')?.scrollIntoView({behavior:'smooth',block:'start'})}><span><b>Avatar</b><small>Escolha sua identidade visual</small></span><ChevronRight size={20}/></button>
    <button type="button" onClick={()=>document.getElementById('profile-medal-loadout')?.scrollIntoView({behavior:'smooth',block:'start'})}><span><b>Vitrine de medalhas</b><small>Selecione até 3 conquistas</small></span><ChevronRight size={20}/></button>
    <button type="button" onClick={()=>document.getElementById('profile-frame-options')?.scrollIntoView({behavior:'smooth',block:'start'})}><span><b>Molduras e joias</b><small>Personalize seu cartão de jogador</small></span><ChevronRight size={20}/></button>
  </div>
  <div className="profile-choice-group" id="profile-avatar-options"><b>Foto ou avatar <small> · desbloqueie novas opções jogando</small></b><div className="profile-avatar-choices">{[{v:'👾',xp:0},{v:'🎮',xp:0},{v:'🦊',xp:100},{v:'🐱',xp:150},{v:'🐼',xp:250},{v:'🐸',xp:350},{v:'🐲',xp:500},{v:'🤖',xp:750},{v:'🦁',xp:1000},{v:'🐯',xp:1250},{v:'🐧',xp:1500},{v:'🐙',xp:2000}].map(a=><button key={a.v} disabled={gameXp<a.xp} title={gameXp<a.xp?'Desbloqueia com '+a.xp+' XP':'Avatar disponível'} className={(playerProfile.avatar===a.v?'selected ':'')+(gameXp<a.xp?'avatar-locked':'')} onClick={()=>setPlayerProfile(p=>({...p,avatar:a.v}))}><span>{gameXp>=a.xp?a.v:'🔒'}</span>{gameXp<a.xp&&<small>{a.xp} XP</small>}</button>)}</div></div>
  <React.Suspense fallback={null}><NexusCollection userId={session?.user?.id} onApplied={ch=>setPlayerProfile(p=>({...p,...ch}))} onToast={notify}/></React.Suspense>
  <div className="profile-choice-group" id="profile-frame-options"><b>Molduras do avatar</b><div className="profile-frame-choices">{[{id:'violet',label:'Neon violeta',unlock:0},{id:'cyan',label:'Cyber ciano',unlock:150},{id:'gold',label:'Elite dourada',unlock:500},{id:'ruby',label:'Rubí arcano',unlock:1000},{id:'chrome',label:'Chrome cósmico',unlock:4500},...(playerProfile.frame==='neon'?[{id:'neon',label:'Rastro Neon · Loja',unlock:0}]:[])].map(fr=><button key={fr.id} disabled={gameXp<fr.unlock} className={'profile-frame-option frame-'+fr.id+(playerProfile.frame===fr.id?' selected':'')} onClick={()=>setPlayerProfile(p=>({...p,frame:fr.id}))}><div className={'player-avatar frame-thumbnail-avatar frame-'+fr.id}><span>{playerProfile.avatar}</span></div><span>{fr.label}</span><small>{gameXp>=fr.unlock?'DESBLOQUEADA':fr.unlock+' XP'}</small></button>)}</div></div>
  <div className="profile-choice-group"><b>Moldura da Central do Jogador</b><p className="muted">Personalize também o cartão grande do seu perfil.</p><div className="profile-frame-choices card-frame-previews">{[{id:'violet',label:'Portal violeta',unlock:0},{id:'cyan',label:'Circuito azul',unlock:250},{id:'gold',label:'Coroa dourada',unlock:750},{id:'ruby',label:'Rubí real',unlock:1500},{id:'chrome',label:'Chrome lendário',unlock:4500},...(playerProfile.cardFrame==='prism'?[{id:'prism',label:'Moldura Prisma · Loja',unlock:0}]:[])].map(fr=><button key={fr.id} disabled={gameXp<fr.unlock} className={'profile-frame-option frame-'+fr.id+(playerProfile.cardFrame===fr.id?' selected':'')} onClick={()=>setPlayerProfile(p=>({...p,cardFrame:fr.id}))}><i/><span>{fr.label}</span><small>{gameXp>=fr.unlock?'DESBLOQUEADA':fr.unlock+' XP'}</small></button>)}{(playerProfile.gems||[]).length===4&&<div className="profile-frame-option frame-chromatic chromatic-frame-preview selected"><i/><span>Cromática</span><small>4 JOIAS · ATIVADA</small></div>}</div></div>
  <div className="profile-choice-group gem-missions-group"><b>Missões de joias <small> · conquiste e equipe até 4 pedras</small></b><p className="muted">Cada desafio libera uma joia exclusiva. Quanto maior a dificuldade, mais rara a pedra.</p><div className="gem-mission-grid">{gemMissions.map(m=>{const equipped=(playerProfile.gems||[]).includes(m.id);return <article key={m.id} className={'gem-mission-card rarity-'+m.rarity+(m.done?' completed':'')}><div className="gem-mission-top"><span className={'mission-gem gem-'+m.id}>{m.symbol}</span><span className="gem-rarity">{m.rarityLabel}</span></div><b>{m.name}</b><p>{m.description}</p><div className="gem-mission-progress"><i style={{width:Math.min(100,m.progress/m.target*100)+'%'}}/></div><small>{m.done?'MISSÃO CONCLUÍDA':m.progress+'/'+m.target}</small><button disabled={!m.done||(!equipped&&(playerProfile.gems||[]).length>=4)} className={equipped?'equipped':''} onClick={()=>setPlayerProfile(p=>({...p,gems:equipped?(p.gems||[]).filter(x=>x!==m.id):[...(p.gems||[]),m.id]}))}>{equipped?'Equipado · remover':m.done?'Equipar joia':(playerProfile.gems||[]).length>=4?'4 espaços ocupados':'Bloqueada'}</button></article>})}</div><div className="gem-equipped-count"><span>JOIAS EQUIPADAS</span><b>{(playerProfile.gems||[]).length}/4</b>{(playerProfile.gems||[]).length===4&&<strong>✦ MOLDURA CROMÁTICA ATIVADA ✦</strong>}</div></div>
  <div className="profile-choice-group medal-loadout-group" id="profile-medal-loadout"><b>Vitrine de medalhas <small> · equipe até 3 conquistas</small></b><p className="muted">Escolha quais medalhas conquistadas aparecem no seu cartão público. Medalhas bloqueadas não podem ser equipadas.</p>{profileMedalsLoading?<p className="muted">Carregando sua coleção…</p>:<><div className="profile-medal-loadout">{['space-nexus','piggy-run','quiz','extra-gems','extra-defense'].map(key=>{const m=profileGameMedals.find(x=>x.game_key===key),id='game:'+key,equipped=profileEquippedMedals.includes(id),earned=!!m;return <button type="button" key={id} disabled={!earned||(!equipped&&profileEquippedMedals.length>=3)} className={'profile-medal-option '+(equipped?'selected':'')+(!earned?' locked':'')} onClick={()=>setProfileEquippedMedals(old=>equipped?old.filter(x=>x!==id):[...old,id])}><span>{earned?'🏅':'🔒'}</span><span><b>{({'space-nexus':'Space Nexus','piggy-run':'Asas da Fortuna',quiz:'Quiz Financeiro','extra-gems':'Gem Match','extra-defense':'Defesa do Cofrinho'})[key]}</b><small>{earned?'Conquistadas: '+Number(m.medals_count||0):'Ainda não conquistada'}</small></span><strong>{equipped?'✓ EQUIPADA':earned?'EQUIPAR':'BLOQUEADA'}</strong></button>})}{['global-season','weekly-tournament','friends-weekly'].map(key=>{const m=profileRankMedals.find(x=>x.medal_key===key),id='rank:'+key,equipped=profileEquippedMedals.includes(id),earned=!!m;return <button type="button" key={id} disabled={!earned||(!equipped&&profileEquippedMedals.length>=3)} className={'profile-medal-option '+(equipped?'selected':'')+(!earned?' locked':'')} onClick={()=>setProfileEquippedMedals(old=>equipped?old.filter(x=>x!==id):[...old,id])}><span>{!earned?'🔒':key==='global-season'?'🌍':key==='weekly-tournament'?'🏆':'👥'}</span><span><b>{({'global-season':'Campeão global','weekly-tournament':'Campeão semanal','friends-weekly':'Campeão dos amigos'})[key]}</b><small>{earned?'Conquistadas: '+Number(m.medals_count||0):'Ainda não conquistada'}</small></span><strong>{equipped?'✓ EQUIPADA':earned?'EQUIPAR':'BLOQUEADA'}</strong></button>})}{!profileGameMedals.length&&!profileRankMedals.length&&<p className="profile-medals-empty">Você ainda não conquistou medalhas de competição. Participe dos torneios para liberar sua vitrine!</p>}</div><div className="profile-medal-count">MEDALHAS EQUIPADAS <b>{profileEquippedMedals.length}/3</b></div></>}</div>
 </div>}
{!profileEditorOpen&&<>
<div className="gamer-section-heading"><div><span>SEU PROGRESSO</span><h3>Conquistas</h3><p>Medalhas que você desbloqueou ao longo da jornada.</p></div></div>
        <div className="achievement-grid">
          <div className={'achievement-card '+(gameCorrect>=1?'unlocked':'')}><div><Trophy size={23}/></div><b>Primeira vitória</b><span>Acertar uma pergunta</span><small>{gameCorrect>=1?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameXp>=500?'unlocked':'')}><div><Zap size={23}/></div><b>Subindo de nível</b><span>Conquistar 100 XP</span><small>{gameXp>=500?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameCorrect>=5?'unlocked':'')}><div><Star size={23}/></div><b>Mente afiada</b><span>Acertar 5 perguntas</span><small>{gameCorrect>=5?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className="achievement-card locked"><div><Flame size={23}/></div><b>Constância</b><span>Manter uma sequência de 7 dias</span><small>EM BREVE</small></div>
        </div>
        
<div className="gamer-section-heading"><div><span>INVENTÁRIO</span><h3>Itens desbloqueáveis</h3><p>Continue evoluindo para liberar novas personalizações.</p></div></div>
<div className="level-reward-grid"><article className={'level-reward '+(gameXp>=500?'unlocked':'')}><span className="level-reward-icon"><Sparkles size={20}/></span><div><b>Moldura Cyber Ciano</b><small>NÍVEL 2 · Moldura de perfil</small></div><strong>{gameXp>=500?'LIBERADA':'500 XP'}</strong></article><article className={'level-reward '+(gameXp>=1000?'unlocked':'')}><span className="level-reward-icon"><Gamepad2 size={20}/></span><div><b>Avatar alternativo</b><small>NÍVEL 3 · Personalização</small></div><strong>{gameXp>=1000?'LIBERADO':'1.000 XP'}</strong></article><article className={'level-reward '+(gameXp>=2000?'unlocked':'')}><span className="level-reward-icon"><Trophy size={20}/></span><div><b>Moldura Elite</b><small>NÍVEL 5 · Moldura dourada</small></div><strong>{gameXp>=2000?'LIBERADA':'2.000 XP'}</strong></article><article className={'level-reward '+(gameXp>=4500?'unlocked':'')}><span className="level-reward-icon"><Star size={20}/></span><div><b>Moldura lendária</b><small>NÍVEL 10 · Moldura especial</small></div><strong>{gameXp>=4500?'LIBERADA':'4.500 XP'}</strong></article></div>
</>}
</section></ProfileRenderBoundary>}
{page==='notifications'&&<section className="panel"><React.Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando notificações...</div>}><PushNotifications session={session} onToast={notify}/></React.Suspense><div className="panel-head"><div><h3>Central de notificações</h3><p>{unreadCount?unreadCount+' não lida(s)':'Você está em dia.'}</p></div>{unreadCount>0&&<button className="text-button" onClick={markAllNotificationsRead}>Marcar todas como lidas</button>}</div>{data.notifications.length?<div className="simple-list">{data.notifications.map(n=><div className={'simple-row notification-row '+(n.is_read?'read':'')} key={n.id}><div className="row-icon">{n.category==='social'?<MessageCircle size={18}/>:<Bell size={18}/>}</div><div className="row-main"><b>{n.title}</b><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString('pt-BR')} · {n.category==='social'?'NEXUS Social':n.category}</small></div>{n.category==='social'&&<button className="delete-btn" onClick={()=>{setPage((n.title?.includes('publicação')||n.title==='Novo comentário')?'social-feed':'social-conversations');if(!n.is_read)markNotificationRead(n.id);}}>Abrir</button>}{!n.is_read&&<button className="delete-btn" onClick={()=>markNotificationRead(n.id)}>Marcar lida</button>}<button className="delete-btn" onClick={()=>deleteItem('notifications',n.id)}>Excluir</button></div>)}</div>:<Empty icon={Bell} title="Nenhuma notificação por enquanto" text="Avisos sobre seus registros aparecerão aqui."/>}</section>}
      {page==='salary'&&<React.Suspense fallback={<div className="chart-loading">Carregando planejamento salarial...</div>}><SalaryCenter transactions={data.transactions} supabase={supabase} session={session} onRefresh={loadData}/></React.Suspense>}
      {page==='reports'&&<React.Suspense fallback={<div className="chart-loading">Carregando relatórios...</div>}><ReportsDashboard transactions={data.transactions}/></React.Suspense>}
      <footer className="footer"><span>MEU FINANCEIRO <i>•</i> FEITO PARA SUA ROTINA</span><span><ShieldCheck size={14}/> Seus dados dependem da configuração segura da sua conta</span></footer>
    </div></main>
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">{[['Início',LayoutDashboard,'overview'],['Movimentos',Activity,'transactions'],['Cartões',CreditCard,'cards'],['Metas',Target,'planning']].map(([label,Icon,key])=><button type="button" key={key} className={page===key?'active':''} onClick={()=>{setPage(key);setMobileMenu(false)}}><Icon size={19}/><span>{label}</span></button>)}<button type="button" className={mobileMenu?'active':''} onClick={()=>setMobileMenu(true)}><Menu size={19}/><span>Mais</span></button></nav>
    {showOnboarding&&<div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><section className="onboarding-card"><button className="onboarding-close" type="button" onClick={finishOnboarding} aria-label="Fechar tutorial"><X size={18}/></button><div className="onboarding-progress">{onboardingSteps.map((step,index)=><i key={step.page} className={index<=onboardingStep?'done':''}/>)}</div><div className="onboarding-icon"><currentOnboarding.icon size={27}/></div><span className="onboarding-eyebrow">{currentOnboarding.eyebrow}</span><h2 id="onboarding-title">{currentOnboarding.title}</h2><p>{currentOnboarding.body}</p><div className="onboarding-tip"><Sparkles size={16}/><span>{currentOnboarding.tip}</span></div><div className="onboarding-actions"><button type="button" className="onboarding-skip" onClick={finishOnboarding}>Pular tutorial</button><div>{onboardingStep>0&&<button type="button" className="onboarding-back" onClick={()=>{const next=onboardingStep-1;setOnboardingStep(next);setPage(onboardingSteps[next].page)}}>Voltar</button>}<button type="button" className="primary" onClick={()=>{if(onboardingStep===onboardingSteps.length-1){finishOnboarding();return;}const next=onboardingStep+1;setOnboardingStep(next);setPage(onboardingSteps[next].page)}}>{onboardingStep===onboardingSteps.length-1?'Concluir':'Próximo'} <ChevronRight size={16}/></button></div></div></section></div>}
    {assistantOpen&&<div className="assistant-popover"><div className="assistant-popover-head"><div className="assistant-popover-title"><span className="assistant-popover-icon nexus-avatar"><Brain size={19}/><Sparkles size={11}/></span><div><b>NEXUS <em>AI</em></b><small><i/> NÚCLEO LOCAL · CÓDIGO PRÓPRIO</small></div></div><button className="icon-btn" onClick={()=>setAssistantOpen(false)} aria-label="Fechar assistente"><X size={18}/></button></div><div className="assistant-popover-messages">{assistantMessages.map((m,i)=><div className={'assistant-message '+m.role} key={i}><div className="assistant-bubble">{m.text}</div></div>)}{assistantBusy&&<div className="assistant-message assistant"><div className="assistant-bubble nexus-typing"><i/><i/><i/><span>NEXUS está pensando…</span></div></div>}{assistantError&&<div className="nexus-error" role="status">{assistantError}</div>}</div><div className="assistant-popover-suggestions"><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Como estão meus gastos?')}>Meus gastos</button><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Analise meus cartões')}>Meus cartões</button><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Quais dívidas devo priorizar?')}>Minhas dívidas</button></div><form className="assistant-popover-compose" onSubmit={e=>{e.preventDefault();sendAssistantMessage()}}><input value={assistantInput} onChange={e=>setAssistantInput(e.target.value)} placeholder="Converse com a NEXUS…" disabled={assistantBusy}/><button className="primary" type="submit" disabled={!assistantInput.trim()||assistantBusy} aria-label="Enviar">{assistantBusy?<span className="nexus-send-spinner"/>:<Send size={17}/>}</button></form><p className="assistant-popover-note">NEXUS AI · núcleo local executado no seu navegador. As mensagens da conversa são interpretadas pelo código do Meu Financeiro, sem envio para um modelo de IA externo.</p></div>}
    <button className={'assistant-fab '+(assistantOpen?'is-open':'')} onClick={()=>setAssistantOpen(v=>!v)} aria-label={assistantOpen?'Fechar assistente':'Abrir assistente'} title="Abrir NEXUS AI">{assistantOpen?<X size={23}/>:<><Gamepad2 size={25}/><span><Sparkles size={13}/></span></>}</button>
    {payModal&&<PayBillsModal debts={data.debts.filter(d=>d.is_continuous?d.paid_month!==currentMonthKey:d.status!=='Pago')} installments={data.installments.filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0))} onClose={()=>setPayModal(false)} onConfirm={confirmPayments} busy={payBusy}/>}
    {modal&&<EntryModal type={typeof modal==='string'?modal:modal.type} extra={typeof modal==='string'?(modal==='installments'?{cards:data.cards}:null):modal} onClose={()=>setModal(null)} onSave={saveItem} busy={busy}/>}
    {rewardSummary&&<div className="nexus-reward-backdrop" role="presentation"><section className="nexus-reward-modal" role="dialog" aria-modal="true" aria-label="Recompensas da partida"><div className="nexus-reward-kicker">NEXUS REWARDS</div><h2>{rewardSummary.won?'MISSÃO CONCLUÍDA!':'FIM DE JOGO'}</h2><p>{rewardSummary.saveError?'O resultado foi calculado. O registro online falhou, mas suas recompensas desta sessão estão abaixo.':'Confira o resultado e as recompensas desta partida.'}</p><div className="nexus-reward-score"><span>PONTUAÇÃO</span><b>{Number(rewardSummary.score||0).toLocaleString('pt-BR')}</b><small>{String(rewardSummary.mode||'normal').toUpperCase()} {rewardSummary.saving?'· SALVANDO RESULTADO':''}</small></div><div className="nexus-reward-stats"><div><b>⚡ +{rewardSummary.xp}</b><small>XP</small></div><div><b>🪙 +{rewardSummary.coins}</b><small>MOEDAS</small></div></div>{rewardSummary.items.length>0?<div className="nexus-reward-items"><strong>ITENS ENCONTRADOS</strong>{rewardSummary.items.map((item,index)=><div key={item.item_name+index}><span>{item.icon||'🎁'}</span><b>{item.item_name}</b><small>{item.rarity||'drop'}</small></div>)}</div>:<div className="nexus-reward-empty">Nenhuma relíquia nesta partida. Continue jogando: novas oportunidades aparecem nos próximos desafios.</div>}<button className="primary" onClick={()=>{setRewardSummary(null);setLiveGameLoot({coins:0,items:[]})}}>Continuar</button></section></div>}{toast&&<div className="toast nx2-toast" role="status" aria-live="polite"><Check size={17}/>{toast}</div>}
  </div>;
}

function Stat({icon:Icon,label,value,tone,detail}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>}
function Empty({icon:Icon,title,text}){return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><b>{title}</b><p>{text}</p></div>}
function TransactionList({items,onDelete}){return items.length?<div className="transaction-list">{items.map(t=><div className="transaction-row" key={t.id}><div className={`transaction-icon ${t.type}`} >{t.type==='entrada'?<ArrowDownLeft size={19}/>:<ArrowUpRight size={19}/>}</div><div className="transaction-main"><b>{t.description||t.category||'Movimentação'}</b><span>{t.category||'Sem categoria'} · {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><div className={`transaction-amount ${t.type}`}>{t.type==='entrada'?'+':'−'} {brl(t.amount)}</div><button className="delete-btn" onClick={()=>onDelete(t.id)}>Excluir</button></div>)}</div>:<Empty icon={Activity} title="Ainda não há movimentações" text="Adicione sua primeira entrada ou gasto para começar a acompanhar seu dinheiro."/>}
function PayBillsModal({debts,installments,onClose,onConfirm,busy}){
 const [selected,setSelected]=useState([]);
 const items=[...debts.map(record=>({key:'d-'+record.id,kind:'debt',record,label:record.title,amount:Number(record.amount||0),detail:record.is_continuous?'Conta contínua · mensal':'Conta pendente'})),...installments.map(record=>({key:'i-'+record.id,kind:'installment',record,label:record.description,amount:Number(record.total_amount||0)/Math.max(1,Number(record.installment_count||1)),detail:(record.paid_count||0)+'/'+record.installment_count+' pagas · '+(Number(record.installment_count)-Number(record.paid_count||0))+' restantes'}))];
 const toggle=key=>setSelected(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key]);
 const chosen=items.filter(x=>selected.includes(x.key));
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><div className="modal pay-bills-modal" style={{maxWidth:560}}><div className="modal-head"><div><h2>Pagar contas</h2><p>Selecione o que você já pagou</p></div><button className="icon-btn" onClick={onClose} disabled={busy}><X size={19}/></button></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'12px 0'}}><span className="muted">{items.length} compromisso(s) pendente(s)</span><button type="button" className="text-button" onClick={()=>setSelected(selected.length===items.length?[]:items.map(x=>x.key))}>{selected.length===items.length?'Desmarcar todos':'Selecionar todos'}</button></div><div className="simple-list pay-bills-list" style={{maxHeight:'52vh',overflowY:'auto'}}>{items.length?items.map(item=><label key={item.key} style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:12,border:selected.includes(item.key)?'1px solid rgba(76,150,255,.7)':'1px solid rgba(130,145,170,.2)',background:selected.includes(item.key)?'rgba(65,130,230,.1)':'transparent',cursor:'pointer'}}><input className="pay-item-check" type="checkbox" checked={selected.includes(item.key)} onChange={()=>toggle(item.key)}/><span className="pay-item-info"><b>{item.label}</b><small className="muted">{item.detail}</small></span><strong className="pay-item-amount">{brl(item.amount)}{item.kind==='installment'&&<small>esta parcela</small>}</strong></label>):<Empty icon={Check} title="Tudo em dia!" text="Não há contas ou parcelas pendentes para pagar."/>}</div><div className="modal-actions pay-bills-actions"><span className="muted">{chosen.length} selecionado(s) · {brl(chosen.reduce((sum,x)=>sum+x.amount,0))}</span><button className="primary" disabled={!chosen.length||busy} onClick={()=>onConfirm(chosen)}><Check size={16}/>{busy?'Registrando…':'Confirmar pagamentos'}</button></div></div></div>;
}

function EntryModal({type,extra,onClose,onSave,busy}){
 const item=extra?.item;
 const [f,setF]=useState({date:item?.date||today(),type:item?.type||'gasto',category:item?.category||'Alimentação',status:item?.status||'Pendente',is_continuous:!!item?.is_continuous,name:item?.name||'',description:item?.description||'',amount:item?.amount==null?'':String(item.amount),limit_amount:item?.limit_amount==null?'':String(item.limit_amount),used:item?.used==null?'0':String(item.used),due_day:item?.due_day==null?'':String(item.due_day),title:item?.title||'',due_date:item?.due_date||'',target:item?.target==null?'':String(item.target),saved:item?.saved==null?'0':String(item.saved),deadline:item?.deadline||'',installment_count:item?.installment_count==null?'2':String(item.installment_count),first_due_date:item?.first_due_date||today(),paid_count:item?.paid_count==null?'0':String(item.paid_count),note:item?.note||'',card_id:item?.card_id||extra?.card_id||'',frequency:item?.frequency||'mensal',next_charge_date:item?.next_charge_date||today(),subscriptionStatus:item?.status||'Ativa',recurring_monthly:false});
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 const title={transactions:'Nova movimentação',cards:item?'Editar cartão':'Adicionar cartão',debts:item?'Editar conta ou dívida':'Nova conta ou dívida',goals:'Criar meta',installments:'Nova compra parcelada',subscriptions:item?'Editar assinatura':'Nova assinatura',goalMovement:extra?.movement_type==='retirada'?'Retirar dinheiro da meta':'Adicionar dinheiro à meta'}[type];
 async function submit(e){e.preventDefault();let table=type,values;
 if(type==='transactions')values={date:f.date,type:f.type,category:f.category,description:f.description,amount:Number(f.amount),recurring_monthly:!!f.recurring_monthly};
 if(type==='cards')values={name:f.name,limit_amount:Number(f.limit_amount),used:Number(f.used||0),due_day:f.due_day?Number(f.due_day):null};
 if(type==='debts')values={title:f.title,amount:Number(f.amount),due_date:f.is_continuous?null:(f.due_date||null),status:f.status,is_continuous:f.is_continuous,paid_month:item?.paid_month||null};
 if(type==='goals')values={name:f.name,target:Number(f.target),saved:Number(f.saved||0),deadline:f.deadline||null};
 if(type==='installments')values={description:f.description,total_amount:Number(f.amount),installment_count:Number(f.installment_count),first_due_date:f.first_due_date,card_id:f.card_id||null,paid_count:Number(f.paid_count||0)};
 if(type==='subscriptions')values={name:f.name,amount:Number(f.amount),frequency:f.frequency,next_charge_date:f.next_charge_date,card_id:f.card_id||null,status:f.subscriptionStatus};
 if(type==='goalMovement')values={goal_id:extra.goal.id,movement_type:extra.movement_type,amount:Number(f.amount),note:f.note||null};
 await onSave(table,values,extra?.item||null);
 }
 return <div className="modal-backdrop" onClick={onClose}><form className="modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ORGANIZE SUAS FINANÇAS</div><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div>
 {type==='transactions'&&<><label>Tipo<select value={f.type} onChange={e=>set('type',e.target.value)}><option value="gasto">Gasto</option><option value="entrada">Entrada</option></select></label><label>Descrição<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: mercado, salário…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Data<input required type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></label></div><label>Categoria<select value={f.category} onChange={e=>set('category',e.target.value)}>{['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Compras','Salário','Freelance','Contas','Outros'].map(x=><option key={x}>{x}</option>)}</select></label>{f.type==='entrada'&&!item&&<><label className="check-row"><input type="checkbox" checked={!!f.recurring_monthly} onChange={e=>set('recurring_monthly',e.target.checked)}/> Repetir esta entrada automaticamente todo mês</label>{f.recurring_monthly&&<p className="muted">O primeiro salário será registrado agora. Os próximos serão lançados mensalmente no mesmo dia, sem duplicar entradas.</p>}</>}</>}
 {type==='cards'&&<><label>Nome do cartão<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Cartão principal"/></label><div className="form-row"><label>Limite total (R$)<input required type="number" min="0" step=".01" value={f.limit_amount} onChange={e=>set('limit_amount',e.target.value)} placeholder="0,00"/></label><label>Valor utilizado (R$)<input required type="number" min="0" step=".01" value={f.used} onChange={e=>set('used',e.target.value)}/></label></div><label>Dia do vencimento (opcional)<input type="number" min="1" max="31" value={f.due_day} onChange={e=>set('due_day',e.target.value)} placeholder="Ex.: 10"/></label></>}
 {type==='debts'&&<><label>Nome da conta ou dívida<input required value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Ex.: conta de internet"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label>{!f.is_continuous&&<label>Vencimento<input type="date" value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></label>}</div><label className="check-row"><input type="checkbox" checked={f.is_continuous} onChange={e=>set('is_continuous',e.target.checked)}/> Conta contínua (repete todos os meses, sem vencimento)</label>{!f.is_continuous&&<label>Situação<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Pendente</option><option>Pago</option></select></label>}<p className="muted">{f.is_continuous?'Essa conta será considerada uma saída mensal. Ao marcar como paga, ela volta a ficar pendente no próximo mês.':'Cadastre uma conta única ou dívida com vencimento definido.'}</p></>}
 {type==='installments'&&<><label>O que foi comprado?<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: celular, televisão…"/></label><div className="form-row"><label>Valor total (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)}/></label><label>Quantidade de parcelas<input required type="number" min="2" max="120" value={f.installment_count} onChange={e=>set('installment_count',e.target.value)}/></label></div><label>Data de vencimento da 1ª parcela<input required type="date" value={f.first_due_date} onChange={e=>set('first_due_date',e.target.value)}/></label><label>Cartão (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">Valor aproximado por parcela: {brl(Number(f.amount||0)/Math.max(1,Number(f.installment_count||1)))}</p></>}
 {type==='subscriptions'&&<><label>Nome da assinatura<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Netflix, Spotify, academia…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Frequência<select value={f.frequency} onChange={e=>set('frequency',e.target.value)}><option value="mensal">Mensal</option><option value="anual">Anual</option></select></label></div><div className="form-row"><label>Próxima cobrança<input required type="date" value={f.next_charge_date} onChange={e=>set('next_charge_date',e.target.value)}/></label><label>Status<select value={f.subscriptionStatus} onChange={e=>set('subscriptionStatus',e.target.value)}><option>Ativa</option><option>Cancelada</option></select></label></div><label>Cartão utilizado (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">A assinatura continua sendo contabilizada até ser cancelada. Não será misturada às compras parceladas.</p></>}
 {type==='goalMovement'&&<><p className="muted">Meta: {extra?.goal?.name} · Saldo atual: {brl(extra?.goal?.saved)}</p><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Observação (opcional)<input value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Ex.: dinheiro separado do salário"/></label></>}
 {type==='goals'&&<><label>Nome da meta<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: reserva de emergência"/></label><div className="form-row"><label>Quanto quero juntar (R$)<input required type="number" min=".01" step=".01" value={f.target} onChange={e=>set('target',e.target.value)} placeholder="1000,00"/></label><label>Já tenho (R$)<input type="number" min="0" step=".01" value={f.saved} onChange={e=>set('saved',e.target.value)}/></label></div><label>Prazo (opcional)<input type="date" value={f.deadline} onChange={e=>set('deadline',e.target.value)}/></label></>}
 <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}><Plus size={17}/>{busy?'Salvando…':'Salvar registro'}</button></div></form></div>
}


function SetupScreen(){return <div className="setup-shell"><div className="setup-card"><div className="brand"><BrandMark /><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Vamos conectar seu espaço privado</h1><p>O visual do site está pronto. Para ativar o login e salvar seus dados com segurança, configure seu projeto Supabase e as variáveis de ambiente.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL do projeto e a chave pública (anon/publishable) para um arquivo <code>.env</code>.</li><li>Ative o cadastro por e-mail em Authentication → Sign In / Providers. Assim, as pessoas poderão criar uma conta pela tela inicial.</li><li>Reinicie o site.</li></ol><div className="setup-warning"><ShieldCheck size={18}/><span>Nunca coloque a chave <b>service_role</b> no site. Use apenas a chave pública e mantenha o Row Level Security (RLS) ativo.</span></div></div></div>}
export default App;