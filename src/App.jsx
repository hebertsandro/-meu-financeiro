import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './supabase';
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
  ['Relatórios',ChartNoAxesCombined,'reports'],['Oportunidades',Gamepad2,'opportunities']
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

function answerFinancialQuestion(question, finance) {
 const q=question.toLowerCase(), money=brl, tx=finance.transactions||[], now=new Date();
 const key=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
 const mt=tx.filter(t=>String(t.date||'').slice(0,7)===key);
 const inc=mt.filter(t=>t.type==='entrada').reduce((s,t)=>s+Number(t.amount||0),0);
 const out=mt.filter(t=>t.type==='gasto').reduce((s,t)=>s+Number(t.amount||0),0);
 const allIn=tx.filter(t=>t.type==='entrada').reduce((s,t)=>s+Number(t.amount||0),0);
 const allOut=tx.filter(t=>t.type==='gasto').reduce((s,t)=>s+Number(t.amount||0),0);
 const debts=(finance.debts||[]).filter(d=>d.status!=='Pago'), debt=debts.reduce((s,d)=>s+Number(d.amount||0),0);
 const cards=finance.cards||[], limit=cards.reduce((s,c)=>s+Number(c.limit_amount||0),0), used=cards.reduce((s,c)=>s+Number(c.used||0),0);
 const parts=(finance.installments||[]).filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0));
 const monthly=parts.reduce((s,i)=>s+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);
 const goals=finance.goals||[];
 const cats=mt.filter(t=>t.type==='gasto').reduce((a,t)=>{const k=t.category||'Outros';a[k]=(a[k]||0)+Number(t.amount||0);return a;},{});
 const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
 if(/saldo|sobrou|disponível|disponivel|quanto tenho/.test(q)) return 'Seu saldo registrado no período completo é '+money(allIn-allOut)+'. Neste mês, entraram '+money(inc)+' e saíram '+money(out)+'. Considero somente os registros cadastrados no site.';
 if(/gasto|despesa|categoria|economizar|economia/.test(q)) return 'Neste mês você registrou '+money(out)+' em gastos e '+money(inc)+' em entradas.'+(top?' Sua categoria com maior gasto é '+top[0]+' ('+money(top[1])+').':'')+(inc>0?' Isso representa '+(out/inc*100).toFixed(0)+'% das entradas.':' Ainda não há entradas registradas para comparar.')+(inc>0&&out/inc>.8?' Atenção: mais de 80% das entradas já foram comprometidas.':'');
 if(/cartão|cartões|cartao|cartoes|limite|crédito|credito|fatura/.test(q)) return cards.length?'Você tem '+cards.length+' cartão(ões), limite total de '+money(limit)+', uso registrado de '+money(used)+' e disponível estimado de '+money(limit-used)+'. Confira os valores com o aplicativo do banco.':'Você ainda não cadastrou cartões.';
 if(/dívida|divida|conta|vencimento/.test(q)) return debts.length?'Você tem '+debts.length+' conta(s) pendente(s), somando '+money(debt)+'. Priorize as essenciais e as que vencem primeiro.':'Não há contas em aberto cadastradas no momento.';
 if(/parcela|prestação|prestacao/.test(q)) return parts.length?'Há '+parts.length+' compra(s) parcelada(s) em andamento, com cerca de '+money(monthly)+' por mês em parcelas. É uma estimativa com base nos valores cadastrados.':'Não encontrei compras parceladas em aberto.';
 if(/meta|objetivo|guardar|juntar|poupar/.test(q)) return goals.length?'Suas metas: '+goals.map(g=>g.name+': '+money(g.saved)+' de '+money(g.target)+'; faltam '+money(Math.max(0,Number(g.target)-Number(g.saved||0)))).join(' | '):'Você ainda não criou metas. Cadastre um objetivo para eu acompanhar seu progresso.';
 return 'Resumo dos seus registros: neste mês entraram '+money(inc)+' e saíram '+money(out)+'. Saldo total registrado: '+money(allIn-allOut)+'. '+(debt?'Contas pendentes: '+money(debt)+'. ':'')+(monthly?'Parcelas estimadas por mês: '+money(monthly)+'. ':'')+'Pergunte sobre saldo, gastos, cartões, dívidas, parcelas ou metas.';
}
function App(){
  const [session,setSession]=useState(null), [loading,setLoading]=useState(true);
  const [page,setPage]=useState('overview'), [mobileMenu,setMobileMenu]=useState(false);
  const [data,setData]=useState({transactions:[],cards:[],debts:[],goals:[],installments:[],subscriptions:[],card_limit_history:[],goal_movements:[],notifications:[]});
  const [modal,setModal]=useState(null), [toast,setToast]=useState('');
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authError,setAuthError]=useState(''), [authMode,setAuthMode]=useState('login'), [authNotice,setAuthNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [adminUsers,setAdminUsers]=useState([]),[adminBusy,setAdminBusy]=useState(false),[adminError,setAdminError]=useState(''),[adminMessage,setAdminMessage]=useState(''),[maintenance,setMaintenance]=useState(false),[maintenanceMessage,setMaintenanceMessage]=useState('Estamos realizando uma manutenção. Voltaremos em breve.');
  const [maintenanceCheckDone,setMaintenanceCheckDone]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [assistantInput,setAssistantInput]=useState('');
  const [gameQuestionIndex,setGameQuestionIndex]=useState(0),[gameAnswer,setGameAnswer]=useState(null),[gameFeedback,setGameFeedback]=useState(''),[gameXp,setGameXp]=useState(()=>Number(window.localStorage.getItem('mf_game_xp')||0)),[gameCorrect,setGameCorrect]=useState(()=>Number(window.localStorage.getItem('mf_game_correct')||0));
  const [quizLastPlayed,setQuizLastPlayed]=useState(()=>Number(window.localStorage.getItem('mf_quiz_last')||0)),[quizClock,setQuizClock]=useState(Date.now()),[quizActive,setQuizActive]=useState(false),[roundQuestions,setRoundQuestions]=useState([]);
  const [dailyGameXp,setDailyGameXp]=useState(()=>{const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');return saved.day===new Date().toLocaleDateString('en-CA')?Number(saved.xp||0):0});
  const [assistantMessages,setAssistantMessages]=useState([{role:'assistant',text:'Oi! Posso analisar seus gastos, cartões, dívidas, parcelas e metas usando os dados cadastrados neste site. O que você quer entender?'}]);
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
    if(error){notify(item?'Não foi possível atualizar. Confira os dados e tente novamente.':'Não foi possível salvar. Confira se o banco foi configurado.');return false}
    await loadData();setModal(null);notify(item?'Atualizado com sucesso!':'Salvo com sucesso!');const messages={transactions:values.type==='entrada'?['Entrada registrada',(values.description||'Sua entrada')+': '+brl(values.amount)+' registrada.','entradas']:['Gasto registrado',(values.description||'Novo gasto')+': '+brl(values.amount)+' registrado.','gastos'],debts:['Conta adicionada',values.title+': '+brl(values.amount)+' cadastrada.','contas'],installments:['Compra parcelada adicionada',values.description+': '+values.installment_count+' parcelas de aproximadamente '+brl(Number(values.total_amount)/Number(values.installment_count))+'.','parcelas'],subscriptions:['Assinatura adicionada',values.name+': '+brl(values.amount)+' cadastrada.','assinaturas'],goals:['Nova meta criada','A meta '+values.name+' foi adicionada.','metas']};if(messages[table]&&!item)await addNotification(...messages[table]);return true;
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
  function awardFlapXp(score){const day=new Date().toLocaleDateString('en-CA');const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');const used=saved.day===day?Number(saved.xp||0):0;const reward=Math.min(Math.max(0,score)*5,Math.max(0,30-used));if(reward>0){const total=used+reward;window.localStorage.setItem('mf_flap_daily',JSON.stringify({day,xp:total}));setDailyGameXp(total);setGameXp(v=>v+reward);notify('Mandou bem! +'+reward+' XP no Flappy Financeiro.')}else notify('Limite diário de XP do Flappy atingido. Volte amanhã!')}

  function sendAssistantMessage(value=assistantInput){const question=value.trim();if(!question)return;const reply=answerFinancialQuestion(question,data);setAssistantMessages(old=>[...old,{role:'user',text:question},{role:'assistant',text:reply}]);setAssistantInput('');}

  const currentMonth=monthStart();
  const income=data.transactions.filter(t=>t.type==='entrada'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const expenses=data.transactions.filter(t=>t.type==='gasto'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const paidIn=data.transactions.filter(t=>t.type==='entrada').reduce((a,t)=>a+Number(t.amount),0);
  const paidOut=data.transactions.filter(t=>t.type==='gasto').reduce((a,t)=>a+Number(t.amount),0);
  const balance=paidIn-paidOut;
  const openDebts=data.debts.filter(d=>d.status!=='Pago').reduce((a,d)=>a+Number(d.amount),0);
  const cardUsed=data.cards.reduce((a,c)=>a+Number(c.used||0),0);
  const goalTotal=data.goals.reduce((a,g)=>a+Math.max(0,Number(g.target)-Number(g.saved)),0);
  const activeInstallments=data.installments.filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0));
  const openInstallmentCount=activeInstallments.reduce((sum,i)=>sum+Math.max(0,Number(i.installment_count||0)-Number(i.paid_count||0)),0);
  const installmentMonthly=activeInstallments.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);
  const installmentRemaining=activeInstallments.reduce((sum,i)=>sum+(Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)))*Math.max(0,Number(i.installment_count||0)-Number(i.paid_count||0)),0);
  const cardLimit=data.cards.reduce((sum,c)=>sum+Number(c.limit_amount||0),0);
  const cardAvailable=Math.max(0,cardLimit-cardUsed);
  const pendingDebtCount=data.debts.filter(d=>d.status!=='Pago').length;
  const goalSaved=data.goals.reduce((sum,g)=>sum+Number(g.saved||0),0);
  const activeSubscriptions=data.subscriptions.filter(s=>s.status==='Ativa');
  const subscriptionsMonthly=activeSubscriptions.reduce((sum,s)=>sum+Number(s.amount||0)/(s.frequency==='anual'?12:1),0);
  const chartData=useMemo(()=>{
    const months=[];
    for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=d.toISOString().slice(0,7);
      const tx=data.transactions.filter(t=>String(t.date).slice(0,7)===key);
      months.push({month:d.toLocaleDateString('pt-BR',{month:'short'}),Entradas:tx.filter(t=>t.type==='entrada').reduce((a,t)=>a+Number(t.amount),0),Gastos:tx.filter(t=>t.type==='gasto').reduce((a,t)=>a+Number(t.amount),0)});
    }return months;
  },[data.transactions]);
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
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><div className="crumb">Meu espaço <ChevronRight size={14}/><b>{[...menu,...(isAdmin?[['Painel ADM',ShieldCheck,'admin']]:[])].find(x=>x[2]===page)?.[0]|| (page==='notifications'?'Notificações':'Visão geral')}</b></div><div className="top-actions"><button className="xp-header-chip" aria-label={`Jogador nível ${Math.floor(gameXp/500)+1}, ${gameXp} XP. Abrir oportunidades`} onClick={()=>setPage("opportunities")}><Zap size={15}/><span><b>{gameXp} XP</b><small>NÍVEL {Math.floor(gameXp/500)+1}</small></span></button><button className="notification-bell" aria-label="Abrir notificações" onClick={()=>setPage("notifications")}><Bell size={18}/>{unreadCount>0&&<i>{unreadCount>9?"9+":unreadCount}</i>}</button><span className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span><div className="avatar">EU</div></div></header>
    <div className="content">
      <div className="page-heading"><div><div className="eyebrow">SEU DINHEIRO, MAIS CLARO</div><h1>{page==='overview'?'Visão geral':page==='admin'?'Painel administrativo':page==='notifications'?'Notificações':menu.find(x=>x[2]===page)?.[0]}</h1><p>{page==='admin'?'Gerencie contas com acesso administrativo protegido no servidor.':page==='overview'?'Aqui está um resumo da sua vida financeira.':page==='transactions'?'Entradas, gastos e contas a pagar em um só lugar.':page==='cards'?'Cartões, limites, faturas e compromissos futuros.':page==='planning'?'Metas e organização dos seus próximos passos.':page==='opportunities'?'Jogos educativos, desafios e oportunidades de renda.':'Entenda seus hábitos financeiros.'}</p></div>{['transactions','cards','planning'].includes(page)&&<button className="primary" onClick={()=>setModal(page==='planning'?'goals':page)}><Plus size={18}/>{page==='cards'?' Adicionar cartão':page==='planning'?' Nova meta':' Nova movimentação'}</button>}</div>

      {page==='admin'&&isAdmin&&<section className="panel admin-panel">
        <div className="panel-head"><div><h3>Administração de contas</h3><p>Área exclusiva do administrador · ações verificadas pela Edge Function</p></div><div className="item-actions"><button className="delete-btn" disabled={adminBusy} onClick={()=>adminAction('get_maintenance')}>Consultar manutenção</button><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_users')}><RefreshCw size={16}/> Atualizar contas</button></div></div>
        <div className="stat-grid"><Stat icon={Users} label="Contas carregadas" value={String(adminUsers.length)} tone="blue" detail="Lista retornada pelo Supabase Auth"/><Stat icon={ShieldCheck} label="Acesso" value="Protegido" tone="green" detail="Validação também no servidor"/></div>
        <div className="history-box maintenance-card"><div className="maintenance-heading"><span className="maintenance-symbol"><ShieldCheck size={20}/></span><div><h3>Disponibilidade do site</h3><p>Controle quando o Meu Financeiro ficará acessível aos usuários.</p></div><span className={`maintenance-badge ${maintenance?'is-on':'is-off'}`}>{maintenance?'Em manutenção':'Site liberado'}</span></div><label className="field-label" htmlFor="maintenance-message">Mensagem para os usuários</label><textarea id="maintenance-message" value={maintenanceMessage} maxLength={240} onChange={e=>setMaintenanceMessage(e.target.value)} placeholder="Ex.: Estamos realizando uma manutenção. Voltaremos em breve."/><div className="maintenance-footer"><span>{maintenanceMessage.length}/240 caracteres</span><button className={`primary maintenance-toggle ${maintenance?'danger-action':''}`} disabled={adminBusy} onClick={()=>adminAction('set_maintenance',null,{enabled:!maintenance,message:maintenanceMessage})}>{maintenance?'Desativar manutenção':'Ativar manutenção'}</button></div></div>
        {adminError&&<div className="error">{adminError}</div>}{adminMessage&&<div className="auth-notice">{adminMessage}</div>}
        {!adminUsers.length?<Empty icon={Users} title="Carregue as contas cadastradas" text="Toque em Atualizar contas para consultar os usuários do Supabase."/>:<div className="simple-list">{adminUsers.map(u=><div className="simple-row admin-user-row" key={u.id}><div className="row-icon"><Users size={18}/></div><div className="row-main"><b>{u.email||'Sem e-mail'}</b><span>{u.id} · Criada em {u.created_at?new Date(u.created_at).toLocaleDateString('pt-BR'):'—'}</span><span>{u.banned_until&&new Date(u.banned_until)>new Date()?'Bloqueada':'Ativa'} · Último acesso: {u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('pt-BR'):'Nunca'}</span></div><button className="delete-btn" disabled={adminBusy||u.email?.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction(u.banned_until&&new Date(u.banned_until)>new Date()?'unban_user':'ban_user',u.id)}>{u.banned_until&&new Date(u.banned_until)>new Date()?<><UserCheck size={15}/> Desbloquear</>:<><Ban size={15}/> Bloquear</>}</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('reset_password',u.id)}><KeyRound size={15}/> Redefinir senha</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('delete_user',u.id)}><X size={15}/> Excluir conta</button></div>)}</div>}
        <p className="muted">A exclusão de contas é definitiva e não pode ser desfeita. Por segurança, o painel nunca exibe senhas. A redefinição gera um link seguro do Supabase. A conta administradora não pode ser bloqueada por esta tela.</p>
      </section>}
      {page==='overview'&&<><section className="journey-banner"><div className="journey-copy"><span className="journey-kicker"><Zap size={13}/> SUA JORNADA FINANCEIRA</span><h2>Seu dinheiro. Seus planos. Sua evolução.</h2><p>Organize sua vida financeira, aprenda no seu ritmo e descubra novas oportunidades.</p><button className="journey-cta" onClick={()=>setPage('opportunities')}>Explorar oportunidades <ChevronRight size={16}/></button><div className="overview-player-progress"><span className="overview-player-icon"><Gamepad2 size={16}/></span><div className="overview-player-copy"><div><b>NÍVEL {Math.floor(gameXp/500)+1}</b><span>{gameXp} XP TOTAL</span></div><div className="overview-xp-track"><i style={{width:`${(gameXp%500)/500*100}%`}}/></div></div><small>{gameXp%500}/500 XP</small></div></div><div className="journey-art"><div className="journey-orbit"/><div className="journey-emblem"><Gamepad2 size={38}/></div><span className="journey-chip"><Star size={12}/> Evolua a cada passo</span></div></section><section className="overview-unified">
        <div className="unified-balance">
          <div className="unified-balance-top"><span><Wallet size={16}/> RESUMO FINANCEIRO</span><span className="unified-live-dot">ATUALIZADO</span></div>
          <small>Saldo registrado</small>
          <strong>{brl(balance)}</strong>
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
        <div className="unified-footer">
          <span>Seu panorama financeiro em um só lugar</span>
          <button onClick={()=>setModal('transactions')}><Plus size={16}/> Nova movimentação</button>
        </div>
      </section></>}
      {page==='transactions'&&<><section className="panel"><div className="panel-head"><div><h3>Movimentações</h3><p>Entradas e gastos registrados</p></div></div><TransactionList items={data.transactions} onDelete={id=>deleteItem('transactions',id)}/></section><section className="panel"><div className="panel-head"><div><h3>Contas a pagar e dívidas</h3><p>Contas pendentes e compromissos fora dos cartões</p></div><button className="delete-btn" onClick={()=>setModal('debts')}><Plus size={15}/> Adicionar conta</button></div>{data.debts.length?<div className="simple-list">{data.debts.map(d=><div className="simple-row commitment-row" key={d.id}><div className="row-icon"><ReceiptText size={18}/></div><div className="row-main"><b>{d.title}</b><span>{d.due_date?`Vence em ${new Date(d.due_date+'T12:00:00').toLocaleDateString('pt-BR')}`:'Sem vencimento informado'} · {d.status}</span></div><strong>{brl(d.amount)}</strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'debts',item:d})}>Editar</button><button className="delete-btn" onClick={async()=>{const next=d.status==='Pago'?'Pendente':'Pago';const {error}=await supabase.from('debts').update({status:next}).eq('id',d.id);if(error)notify('Não foi possível atualizar a conta.');else{await loadData();notify(next==='Pago'?'Conta marcada como paga.':'Conta reaberta.')}}}>{d.status==='Pago'?'Reabrir':'Marcar paga'}</button><button className="delete-btn" onClick={()=>deleteItem('debts',d.id)}>Excluir</button></div></div>)}</div>:<Empty icon={ReceiptText} title="Nenhuma conta cadastrada" text="Adicione contas e dívidas para acompanhar o que ainda precisa ser pago."/>}</section></>}
      {page==='cards'&&<><section className="panel"><div className="panel-head"><div><h3>Meus cartões</h3><p>Limite, utilização e valor disponível em cada cartão</p></div></div>{data.cards.length?<div className="item-grid">{data.cards.map(c=><div className="finance-item" key={c.id}><div className="item-top"><span className="panel-icon"><CreditCard size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>setModal({type:'cards',item:c})}>Editar cartão</button><button className="delete-btn" onClick={()=>deleteItem('cards',c.id)}>Excluir</button></div></div><h3>{c.name}</h3><div className="item-number">{brl(c.used)} <small>utilizados</small></div><div className="progress"><i style={{width:`${Math.min(100,Number(c.limit_amount)?Number(c.used)/Number(c.limit_amount)*100:0)}%`}}/></div><div className="item-meta"><span>Limite {brl(c.limit_amount)}</span><b>Disponível {brl(Number(c.limit_amount)-Number(c.used))}</b></div>{c.due_day&&<p className="muted">Vencimento: dia {c.due_day}</p>}{(()=>{const open=data.installments.filter(i=>i.card_id===c.id&&Number(i.paid_count||0)<Number(i.installment_count||0));const monthly=open.reduce((sum,i)=>sum+Number(i.total_amount||0)/Math.max(1,Number(i.installment_count||1)),0);return <div className="goal-history"><b>Compromissos em aberto</b><span>{open.length} compra(s) parcelada(s) · {brl(monthly)}/mês</span></div>})()}<button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards,card_id:c.id})}><Plus size={15}/> Adicionar compromisso parcelado</button></div>)}</div>:<Empty icon={CreditCard} title="Nenhum cartão cadastrado" text="Adicione um cartão para acompanhar limite e uso."/>}{data.card_limit_history.length>0&&<div className="history-box"><h3>Histórico de alterações de limite</h3>{data.card_limit_history.slice(0,8).map(h=><div className="history-row" key={h.id}><span>{data.cards.find(c=>c.id===h.card_id)?.name||'Cartão'}</span><span>{brl(h.previous_limit)} → <b>{brl(h.new_limit)}</b></span><small>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</small></div>)}</div>}</section><section className="panel"><div className="panel-head"><div><h3>Parcelas e compromissos</h3><p>Compras parceladas vinculadas ou não a um cartão</p></div><button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards})}><Plus size={15}/> Adicionar parcela</button></div>{data.installments.length?<div className="simple-list">{data.installments.map(i=>{const monthly=Number(i.total_amount)/Math.max(1,Number(i.installment_count));const remaining=Number(i.installment_count)-Number(i.paid_count||0);const end=new Date(`${i.first_due_date}T12:00:00`);end.setMonth(end.getMonth()+Number(i.installment_count)-1);const card=data.cards.find(c=>c.id===i.card_id);return <div className="simple-row commitment-row" key={i.id}><div className="row-icon"><CalendarClock size={18}/></div><div className="row-main"><b>{i.description}</b><span>{card?card.name+' · ':''}{i.paid_count||0}/{i.installment_count} pagas · faltam {remaining} · termina em {end.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'})}</span><span>{brl(monthly)} por mês · primeira parcela {new Date(i.first_due_date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><strong>{brl(i.total_amount)}</strong><div className="row-actions"><button className="delete-btn" onClick={async()=>{const next=Math.min(Number(i.installment_count),Number(i.paid_count||0)+1);const {error}=await supabase.from('installments').update({paid_count:next}).eq('id',i.id);if(error)notify('Não foi possível atualizar as parcelas.');else{await loadData();notify('Parcela marcada como paga.')}}}>Pagar próxima</button><button className="delete-btn" onClick={()=>deleteItem('installments',i.id)}>Excluir</button></div></div>})}</div>:<Empty icon={CalendarClock} title="Nenhum compromisso parcelado" text="Adicione uma compra parcelada para acompanhar pagamentos e previsão de término."/>}</section><section className="panel"><div className="panel-head"><div><h3>Assinaturas</h3><p>Serviços recorrentes e próximas cobranças</p></div><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',cards:data.cards})}><Plus size={15}/> Adicionar assinatura</button></div><div className="subscription-summary"><div><span>Gasto mensal ativo</span><strong>{brl(subscriptionsMonthly)}</strong></div><small>{activeSubscriptions.length} assinatura(s) ativa(s) · valores anuais divididos por 12</small></div>{data.subscriptions.length?<div className="simple-list">{data.subscriptions.map(s=>{const card=data.cards.find(c=>c.id===s.card_id);const monthly=Number(s.amount||0)/(s.frequency==='anual'?12:1);return <div className="simple-row commitment-row" key={s.id}><div className="row-icon"><RefreshCw size={18}/></div><div className="row-main"><b>{s.name}</b><span>{s.frequency==='anual'?'Cobrança anual':'Cobrança mensal'} · {s.status}{card?' · '+card.name:''}</span><span>Próxima cobrança: {new Date(s.next_charge_date+'T12:00:00').toLocaleDateString('pt-BR')} · {brl(monthly)}/mês equivalente</span></div><strong>{brl(s.amount)}<small>{s.frequency==='anual'?' /ano':' /mês'}</small></strong><div className="row-actions"><button className="delete-btn" onClick={()=>setModal({type:'subscriptions',item:s,cards:data.cards})}>Editar</button>{s.status==='Ativa'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Cancelada'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível cancelar a assinatura.');else{await loadData();notify('Assinatura cancelada.')}}}>Cancelar</button>}{s.status==='Cancelada'&&<button className="delete-btn" onClick={async()=>{const {error}=await supabase.from('subscriptions').update({status:'Ativa'}).eq('id',s.id).eq('user_id',session.user.id);if(error)notify('Não foi possível reativar a assinatura.');else{await loadData();notify('Assinatura reativada.')}}}>Reativar</button>}<button className="delete-btn" onClick={()=>deleteItem('subscriptions',s.id)}>Excluir</button></div></div>})}</div>:<Empty icon={RefreshCw} title="Nenhuma assinatura cadastrada" text="Adicione serviços como streaming, academia ou aplicativos para acompanhar as cobranças recorrentes."/>}</section></>}
      
      
      {page==='planning'&&<section className="panel"><div className="panel-head"><div><h3>Minhas metas</h3><p>Acompanhe o progresso de cada objetivo</p></div></div>{data.goals.length?<div className="item-grid">{data.goals.map(g=>{const pct=Math.min(100,Number(g.target)?Number(g.saved)/Number(g.target)*100:0);return <div className="finance-item" key={g.id}><div className="item-top"><span className="panel-icon"><Target size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'deposito'})}}>Depositar</button><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'retirada'})}}>Retirar</button><button className="delete-btn" onClick={()=>deleteItem('goals',g.id)}>Excluir</button></div></div><h3>{g.name}</h3><div className="item-number">{brl(g.saved)} <small>de {brl(g.target)}</small></div><div className="progress goal-progress"><i style={{width:`${pct}%`}}/></div><div className="item-meta"><span>{pct.toFixed(0)}% concluído</span><b>Faltam {brl(Number(g.target)-Number(g.saved))}</b></div>{g.deadline&&<p className="muted">Prazo: {new Date(g.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</p>}{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).length>0&&<div className="goal-history"><b>Últimas movimentações</b>{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).map(m=><span key={m.id}>{m.movement_type==='deposito'?'+':'−'} {brl(m.amount)} · {new Date(m.created_at).toLocaleDateString('pt-BR')}</span>)}</div>}</div>})}</div>:<Empty icon={Target} title="Qual é o seu próximo objetivo?" text="Crie uma meta e acompanhe quanto falta para alcançá-la."/>}</section>}
      {page==='opportunities'&&<section className="opportunities-page gamer-world">
        <div className={`game-world-hero ${gameXp>=4500?"level-legendary":gameXp>=2000?"level-elite":gameXp>=1000?"level-avatar":gameXp>=500?"level-neon":""}`}>
          <div className="game-world-top"><span className="world-label"><span className="live-pulse"/> CENTRAL DO JOGADOR</span><span className="season-pill">TEMPORADA 01 · SUA EVOLUÇÃO</span></div>
          <div className="player-identity"><div className={`player-avatar ${gameXp>=4500?"avatar-legendary":gameXp>=2000?"avatar-elite":gameXp>=1000?"avatar-veteran":""}`}>{gameXp>=2000?<Trophy size={36}/>:gameXp>=1000?<Star size={36}/>:gameXp>=500?<Zap size={36}/>:<Gamepad2 size={36}/>}<i><Zap size={12}/></i></div><div className="player-info"><span>{gameXp>=4500?"LENDÁRIO":gameXp>=2000?"ELITE":gameXp>=1000?"VETERANO":gameXp>=500?"EXPLORADOR":"JOGADOR"}</span><h2> sua jornada começa aqui</h2><div className="player-level-line"><b>NÍVEL {Math.floor(gameXp/500)+1}</b><span>{gameXp%500}/500 XP para o próximo nível</span></div><div className="player-xp-track"><i style={{width:((gameXp%500)/500*100)+'%'}}/></div></div><div className="player-xp-total"><strong>{gameXp}</strong><small>XP TOTAL</small></div></div>
          <div className="world-stats"><div><Flame size={17}/><span><b>{gameCorrect}</b> desafios concluídos</span></div><div><Trophy size={17}/><span><b>{Math.floor(gameXp/500)}</b> níveis conquistados</span></div><div><Coins size={17}/><span><b>R$ 0,00</b> em recompensas reais</span></div></div>
        </div>
        <div className="gamer-section-heading"><div><span>SEU PRÓXIMO PASSO</span><h3>Missões de hoje</h3><p>Pequenas atitudes que fortalecem sua vida financeira.</p></div><span className="quest-reset">RENOVAÇÃO DIÁRIA</span></div>
        <div className="daily-quests">
          <article className="quest-card"><div className="quest-icon quest-blue"><ReceiptText size={20}/></div><div className="quest-copy"><b>Registre uma movimentação</b><p>Não deixe seu dinheiro passar despercebido.</p><span>MISSÃO · ORGANIZAÇÃO</span></div><button onClick={()=>setPage('transactions')}>Começar <ChevronRight size={15}/></button></article>
          <article className="quest-card"><div className="quest-icon quest-purple"><Target size={20}/></div><div className="quest-copy"><b>Crie uma meta financeira</b><p>Defina algo que você quer conquistar.</p><span>MISSÃO · PLANEJAMENTO</span></div><button onClick={()=>setPage('planning')}>Começar <ChevronRight size={15}/></button></article>
          <article className="quest-card"><div className="quest-icon quest-gold"><Brain size={20}/></div><div className="quest-copy"><b>Complete o desafio relâmpago</b><p>Responda ao quiz e aprenda algo novo.</p><span>MISSÃO · APRENDIZADO</span></div><button onClick={()=>setPage('opportunities')}>Jogar <ChevronRight size={15}/></button></article>
        </div>
        <div className="gamer-section-heading"><div><span>ARCADE FINANCEIRO · 20 TEMAS</span><h3>Desafio relâmpago</h3><p>Uma rodada com 5 perguntas variadas. Novo desafio a cada 2 horas.</p></div><div className="arcade-chip"><Gamepad2 size={14}/> +5 XP por acerto</div></div>
        <section className="arcade-game">
          <div className="arcade-game-side"><div className="arcade-orb"><Brain size={32}/></div><span>{quizActive?'TEMA · '+roundQuestions[gameQuestionIndex]?.category:'QUIZ DIÁRIO'}</span><b>{quizActive?'Desbloqueie conhecimento.':'Prepare-se para o desafio.'}</b><small>5 perguntas por rodada · limite de uma rodada a cada 2 horas.</small></div>
          <div className="arcade-game-main">{quizActive? <><div className="arcade-progress-head"><span>FASE {gameQuestionIndex+1} / 5</span><span>{gameCorrect} ACERTOS NO TOTAL</span></div><div className="arcade-progress"><i style={{width:((gameQuestionIndex+1)/5*100)+'%'}}/></div><h4>{roundQuestions[gameQuestionIndex]?.question}</h4><div className="game-options">{(roundQuestions[gameQuestionIndex]?.options||[]).map((option,index)=><button key={option} className={'game-option '+(gameAnswer===index?(index===roundQuestions[gameQuestionIndex].correct?'correct':'wrong'):'')} disabled={gameAnswer!==null} onClick={()=>answerGame(index)}><span>{String.fromCharCode(65+index)}</span>{option}{gameAnswer===index&&<Check size={17}/>}</button>)}</div>{gameFeedback&&<div className={'game-feedback '+(gameAnswer===roundQuestions[gameQuestionIndex]?.correct?'is-correct':'')}>{gameFeedback}</div>}<button className="primary game-next" disabled={gameAnswer===null} onClick={nextGameQuestion}>{gameQuestionIndex===4?'Concluir rodada':'Próxima pergunta'} <ChevronRight size={17}/></button></>:<div className="quiz-gate"><div className="quiz-gate-icon"><Brain size={30}/></div><h4>{quizAvailable?'Novo desafio disponível!':'Próxima rodada em breve'}</h4><p>{quizAvailable?'São 5 perguntas sorteadas entre 20 temas de educação financeira.':'Você já jogou nesta janela. O intervalo de 2 horas evita farm de XP.'}</p>{quizAvailable?<button className="primary" onClick={startQuiz}>Iniciar desafio <ChevronRight size={17}/></button>:<span className="quiz-countdown">Disponível em {Math.ceil(Math.max(0,2*60*60*1000-(quizClock-quizLastPlayed))/60000)} min</span>}</div>}</div>
        </section>
        <div className="gamer-section-heading"><div><span>ARCADE EXTRA</span><h3>Flappy Financeiro</h3><p>Toque para manter o mascote no ar e desviar dos obstáculos. Até 30 XP por dia.</p></div><div className="arcade-chip"><Gamepad2 size={14}/> {dailyGameXp}/30 XP hoje</div></div>
        <FinanceFlapGame onReward={awardFlapXp}/>
        <div className="gamer-section-heading"><div><span>RECOMPENSAS DE NÍVEL</span><h3>Itens desbloqueáveis</h3><p>Subir de nível libera itens visuais e personalização, sem bloquear recursos financeiros.</p></div><span className="quest-reset">NÍVEL {Math.floor(gameXp/500)+1}</span></div>
        <div className="level-reward-grid">
          <article className={'level-reward '+(gameXp>=500?'unlocked':'')}><span className="level-reward-icon"><Sparkles size={20}/></span><div><b>Tema Neon</b><small>NÍVEL 2 · NOVA identidade visual</small></div><strong>{gameXp>=500?'LIBERADO':'500 XP'}</strong></article>
          <article className={'level-reward '+(gameXp>=5000?'unlocked':'')}><span className="level-reward-icon"><Gamepad2 size={20}/></span><div><b>Avatar alternativo</b><small>NÍVEL 3 · Personalize seu jogador</small></div><strong>{gameXp>=5000?'LIBERADO':'1.000 XP'}</strong></article>
          <article className={'level-reward '+(gameXp>=2000?'unlocked':'')}><span className="level-reward-icon"><Trophy size={20}/></span><div><b>Título de elite</b><small>NÍVEL 5 · Emblema no perfil</small></div><strong>{gameXp>=2000?'LIBERADO':'2.000 XP'}</strong></article>
          <article className={'level-reward '+(gameXp>=4500?'unlocked':'')}><span className="level-reward-icon"><Star size={20}/></span><div><b>Perfil lendário</b><small>NÍVEL 10 · Moldura especial</small></div><strong>{gameXp>=4500?'LIBERADO':'4.500 XP'}</strong></article>
        </div>
        <div className="gamer-section-heading"><div><span>COLECIONÁVEIS</span><h3>Conquistas</h3><p>Seu progresso merece ser celebrado.</p></div></div>
        <div className="achievement-grid">
          <div className={'achievement-card '+(gameCorrect>=1?'unlocked':'')}><div><Trophy size={23}/></div><b>Primeira vitória</b><span>Acertar uma pergunta</span><small>{gameCorrect>=1?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameXp>=500?'unlocked':'')}><div><Zap size={23}/></div><b>Subindo de nível</b><span>Conquistar 100 XP</span><small>{gameXp>=500?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className={'achievement-card '+(gameCorrect>=5?'unlocked':'')}><div><Star size={23}/></div><b>Mente afiada</b><span>Acertar 5 perguntas</span><small>{gameCorrect>=5?'DESBLOQUEADA':'BLOQUEADA'}</small></div>
          <div className="achievement-card locked"><div><Flame size={23}/></div><b>Constância</b><span>Manter uma sequência de 7 dias</span><small>EM BREVE</small></div>
        </div>
        <div className="gamer-section-heading"><div><span>DINHEIRO DE VERDADE</span><h3>Central de recompensas</h3><p>Oportunidades remuneradas serão liberadas com parceiros e campanhas verificadas.</p></div><span className="quest-reset">EM PREPARAÇÃO</span></div>
        <div className="reward-hub"><div className="reward-hub-icon"><Coins size={27}/></div><div><b>Ganhe além do XP</b><p>Pesquisas remuneradas, missões patrocinadas e recompensas com saldo real. Nada de pontos fingindo ser dinheiro: cada campanha terá valor, regras e pagamento explicados antes de começar.</p></div><span className="reward-coming">EM BREVE</span></div>
        <div className="opportunity-safety"><ShieldCheck size={18}/><p><b>Segurança em primeiro lugar.</b> Não será necessário pagar para participar. Recompensas em dinheiro só serão ativadas com parceiros verificados, orçamento reservado, validação antifraude e regras adequadas à idade dos participantes.</p></div>
      </section>}
      {page==='notifications'&&<section className="panel"><div className="panel-head"><div><h3>Central de notificações</h3><p>{unreadCount?unreadCount+' não lida(s)':'Você está em dia.'}</p></div>{unreadCount>0&&<button className="text-button" onClick={markAllNotificationsRead}>Marcar todas como lidas</button>}</div>{data.notifications.length?<div className="simple-list">{data.notifications.map(n=><div className={'simple-row notification-row '+(n.is_read?'read':'')} key={n.id}><div className="row-icon"><Bell size={18}/></div><div className="row-main"><b>{n.title}</b><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString('pt-BR')} · {n.category}</small></div>{!n.is_read&&<button className="delete-btn" onClick={()=>markNotificationRead(n.id)}>Marcar lida</button>}<button className="delete-btn" onClick={()=>deleteItem('notifications',n.id)}>Excluir</button></div>)}</div>:<Empty icon={Bell} title="Nenhuma notificação por enquanto" text="Avisos sobre seus registros aparecerão aqui."/>}</section>}
      {page==='reports'&&<><div className="stat-grid"><Stat icon={ArrowDownLeft} label="Entradas registradas" value={brl(paidIn)} tone="green" detail="Todo o período"/><Stat icon={ArrowUpRight} label="Gastos registrados" value={brl(paidOut)} tone="red" detail="Todo o período"/><Stat icon={Wallet} label="Saldo calculado" value={brl(balance)} tone="blue" detail="Entradas menos gastos"/><Stat icon={Target} label="Falta para metas" value={brl(goalTotal)} tone="purple" detail="Total restante"/></div><div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Fluxo dos últimos meses</h3><p>Comparação mensal</p></div></div><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}><CartesianGrid stroke="#263044" strokeDasharray="4 4"/><XAxis dataKey="month" tick={{fill:'#8290a8',fontSize:11}}/><YAxis tick={{fill:'#8290a8',fontSize:10}}/><Tooltip formatter={v=>brl(v)}/><Area dataKey="Entradas" stroke="#35d39a" fill="#35d39a" fillOpacity={.12}/><Area dataKey="Gastos" stroke="#ff7085" fill="#ff7085" fillOpacity={.12}/></AreaChart></ResponsiveContainer></section><section className="panel"><div className="panel-head"><div><h3>Gastos por categoria</h3><p>Distribuição registrada</p></div></div>{categories.length?<div className="category-list">{categories.map(c=><div className="category-row" key={c.name}><span>{c.name}</span><b>{brl(c.value)}</b><div className="progress"><i style={{width:`${Math.min(100,c.value/Math.max(...categories.map(x=>x.value))*100)}%`}}/></div></div>)}</div>:<Empty icon={ChartNoAxesCombined} title="Sem dados suficientes" text="Registre despesas e escolha categorias para ver a análise."/ >}</section></div></>}
      <footer className="footer"><span>MEU FINANCEIRO <i>•</i> FEITO PARA SUA ROTINA</span><span><ShieldCheck size={14}/> Seus dados dependem da configuração segura da sua conta</span></footer>
    </div></main>
    {assistantOpen&&<div className="assistant-popover"><div className="assistant-popover-head"><div className="assistant-popover-title"><span className="assistant-popover-icon"><Bot size={18}/></span><div><b>Assistente financeira</b><small><i/> Análise dos seus registros</small></div></div><button className="icon-btn" onClick={()=>setAssistantOpen(false)} aria-label="Fechar assistente"><X size={18}/></button></div><div className="assistant-popover-messages">{assistantMessages.map((m,i)=><div className={'assistant-message '+m.role} key={i}><div className="assistant-bubble">{m.text}</div></div>)}</div><div className="assistant-popover-suggestions"><button onClick={()=>sendAssistantMessage('Como estão meus gastos?')}>Meus gastos</button><button onClick={()=>sendAssistantMessage('Analise meus cartões')}>Meus cartões</button><button onClick={()=>sendAssistantMessage('Quais dívidas devo priorizar?')}>Minhas dívidas</button></div><form className="assistant-popover-compose" onSubmit={e=>{e.preventDefault();sendAssistantMessage()}}><input value={assistantInput} onChange={e=>setAssistantInput(e.target.value)} placeholder="Pergunte sobre seu dinheiro…"/><button className="primary" type="submit" disabled={!assistantInput.trim()} aria-label="Enviar"><Send size={17}/></button></form><p className="assistant-popover-note">Respostas calculadas com os dados cadastrados. Não é aconselhamento profissional.</p></div>}
    <button className={'assistant-fab '+(assistantOpen?'is-open':'')} onClick={()=>setAssistantOpen(v=>!v)} aria-label={assistantOpen?'Fechar assistente':'Abrir assistente'} title="Assistente financeira">{assistantOpen?<X size={23}/>:<><Bot size={24}/><span><Sparkles size={12}/></span></>}</button>
    {modal&&<EntryModal type={typeof modal==='string'?modal:modal.type} extra={typeof modal==='string'?(modal==='installments'?{cards:data.cards}:null):modal} onClose={()=>setModal(null)} onSave={saveItem} busy={busy}/>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function Stat({icon:Icon,label,value,tone,detail}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>}
function Empty({icon:Icon,title,text}){return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><b>{title}</b><p>{text}</p></div>}
function TransactionList({items,onDelete}){return items.length?<div className="transaction-list">{items.map(t=><div className="transaction-row" key={t.id}><div className={`transaction-icon ${t.type}`} >{t.type==='entrada'?<ArrowDownLeft size={19}/>:<ArrowUpRight size={19}/>}</div><div className="transaction-main"><b>{t.description||t.category||'Movimentação'}</b><span>{t.category||'Sem categoria'} · {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><div className={`transaction-amount ${t.type}`}>{t.type==='entrada'?'+':'−'} {brl(t.amount)}</div><button className="delete-btn" onClick={()=>onDelete(t.id)}>Excluir</button></div>)}</div>:<Empty icon={Activity} title="Ainda não há movimentações" text="Adicione sua primeira entrada ou gasto para começar a acompanhar seu dinheiro."/>}
function EntryModal({type,extra,onClose,onSave,busy}){
 const item=extra?.item;
 const [f,setF]=useState({date:item?.date||today(),type:item?.type||'gasto',category:item?.category||'Alimentação',status:item?.status||'Pendente',name:item?.name||'',description:item?.description||'',amount:item?.amount==null?'':String(item.amount),limit_amount:item?.limit_amount==null?'':String(item.limit_amount),used:item?.used==null?'0':String(item.used),due_day:item?.due_day==null?'':String(item.due_day),title:item?.title||'',due_date:item?.due_date||'',target:item?.target==null?'':String(item.target),saved:item?.saved==null?'0':String(item.saved),deadline:item?.deadline||'',installment_count:item?.installment_count==null?'2':String(item.installment_count),first_due_date:item?.first_due_date||today(),paid_count:item?.paid_count==null?'0':String(item.paid_count),note:item?.note||'',card_id:item?.card_id||extra?.card_id||'',frequency:item?.frequency||'mensal',next_charge_date:item?.next_charge_date||today(),status:item?.status||'Ativa'});
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 const title={transactions:'Nova movimentação',cards:item?'Editar cartão':'Adicionar cartão',debts:item?'Editar conta ou dívida':'Nova conta ou dívida',goals:'Criar meta',installments:'Nova compra parcelada',subscriptions:item?'Editar assinatura':'Nova assinatura',goalMovement:extra?.movement_type==='retirada'?'Retirar dinheiro da meta':'Adicionar dinheiro à meta'}[type];
 async function submit(e){e.preventDefault();let table=type,values;
 if(type==='transactions')values={date:f.date,type:f.type,category:f.category,description:f.description,amount:Number(f.amount)};
 if(type==='cards')values={name:f.name,limit_amount:Number(f.limit_amount),used:Number(f.used||0),due_day:f.due_day?Number(f.due_day):null};
 if(type==='debts')values={title:f.title,amount:Number(f.amount),due_date:f.due_date||null,status:f.status};
 if(type==='goals')values={name:f.name,target:Number(f.target),saved:Number(f.saved||0),deadline:f.deadline||null};
 if(type==='installments')values={description:f.description,total_amount:Number(f.amount),installment_count:Number(f.installment_count),first_due_date:f.first_due_date,card_id:f.card_id||null,paid_count:Number(f.paid_count||0)};
 if(type==='subscriptions')values={name:f.name,amount:Number(f.amount),frequency:f.frequency,next_charge_date:f.next_charge_date,card_id:f.card_id||null,status:f.status};
 if(type==='goalMovement')values={goal_id:extra.goal.id,movement_type:extra.movement_type,amount:Number(f.amount),note:f.note||null};
 await onSave(table,values,extra?.item||null);
 }
 return <div className="modal-backdrop" onClick={onClose}><form className="modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ORGANIZE SUAS FINANÇAS</div><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div>
 {type==='transactions'&&<><label>Tipo<select value={f.type} onChange={e=>set('type',e.target.value)}><option value="gasto">Gasto</option><option value="entrada">Entrada</option></select></label><label>Descrição<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: mercado, salário…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Data<input required type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></label></div><label>Categoria<select value={f.category} onChange={e=>set('category',e.target.value)}>{['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Compras','Salário','Freelance','Contas','Outros'].map(x=><option key={x}>{x}</option>)}</select></label></>}
 {type==='cards'&&<><label>Nome do cartão<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Cartão principal"/></label><div className="form-row"><label>Limite total (R$)<input required type="number" min="0" step=".01" value={f.limit_amount} onChange={e=>set('limit_amount',e.target.value)} placeholder="0,00"/></label><label>Valor utilizado (R$)<input required type="number" min="0" step=".01" value={f.used} onChange={e=>set('used',e.target.value)}/></label></div><label>Dia do vencimento (opcional)<input type="number" min="1" max="31" value={f.due_day} onChange={e=>set('due_day',e.target.value)} placeholder="Ex.: 10"/></label></>}
 {type==='debts'&&<><label>Nome da conta ou dívida<input required value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Ex.: conta de internet"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Vencimento<input type="date" value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></label></div><label>Situação<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Pendente</option><option>Pago</option></select></label></>}
 {type==='installments'&&<><label>O que foi comprado?<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: celular, televisão…"/></label><div className="form-row"><label>Valor total (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)}/></label><label>Quantidade de parcelas<input required type="number" min="2" max="120" value={f.installment_count} onChange={e=>set('installment_count',e.target.value)}/></label></div><label>Data de vencimento da 1ª parcela<input required type="date" value={f.first_due_date} onChange={e=>set('first_due_date',e.target.value)}/></label><label>Cartão (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">Valor aproximado por parcela: {brl(Number(f.amount||0)/Math.max(1,Number(f.installment_count||1)))}</p></>}
 {type==='subscriptions'&&<><label>Nome da assinatura<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Netflix, Spotify, academia…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Frequência<select value={f.frequency} onChange={e=>set('frequency',e.target.value)}><option value="mensal">Mensal</option><option value="anual">Anual</option></select></label></div><div className="form-row"><label>Próxima cobrança<input required type="date" value={f.next_charge_date} onChange={e=>set('next_charge_date',e.target.value)}/></label><label>Status<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Ativa</option><option>Cancelada</option></select></label></div><label>Cartão utilizado (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">A assinatura continua sendo contabilizada até ser cancelada. Não será misturada às compras parceladas.</p></>}
 {type==='goalMovement'&&<><p className="muted">Meta: {extra?.goal?.name} · Saldo atual: {brl(extra?.goal?.saved)}</p><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Observação (opcional)<input value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Ex.: dinheiro separado do salário"/></label></>}
 {type==='goals'&&<><label>Nome da meta<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: reserva de emergência"/></label><div className="form-row"><label>Quanto quero juntar (R$)<input required type="number" min=".01" step=".01" value={f.target} onChange={e=>set('target',e.target.value)} placeholder="1000,00"/></label><label>Já tenho (R$)<input type="number" min="0" step=".01" value={f.saved} onChange={e=>set('saved',e.target.value)}/></label></div><label>Prazo (opcional)<input type="date" value={f.deadline} onChange={e=>set('deadline',e.target.value)}/></label></>}
 <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}><Plus size={17}/>{busy?'Salvando…':'Salvar registro'}</button></div></form></div>
}

function FinanceFlapGame({onReward}){
 const canvasRef=React.useRef(null),stateRef=React.useRef({birdY:190,velocity:0,pipes:[],frame:0,score:0,active:false,over:false,rewarded:false});
 const [status,setStatus]=useState('ready'),[score,setScore]=useState(0);
 function begin(){const s=stateRef.current;s.birdY=190;s.velocity=0;s.pipes=[{x:360,gapY:145,passed:false}];s.frame=0;s.score=0;s.active=true;s.over=false;s.rewarded=false;setScore(0);setStatus('playing')}
 function flap(){if(status==='ready'||status==='over'){begin();return}if(status==='playing')stateRef.current.velocity=-6.2}
 useEffect(()=>{if(status!=='playing')return;const canvas=canvasRef.current,ctx=canvas.getContext('2d');let raf;const W=320,H=420;
 const loop=()=>{const s=stateRef.current;s.frame++;s.velocity+=.34;s.birdY+=s.velocity;
 if(s.frame%105===0)s.pipes.push({x:W+10,gapY:85+Math.random()*190,passed:false});
 s.pipes.forEach(p=>{p.x-=2.25;if(!p.passed&&p.x+48<66){p.passed=true;s.score++;setScore(s.score)}});
 s.pipes=s.pipes.filter(p=>p.x>-55);
 let hit=s.birdY<8||s.birdY>H-24;
 s.pipes.forEach(p=>{const overlap=66+14>p.x&&66-14<p.x+48;if(overlap&&(s.birdY-12<p.gapY-66||s.birdY+12>p.gapY+66))hit=true});
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#111a38');bg.addColorStop(1,'#091426');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#8ba9ff22';for(let i=0;i<22;i++){const x=(i*53+s.frame*.22)%W,y=(i*79)%H;ctx.fillRect(x,y,2,2)}
 s.pipes.forEach(p=>{const grad=ctx.createLinearGradient(p.x,0,p.x+48,0);grad.addColorStop(0,'#256e83');grad.addColorStop(.5,'#36c6b2');grad.addColorStop(1,'#1c526b');ctx.fillStyle=grad;ctx.fillRect(p.x,0,48,p.gapY-66);ctx.fillRect(p.x,p.gapY+66,48,H);ctx.fillStyle='#8fffe0';ctx.fillRect(p.x-4,p.gapY-78,56,12);ctx.fillRect(p.x-4,p.gapY+66,56,12)});
 ctx.save();ctx.translate(66,s.birdY);ctx.rotate(Math.max(-.45,Math.min(.7,s.velocity*.055)));ctx.fillStyle='#f5cf73';ctx.shadowColor='#f5cf73';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-4,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17213c';ctx.beginPath();ctx.arc(6,-4,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff9b72';ctx.beginPath();ctx.moveTo(12,1);ctx.lineTo(22,5);ctx.lineTo(12,8);ctx.fill();ctx.restore();
 ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(String(s.score),W/2,38);
 if(hit){s.active=false;s.over=true;if(!s.rewarded){s.rewarded=true;onReward(s.score)}setStatus('over');return}
 raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[status]);
 return <div className="flap-game"><div className="flap-game-stage"><canvas ref={canvasRef} width="320" height="420" onPointerDown={flap} aria-label="Jogo Flappy Financeiro. Toque para voar."/>{status!=='playing'&&<div className="flap-overlay"><b>{status==='ready'?'Pronto para voar?':'Fim de jogo!'}</b><span>{status==='ready'?'Toque para começar.':'Pontuação: '+score+' · Toque para jogar novamente.'}</span><button className="primary" onClick={begin}>{status==='ready'?'Começar':'Jogar novamente'} <ChevronRight size={16}/></button></div>}</div><div className="flap-game-info"><span><Zap size={15}/> Cada obstáculo superado vale 5 XP</span><b>{score} pontos</b></div></div>
}

function SetupScreen(){return <div className="setup-shell"><div className="setup-card"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Vamos conectar seu espaço privado</h1><p>O visual do site está pronto. Para ativar o login e salvar seus dados com segurança, configure seu projeto Supabase e as variáveis de ambiente.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL do projeto e a chave pública (anon/publishable) para um arquivo <code>.env</code>.</li><li>Ative o cadastro por e-mail em Authentication → Sign In / Providers. Assim, as pessoas poderão criar uma conta pela tela inicial.</li><li>Reinicie o site.</li></ol><div className="setup-warning"><ShieldCheck size={18}/><span>Nunca coloque a chave <b>service_role</b> no site. Use apenas a chave pública e mantenha o Row Level Security (RLS) ativo.</span></div></div></div>}
export default App;