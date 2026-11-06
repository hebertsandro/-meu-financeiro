import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import { improveNexusFallback } from './nexus-cognition';
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChartNoAxesCombined,
  Check, ChevronRight, CircleDollarSign, CreditCard, LayoutDashboard, LockKeyhole, Pencil, CalendarClock, Bot, Sparkles, Send,
  Gamepad2, Trophy, Coins, Brain, Gift, ClipboardList, Star, Zap, Flame,
  LogOut, Menu, Plus, ReceiptText, ShieldCheck, Target, TrendingUp, Wallet, X, Users, Ban, UserCheck, KeyRound, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell
} from 'recharts';

const brl = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const today = () => new Date().toISOString().slice(0,10);
const monthStart = () => new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
const ADMIN_EMAIL = 'hebertsandro877@gmail.com'; // Apenas controla a exibição; a Edge Function valida o acesso no servidor.
const menu = [
  ['Visão geral',LayoutDashboard,'overview'],['Cartões e compromissos',CreditCard,'cards'],
  ['Movimentações',Activity,'transactions'],['Planejamento',Target,'planning'],
  ['Relatórios',ChartNoAxesCombined,'reports'],['Jogos',Gamepad2,'games'],['Oportunidades',Gift,'opportunities']
];


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
      'tb':'tambem','eh':'e','ehh':'e'
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
  const recentTopic = lastUser ? String(lastUser).slice(0,220) : '';
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
  if (asksForAdvice && recentTopic) return 'Pelo contexto, parece que você quer orientação sobre “'+recentTopic+'”. Não quero tirar conclusões sem conhecer os detalhes. O que aconteceu depois disso?';

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
function App(){
  const [session,setSession]=useState(null), [loading,setLoading]=useState(true);
  const [page,setPage]=useState('overview'), [mobileMenu,setMobileMenu]=useState(false);
  const [data,setData]=useState({transactions:[],cards:[],debts:[],goals:[],installments:[],subscriptions:[],card_limit_history:[],goal_movements:[],notifications:[]});
  const [modal,setModal]=useState(null), [toast,setToast]=useState('');
  const [payModal,setPayModal]=useState(false),[payBusy,setPayBusy]=useState(false);
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authError,setAuthError]=useState(''), [authMode,setAuthMode]=useState('login'), [authNotice,setAuthNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [adminUsers,setAdminUsers]=useState([]),[adminBusy,setAdminBusy]=useState(false),[adminError,setAdminError]=useState(''),[adminMessage,setAdminMessage]=useState(''),[maintenance,setMaintenance]=useState(false),[maintenanceMessage,setMaintenanceMessage]=useState('Estamos realizando uma manutenção. Voltaremos em breve.');
  const [adminTestMode,setAdminTestMode]=useState(()=>window.localStorage.getItem('mf_admin_test_mode')==='true');
  const [maintenanceCheckDone,setMaintenanceCheckDone]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [assistantInput,setAssistantInput]=useState('');
  const [assistantBusy,setAssistantBusy]=useState(false);
  const [assistantError,setAssistantError]=useState('');
  const [activeArcadeGame,setActiveArcadeGame]=useState(null);
  const [gameQuestionIndex,setGameQuestionIndex]=useState(0),[gameAnswer,setGameAnswer]=useState(null),[gameFeedback,setGameFeedback]=useState(''),[gameXp,setGameXp]=useState(()=>Number(window.localStorage.getItem('mf_game_xp')||0)),[gameCorrect,setGameCorrect]=useState(()=>Number(window.localStorage.getItem('mf_game_correct')||0));
  const [quizLastPlayed,setQuizLastPlayed]=useState(()=>Number(window.localStorage.getItem('mf_quiz_last')||0)),[quizClock,setQuizClock]=useState(Date.now()),[quizActive,setQuizActive]=useState(false),[roundQuestions,setRoundQuestions]=useState([]);
  const [dailyGameXp,setDailyGameXp]=useState(()=>{const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');return saved.day===new Date().toLocaleDateString('en-CA')?Number(saved.xp||0):0});
  const [playerProfile,setPlayerProfile]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('mf_player_profile')||'{"name":"Meu jogador","avatar":"👾","frame":"violet","cardFrame":"cyan"}')}catch{return {name:'Meu jogador',avatar:'👾',frame:'violet',cardFrame:'cyan'}}});
  useEffect(()=>{window.localStorage.setItem('mf_player_profile',JSON.stringify(playerProfile))},[playerProfile]);
  const [assistantMessages,setAssistantMessages]=useState([{role:'assistant',text:'Olá! Eu sou a NEXUS. ⚡ Estou aqui para conversar sobre sua vida, estudos, sentimentos, ideias e também ajudar com suas finanças. Pode falar naturalmente, sem medo de errar!'}]);
  const isAdmin=session?.user?.email?.toLowerCase()===ADMIN_EMAIL;
  useEffect(()=>{window.localStorage.setItem('mf_game_xp',String(gameXp));window.localStorage.setItem('mf_game_correct',String(gameCorrect));},[gameXp,gameCorrect]);
  useEffect(()=>{const timer=setInterval(()=>setQuizClock(Date.now()),30000);return ()=>clearInterval(timer)},[]);

  useEffect(()=>{
    if(!isConfigured){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{if(session) loadData()},[session]);
  useEffect(()=>{
    if(!isConfigured){setMaintenanceCheckDone(true);return}
    let active=true;
    supabase.from('app_settings').select('maintenance_mode,maintenance_message').eq('id',true).maybeSingle()
      .then(({data,error})=>{
        if(!active)return;
        if(!error&&data){setMaintenance(!!data.maintenance_mode);setMaintenanceMessage(data.maintenance_message||'Estamos realizando uma manutenção. Voltaremos em breve.')}
        setMaintenanceCheckDone(true);
      }).catch(()=>{if(active)setMaintenanceCheckDone(true)});
    return ()=>{active=false};
  },[]);
  const notify=(s)=>{setToast(s);setTimeout(()=>setToast(''),3200)};
  const unreadCount=data.notifications.filter(n=>!n.is_read).length;
  async function addNotification(title,message,category='geral'){if(!session?.user?.id)return;const {error}=await supabase.from('notifications').insert({user_id:session.user.id,title,message,category});if(!error)await loadData()}
  async function markNotificationRead(id){const {error}=await supabase.from('notifications').update({is_read:true}).eq('id',id);if(!error)await loadData()}
  async function markAllNotificationsRead(){const {error}=await supabase.from('notifications').update({is_read:true}).eq('is_read',false);if(!error){await loadData();notify('Todas as notificações foram marcadas como lidas.')}}
  async function handleAuth(e){
    e.preventDefault();setBusy(true);setAuthError('');setAuthNotice('');
    const cleanEmail=email.trim();
    if(authMode==='signup'){
      const {data,error}=await supabase.auth.signUp({
        email:cleanEmail,
        password,
        options:{emailRedirectTo:window.location.origin}
      });
      if(error){
        setAuthError(error.message.includes('Password')?'Use uma senha mais forte, com pelo menos 6 caracteres.':'Não foi possível criar a conta. Confira os dados e tente novamente.');
      } else if(data.session){
        setAuthNotice('Conta criada! Seu espaço financeiro já está pronto.');
      } else {
        setAuthNotice('Cadastro iniciado! Confira seu e-mail para confirmar a conta e depois entre no site.');
      }
    } else {
      const {error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
      if(error)setAuthError('Não foi possível entrar. Confira o e-mail e a senha.');
    }
    setBusy(false);
  }
  async function loadData(){
    const tables=['transactions','cards','debts','goals','installments','subscriptions','card_limit_history','goal_movements','notifications'];
    const results=await Promise.all(tables.map(t=>supabase.from(t).select('*').order(t==='card_limit_history'?'changed_at':'created_at',{ascending:false})));
    const next={};
    results.forEach((r,i)=>{next[tables[i]]=r.data||[]});
    setData(next);
  }
  async function saveItem(table, values, item=null){
    setBusy(true);
    if(table==='goalMovement'){
      const goal=data.goals.find(g=>g.id===values.goal_id);
      if(!goal){setBusy(false);notify('Meta não encontrada.');return false}
      const nextSaved=Number(goal.saved)+(values.movement_type==='deposito'?1:-1)*Number(values.amount);
      if(nextSaved<0){setBusy(false);notify('A retirada não pode ser maior que o valor guardado.');return false}
      const movement=await supabase.from('goal_movements').insert({...values,user_id:session.user.id}).select('id').single();
      if(movement.error||!movement.data){setBusy(false);notify('Não foi possível registrar a movimentação.');return false}
      const update=await supabase.from('goals').update({saved:nextSaved}).eq('id',goal.id);
      if(update.error){await supabase.from('goal_movements').delete().eq('id',movement.data.id);setBusy(false);notify('Não foi possível atualizar a meta.');return false}
      setBusy(false);await loadData();setModal(null);notify('Movimentação da meta registrada!');await addNotification(values.movement_type==='deposito'?'Depósito na meta':'Retirada da meta',(values.movement_type==='deposito'?'Você adicionou ':'Você retirou ')+brl(values.amount)+' da meta.','metas');return true;
    }
    const request=item
      ? supabase.from(table).update(values).eq('id',item.id).eq('user_id',session.user.id)
      : supabase.from(table).insert({...values,user_id:session.user.id});
    const {error}=await request;
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
    const update=await supabase.from('cards').update({limit_amount:next}).eq('id',card.id);
    setBusy(false);
    if(update.error){notify('O histórico foi salvo, mas não foi possível atualizar o cartão.');return}
    await loadData();notify('Limite atualizado e histórico registrado!');await addNotification('Limite do cartão alterado',card.name+': '+brl(card.limit_amount)+' → '+brl(next)+'.','cartoes');
  }
  function toggleAdminTestMode(){
    if(!isAdmin)return;
    const keys=['mf_game_xp','mf_game_correct','mf_quiz_last','mf_flap_daily','mf_flap_best','mf_flap_best_infinite','mf_flap_bird','mf_flap_pipe','mf_flap_story_unlocks','mf_player_profile'];
    if(!adminTestMode){
      const backup={};keys.forEach(key=>{backup[key]=window.localStorage.getItem(key)});
      window.localStorage.setItem('mf_admin_test_backup',JSON.stringify(backup));
      window.localStorage.setItem('mf_game_xp','10000');
      window.localStorage.setItem('mf_game_correct','100');
      window.localStorage.setItem('mf_quiz_last','0');
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
      setQuizLastPlayed(Number(backup.mf_quiz_last||0));
      try{const daily=JSON.parse(backup.mf_flap_daily||'{}');setDailyGameXp(daily.day===new Date().toLocaleDateString('en-CA')?Number(daily.xp||0):0)}catch{setDailyGameXp(0)}
      try{setPlayerProfile(JSON.parse(backup.mf_player_profile||'{"name":"Meu jogador","avatar":"👾","frame":"violet","cardFrame":"cyan"}'))}catch{}
      setAdminTestMode(false);
      notify('Progresso original restaurado.');
    }
  }

  async function adminAction(action,userId,extra={}){
    if(action==='delete_user'&&!window.confirm('ATENÇÃO: excluir esta conta é definitivo. Os dados vinculados também poderão ser removidos. Deseja continuar?'))return;
    setAdminBusy(true);setAdminError('');setAdminMessage('');
    const {data:result,error}=await supabase.functions.invoke('admin-panel',{body:{action,user_id:userId,...extra}});
    setAdminBusy(false);
    if(error||result?.error){let detail=result?.error||error?.message||'Falha sem detalhes retornados.';try{const ctx=error?.context;if(ctx&&typeof ctx.clone==='function'){const payload=await ctx.clone().json();detail=payload?.error||payload?.message||detail}}catch{}setAdminError(detail);return}
    if(action==='list_users'){setAdminUsers(result.users||[]);setAdminMessage('Lista de contas atualizada.');return}
    if(action==='get_maintenance'){setMaintenance(!!result.settings?.maintenance_mode);setMaintenanceMessage(result.settings?.maintenance_message||'Estamos realizando uma manutenção. Voltaremos em breve.');return}
    if(action==='set_maintenance'){setMaintenance(!!result.maintenance_mode);setAdminMessage(result.maintenance_mode?'Modo manutenção ativado.':'Modo manutenção desativado.');return}
    if(action==='reset_password'){setAdminMessage('Link de redefinição gerado: '+(result.action_link||'Confira o e-mail do usuário.'));return}
    setAdminMessage(action==='ban_user'?'Conta bloqueada.':action==='unban_user'?'Conta desbloqueada.':'Conta excluída definitivamente.');
    await adminAction('list_users');
  }
  useEffect(()=>{if(session&&isAdmin&&page==='admin'&&!adminUsers.length&&!adminBusy&&!adminError)adminAction('list_users')},[session,page]);

  async function deleteItem(table,id){
    const {error}=await supabase.from(table).delete().eq('id',id);
    if(error){notify('Não foi possível excluir.');return}
    await loadData();notify('Registro excluído.');
  }

  const quizAvailable=!quizLastPlayed||quizClock-quizLastPlayed>=2*60*60*1000;
  function startQuiz(){if(!quizAvailable)return;const selected=[...gameQuestions].sort(()=>Math.random()-.5).slice(0,5);const now=Date.now();setRoundQuestions(selected);setGameQuestionIndex(0);setGameAnswer(null);setGameFeedback('');setQuizLastPlayed(now);window.localStorage.setItem('mf_quiz_last',String(now));setQuizActive(true)}
  function answerGame(index){if(gameAnswer!==null||!quizActive)return;setGameAnswer(index);const q=roundQuestions[gameQuestionIndex];if(index===q.correct){setGameXp(v=>v+5);setGameCorrect(v=>v+1);setGameFeedback('Resposta certa! +5 XP. '+q.explanation)}else{setGameFeedback('Quase! '+q.explanation)}}
  function nextGameQuestion(){if(gameQuestionIndex>=roundQuestions.length-1){setQuizActive(false);setGameFeedback('');return}setGameQuestionIndex(v=>v+1);setGameAnswer(null);setGameFeedback('')}
  function awardFlapXp(score){const day=new Date().toLocaleDateString('en-CA');const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');const used=saved.day===day?Number(saved.xp||0):0;const points=Math.max(0,Math.floor(Number(score)||0));const requested=points*2;const reward=Math.min(requested,Math.max(0,100-used));if(reward>0){const total=used+reward;window.localStorage.setItem('mf_flap_daily',JSON.stringify({day,xp:total}));setDailyGameXp(total);setGameXp(v=>v+reward);notify('Mandou bem! +'+reward+' XP no Asas da Fortuna (2 XP por ponto).')}else notify('Limite diário de 100 XP do Flappy atingido. Volte amanhã!')}

  async function sendAssistantMessage(value=assistantInput){
    const question=String(value||'').trim();
    if(!question||assistantBusy)return;
    const previous=assistantMessages.filter(m=>m.role==='user'||m.role==='assistant').slice(-12);
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

  if(loading||!maintenanceCheckDone)return <div className="loading"><div className="spinner"/><span>Preparando seu espaço financeiro…</span></div>;
  if(!isConfigured)return <SetupScreen/>;
  if(maintenance&&!isAdmin)return <div className="setup-shell"><div className="setup-card"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Estamos em manutenção</h1><p>{maintenanceMessage}</p><p>Estamos trabalhando para melhorar sua experiência. Tente novamente mais tarde.</p></div></div>;
  if(!session)return <div className="auth-shell"><div className="auth-art"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="auth-message"><div className="eyebrow"><ShieldCheck size={15}/> SEU ESPAÇO PESSOAL</div><h1>Cuide do seu dinheiro.<br/><span>Do seu jeito.</span></h1><p>Um lugar só seu para organizar suas finanças, acompanhar seus objetivos e tomar decisões melhores.</p><div className="auth-mini-stats"><div><span>Controle</span><b>em suas mãos</b></div><div><span>Acesso</span><b>protegido</b></div></div></div><div className="auth-foot">FINANÇAS MAIS CLARAS, UM DIA DE CADA VEZ.</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={handleAuth}><div className="lock-circle"><LockKeyhole size={25}/></div><h2>{authMode==='login'?'Bem-vindo de volta':'Crie sua conta'}</h2><p>{authMode==='login'?'Entre para acessar seu painel privado.':'Comece a organizar suas finanças em seu espaço particular.'}</p><label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='login'?'Sua senha':'Crie uma senha (mín. 6 caracteres)'}/></label>{authError&&<div className="error">{authError}</div>}{authNotice&&<div className="auth-notice">{authNotice}</div>}<button className="primary wide" disabled={busy}>{busy?(authMode==='login'?'Entrando…':'Criando conta…'):(authMode==='login'?'Entrar na minha conta':'Criar minha conta')} <ChevronRight size={18}/></button><button type="button" className="auth-switch" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('');setAuthNotice('')}}>{authMode==='login'?'Ainda não tem conta? Criar cadastro':'Já tem uma conta? Entrar'}</button><div className="secure-note"><ShieldCheck size={15}/> Área privada • Conexão segura</div></form></div></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'open':''}`}><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span><button className="mobile-close icon-btn" onClick={()=>setMobileMenu(false)}><X size={19}/></button></div><div className="side-caption">SEU ESPAÇO</div><nav>{[...menu,...(isAdmin?[['Painel ADM',ShieldCheck,'admin']]:[])].map(([label,Icon,key])=><button key={key} className={`nav-item ${page===key?'active':''}`} onClick={()=>{setPage(key);setMobileMenu(false)}}><Icon size={19}/><span>{label}</span>{page===key&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={18}/><div><b>Seus dados, suas regras</b><span>Espaço financeiro pessoal</span></div></div><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sair da conta</button></div></aside>
    {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}/>}
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><div className="crumb">Meu espaço <ChevronRight size={14}/><b>{[...menu,...(isAdmin?[['Painel ADM',ShieldCheck,'admin']]:[])].find(x=>x[2]===page)?.[0]|| (page==='notifications'?'Notificações':'Visão geral')}</b></div><div className="top-actions"><button className="xp-header-chip" aria-label={`Jogador nível ${Math.floor(gameXp/500)+1}, ${gameXp} XP. Abrir oportunidades`} onClick={()=>setPage("opportunities")}><Zap size={15}/><span><b>{gameXp} XP</b><small>NÍVEL {Math.floor(gameXp/500)+1}</small></span></button><button className="notification-bell" aria-label="Abrir notificações" onClick={()=>setPage("notifications")}><Bell size={18}/>{unreadCount>0&&<i>{unreadCount>9?"9+":unreadCount}</i>}</button><span className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span><button className={`avatar profile-avatar-button frame-${playerProfile.frame} ${(playerProfile.gems||[]).length===4?"frame-chromatic":""}`} aria-label="Abrir meu perfil" title="Meu perfil" onClick={()=>setPage('profile')}><span>{playerProfile.avatar}</span></button></div></header>
    <div className="content">
      <div className="page-heading"><div><div className="eyebrow">SEU DINHEIRO, MAIS CLARO</div><h1>{page==='overview'?'Visão geral':page==='admin'?'Painel administrativo':page==='notifications'?'Notificações':page==='profile'?'Meu perfil':menu.find(x=>x[2]===page)?.[0]}</h1><p>{page==='admin'?'Gerencie contas com acesso administrativo protegido no servidor.':page==='overview'?'Aqui está um resumo da sua vida financeira.':page==='transactions'?'Entradas, gastos e contas a pagar em um só lugar.':page==='cards'?'Cartões, limites, faturas e compromissos futuros.':page==='planning'?'Metas e organização dos seus próximos passos.':page==='opportunities'?'Missões e oportunidades para evoluir.':page==='games'?'Jogos, desafios e XP em uma central exclusiva.':page==='profile'?'Seu jogador, suas conquistas e sua personalização.':'Entenda seus hábitos financeiros.'}</p></div>{['transactions','cards','planning'].includes(page)&&<button className="primary" onClick={()=>setModal(page==='planning'?'goals':page)}><Plus size={18}/>{page==='cards'?' Adicionar cartão':page==='planning'?' Nova meta':' Nova movimentação'}</button>}</div>

      {page==='admin'&&isAdmin&&<section className="panel admin-panel">
        <div className="panel-head"><div><h3>Administração de contas</h3><p>Área exclusiva do administrador · ações verificadas pela Edge Function</p></div><div className="item-actions"><button className="delete-btn" disabled={adminBusy} onClick={()=>adminAction('get_maintenance')}>Consultar manutenção</button><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_users')}><RefreshCw size={16}/> Atualizar contas</button></div></div>
        <div className="stat-grid"><Stat icon={Users} label="Contas carregadas" value={String(adminUsers.length)} tone="blue" detail="Lista retornada pelo Supabase Auth"/><Stat icon={ShieldCheck} label="Acesso" value="Protegido" tone="green" detail="Validação também no servidor"/></div>
        <div className="history-box admin-test-card"><div className="maintenance-heading"><span className="maintenance-symbol"><Gamepad2 size={20}/></span><div><h3>Modo de testes do administrador</h3><p>Libera temporariamente os recursos de jogador neste navegador, sem alterar saldos, contas ou dados financeiros do banco.</p></div><span className={`maintenance-badge ${adminTestMode?'is-on':'is-off'}`}>{adminTestMode?'Ativado':'Desativado'}</span></div><div className="maintenance-footer"><span>{adminTestMode?'XP, níveis, conquistas e itens liberados.':'Ative para testar todas as personalizações e recompensas.'}</span><button className={`primary maintenance-toggle ${adminTestMode?'danger-action':''}`} onClick={toggleAdminTestMode}>{adminTestMode?'Restaurar progresso original':'Desbloquear tudo para testes'}</button></div></div>
        <div className="history-box maintenance-card"><div className="maintenance-heading"><span className="maintenance-symbol"><ShieldCheck size={20}/></span><div><h3>Disponibilidade do site</h3><p>Controle quando o Meu Financeiro ficará acessível aos usuários.</p></div><span className={`maintenance-badge ${maintenance?'is-on':'is-off'}`}>{maintenance?'Em manutenção':'Site liberado'}</span></div><label className="field-label" htmlFor="maintenance-message">Mensagem para os usuários</label><textarea id="maintenance-message" value={maintenanceMessage} maxLength={240} onChange={e=>setMaintenanceMessage(e.target.value)} placeholder="Ex.: Estamos realizando uma manutenção. Voltaremos em breve."/><div className="maintenance-footer"><span>{maintenanceMessage.length}/240 caracteres</span><button className={`primary maintenance-toggle ${maintenance?'danger-action':''}`} disabled={adminBusy} onClick={()=>adminAction('set_maintenance',null,{enabled:!maintenance,message:maintenanceMessage})}>{maintenance?'Desativar manutenção':'Ativar manutenção'}</button></div></div>
        {adminError&&<div className="error">{adminError}</div>}{adminMessage&&<div className="auth-notice">{adminMessage}</div>}
        {!adminUsers.length?<Empty icon={Users} title="Carregue as contas cadastradas" text="Toque em Atualizar contas para consultar os usuários do Supabase."/>:<div className="simple-list">{adminUsers.map(u=><div className="simple-row admin-user-row" key={u.id}><div className="row-icon"><Users size={18}/></div><div className="row-main"><b>{u.email||'Sem e-mail'}</b><span>{u.id} · Criada em {u.created_at?new Date(u.created_at).toLocaleDateString('pt-BR'):'—'}</span><span>{u.banned_until&&new Date(u.banned_until)>new Date()?'Bloqueada':'Ativa'} · Último acesso: {u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('pt-BR'):'Nunca'}</span></div><button className="delete-btn" disabled={adminBusy||u.email?.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction(u.banned_until&&new Date(u.banned_until)>new Date()?'unban_user':'ban_user',u.id)}>{u.banned_until&&new Date(u.banned_until)>new Date()?<><UserCheck size={15}/> Desbloquear</>:<><Ban size={15}/> Bloquear</>}</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('reset_password',u.id)}><KeyRound size={15}/> Redefinir senha</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('delete_user',u.id)}><X size={15}/> Excluir conta</button></div>)}</div>}
        <p className="muted">A exclusão de contas é definitiva e não pode ser desfeita. Por segurança, o painel nunca exibe senhas. A redefinição gera um link seguro do Supabase. A conta administradora não pode ser bloqueada por esta tela.</p>
      </section>}
      {page==='overview'&&<><section className="journey-banner"><div className="journey-copy"><span className="journey-kicker"><Zap size={13}/> SUA JORNADA FINANCEIRA</span><h2>Seu dinheiro. Seus planos. Sua evolução.</h2><p>Organize sua vida financeira, aprenda no seu ritmo e descubra novas oportunidades.</p><button className="journey-cta" onClick={()=>setPage('opportunities')}>Explorar oportunidades <ChevronRight size={16}/></button><div className="overview-player-progress"><span className="overview-player-icon"><Gamepad2 size={16}/></span><div className="overview-player-copy"><div><b>NÍVEL {Math.floor(gameXp/500)+1}</b><span>{gameXp} XP TOTAL</span></div><div className="overview-xp-track"><i style={{width:`${(gameXp%500)/500*100}%`}}/></div></div><small>{gameXp%500}/500 XP</small></div></div><div className="journey-art"><div className="journey-orbit"/><div className="journey-emblem"><Gamepad2 size={38}/></div><span className="journey-chip"><Star size={12}/> Evolua a cada passo</span></div></section><section className="overview-unified">
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
      </section></>}
      {page==='transactions'&&<><section className="panel"><div className="panel-head"><div><h3>Movimentações</h3><p>Entradas e gastos registrados</p></div></div><TransactionList items={data.transactions} onDelete={id=>deleteItem('transactions',id)}/></section><section className="panel"><div className="panel-head"><div><h3>Contas a pagar e dívidas</h3><p>Contas pendentes e compromissos fora dos cartões</p></div><button className="delete-btn" onClick={()=>setModal('debts')}><Plus size={15}/> Adicionar conta</button></div>{data.debts.length?<div className="simple-list">{data.debts.map(d=><div className="simple-row commitment-row" key={d.id}><div className="row-icon"><ReceiptText size={18}/></div><div className="row-main"><b>{d.title}</b><span>{d.is_continuous?'Conta contínua · mensal · sem vencimento':d.due_date?`Vence em ${new Date(d.due_date+'T12:00:00').toLocaleDateString('pt-BR')}`:'Sem vencimento informado'} · {d.is_continuous?(d.paid_month===currentMonthKey?'Paga neste mês':'Pendente neste mês'):d.status}</span></div><strong>{brl(d.amount)}</strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'debts',item:d})}>Editar</button><button className="delete-btn" onClick={async()=>{const isPaid=d.is_continuous?d.paid_month===currentMonthKey:d.status==='Pago';const next=isPaid?'Pendente':'Pago';const update=d.is_continuous?{paid_month:isPaid?null:currentMonthKey,status:next}:{status:next};const {error}=await supabase.from('debts').update(update).eq('id',d.id);if(error)notify('Não foi possível atualizar a conta.');else{await loadData();notify(next==='Pago'?'Conta marcada como paga neste mês.':'Conta reaberta.')}}}>{(d.is_continuous?d.paid_month===currentMonthKey:d.status==='Pago')?'Reabrir':'Marcar paga'}</button><button className="delete-btn" onClick={()=>deleteItem('debts',d.id)}>Excluir</button></div></div>)}</div>:<Empty icon={ReceiptText} title="Nenhuma conta cadastrada" text="Adicione contas e dívidas para acompanhar o que ainda precisa ser pago."/>}</section></>}
      {page==='cards'&&<><section className="panel"><div className="panel-head"><div><h3>Meus cartões</h3><p>Limite, utilização e valor disponível em cada cartão</p></div></div>{data.cards.length?<div className="item-grid">{data.cards.map(c=><div className="finance-item" key={c.id}><div className="item-top"><span className="panel-icon"><CreditCard size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>setModal({type:'cards',item:c})}>Editar cartão</button><button className="delete-btn" onClick={()=>deleteItem('cards',c.id)}>Excluir</button></div></div><h3>{c.name}</h3><div className="item-number">{brl(c.used)} <small>utilizados</small></div><div className="progress"><i style={{width:`${Math.min(100,Number(c.limit_amount)?Number(c.used)/Number(c.limit_amount)*100:0)}%`}}/></div><div className="item-meta"><span>Limite {brl(c.limit_amount)}</span><b>Disponível {brl(Number(c.limit_amount)-Number(c.used))}</b></div>{c.due_day&&<p className="muted">Vencimento: dia {c.due_day}</p>}{(()=>{const open=data.installments.filter(i=>i.card_id===c.id&&Number(i.paid_count||0)<Number(i.installment_count||0));const monthly=open.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);return <div className="goal-history"><b>Compromissos em aberto</b><span>{open.length} compra(s) parcelada(s) · {brl(monthly)}/mês</span></div>})()}<button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards,card_id:c.id})}><Plus size={15}/> Adicionar compromisso parcelado</button></div>)}</div>:<Empty icon={CreditCard} title="Nenhum cartão cadastrado" text="Adicione um cartão para acompanhar limite e uso."/>}{data.card_limit_history.length>0&&<div className="history-box"><h3>Histórico de alterações de limite</h3>{data.card_limit_history.slice(0,8).map(h=><div className="history-row" key={h.id}><span>{data.cards.find(c=>c.id===h.card_id)?.name||'Cartão'}</span><span>{brl(h.previous_limit)} → <b>{brl(h.new_limit)}</b></span><small>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</small></div>)}</div>}</section><section className="panel"><div className="panel-head"><div><h3>Parcelas e compromissos</h3><p>Compras parceladas vinculadas ou não a um cartão</p></div><button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards})}><Plus size={15}/> Adicionar parcela</button></div>{data.installments.length?<div className="simple-list">{data.installments.map(i=>{const monthly=Number(i.total_amount)/Math.max(1,Number(i.installment_count));const remaining=Number(i.installment_count)-Number(i.paid_count||0);const end=new Date(`${i.first_due_date}T12:00:00`);end.setMonth(end.getMonth()+Number(i.installment_count)-1);const card=data.cards.find(c=>c.id===i.card_id);return <div className="simple-row commitment-row" key={i.id}><div className="row-icon"><CalendarClock size={18}/></div><div className="row-main"><b>{i.description}</b><span>{card?card.name+' · ':''}{i.paid_count||0}/{i.installment_count} pagas · faltam {remaining} · termina em {end.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'})}</span><span>{brl(monthly)} por mês · primeira parcela {new Date(i.first_due_date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><strong style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,fontSize:'1.35rem',lineHeight:1.1}}><span>{brl(monthly)}</span><small style={{fontSize:'.72rem',fontWeight:700,opacity:.9}}>por parcela</small><small style={{fontSize:'.68rem',fontWeight:500,opacity:.65}}>Total: {brl(i.total_amount)}</small></strong><div className="row-actions"><button className="delete-btn" onClick={async()=>{const next=Math.min(Number(i.installment_count),Number(i.paid_count||0)+1);const {error}=await supabase.from('installments').update({paid_count:next}).eq('id',i.id);if(error)notify('Não foi possível atualizar as parcelas.');else{await loadData();notify('Parcela marcada como paga.')}}}>Pagar próxima</button><button className="delete-btn" onClick={()=>deleteItem('installments',i.id)}>Excluir</button></div></div>})}</div>:<Empty icon={CalendarClock} title="Nenhum compromisso parcelado" text="Adicione uma compra parcelada para acompanhar pagamentos e previsão de término."/>}</section><section className="panel"><div className="panel-head"><div><h3>Assinaturas</h3><p>Serviços recorrentes e próximas cobranças</p></div><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',cards:data.cards})}><Plus size={15}/> Adicionar assinatura</button></div><div className="subscription-summary"><div><span>Gasto mensal ativo</span><strong>{brl(subscriptionsMonthly)}</strong></div><small>{activeSubscriptions.length} assinatura(s) ativa(s) · valores anuais divididos por 12</small></div>{data.subscriptions.length?<div className="simple-list">{data.subscriptions.map(s=>{const card=data.cards.find(c=>c.id===s.card_id);const monthly=Number(s.amount||0)/(s.frequency==='anual'?12:1);return <div className="simple-row commitment-row" key={s.id}><div className="row-icon"><RefreshCw size={18}/></div><div className="row-main"><b>{s.name}</b><span>{s.frequency==='anual'?'Cobrança anual':'Cobrança mensal'} · {s.status}{card?' · '+card.name:''}</span><span>Próxima cobrança: {new Date(s.next_charge_date+'T12:00:00').toLocaleDateString('pt-BR')} · {brl(monthly)}/mês equivalente</span></div><strong>{brl(s.amount)}<small>{s.frequency==='anual'?' /ano':' /mês'}</small></strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',item:s,cards:data.cards})}>Editar</button>{s.status==='Ativa'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Cancelada'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível cancelar a assinatura.');else{await loadData();notify('Assinatura cancelada.')}}}>Cancelar</button>}{s.status==='Cancelada'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Ativa'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível reativar a assinatura.');else{await loadData();notify('Assinatura reativada.')}}}>Reativar</button>}<button className="delete-btn" onClick={()=>deleteItem('subscriptions',s.id)}>Excluir</button></div></div>})}</div>:<Empty icon={RefreshCw} title="Nenhuma assinatura cadastrada" text="Adicione serviços como streaming, academia ou aplicativos para acompanhar as cobranças recorrentes."/>}</section></>}
      
      
      {page==='planning'&&<section className="panel"><div className="panel-head"><div><h3>Minhas metas</h3><p>Acompanhe o progresso de cada objetivo</p></div></div>{data.goals.length?<div className="item-grid">{data.goals.map(g=>{const pct=Math.min(100,Number(g.target)?Number(g.saved)/Number(g.target)*100:0);return <div className="finance-item" key={g.id}><div className="item-top"><span className="panel-icon"><Target size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'deposito'})}}>Depositar</button><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'retirada'})}}>Retirar</button><button className="delete-btn" onClick={()=>deleteItem('goals',g.id)}>Excluir</button></div></div><h3>{g.name}</h3><div className="item-number">{brl(g.saved)} <small>de {brl(g.target)}</small></div><div className="progress goal-progress"><i style={{width:`${pct}%`}}/></div><div className="item-meta"><span>{pct.toFixed(0)}% concluído</span><b>Faltam {brl(Number(g.target)-Number(g.saved))}</b></div>{g.deadline&&<p className="muted">Prazo: {new Date(g.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</p>}{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).length>0&&<div className="goal-history"><b>Últimas movimentações</b>{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).map(m=><span key={m.id}>{m.movement_type==='deposito'?'+':'−'} {brl(m.amount)} · {new Date(m.created_at).toLocaleDateString('pt-BR')}</span>)}</div>}</div>})}</div>:<Empty icon={Target} title="Qual é o seu próximo objetivo?" text="Crie uma meta e acompanhe quanto falta para alcançá-la."/>}</section>}
      {page==='opportunities'&&<section className="opportunities-page gamer-world">
  <div className="games-welcome"><div><span>OPORTUNIDADES</span><h2>Ganhe além do seu controle financeiro</h2><p>Descubra campanhas, pesquisas e missões que poderão oferecer recompensas reais.</p></div><div className="games-welcome-xp"><Coins size={20}/><b>Saldo real</b><small>ÁREA EM PREPARAÇÃO</small></div></div>
  <div className="gamer-section-heading"><div><span>EM BREVE</span><h3>Oportunidades disponíveis</h3><p>Estamos preparando experiências com parceiros verificados.</p></div></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Coins size={27}/></div><div><b>Pesquisas remuneradas</b><p>Participe de pesquisas, compartilhe sua opinião e confira o valor e as regras antes de começar.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Gift size={27}/></div><div><b>Missões patrocinadas</b><p>Atividades propostas por marcas parceiras, com condições e recompensas explicadas com transparência.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="reward-hub"><div className="reward-hub-icon"><Sparkles size={27}/></div><div><b>Programa de indicação</b><p>Convide pessoas para conhecer o app e acompanhe futuras campanhas de indicação.</p></div><span className="reward-coming">EM BREVE</span></div>
  <div className="opportunity-safety"><ShieldCheck size={18}/><p><b>Segurança em primeiro lugar.</b> Não será necessário pagar para participar. Recompensas em dinheiro só serão ativadas com parceiros verificados, orçamento reservado, validação antifraude e regras adequadas à idade dos participantes.</p></div>
</section>}
{page==='games'&&<section className="opportunities-page gamer-world">
 <div className="games-welcome"><div><span>ARCADE · CENTRAL DE JOGOS</span><h2>{activeArcadeGame?'Área de jogo':'Biblioteca de jogos'}</h2><p>{activeArcadeGame?'Prepare-se para o desafio!':'Escolha um jogo e entre na diversão. Novos títulos serão adicionados aqui.'}</p></div><div className="games-welcome-xp"><Zap size={20}/><b>{gameXp} XP</b><small>NÍVEL {Math.floor(gameXp/500)+1}</small></div></div>
 {!activeArcadeGame?<><div className="arcade-library-heading"><div><span>SEUS JOGOS</span><h3>Todos os jogos</h3></div><small>3 DISPONÍVEIS · MAIS CHEGANDO</small></div>
 <div className="arcade-library-grid">
  <button className="arcade-library-card space-library-card" onClick={()=>setActiveArcadeGame('space')}><div className="arcade-library-art"><span>🚀</span><i>✦</i><b>SPACE</b></div><div className="arcade-library-info"><strong>SPACE NEXUS</strong><small>Ação · Espaço · Chefões</small><span className="arcade-library-play">JOGAR <ChevronRight size={15}/></span></div></button>
  <button className="arcade-library-card quiz-library-card" onClick={()=>setActiveArcadeGame('quiz')}><div className="arcade-library-art"><span>🧠</span><i>✦</i><b>QUIZ</b></div><div className="arcade-library-info"><strong>QUIZ FINANCEIRO</strong><small>Conhecimento · Estratégia</small><span className="arcade-library-play">JOGAR <ChevronRight size={15}/></span></div></button>
  <button className="arcade-library-card flap-library-card" onClick={()=>setActiveArcadeGame('flap')}><div className="arcade-library-art"><span>🐷</span><i>✦</i><b>ASAS</b></div><div className="arcade-library-info"><strong>ASAS DA FORTUNA</strong><small>Reflexos · Cofrinho voador</small><span className="arcade-library-play">JOGAR <ChevronRight size={15}/></span></div></button>
  {['DUNGEON RUSH','GEM MATCH','CORRIDA DO DINHEIRO','DEFESA DO COFRINHO'].map((name,i)=><div key={name} className="arcade-library-card arcade-coming-card"><div className="arcade-library-art"><span>{['⚔️','💎','🏎️','🏰'][i]}</span><b>EM BREVE</b></div><div className="arcade-library-info"><strong>{name}</strong><small>Um novo desafio está a caminho</small><span className="arcade-library-soon">EM DESENVOLVIMENTO</span></div></div>)}
 </div></>:<><button className="arcade-back-button" onClick={()=>setActiveArcadeGame(null)}><span>←</span> VOLTAR À BIBLIOTECA</button>
 {activeArcadeGame==='space'&&<><div className="gamer-section-heading"><div><span>PRIMEIRO LANÇAMENTO · SPACE NEXUS</span><h3>Defenda a galáxia</h3><p>Enfrente esquadrões alienígenas, mini-chefes e chefões que revidam.</p></div><div className="arcade-chip"><Gamepad2 size={14}/> AÇÃO ESPACIAL</div></div><SpaceNexusGame onReward={awardFlapXp}/></>}
 {activeArcadeGame==='quiz'&&<section className="quiz-game"><div className="quiz-hero"><div className="quiz-hero-top"><span className="quiz-kicker"><Brain size={15}/> CENTRAL DE CONHECIMENTO</span><span className="quiz-reward-pill"><Zap size={14}/> +5 XP por acerto</span></div><h2>Quiz Financeiro</h2><p>Aprenda a dominar seu dinheiro enquanto sobe de nível.</p></div>{!quizActive?<div className="quiz-start-panel"><div className="quiz-start-copy"><span className="quiz-start-eyebrow">{roundQuestions.length&&gameQuestionIndex>=roundQuestions.length-1&&!gameFeedback?'DESAFIO FINALIZADO':'NOVO DESAFIO DISPONÍVEL'}</span><h3>{roundQuestions.length&&gameQuestionIndex>=roundQuestions.length-1&&!gameFeedback?'Mandou bem! Vamos para mais uma?':'Está pronto para o desafio?'}</h3><p>{quizAvailable?'Responda 5 perguntas sobre orçamento, cartões, juros e segurança. Cada acerto vale experiência.':'Você já jogou recentemente. Uma nova rodada será liberada em breve.'}</p></div><div className="quiz-stats-grid"><div className="quiz-stat-card"><span><Trophy size={15}/></span><strong>{gameCorrect}</strong><small>ACERTOS</small></div><div className="quiz-stat-card"><span><Zap size={15}/></span><strong>{gameXp}</strong><small>XP TOTAL</small></div><div className="quiz-stat-card"><span><Target size={15}/></span><strong>5</strong><small>PERGUNTAS</small></div></div><button className="quiz-start-button" onClick={startQuiz} disabled={!quizAvailable}><span>{quizAvailable?'Começar desafio':'Aguarde para jogar'}</span><ChevronRight size={19}/></button><div className="quiz-start-footnote"><ShieldCheck size={14}/>{quizAvailable?'Escolha a melhor resposta e acumule XP.':'O intervalo evita repetir rodadas em sequência.'}</div></div>:<div className="quiz-question-panel"><div className="quiz-progress-line"><b>PERGUNTA {gameQuestionIndex+1} DE {roundQuestions.length}</b><span>{gameQuestionIndex+1}/{roundQuestions.length}</span></div><div className="flap-progress-track"><i style={{width:((gameQuestionIndex+1)/Math.max(1,roundQuestions.length)*100)+'%'}}/></div>{roundQuestions[gameQuestionIndex]&&<><span className="quiz-category">{roundQuestions[gameQuestionIndex].category}</span><h3>{roundQuestions[gameQuestionIndex].question}</h3><div className="quiz-answer-list">{roundQuestions[gameQuestionIndex].options.map((option,index)=><button key={index} className={'quiz-answer '+(gameAnswer===index?'selected':'')+(gameAnswer!==null&&index===roundQuestions[gameQuestionIndex].correct?' correct':'')+(gameAnswer===index&&index!==roundQuestions[gameQuestionIndex].correct?' incorrect':'')} disabled={gameAnswer!==null} onClick={()=>answerGame(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div>{gameFeedback&&<div className="quiz-feedback"><p>{gameFeedback}</p><button className="primary" onClick={nextGameQuestion}>{gameQuestionIndex===roundQuestions.length-1?'Concluir rodada':'Próxima pergunta'} <ChevronRight size={16}/></button></div>}</>}</div>}</section>}
 {activeArcadeGame==='flap'&&<FinanceFlapGame onReward={awardFlapXp}/>}
 </>}
</section>}
{page==='profile'&&<section className="opportunities-page gamer-world player-profile-page">
        <div className={`game-world-hero player-card-frame frame-${playerProfile.cardFrame||"cyan"} ${playerProfile.gems?.length===4?"frame-chromatic":""} ${gameXp>=4500?"level-legendary":gameXp>=2000?"level-elite":gameXp>=1000?"level-avatar":gameXp>=500?"level-neon":""}`}>
          <div className={`frame-gem-ornament ornament-${playerProfile.cardFrame||"cyan"}`} aria-hidden="true">{(playerProfile.gems||[]).map(id=><i key={id} className={`gemstone gem-${id}`}/>)}</div>
          <div className="game-world-top"><span className="world-label"><span className="live-pulse"/> CENTRAL DO JOGADOR</span><span className="season-pill">TEMPORADA 01 · SUA EVOLUÇÃO</span></div>
          <div className="player-identity"><div className={`player-avatar profile-big-avatar frame-${playerProfile.frame} ${(playerProfile.gems||[]).length===4?"frame-chromatic":""}`}><span>{playerProfile.avatar}</span><i><Zap size={12}/></i></div><div className="player-info"><span>{gameXp>=4500?"LENDÁRIO":gameXp>=2000?"ELITE":gameXp>=1000?"VETERANO":gameXp>=500?"EXPLORADOR":"JOGADOR"}</span><h2>{playerProfile.name||"Sua jornada começa aqui"}</h2><div className="player-level-line"><b>NÍVEL {Math.floor(gameXp/500)+1}</b><span>{gameXp%500}/500 XP para o próximo nível</span></div><div className="player-xp-track"><i style={{width:((gameXp%500)/500*100)+'%'}}/></div></div><div className="player-xp-total"><strong>{gameXp}</strong><small>XP TOTAL</small></div></div>
          <div className="world-stats"><div><Flame size={17}/><span><b>{gameCorrect}</b> desafios concluídos</span></div><div><Trophy size={17}/><span><b>{Math.floor(gameXp/500)}</b> níveis conquistados</span></div><div><Coins size={17}/><span><b>R$ 0,00</b> em recompensas reais</span></div></div>
        </div>
        
<div className="profile-editor panel"><div className="panel-head"><div><h3>Personalize seu jogador</h3><p>Seu nome, avatar e moldura aparecem no perfil.</p></div></div>
<label className="profile-name-field">Nome do jogador<input maxLength={24} value={playerProfile.name} onChange={e=>setPlayerProfile(p=>({...p,name:e.target.value}))} placeholder="Como quer ser chamado no jogo?"/></label>
<div className="profile-choice-group"><b>Avatar <small> · desbloqueie jogando</small></b><div className="profile-avatar-choices">{[{v:'👾',xp:0},{v:'🎮',xp:0},{v:'🦊',xp:100},{v:'🐱',xp:150},{v:'🐼',xp:250},{v:'🐸',xp:350},{v:'🐲',xp:500},{v:'🤖',xp:750},{v:'🦁',xp:1000},{v:'🐯',xp:1250},{v:'🐧',xp:1500},{v:'🐙',xp:2000}].map(a=><button key={a.v} disabled={gameXp<a.xp} title={gameXp<a.xp?'Desbloqueia com '+a.xp+' XP':'Avatar disponível'} className={(playerProfile.avatar===a.v?'selected ':'')+(gameXp<a.xp?'avatar-locked':'')} onClick={()=>setPlayerProfile(p=>({...p,avatar:a.v}))}><span>{gameXp>=a.xp?a.v:'🔒'}</span>{gameXp<a.xp&&<small>{a.xp} XP</small>}</button>)}</div></div>
<div className="profile-choice-group"><b>Molduras do avatar</b><div className="profile-frame-choices">{[{id:'violet',label:'Neon violeta',unlock:0},{id:'cyan',label:'Cyber ciano',unlock:150},{id:'gold',label:'Elite dourada',unlock:500},{id:'ruby',label:'Rubí arcano',unlock:1000},{id:'chrome',label:'Chrome cósmico',unlock:4500}].map(fr=><button key={fr.id} disabled={gameXp<fr.unlock} className={'profile-frame-option frame-'+fr.id+(playerProfile.frame===fr.id?' selected':'')} onClick={()=>setPlayerProfile(p=>({...p,frame:fr.id}))}><div className={'player-avatar frame-thumbnail-avatar frame-'+fr.id}><span>{playerProfile.avatar}</span></div><span>{fr.label}</span><small>{gameXp>=fr.unlock?'DESBLOQUEADA':fr.unlock+' XP'}</small></button>)}</div></div>
<div className="profile-choice-group"><b>Moldura da Central do Jogador</b><p className="muted">Personalize também o cartão grande do seu perfil.</p><div className="profile-frame-choices card-frame-previews">{[{id:'violet',label:'Portal violeta',unlock:0},{id:'cyan',label:'Circuito azul',unlock:250},{id:'gold',label:'Coroa dourada',unlock:750},{id:'ruby',label:'Rubí real',unlock:1500},{id:'chrome',label:'Chrome lendário',unlock:4500}].map(fr=><button key={fr.id} disabled={gameXp<fr.unlock} className={'profile-frame-option frame-'+fr.id+(playerProfile.cardFrame===fr.id?' selected':'')} onClick={()=>setPlayerProfile(p=>({...p,cardFrame:fr.id}))}><i/><span>{fr.label}</span><small>{gameXp>=fr.unlock?'DESBLOQUEADA':fr.unlock+' XP'}</small></button>)}{(playerProfile.gems||[]).length===4&&<div className="profile-frame-option frame-chromatic chromatic-frame-preview selected"><i/><span>Cromática</span><small>4 JOIAS · ATIVADA</small></div>}</div></div>
<div className="profile-choice-group gem-missions-group"><b>Missões de joias <small> · conquiste e equipe até 4 pedras</small></b><p className="muted">Cada desafio libera uma joia exclusiva. Quanto maior a dificuldade, mais rara a pedra.</p><div className="gem-mission-grid">{gemMissions.map(m=>{const equipped=(playerProfile.gems||[]).includes(m.id);return <article key={m.id} className={'gem-mission-card rarity-'+m.rarity+(m.done?' completed':'')}><div className="gem-mission-top"><span className={'mission-gem gem-'+m.id}>{m.symbol}</span><span className="gem-rarity">{m.rarityLabel}</span></div><b>{m.name}</b><p>{m.description}</p><div className="gem-mission-progress"><i style={{width:Math.min(100,m.progress/m.target*100)+'%'}}/></div><small>{m.done?'MISSÃO CONCLUÍDA':m.progress+'/'+m.target}</small><button disabled={!m.done||(!equipped&&(playerProfile.gems||[]).length>=4)} className={equipped?'equipped':''} onClick={()=>setPlayerProfile(p=>({...p,gems:equipped?(p.gems||[]).filter(x=>x!==m.id):[...(p.gems||[]),m.id]}))}>{equipped?'Equipado · remover':m.done?'Equipar joia':(playerProfile.gems||[]).length>=4?'4 espaços ocupados':'Bloqueada'}</button></article>})}</div><div className="gem-equipped-count"><span>JOIAS EQUIPADAS</span><b>{(playerProfile.gems||[]).length}/4</b>{(playerProfile.gems||[]).length===4&&<strong>✦ MOLDURA CROMÁTICA ATIVADA ✦</strong>}</div></div>
</div>
<div className="gamer-section-heading"><div><span>SEU PROGRESSO</span><h3>Conquistas</h3><p>Medalhas que você desbloqueou ao longo da jornada.</p></div></div>
        <div className="achievement-grid">
          <div className={'achievement-card '+(gameCorrect>=1?'unlocked':'')}><div><Trophy size={23}/></div><b>Primeira vitória</b><span>Acertar uma pergunta</span><small>{gameCorrect>=1?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameXp>=500?'unlocked':'')}><div><Zap size={23}/></div><b>Subindo de nível</b><span>Conquistar 100 XP</span><small>{gameXp>=500?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameCorrect>=5?'unlocked':'')}><div><Star size={23}/></div><b>Mente afiada</b><span>Acertar 5 perguntas</span><small>{gameCorrect>=5?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className="achievement-card locked"><div><Flame size={23}/></div><b>Constância</b><span>Manter uma sequência de 7 dias</span><small>EM BREVE</small></div>
        </div>
        
<div className="gamer-section-heading"><div><span>INVENTÁRIO</span><h3>Itens desbloqueáveis</h3><p>Continue evoluindo para liberar novas personalizações.</p></div></div>
<div className="level-reward-grid"><article className={'level-reward '+(gameXp>=500?'unlocked':'')}><span className="level-reward-icon"><Sparkles size={20}/></span><div><b>Moldura Cyber Ciano</b><small>NÍVEL 2 · Moldura de perfil</small></div><strong>{gameXp>=500?'LIBERADA':'500 XP'}</strong></article><article className={'level-reward '+(gameXp>=1000?'unlocked':'')}><span className="level-reward-icon"><Gamepad2 size={20}/></span><div><b>Avatar alternativo</b><small>NÍVEL 3 · Personalização</small></div><strong>{gameXp>=1000?'LIBERADO':'1.000 XP'}</strong></article><article className={'level-reward '+(gameXp>=2000?'unlocked':'')}><span className="level-reward-icon"><Trophy size={20}/></span><div><b>Moldura Elite</b><small>NÍVEL 5 · Moldura dourada</small></div><strong>{gameXp>=2000?'LIBERADA':'2.000 XP'}</strong></article><article className={'level-reward '+(gameXp>=4500?'unlocked':'')}><span className="level-reward-icon"><Star size={20}/></span><div><b>Moldura lendária</b><small>NÍVEL 10 · Moldura especial</small></div><strong>{gameXp>=4500?'LIBERADA':'4.500 XP'}</strong></article></div>
</section>}
{page==='notifications'&&<section className="panel"><div className="panel-head"><div><h3>Central de notificações</h3><p>{unreadCount?unreadCount+' não lida(s)':'Você está em dia.'}</p></div>{unreadCount>0&&<button className="text-button" onClick={markAllNotificationsRead}>Marcar todas como lidas</button>}</div>{data.notifications.length?<div className="simple-list">{data.notifications.map(n=><div className={'simple-row notification-row '+(n.is_read?'read':'')} key={n.id}><div className="row-icon"><Bell size={18}/></div><div className="row-main"><b>{n.title}</b><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString('pt-BR')} · {n.category}</small></div>{!n.is_read&&<button className="delete-btn" onClick={()=>markNotificationRead(n.id)}>Marcar lida</button>}<button className="delete-btn" onClick={()=>deleteItem('notifications',n.id)}>Excluir</button></div>)}</div>:<Empty icon={Bell} title="Nenhuma notificação por enquanto" text="Avisos sobre seus registros aparecerão aqui."/>}</section>}
      {page==='reports'&&<><div className="stat-grid"><Stat icon={ArrowDownLeft} label="Entradas registradas" value={brl(paidIn)} tone="green" detail="Todo o período"/><Stat icon={ArrowUpRight} label="Gastos registrados" value={brl(paidOut)} tone="red" detail="Todo o período"/><Stat icon={Wallet} label="Saldo calculado" value={brl(balance)} tone="blue" detail="Entradas menos gastos"/><Stat icon={Target} label="Falta para metas" value={brl(goalTotal)} tone="purple" detail="Total restante"/></div><div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Fluxo dos últimos meses</h3><p>Comparação mensal</p></div></div><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}><CartesianGrid stroke="#263044" strokeDasharray="4 4"/><XAxis dataKey="month" tick={{fill:'#8290a8',fontSize:11}}/><YAxis tick={{fill:'#8290a8',fontSize:10}}/><Tooltip formatter={v=>brl(v)}/><Area dataKey="Entradas" stroke="#35d39a" fill="#35d39a" fillOpacity={.12}/><Area dataKey="Gastos" stroke="#ff7085" fill="#ff7085" fillOpacity={.12}/></AreaChart></ResponsiveContainer></section><section className="panel"><div className="panel-head"><div><h3>Gastos por categoria</h3><p>Distribuição registrada</p></div></div>{categories.length?<div className="category-list">{categories.map(c=><div className="category-row" key={c.name}><span>{c.name}</span><b>{brl(c.value)}</b><div className="progress"><i style={{width:`${Math.min(100,c.value/Math.max(...categories.map(x=>x.value))*100)}%`}}/></div></div>)}</div>:<Empty icon={ChartNoAxesCombined} title="Sem dados suficientes" text="Registre despesas e escolha categorias para ver a análise."/ >}</section></div></>}
      <footer className="footer"><span>MEU FINANCEIRO <i>•</i> FEITO PARA SUA ROTINA</span><span><ShieldCheck size={14}/> Seus dados dependem da configuração segura da sua conta</span></footer>
    </div></main>
    {assistantOpen&&<div className="assistant-popover"><div className="assistant-popover-head"><div className="assistant-popover-title"><span className="assistant-popover-icon nexus-avatar"><Brain size={19}/><Sparkles size={11}/></span><div><b>NEXUS <em>AI</em></b><small><i/> NÚCLEO LOCAL · CÓDIGO PRÓPRIO</small></div></div><button className="icon-btn" onClick={()=>setAssistantOpen(false)} aria-label="Fechar assistente"><X size={18}/></button></div><div className="assistant-popover-messages">{assistantMessages.map((m,i)=><div className={'assistant-message '+m.role} key={i}><div className="assistant-bubble">{m.text}</div></div>)}{assistantBusy&&<div className="assistant-message assistant"><div className="assistant-bubble nexus-typing"><i/><i/><i/><span>NEXUS está pensando…</span></div></div>}{assistantError&&<div className="nexus-error" role="status">{assistantError}</div>}</div><div className="assistant-popover-suggestions"><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Como estão meus gastos?')}>Meus gastos</button><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Analise meus cartões')}>Meus cartões</button><button disabled={assistantBusy} onClick={()=>sendAssistantMessage('Quais dívidas devo priorizar?')}>Minhas dívidas</button></div><form className="assistant-popover-compose" onSubmit={e=>{e.preventDefault();sendAssistantMessage()}}><input value={assistantInput} onChange={e=>setAssistantInput(e.target.value)} placeholder="Converse com a NEXUS…" disabled={assistantBusy}/><button className="primary" type="submit" disabled={!assistantInput.trim()||assistantBusy} aria-label="Enviar">{assistantBusy?<span className="nexus-send-spinner"/>:<Send size={17}/>}</button></form><p className="assistant-popover-note">NEXUS AI · núcleo local executado no seu navegador. As mensagens da conversa são interpretadas pelo código do Meu Financeiro, sem envio para um modelo de IA externo.</p></div>}
    <button className={'assistant-fab '+(assistantOpen?'is-open':'')} onClick={()=>setAssistantOpen(v=>!v)} aria-label={assistantOpen?'Fechar assistente':'Abrir assistente'} title="Abrir NEXUS AI">{assistantOpen?<X size={23}/>:<><Gamepad2 size={25}/><span><Sparkles size={13}/></span></>}</button>
    {payModal&&<PayBillsModal debts={data.debts.filter(d=>d.is_continuous?d.paid_month!==currentMonthKey:d.status!=='Pago')} installments={data.installments.filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0))} onClose={()=>setPayModal(false)} onConfirm={confirmPayments} busy={payBusy}/>}
    {modal&&<EntryModal type={typeof modal==='string'?modal:modal.type} extra={typeof modal==='string'?(modal==='installments'?{cards:data.cards}:null):modal} onClose={()=>setModal(null)} onSave={saveItem} busy={busy}/>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
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
 const [f,setF]=useState({date:item?.date||today(),type:item?.type||'gasto',category:item?.category||'Alimentação',status:item?.status||'Pendente',is_continuous:!!item?.is_continuous,name:item?.name||'',description:item?.description||'',amount:item?.amount==null?'':String(item.amount),limit_amount:item?.limit_amount==null?'':String(item.limit_amount),used:item?.used==null?'0':String(item.used),due_day:item?.due_day==null?'':String(item.due_day),title:item?.title||'',due_date:item?.due_date||'',target:item?.target==null?'':String(item.target),saved:item?.saved==null?'0':String(item.saved),deadline:item?.deadline||'',installment_count:item?.installment_count==null?'2':String(item.installment_count),first_due_date:item?.first_due_date||today(),paid_count:item?.paid_count==null?'0':String(item.paid_count),note:item?.note||'',card_id:item?.card_id||extra?.card_id||'',frequency:item?.frequency||'mensal',next_charge_date:item?.next_charge_date||today(),subscriptionStatus:item?.status||'Ativa'});
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 const title={transactions:'Nova movimentação',cards:item?'Editar cartão':'Adicionar cartão',debts:item?'Editar conta ou dívida':'Nova conta ou dívida',goals:'Criar meta',installments:'Nova compra parcelada',subscriptions:item?'Editar assinatura':'Nova assinatura',goalMovement:extra?.movement_type==='retirada'?'Retirar dinheiro da meta':'Adicionar dinheiro à meta'}[type];
 async function submit(e){e.preventDefault();let table=type,values;
 if(type==='transactions')values={date:f.date,type:f.type,category:f.category,description:f.description,amount:Number(f.amount)};
 if(type==='cards')values={name:f.name,limit_amount:Number(f.limit_amount),used:Number(f.used||0),due_day:f.due_day?Number(f.due_day):null};
 if(type==='debts')values={title:f.title,amount:Number(f.amount),due_date:f.is_continuous?null:(f.due_date||null),status:f.status,is_continuous:f.is_continuous,paid_month:item?.paid_month||null};
 if(type==='goals')values={name:f.name,target:Number(f.target),saved:Number(f.saved||0),deadline:f.deadline||null};
 if(type==='installments')values={description:f.description,total_amount:Number(f.amount),installment_count:Number(f.installment_count),first_due_date:f.first_due_date,card_id:f.card_id||null,paid_count:Number(f.paid_count||0)};
 if(type==='subscriptions')values={name:f.name,amount:Number(f.amount),frequency:f.frequency,next_charge_date:f.next_charge_date,card_id:f.card_id||null,status:f.subscriptionStatus};
 if(type==='goalMovement')values={goal_id:extra.goal.id,movement_type:extra.movement_type,amount:Number(f.amount),note:f.note||null};
 await onSave(table,values,extra?.item||null);
 }
 return <div className="modal-backdrop" onClick={onClose}><form className="modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ORGANIZE SUAS FINANÇAS</div><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div>
 {type==='transactions'&&<><label>Tipo<select value={f.type} onChange={e=>set('type',e.target.value)}><option value="gasto">Gasto</option><option value="entrada">Entrada</option></select></label><label>Descrição<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: mercado, salário…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Data<input required type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></label></div><label>Categoria<select value={f.category} onChange={e=>set('category',e.target.value)}>{['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Compras','Salário','Freelance','Contas','Outros'].map(x=><option key={x}>{x}</option>)}</select></label></>}
 {type==='cards'&&<><label>Nome do cartão<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Cartão principal"/></label><div className="form-row"><label>Limite total (R$)<input required type="number" min="0" step=".01" value={f.limit_amount} onChange={e=>set('limit_amount',e.target.value)} placeholder="0,00"/></label><label>Valor utilizado (R$)<input required type="number" min="0" step=".01" value={f.used} onChange={e=>set('used',e.target.value)}/></label></div><label>Dia do vencimento (opcional)<input type="number" min="1" max="31" value={f.due_day} onChange={e=>set('due_day',e.target.value)} placeholder="Ex.: 10"/></label></>}
 {type==='debts'&&<><label>Nome da conta ou dívida<input required value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Ex.: conta de internet"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label>{!f.is_continuous&&<label>Vencimento<input type="date" value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></label>}</div><label className="check-row"><input type="checkbox" checked={f.is_continuous} onChange={e=>set('is_continuous',e.target.checked)}/> Conta contínua (repete todos os meses, sem vencimento)</label>{!f.is_continuous&&<label>Situação<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Pendente</option><option>Pago</option></select></label>}<p className="muted">{f.is_continuous?'Essa conta será considerada uma saída mensal. Ao marcar como paga, ela volta a ficar pendente no próximo mês.':'Cadastre uma conta única ou dívida com vencimento definido.'}</p></>}
 {type==='installments'&&<><label>O que foi comprado?<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: celular, televisão…"/></label><div className="form-row"><label>Valor total (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)}/></label><label>Quantidade de parcelas<input required type="number" min="2" max="120" value={f.installment_count} onChange={e=>set('installment_count',e.target.value)}/></label></div><label>Data de vencimento da 1ª parcela<input required type="date" value={f.first_due_date} onChange={e=>set('first_due_date',e.target.value)}/></label><label>Cartão (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">Valor aproximado por parcela: {brl(Number(f.amount||0)/Math.max(1,Number(f.installment_count||1)))}</p></>}
 {type==='subscriptions'&&<><label>Nome da assinatura<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Netflix, Spotify, academia…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Frequência<select value={f.frequency} onChange={e=>set('frequency',e.target.value)}><option value="mensal">Mensal</option><option value="anual">Anual</option></select></label></div><div className="form-row"><label>Próxima cobrança<input required type="date" value={f.next_charge_date} onChange={e=>set('next_charge_date',e.target.value)}/></label><label>Status<select value={f.subscriptionStatus} onChange={e=>set('subscriptionStatus',e.target.value)}><option>Ativa</option><option>Cancelada</option></select></label></div><label>Cartão utilizado (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">A assinatura continua sendo contabilizada até ser cancelada. Não será misturada às compras parceladas.</p></>}
 {type==='goalMovement'&&<><p className="muted">Meta: {extra?.goal?.name} · Saldo atual: {brl(extra?.goal?.saved)}</p><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Observação (opcional)<input value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Ex.: dinheiro separado do salário"/></label></>}
 {type==='goals'&&<><label>Nome da meta<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: reserva de emergência"/></label><div className="form-row"><label>Quanto quero juntar (R$)<input required type="number" min=".01" step=".01" value={f.target} onChange={e=>set('target',e.target.value)} placeholder="1000,00"/></label><label>Já tenho (R$)<input type="number" min="0" step=".01" value={f.saved} onChange={e=>set('saved',e.target.value)}/></label></div><label>Prazo (opcional)<input type="date" value={f.deadline} onChange={e=>set('deadline',e.target.value)}/></label></>}
 <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}><Plus size={17}/>{busy?'Salvando…':'Salvar registro'}</button></div></form></div>
}


function ShipArtwork(){return <svg className="space-art-ship" viewBox="0 0 120 144" role="img" aria-label="Caça espacial azul"><defs><linearGradient id="shipMetal" x1="0" x2="1"><stop stopColor="#15345d"/><stop offset=".22" stopColor="#8cecff"/><stop offset=".48" stopColor="#f5ffff"/><stop offset=".7" stopColor="#55bce8"/><stop offset="1" stopColor="#10284e"/></linearGradient><linearGradient id="shipWing" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eaffff"/><stop offset=".3" stopColor="#38bfe9"/><stop offset=".72" stopColor="#17609e"/><stop offset="1" stopColor="#0b1d42"/></linearGradient><linearGradient id="shipGlass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".25" stopColor="#8fffff"/><stop offset=".65" stopColor="#1377bd"/><stop offset="1" stopColor="#071b43"/></linearGradient><linearGradient id="shipFire" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff"/><stop offset=".25" stopColor="#7fffff"/><stop offset=".65" stopColor="#238dff" stopOpacity=".8"/><stop offset="1" stopColor="#287cff" stopOpacity="0"/></linearGradient></defs><ellipse cx="60" cy="125" rx="25" ry="13" fill="#27dfff" opacity=".18"/><path d="M35 102 L20 136 L48 124 L60 140 L72 124 L100 136 L85 102Z" fill="url(#shipFire)" opacity=".95"/><path d="M14 73 L2 110 L37 99 L48 76Z" fill="url(#shipWing)" stroke="#bafaff" strokeWidth="2"/><path d="M106 73 L118 110 L83 99 L72 76Z" fill="url(#shipWing)" stroke="#bafaff" strokeWidth="2"/><path d="M22 84 L10 105 L37 96 M98 84 L110 105 L83 96" fill="none" stroke="#e2ffff" strokeWidth="2" opacity=".8"/><path d="M39 24 L60 4 L81 24 L92 91 L72 116 L60 126 L48 116 L28 91Z" fill="url(#shipMetal)" stroke="#e5ffff" strokeWidth="2.4"/><path d="M60 7 L60 119 M42 37 L28 91 M78 37 L92 91" stroke="#f4ffff" strokeWidth="1.5" opacity=".65"/><path d="M48 31 Q60 15 72 31 L75 62 Q60 76 45 62Z" fill="url(#shipGlass)" stroke="#d8ffff" strokeWidth="2"/><path d="M52 35 Q60 25 68 35" stroke="#fff" strokeWidth="2" fill="none" opacity=".85"/><path d="M35 78 L49 85 L44 103 L27 96Z M85 78 L71 85 L76 103 L93 96Z" fill="#153e70" stroke="#7cecff" strokeWidth="1.5"/><circle cx="60" cy="88" r="8" fill="#f5ffff" stroke="#72f5ff" strokeWidth="3"/><circle cx="60" cy="88" r="15" fill="#45dfff" opacity=".2"/><path d="M20 78 L35 70 L39 78 L25 88Z M100 78 L85 70 L81 78 L95 88Z" fill="#f2ffff" stroke="#5ddfff" strokeWidth="1.5"/><path d="M43 108 L49 130 L56 119 L53 106 M77 108 L71 130 L64 119 L67 106" fill="#d9ffff" stroke="#4acfff" strokeWidth="1.5"/><path d="M15 109 L27 105 M105 109 L93 105" stroke="#fff" strokeWidth="2"/></svg>}
function EnemyArtwork({type}){if(type==='scout')return <svg className="space-art-enemy scout-art" viewBox="0 0 112 86" role="img" aria-label="Inimigo batedor"><defs><linearGradient id="scoutMetal" x2="1" y2="1"><stop stopColor="#efffff"/><stop offset=".4" stopColor="#40d9ee"/><stop offset="1" stopColor="#10417e"/></linearGradient></defs><path d="M45 24 L4 5 L18 42 L4 68 L48 57Z M67 24 L108 5 L94 42 L108 68 L64 57Z" fill="url(#scoutMetal)" stroke="#c4ffff" strokeWidth="2"/><path d="M56 4 L78 38 L69 73 L56 82 L43 73 L34 38Z" fill="url(#scoutMetal)" stroke="#eaffff" strokeWidth="2"/><path d="M56 13 L56 66 M43 39 L69 39" stroke="#fff" strokeWidth="2" opacity=".65"/><path d="M43 35 L52 29 L52 46 L42 50Z M69 35 L60 29 L60 46 L70 50Z" fill="#092c62"/><circle cx="56" cy="52" r="7" fill="#fff" stroke="#72ffff" strokeWidth="3"/><path d="M18 42 L38 46 M94 42 L74 46" stroke="#fff" strokeWidth="2"/><path d="M48 74 L56 85 L64 74" fill="#baffff"/></svg>;if(type==='brute')return <svg className="space-art-enemy brute-art" viewBox="0 0 120 94" role="img" aria-label="Inimigo blindado"><defs><linearGradient id="bruteArmor" x2="1" y2="1"><stop stopColor="#fff0d1"/><stop offset=".25" stopColor="#ff987f"/><stop offset=".65" stopColor="#b82c61"/><stop offset="1" stopColor="#3a123e"/></linearGradient></defs><path d="M38 27 L5 10 L12 53 L32 72 L46 60Z M82 27 L115 10 L108 53 L88 72 L74 60Z" fill="url(#bruteArmor)" stroke="#ffd5bd" strokeWidth="3"/><path d="M60 4 L87 17 L103 43 L91 77 L60 91 L29 77 L17 43 L33 17Z" fill="url(#bruteArmor)" stroke="#ffe1c7" strokeWidth="3"/><path d="M60 7 L60 82 M29 25 L45 40 L37 67 M91 25 L75 40 L83 67" stroke="#ffe8d5" strokeWidth="2" opacity=".65"/><path d="M34 23 L49 16 L55 39 L42 49Z M86 23 L71 16 L65 39 L78 49Z" fill="#70204e" stroke="#ffc6b2" strokeWidth="2"/><path d="M43 48 L77 48 L83 66 L60 79 L37 66Z" fill="#45133e" stroke="#ffb0a4" strokeWidth="2"/><circle cx="60" cy="58" r="10" fill="#fff2dc" stroke="#ff9b78" strokeWidth="4"/><circle cx="60" cy="58" r="18" fill="#ff3f70" opacity=".2"/><path d="M17 53 L5 72 M103 53 L115 72" stroke="#ffe0d0" strokeWidth="4"/></svg>;return <svg className="space-art-enemy drone-art" viewBox="0 0 112 86" role="img" aria-label="Drone alienígena"><defs><linearGradient id="droneArmor" x2="1" y2="1"><stop stopColor="#ffeaff"/><stop offset=".3" stopColor="#d17af0"/><stop offset=".7" stopColor="#7130b5"/><stop offset="1" stopColor="#24104e"/></linearGradient></defs><path d="M42 29 L4 12 L13 57 L40 68 L50 51Z M70 29 L108 12 L99 57 L72 68 L62 51Z" fill="url(#droneArmor)" stroke="#f6caff" strokeWidth="2"/><path d="M56 5 L78 22 L88 48 L73 73 L56 82 L39 73 L24 48 L34 22Z" fill="url(#droneArmor)" stroke="#ffe5ff" strokeWidth="2.5"/><path d="M56 8 L56 73 M34 26 L47 42 M78 26 L65 42" stroke="#fff" strokeWidth="2" opacity=".6"/><path d="M36 36 L50 31 L49 48 L35 48Z M76 36 L62 31 L63 48 L77 48Z" fill="#32105e" stroke="#f6b8ff" strokeWidth="1.5"/><ellipse cx="42" cy="41" rx="4" ry="6" fill="#fff" filter="url(#none)"/><ellipse cx="70" cy="41" rx="4" ry="6" fill="#fff"/><path d="M45 59 Q56 67 67 59" fill="none" stroke="#fff" strokeWidth="3"/><circle cx="56" cy="60" r="7" fill="#fff" stroke="#f59cff" strokeWidth="3"/><path d="M39 73 L33 84 M73 73 L79 84" stroke="#ffbaff" strokeWidth="4" strokeLinecap="round"/></svg>}
function BossArtwork(){return <svg className="space-art-boss" viewBox="0 0 260 150" role="img" aria-label="Chefão Titã Nebular"><defs><linearGradient id="bossArmor" x2="1" y2="1"><stop stopColor="#fff1d8"/><stop offset=".2" stopColor="#ff9eb6"/><stop offset=".55" stopColor="#d22e70"/><stop offset="1" stopColor="#381044"/></linearGradient><linearGradient id="bossWing" x2="1" y2="1"><stop stopColor="#ffe1e8"/><stop offset=".4" stopColor="#e64d87"/><stop offset="1" stopColor="#4a124f"/></linearGradient></defs><path d="M97 44 L12 8 L28 70 L4 116 L91 99 L112 73Z M163 44 L248 8 L232 70 L256 116 L169 99 L148 73Z" fill="url(#bossWing)" stroke="#ffd2df" strokeWidth="3"/><path d="M91 41 L48 27 L68 53 L34 78 L91 82 M169 41 L212 27 L192 53 L226 78 L169 82" fill="none" stroke="#fff0f5" strokeWidth="3" opacity=".7"/><path d="M130 6 L176 28 L205 67 L190 116 L130 143 L70 116 L55 67 L84 28Z" fill="url(#bossArmor)" stroke="#ffe5ed" strokeWidth="3"/><path d="M130 9 L130 132 M79 42 L104 65 L92 104 M181 42 L156 65 L168 104" stroke="#fff0f4" strokeWidth="2" opacity=".7"/><path d="M94 37 L120 24 L126 58 L105 71Z M166 37 L140 24 L134 58 L155 71Z" fill="#67194e" stroke="#ffc1d3" strokeWidth="2"/><path d="M91 77 L169 77 L180 104 L130 128 L80 104Z" fill="#541348" stroke="#ffbdd1" strokeWidth="3"/><path d="M110 48 L150 48 L160 72 L130 91 L100 72Z" fill="#260d3d" stroke="#ffd9e7" strokeWidth="3"/><circle cx="130" cy="69" r="17" fill="#fff1f5" stroke="#ff9fbe" strokeWidth="6"/><circle cx="130" cy="69" r="29" fill="#ff367d" opacity=".2"/><path d="M30 82 L8 91 L18 111 L48 103 M230 82 L252 91 L242 111 L212 103" fill="#681847" stroke="#ffbad0" strokeWidth="3"/><path d="M54 124 L40 145 M206 124 L220 145" stroke="#ff759f" strokeWidth="6" strokeLinecap="round"/><path d="M102 114 L90 145 L119 130 M158 114 L170 145 L141 130" fill="#ff759f" opacity=".8"/></svg>}

function SpaceNexusGame({onReward}){
 const [running,setRunning]=useState(false),[ended,setEnded]=useState(false),[score,setScore]=useState(0),[lives,setLives]=useState(3),[ship,setShip]=useState({x:50,y:84}),[shots,setShots]=useState([]),[foes,setFoes]=useState([]),[enemyShots,setEnemyShots]=useState([]),[drops,setDrops]=useState([]),[boss,setBoss]=useState(null),[wave,setWave]=useState(1),[best,setBest]=useState(()=>Number(localStorage.getItem('mf_space_best')||0)),[message,setMessage]=useState('A galáxia precisa de você!'),[shieldActive,setShieldActive]=useState(false);
 const game=React.useRef({tick:0,ship:{x:50,y:84},score:0,lives:3,wave:1,shots:[],foes:[],enemyShots:[],drops:[],boss:null,shield:false,rapidUntil:0,doubleUntil:0});
 const moveTo=(clientX,clientY,arena)=>{const r=arena.getBoundingClientRect();const x=Math.max(5,Math.min(95,(clientX-r.left)/r.width*100));const y=Math.max(9,Math.min(91,(clientY-r.top)/r.height*100));game.current.ship={x,y};setShip({x,y})};
 const start=()=>{game.current={tick:0,ship:{x:50,y:84},score:0,lives:3,wave:1,shots:[],foes:[],enemyShots:[],drops:[],boss:null,shield:false,rapidUntil:0,doubleUntil:0};setScore(0);setLives(3);setShip({x:50,y:84});setShots([]);setFoes([]);setEnemyShots([]);setDrops([]);setBoss(null);setWave(1);setShieldActive(false);setEnded(false);setMessage('O esquadrão alienígena está chegando!');setRunning(true)};
 useEffect(()=>{
  if(!running)return;
  const id=setInterval(()=>{
   const g=game.current;g.tick++;
   const n=g.tick;
   if(n%(n<g.rapidUntil?9:19)===0){g.shots.push({id:n+'p',x:g.ship.x,y:g.ship.y-7});if(n<g.doubleUntil){g.shots.push({id:n+'pl',x:g.ship.x-2.5,y:g.ship.y-7},{id:n+'pr',x:g.ship.x+2.5,y:g.ship.y-7})}}
   // Limita inimigos simultâneos para reduzir carga de colisão e renderização.
   if(!g.boss&&n%68===0&&g.foes.length<5)g.foes.push({id:n+'e',x:12+Math.random()*76,y:4,hp:n%195===0?3:1,type:n%156===0?'brute':n%146===0?'scout':'drone',fire:n%65===0||Math.random()>.48});
   if(n%675===0){g.wave++;setWave(g.wave);setMessage('ONDA '+g.wave+' — novos invasores detectados!')}
   g.foes.forEach(f=>{f.y+=((f.type==='scout'?.35:.2167)+(g.wave*.0267))*.8});
   g.shots.forEach(b=>{b.y-=1.0664});
   g.enemyShots.forEach(b=>{b.y+=.58664});g.drops.forEach(d=>{d.y+=.176});
   // Sem disparos de inimigos comuns durante a batalha de chefão.
   if(!g.boss&&n%98===0){g.foes.filter(f=>f.fire).slice(-1).forEach(f=>g.enemyShots.push({id:'m'+n+f.id,x:f.x,y:f.y+3,kind:'minion'}))}
   if(g.boss&&n%82===0){const spread=g.boss.style==='spread'?[0,-12,12]:g.boss.style==='cross'?[0,-15,15]:[0,-9,9];spread.forEach((dx,i)=>g.enemyShots.push({id:'b'+n+i,x:Math.max(3,Math.min(97,g.boss.x+dx)),y:g.boss.y+8,kind:'boss'}));if(g.enemyShots.length>18)g.enemyShots=g.enemyShots.slice(-18)}
   if(n%1350===0&&!g.boss){const bosses=[{name:'DEVORADOR ESTELAR',style:'spread'},{name:'GENERAL VORTEX',style:'cross'},{name:'TITÃ NEBULAR',style:'spread'}];const chosen=bosses[(Math.floor(n/360)-1)%bosses.length];g.foes=[];g.enemyShots=[];g.boss={hp:12+g.wave*3,max:12+g.wave*3,x:50,y:9,direction:1,...chosen};setMessage('CHEFÃO DETECTADO! Arena de chefão iniciada!')}
   if(g.boss){g.boss.x+=g.boss.direction*.34;if(g.boss.x>=77){g.boss.x=77;g.boss.direction=-1}else if(g.boss.x<=23){g.boss.x=23;g.boss.direction=1}}
   // Colisão tiro da nave x inimigo: só remove o projétil quando realmente acerta.
   const remainingShots=[];
   for(const shot of g.shots){
    let hit=false;
    for(const foe of g.foes){
     const hitX=Math.abs(shot.x-foe.x)<(foe.type==='brute'?7:5.5);
     const hitY=shot.y>=foe.y-4&&shot.y<=foe.y+5;
     if(hitX&&hitY){foe.hp-=1;hit=true;if(foe.hp<=0){g.score+=foe.type==='brute'?35:foe.type==='scout'?20:10;if(Math.random()<.24){const types=['shield','rapid','double','repair'];const type=types[Math.floor(Math.random()*types.length)];g.drops.push({id:'drop-'+n+'-'+foe.id,type,x:foe.x,y:foe.y})}}break;}
    }
    if(!hit&&g.boss&&Math.abs(shot.x-g.boss.x)<18&&shot.y>=g.boss.y-3&&shot.y<=g.boss.y+17){g.boss.hp--;hit=true;if(g.boss.hp<=0){g.score+=250;g.drops.push({id:'boss-drop-'+n,type:['shield','rapid','double','repair'][Math.floor(Math.random()*4)],x:g.boss.x,y:g.boss.y});g.boss=null;g.enemyShots=g.enemyShots.filter(s=>s.kind!=='boss');setMessage('CHEFÃO DERROTADO! +250 pontos — recompensa liberada!')}else if(g.boss.hp===Math.ceil(g.boss.max*.5))setMessage('FASE 2! O chefão ficou mais agressivo!')}
    if(!hit&&shot.y>0)remainingShots.push(shot);
   }
   g.shots=remainingShots;g.foes=g.foes.filter(f=>f.hp>0&&f.y<96);
   const remainingDrops=[];for(const d of g.drops){if(Math.abs(d.x-g.ship.x)<7&&Math.abs(d.y-g.ship.y)<8){if(d.type==='shield'){g.shield=true;setShieldActive(true);setMessage('ESCUDO COLETADO! O próximo impacto será bloqueado.')}else if(d.type==='rapid'){g.rapidUntil=n+375;setMessage('DISPARO RÁPIDO! Poder ativo por 6 segundos.')}else if(d.type==='double'){g.doubleUntil=n+375;setMessage('TIRO DUPLO! Poder ativo por 6 segundos.')}else if(d.type==='repair'){g.lives=Math.min(3,g.lives+1);setLives(g.lives);setMessage('REPARO COLETADO! +1 vida.')}}else if(d.y<100)remainingDrops.push(d)}g.drops=remainingDrops;
   let tookHit=false;
   const enemyRemaining=[];
   for(const shot of g.enemyShots){if(Math.abs(shot.x-g.ship.x)<6&&Math.abs(shot.y-g.ship.y)<7){tookHit=true}else if(shot.y<100)enemyRemaining.push(shot)}
   g.enemyShots=enemyRemaining;
   const foeRemaining=[];
   for(const foe of g.foes){if(Math.abs(foe.x-g.ship.x)<7&&Math.abs(foe.y-g.ship.y)<6){tookHit=true}else foeRemaining.push(foe)}
   g.foes=foeRemaining;
   if(tookHit){if(g.shield){g.shield=false;setShieldActive(false);setMessage('Escudo absorveu o impacto!')}else{g.lives=Math.max(0,g.lives-1);setMessage('A nave foi atingida! Desvie dos disparos!')}}
   // Mantém a simulação e colisões em 60 FPS, mas atualiza o React a cada 2 ciclos.
   // Isso reduz pela metade as reconciliações do DOM sem alterar a velocidade da partida.
   if(n%2===0||g.lives<=0){setScore(g.score);setLives(g.lives);setShots([...g.shots]);setFoes([...g.foes]);setEnemyShots([...g.enemyShots]);setDrops([...g.drops]);setBoss(g.boss?{...g.boss}:null);}
   if(g.lives<=0){setRunning(false);setEnded(true);setMessage('Sua nave foi destruída. A galáxia ainda precisa de você!');setBest(old=>{const value=Math.max(old,g.score);localStorage.setItem('mf_space_best',String(value));return value});onReward(Math.floor(g.score/25))}
  },16);
  return()=>clearInterval(id);
 },[running,onReward]);
 return <section className="space-nexus-card">
  <div className="space-nexus-hud"><div className="space-hud-block"><small>SETOR ATUAL</small><span className="space-wave-pill"><i/> ONDA {wave}</span></div><div className="space-score-block"><small>PONTUAÇÃO</small><b>{score.toLocaleString('pt-BR')}</b></div><div className="space-lives-block"><small>INTEGRIDADE</small><span>{'❤️'.repeat(lives)}{'🖤'.repeat(3-lives)}</span></div></div>
  <div className="space-nexus-arena" onPointerDown={e=>{if(!running)return;e.currentTarget.setPointerCapture?.(e.pointerId);moveTo(e.clientX,e.clientY,e.currentTarget)}} onPointerMove={e=>{if(!running)return;if(e.pointerType==='touch'||(e.buttons&1))moveTo(e.clientX,e.clientY,e.currentTarget)}}>
   <div className="space-stars"/><div className="space-nebula"/>
   {foes.map(f=><div key={f.id} className={'space-enemy '+f.type} style={{left:f.x+'%',top:f.y+'%'}}><EnemyArtwork type={f.type}/></div>)}
   {enemyShots.map(b=><i key={b.id} className={'space-enemy-shot '+(b.kind==='boss'?'boss-shot':'')} style={{left:b.x+'%',top:b.y+'%'}}/>)}
   {drops.map(d=><div key={d.id} className={'space-drop space-drop-'+d.type} style={{left:d.x+'%',top:d.y+'%'}}><span>{d.type==='shield'?'S':d.type==='rapid'?'R':d.type==='double'?'×2':'+'}</span></div>)}
   {shots.map(b=><i key={b.id} className="space-player-shot" style={{left:b.x+'%',top:b.y+'%'}}/>)}
   {boss&&<div className={'space-boss '+(boss.hp<=boss.max*.5?'phase-two':'')} style={{left:boss.x+'%',top:boss.y+'%'}}><BossArtwork/><b>{boss.name}</b><small>{boss.hp<=boss.max*.5?'FASE 2 · FÚRIA MÁXIMA':'FASE 1'}</small><i><em style={{width:(boss.hp/boss.max*100)+'%'}}/></i></div>}
   <div className={'space-player-ship '+(shieldActive?'shielded':'')} style={{left:ship.x+'%',top:ship.y+'%'}}><ShipArtwork/></div>
   {!running&&<div className="space-overlay"><div className="space-overlay-icon"><span className="space-overlay-orbit"/></div><h3>{ended?'MISSÃO ENCERRADA':'SPACE NEXUS'}</h3><p>{ended?'Pontuação: '+score+' · Recorde: '+best:message}</p><button className="primary" onClick={start}>{ended?'Jogar novamente':'Iniciar missão'} <ChevronRight size={17}/></button></div>}
  </div>
  <div className="space-nexus-controls"><span>ARRASTE A NAVE E COLETE AS RECOMPENSAS</span></div>
  <div className="space-nexus-footer"><span>Recorde: {best}</span><span>Disparo automático</span><span>Escudo: {shieldActive?'ativo':'aguardando coleta'}</span><span>Chefões com evolução de combate</span></div>
 </section>
}
function FinanceFlapGame({onReward}){
 const modes=[{id:'normal',name:'Normal',speed:2,desc:'Um desafio equilibrado'},{id:'medium',name:'Médio',speed:3,desc:'Exige reflexos e precisão'},{id:'hard',name:'Difícil',speed:4,desc:'Para quem domina o voo'}];
 const [mode,setMode]=useState(null),[bestScore,setBestScore]=useState(()=>Number(window.localStorage.getItem('mf_flap_best')||0));
 const [infiniteBest,setInfiniteBest]=useState(()=>Number(window.localStorage.getItem('mf_flap_best_infinite')||0));
 const canvasRef=React.useRef(null),stateRef=React.useRef({pigY:190,velocity:0,obstacles:[],items:[],frame:0,score:0,rewarded:false,spawnTimer:0,shield:0,slow:0});
 const [status,setStatus]=useState('choose'),[score,setScore]=useState(0);
 function begin(){const s=stateRef.current;s.pigY=190;s.velocity=0;s.obstacles=[{x:360,gapY:145,passed:false}];s.items=[];s.shield=0;s.slow=0;s.frame=0;s.spawnTimer=0;s.score=0;s.rewarded=false;setScore(0);setStatus('playing')}
 function flap(){if(status==='ready'||status==='over'||status==='won'){begin();return}if(status==='playing')stateRef.current.velocity=-6.2}
 function backToModes(){setStatus('choose');setMode(null)}
 useEffect(()=>{if(status!=='playing'||!mode)return;const canvas=canvasRef.current,ctx=canvas?.getContext('2d');if(!ctx)return;let raf,lastFrame=0;const W=320,H=420;
 const roundRect=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
 const drawPig=(y,velocity,frame)=>{
  ctx.save();ctx.translate(67,y);ctx.rotate(Math.max(-.38,Math.min(.62,velocity*.045)));
  // asas pequenas do mascote
  const wingBeat=Math.sin(frame*.24)*3;
  ctx.fillStyle='#f4a9c5';ctx.strokeStyle='#b95785';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-15,5+wingBeat,10,6,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  // orelhas
  ctx.fillStyle='#f49abb';ctx.strokeStyle='#b95785';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-9,-12,6,10,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(8,-13,6,10,.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  // corpo de porquinho-cofrinho
  const body=ctx.createRadialGradient(-5,-8,2,0,0,23);body.addColorStop(0,'#ffd9e7');body.addColorStop(.58,'#f58fb5');body.addColorStop(1,'#c94f83');
  ctx.shadowColor='#ff8fbd';ctx.shadowBlur=17;ctx.fillStyle=body;ctx.strokeStyle='#a83f70';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,20,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  // pezinho
  ctx.fillStyle='#d95f91';ctx.beginPath();ctx.ellipse(-8,14,5,4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(8,14,5,4,0,0,Math.PI*2);ctx.fill();
  // focinho em destaque
  const snout=ctx.createLinearGradient(10,-2,24,10);snout.addColorStop(0,'#ffc2d7');snout.addColorStop(1,'#ed79a4');ctx.fillStyle=snout;ctx.strokeStyle='#b95785';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(17,3,8,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#9e426d';ctx.beginPath();ctx.ellipse(15,3,1.5,2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(20,3,1.5,2,0,0,Math.PI*2);ctx.fill();
  // olho expressivo e brilho
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(7,-6,4.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29304f';ctx.beginPath();ctx.arc(8,-6,2.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(8.7,-7,0.8,0,Math.PI*2);ctx.fill();
  // bochecha
  ctx.fillStyle='#ffb1ca';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(10,5,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // fenda da moeda no topo
  ctx.strokeStyle='#8c3d69';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,-16);ctx.lineTo(5,-16);ctx.stroke();
  // medalhinha de moeda
  ctx.fillStyle='#ffd66f';ctx.strokeStyle='#a9792c';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(-13,-14,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#8a6427';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('$',-13,-12);
  ctx.restore();
 };
 const loop=(timestamp)=>{if(!lastFrame)lastFrame=timestamp;const elapsed=timestamp-lastFrame;if(elapsed<1000/60){raf=requestAnimationFrame(loop);return}lastFrame=timestamp-(elapsed%(1000/60));const s=stateRef.current;s.frame++;s.velocity+=.34;s.pigY+=s.velocity;
  const multiplier=mode.id==='infinite'?Math.min(10,2+s.score*.08):mode.speed;const speed=2.8*multiplier;const spawnEvery=Math.max(30,Math.round(150/multiplier));
  s.spawnTimer++;if(s.spawnTimer>=spawnEvery){s.spawnTimer=0;const gapY=105+Math.random()*150;s.obstacles.push({x:W+10,gapY,passed:false});if(Math.random()<.14){const types=['coin','shield','slow'];const type=types[Math.floor(Math.random()*types.length)];s.items.push({x:W+34,y:gapY,type,taken:false,pulse:Math.random()*6})}}
  const currentSpeed=s.slow>0?speed*.62:speed;if(s.slow>0)s.slow--;s.obstacles.forEach(o=>{o.x-=currentSpeed;if(!o.passed&&o.x+48<67){o.passed=true;s.score++;setScore(s.score)}});s.obstacles=s.obstacles.filter(o=>o.x>-55);s.items.forEach(item=>{item.x-=currentSpeed;item.pulse+=.12;if(!item.taken&&Math.hypot(item.x-67,item.y-s.pigY)<25){item.taken=true;if(item.type==='coin'){s.score+=3;setScore(s.score)}else if(item.type==='shield')s.shield=1;else if(item.type==='slow')s.slow=240}});s.items=s.items.filter(item=>item.x>-30&&!item.taken);
  let hit=s.pigY<13||s.pigY>H-25;s.obstacles.forEach(o=>{const overlap=67+16>o.x&&67-16<o.x+48;if(overlap&&(s.pigY-14<o.gapY-68||s.pigY+14>o.gapY+68))hit=true});if(hit&&s.shield>0){s.shield=0;hit=false;s.velocity=-4}
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#15234a');bg.addColorStop(.55,'#101b39');bg.addColorStop(1,'#091327');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // céu em camadas, estrelas cintilantes e partículas de profundidade
  const glow=ctx.createRadialGradient(245,82,8,245,82,190);glow.addColorStop(0,'#6256a855');glow.addColorStop(1,'#6256a800');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  for(let i=0;i<34;i++){const x=(i*47+s.frame*(speed*.09*(i%2?1:.45)))%W,y=(i*73)%H;const twinkle=.55+Math.sin(s.frame*.07+i)*.35;ctx.globalAlpha=twinkle;ctx.fillStyle=i%3===0?'#d6caff':'#9deaff';ctx.beginPath();ctx.arc(x,y,i%5===0?1.8:1,0,Math.PI*2);ctx.fill();if(i%8===0){ctx.strokeStyle='#d6caff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke()}}ctx.globalAlpha=1;
  ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#8e9eff';for(let i=0;i<4;i++){const x=(i*105-s.frame*.25+W*2)%W;ctx.beginPath();ctx.ellipse(x,75+i*87,34,9,0,0,Math.PI*2);ctx.fill()}ctx.restore();
  // cofres dourados com moldura, rebites e placas ornamentais — versão corrigida
  s.obstacles.forEach(o=>{
    const drawVault=(x,y,h,top)=>{
      if(h<=0)return;
      ctx.save();
      ctx.shadowColor='#f6bf5b55';ctx.shadowBlur=10;
      const g=ctx.createLinearGradient(x,0,x+48,0);
      g.addColorStop(0,'#684326');g.addColorStop(.18,'#b87935');g.addColorStop(.38,'#f4cf79');g.addColorStop(.62,'#d99b45');g.addColorStop(.84,'#f6d98c');g.addColorStop(1,'#684326');
      ctx.fillStyle=g;roundRect(x,y,48,h,7);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle='#ffe7ad';ctx.lineWidth=1.6;ctx.stroke();
      ctx.strokeStyle='#8d5b2c';ctx.lineWidth=1;roundRect(x+5,y+5,38,Math.max(0,h-10),4);if(h>12)ctx.stroke();
      ctx.fillStyle='#8b5b2e';
      for(let yy=y+13;yy<y+h-7;yy+=30){ctx.beginPath();ctx.arc(x+7,yy,1.7,0,Math.PI*2);ctx.arc(x+41,yy,1.7,0,Math.PI*2);ctx.fill()}
      if(h>36){
        ctx.fillStyle='#9b672e';ctx.globalAlpha=.72;
        for(let yy=y+23;yy<y+h-12;yy+=38){ctx.beginPath();ctx.arc(x+24,yy,7,0,Math.PI*2);ctx.fill()}
        ctx.globalAlpha=1;ctx.fillStyle='#ffdf87';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('✦',x+24,Math.min(y+h-8,y+27));
      }
      ctx.fillStyle='#ffdf87';roundRect(x-4,top?y+h-14:y,56,14,4);ctx.fill();
      ctx.strokeStyle='#a87332';ctx.stroke();ctx.fillStyle='#fff0bd';ctx.fillRect(x+5,top?y+h-11:y+3,2,5);
      ctx.restore();
    };
    drawVault(o.x,0,o.gapY-68,true);
    drawVault(o.x,o.gapY+68,H-o.gapY-68,false);
  });
  // Itens especiais flutuando entre os cofres
  s.items.forEach(item=>{const bob=Math.sin(item.pulse)*4;ctx.save();ctx.shadowBlur=13;ctx.shadowColor=item.type==='coin'?'#ffd76a':item.type==='shield'?'#62d9ff':'#b69aff';ctx.fillStyle=item.type==='coin'?'#f6c957':item.type==='shield'?'#39bde9':'#9a78ed';ctx.beginPath();ctx.arc(item.x,item.y+bob,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff4';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#18213b';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.type==='coin'?'+':item.type==='shield'?'S':'↘',item.x,item.y+bob);ctx.restore()});
  // rastro de brilho do porquinho
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#ff9fc6';ctx.beginPath();ctx.ellipse(38,s.pigY+5,12,4,-.15,0,Math.PI*2);ctx.fill();ctx.restore();drawPig(s.pigY,s.velocity,s.frame);
  if(s.shield>0){ctx.save();ctx.strokeStyle='#70ddff';ctx.lineWidth=3;ctx.shadowColor='#58d9ff';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(67,s.pigY,27,0,Math.PI*2);ctx.stroke();ctx.restore()}if(s.slow>0){ctx.fillStyle='#c8b5ff';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('TEMPO LENTO',10,18)}ctx.fillStyle='#fff';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(String(s.score),W/2,39);ctx.fillStyle='#c5b8ff';ctx.font='bold 9px sans-serif';ctx.fillText(mode.id==='infinite'?'MODO INFINITO · x'+multiplier.toFixed(1):mode.name.toUpperCase()+' · x'+multiplier,W/2,56);
  if(mode.id!=='infinite'&&s.score>=100){s.rewarded=true;setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});onReward(s.score);setStatus('won');return}
  if(hit){setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});if(mode.id==='infinite')setInfiniteBest(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best_infinite',String(value));return value});if(!s.rewarded){s.rewarded=true;onReward(s.score)}setStatus('over');return}
  raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[status,mode]);
 return <div className="flap-game">
 {status==='choose'?<div className="flap-mode-select"><div className="flap-mode-heading"><b>ESCOLHA SEU MODO</b><span>Supere os obstáculos e leve o Cofrinho Voador até 100 pontos</span></div><div className="flap-mode-grid">{modes.map(item=><button key={item.id} className={'flap-mode-card mode-'+item.id} onClick={()=>{setMode(item);setStatus('ready')}}><span className="flap-mode-icon">{item.id==='infinite'?'∞':item.id==='easy'?'🪽':item.id==='normal'?'⚡':item.id==='medium'?'🎯':'🔥'}</span><strong>{item.name}</strong><small>{item.id==='infinite'?'Recorde: '+infiniteBest+' pontos':'Velocidade: '+item.speed+'x'}</small><em>{item.desc}</em>{item.id!=='infinite'&&<span className="flap-mode-reward">🏆 Complete 100 pontos</span>}</button>)}</div></div>:<>
 <div className="flap-mode-top"><button className="text-button" onClick={backToModes}>← Modos</button><b>{mode?.name} {mode?.id==='infinite'?'∞':'· '+mode?.speed+'x'}</b><span>{mode?.id==='infinite'?'Recorde: '+infiniteBest:'Meta: 100 pontos'}</span></div>
 <div className="flap-game-stage"><canvas ref={canvasRef} width="320" height="420" onPointerDown={flap} aria-label="Asas da Fortuna: toque para fazer o porquinho-cofrinho voar."/>
 {status!=='playing'&&<div className="flap-overlay"><b>{status==='ready'?'Prepare o voo!':status==='won'?'COFRINHO LENDÁRIO! 🏆':'Ops! O porquinho bateu!'}</b><span>{status==='ready'?'Toque para começar e mantenha o porquinho no ar.':status==='won'?'Você alcançou 100 pontos e completou o desafio!':'Pontuação: '+score+' · Toque para tentar novamente.'}</span>{status==='won'?<button className="primary" onClick={backToModes}>Escolher outro modo <ChevronRight size={16}/></button>:<button className="primary" onClick={begin}>{status==='ready'?'Começar voo':'Tentar novamente'} <ChevronRight size={16}/></button>}</div>}
 </div>
 <div className="flap-game-info"><span><Zap size={15}/> 1 ponto por obstáculo · 2 XP por ponto</span><b>{score}{mode?.id==='infinite'?' pontos':' / 100'}</b></div>
 <div className="flap-progress-track"><i style={{width:(mode?.id==='infinite'?Math.min(100,score):Math.min(100,score))+'%'}}/></div>
 <div className="flap-best-score"><Trophy size={14}/> {mode?.id==='infinite'?'Recorde infinito: '+infiniteBest:'Melhor pontuação: '+bestScore}</div>
 </>}
 </div>
}

function SetupScreen(){return <div className="setup-shell"><div className="setup-card"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Vamos conectar seu espaço privado</h1><p>O visual do site está pronto. Para ativar o login e salvar seus dados com segurança, configure seu projeto Supabase e as variáveis de ambiente.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL do projeto e a chave pública (anon/publishable) para um arquivo <code>.env</code>.</li><li>Ative o cadastro por e-mail em Authentication → Sign In / Providers. Assim, as pessoas poderão criar uma conta pela tela inicial.</li><li>Reinicie o site.</li></ol><div className="setup-warning"><ShieldCheck size={18}/><span>Nunca coloque a chave <b>service_role</b> no site. Use apenas a chave pública e mantenha o Row Level Security (RLS) ativo.</span></div></div></div>}
export default App;