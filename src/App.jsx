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
  const [payModal,setPayModal]=useState(false),[payBusy,setPayBusy]=useState(false);
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authError,setAuthError]=useState(''), [authMode,setAuthMode]=useState('login'), [authNotice,setAuthNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [adminUsers,setAdminUsers]=useState([]),[adminBusy,setAdminBusy]=useState(false),[adminError,setAdminError]=useState(''),[adminMessage,setAdminMessage]=useState(''),[maintenance,setMaintenance]=useState(false),[maintenanceMessage,setMaintenanceMessage]=useState('Estamos realizando uma manutenção. Voltaremos em breve.');
  const [adminTestMode,setAdminTestMode]=useState(()=>window.localStorage.getItem('mf_admin_test_mode')==='true');
  const [maintenanceCheckDone,setMaintenanceCheckDone]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [assistantInput,setAssistantInput]=useState('');
  const [activeArcadeGame,setActiveArcadeGame]=useState(null);
  const [gameQuestionIndex,setGameQuestionIndex]=useState(0),[gameAnswer,setGameAnswer]=useState(null),[gameFeedback,setGameFeedback]=useState(''),[gameXp,setGameXp]=useState(()=>Number(window.localStorage.getItem('mf_game_xp')||0)),[gameCorrect,setGameCorrect]=useState(()=>Number(window.localStorage.getItem('mf_game_correct')||0));
  const [quizLastPlayed,setQuizLastPlayed]=useState(()=>Number(window.localStorage.getItem('mf_quiz_last')||0)),[quizClock,setQuizClock]=useState(Date.now()),[quizActive,setQuizActive]=useState(false),[roundQuestions,setRoundQuestions]=useState([]);
  const [dailyGameXp,setDailyGameXp]=useState(()=>{const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');return saved.day===new Date().toLocaleDateString('en-CA')?Number(saved.xp||0):0});
  const [playerProfile,setPlayerProfile]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('mf_player_profile')||'{"name":"Meu jogador","avatar":"👾","frame":"violet","cardFrame":"cyan"}')}catch{return {name:'Meu jogador',avatar:'👾',frame:'violet',cardFrame:'cyan'}}});
  useEffect(()=>{window.localStorage.setItem('mf_player_profile',JSON.stringify(playerProfile))},[playerProfile]);
  const [assistantMessages,setAssistantMessages]=useState([{role:'assistant',text:'NEXUS online! ⚡ Posso analisar seus gastos, cartões, dívidas, parcelas e metas usando os dados cadastrados. Qual missão vamos cumprir?'}]);
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
  function awardFlapXp(score){const day=new Date().toLocaleDateString('en-CA');const saved=JSON.parse(window.localStorage.getItem('mf_flap_daily')||'{}');const used=saved.day===day?Number(saved.xp||0):0;const points=Math.max(0,Math.floor(Number(score)||0));const requested=points*2;const reward=Math.min(requested,Math.max(0,100-used));if(reward>0){const total=used+reward;window.localStorage.setItem('mf_flap_daily',JSON.stringify({day,xp:total}));setDailyGameXp(total);setGameXp(v=>v+reward);notify('Mandou bem! +'+reward+' XP no Flappy Financeiro (2 XP por ponto).')}else notify('Limite diário de 100 XP do Flappy atingido. Volte amanhã!')}

  function sendAssistantMessage(value=assistantInput){const question=value.trim();if(!question)return;const reply=answerFinancialQuestion(question,data);setAssistantMessages(old=>[...old,{role:'user',text:question},{role:'assistant',text:reply}]);setAssistantInput('');}

  const flapBestForGems=Math.max(Number(window.localStorage.getItem('mf_flap_best')||0),Number(window.localStorage.getItem('mf_flap_best_infinite')||0));
  let flapStoryForGems={};try{flapStoryForGems=JSON.parse(window.localStorage.getItem('mf_flap_story_unlocks')||'{}')}catch{}
  const gemMissions=[
    {id:'sapphire',name:'Safira da sabedoria',symbol:'💠',rarity:'common',rarityLabel:'COMUM',description:'Acerte sua primeira pergunta no Quiz.',progress:Math.min(1,gameCorrect),target:1,done:gameCorrect>=1},
    {id:'amethyst',name:'Ametista estrategista',symbol:'🔮',rarity:'rare',rarityLabel:'RARO',description:'Acumule 10 respostas corretas no Quiz.',progress:Math.min(10,gameCorrect),target:10,done:gameCorrect>=10},
    {id:'ruby',name:'Rubi do arcade',symbol:'♦️',rarity:'epic',rarityLabel:'ÉPICO',description:'Alcance 30 pontos em uma partida do Flappy.',progress:Math.min(30,flapBestForGems),target:30,done:flapBestForGems>=30},
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
  <button className="arcade-library-card flap-library-card" onClick={()=>setActiveArcadeGame('flap')}><div className="arcade-library-art"><span>🐤</span><i>✦</i><b>FLAPPY</b></div><div className="arcade-library-info"><strong>FLAPPY FINANCEIRO</strong><small>Habilidade · Reflexos</small><span className="arcade-library-play">JOGAR <ChevronRight size={15}/></span></div></button>
  {['DUNGEON RUSH','GEM MATCH','CORRIDA DO DINHEIRO','DEFESA DO COFRINHO'].map((name,i)=><div key={name} className="arcade-library-card arcade-coming-card"><div className="arcade-library-art"><span>{['⚔️','💎','🏎️','🏰'][i]}</span><b>EM BREVE</b></div><div className="arcade-library-info"><strong>{name}</strong><small>Um novo desafio está a caminho</small><span className="arcade-library-soon">EM DESENVOLVIMENTO</span></div></div>)}
 </div></>:<><button className="arcade-back-button" onClick={()=>setActiveArcadeGame(null)}><span>←</span> VOLTAR À BIBLIOTECA</button>
 {activeArcadeGame==='space'&&<><div className="gamer-section-heading"><div><span>PRIMEIRO LANÇAMENTO · SPACE NEXUS</span><h3>Defenda a galáxia</h3><p>Enfrente esquadrões alienígenas, mini-chefes e chefões que revidam.</p></div><div className="arcade-chip"><Gamepad2 size={14}/> AÇÃO ESPACIAL</div></div><SpaceNexusGame onReward={awardFlapXp}/></>}
 {activeArcadeGame==='quiz'&&<>{quizBlock}</>}
 {activeArcadeGame==='flap'&&<>{flapBlock}</>}
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
    {assistantOpen&&<div className="assistant-popover"><div className="assistant-popover-head"><div className="assistant-popover-title"><span className="assistant-popover-icon"><Gamepad2 size={19}/><Sparkles size={11}/></span><div><b>NEXUS <em>AI</em></b><small><i/> SISTEMA ONLINE · SEU CO-PILOTO</small></div></div><button className="icon-btn" onClick={()=>setAssistantOpen(false)} aria-label="Fechar assistente"><X size={18}/></button></div><div className="assistant-popover-messages">{assistantMessages.map((m,i)=><div className={'assistant-message '+m.role} key={i}><div className="assistant-bubble">{m.text}</div></div>)}</div><div className="assistant-popover-suggestions"><button onClick={()=>sendAssistantMessage('Como estão meus gastos?')}>Meus gastos</button><button onClick={()=>sendAssistantMessage('Analise meus cartões')}>Meus cartões</button><button onClick={()=>sendAssistantMessage('Quais dívidas devo priorizar?')}>Minhas dívidas</button></div><form className="assistant-popover-compose" onSubmit={e=>{e.preventDefault();sendAssistantMessage()}}><input value={assistantInput} onChange={e=>setAssistantInput(e.target.value)} placeholder="Digite sua próxima missão…"/><button className="primary" type="submit" disabled={!assistantInput.trim()} aria-label="Enviar"><Send size={17}/></button></form><p className="assistant-popover-note">Respostas calculadas com os dados cadastrados. Não é aconselhamento profissional.</p></div>}
    <button className={'assistant-fab '+(assistantOpen?'is-open':'')} onClick={()=>setAssistantOpen(v=>!v)} aria-label={assistantOpen?'Fechar assistente':'Abrir assistente'} title="Abrir NEXUS AI">{assistantOpen?<X size={23}/>:<><Gamepad2 size={25}/><span><Sparkles size={13}/></span></>}</button>
    {payModal&&<PayBillsModal debts={data.debts.filter(d=>d.is_continuous?d.paid_month!==currentMonthKey:d.status!=='Pago')} installments={data.installments.filter(i=>Number(i.paid_count||0)<Number(i.installment_count||0))} onClose={()=>setPayModal(false)} onConfirm={confirmPayments} busy={payBusy}/>}\n    {modal&&<EntryModal type={typeof modal==='string'?modal:modal.type} extra={typeof modal==='string'?(modal==='installments'?{cards:data.cards}:null):modal} onClose={()=>setModal(null)} onSave={saveItem} busy={busy}/>}
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
   if(n%(n<g.rapidUntil?7:15)===0){g.shots.push({id:n+'p',x:g.ship.x,y:g.ship.y-7});if(n<g.doubleUntil){g.shots.push({id:n+'pl',x:g.ship.x-2.5,y:g.ship.y-7},{id:n+'pr',x:g.ship.x+2.5,y:g.ship.y-7})}}
   if(n%39===0)g.foes.push({id:n+'e',x:12+Math.random()*76,y:4,hp:n%156===0?3:1,type:n%156===0?'brute':n%117===0?'scout':'drone',fire:n%52===0||Math.random()>.48});
   if(n%540===0){g.wave++;setWave(g.wave);setMessage('ONDA '+g.wave+' — novos invasores detectados!')}
   g.foes.forEach(f=>{f.y+=(f.type==='scout'?.35:.2167)+(g.wave*.0267)});
   g.shots.forEach(b=>{b.y-=1.333});
   g.enemyShots.forEach(b=>{b.y+=.7333});g.drops.forEach(d=>{d.y+=.22});
   if(n%78===0){g.foes.filter(f=>f.fire).slice(-2).forEach(f=>g.enemyShots.push({id:'m'+n+f.id,x:f.x,y:f.y+3,kind:'minion'}))}
   if(g.boss&&n%54===0){const spread=g.boss.style==='spread'?[0,-10,10,-20,20]:g.boss.style==='cross'?[0,-14,14]:[0,-8,8];spread.forEach((dx,i)=>g.enemyShots.push({id:'b'+n+i,x:Math.max(3,Math.min(97,g.boss.x+dx)),y:g.boss.y+8,kind:'boss'}))}
   if(n%1080===0&&!g.boss){const bosses=[{name:'DEVORADOR ESTELAR',style:'spread'},{name:'GENERAL VORTEX',style:'cross'},{name:'TITÃ NEBULAR',style:'spread'}];const chosen=bosses[(Math.floor(n/360)-1)%bosses.length];g.boss={hp:12+g.wave*3,max:12+g.wave*3,x:50,y:8,...chosen};setMessage('CHEFÃO DETECTADO! Prepare-se para o ataque!')}
   if(g.boss){g.boss.x=Math.max(22,Math.min(78,g.boss.x+(Math.random()-.5)*1));}
   // Colisão tiro da nave x inimigo: só remove o projétil quando realmente acerta.
   const remainingShots=[];
   for(const shot of g.shots){
    let hit=false;
    for(const foe of g.foes){
     const hitX=Math.abs(shot.x-foe.x)<(foe.type==='brute'?7:5.5);
     const hitY=shot.y>=foe.y-4&&shot.y<=foe.y+5;
     if(hitX&&hitY){foe.hp-=1;hit=true;if(foe.hp<=0){g.score+=foe.type==='brute'?35:foe.type==='scout'?20:10;if(Math.random()<.24){const types=['shield','rapid','double','repair'];const type=types[Math.floor(Math.random()*types.length)];g.drops.push({id:'drop-'+n+'-'+foe.id,type,x:foe.x,y:foe.y})}}break;}
    }
    if(!hit&&g.boss&&Math.abs(shot.x-g.boss.x)<18&&shot.y>=g.boss.y-3&&shot.y<=g.boss.y+17){g.boss.hp--;hit=true;if(g.boss.hp<=0){g.score+=250;g.drops.push({id:'boss-drop-'+n,type:['shield','rapid','double','repair'][Math.floor(Math.random()*4)],x:g.boss.x,y:g.boss.y});g.boss=null;setMessage('CHEFÃO DERROTADO! +250 pontos — recompensa liberada!')}else if(g.boss.hp===Math.ceil(g.boss.max*.5))setMessage('FASE 2! O chefão ficou mais agressivo!')}
    if(!hit&&shot.y>0)remainingShots.push(shot);
   }
   g.shots=remainingShots;g.foes=g.foes.filter(f=>f.hp>0&&f.y<96);
   const remainingDrops=[];for(const d of g.drops){if(Math.abs(d.x-g.ship.x)<7&&Math.abs(d.y-g.ship.y)<8){if(d.type==='shield'){g.shield=true;setShieldActive(true);setMessage('ESCUDO COLETADO! O próximo impacto será bloqueado.')}else if(d.type==='rapid'){g.rapidUntil=n+300;setMessage('DISPARO RÁPIDO! Poder ativo por 6 segundos.')}else if(d.type==='double'){g.doubleUntil=n+300;setMessage('TIRO DUPLO! Poder ativo por 6 segundos.')}else if(d.type==='repair'){g.lives=Math.min(3,g.lives+1);setLives(g.lives);setMessage('REPARO COLETADO! +1 vida.')}}else if(d.y<100)remainingDrops.push(d)}g.drops=remainingDrops;
   let tookHit=false;
   const enemyRemaining=[];
   for(const shot of g.enemyShots){if(Math.abs(shot.x-g.ship.x)<6&&Math.abs(shot.y-g.ship.y)<7){tookHit=true}else if(shot.y<100)enemyRemaining.push(shot)}
   g.enemyShots=enemyRemaining;
   const foeRemaining=[];
   for(const foe of g.foes){if(Math.abs(foe.x-g.ship.x)<7&&Math.abs(foe.y-g.ship.y)<6){tookHit=true}else foeRemaining.push(foe)}
   g.foes=foeRemaining;
   if(tookHit){if(g.shield){g.shield=false;setShieldActive(false);setMessage('Escudo absorveu o impacto!')}else{g.lives=Math.max(0,g.lives-1);setMessage('A nave foi atingida! Desvie dos disparos!')}}
   setScore(g.score);setLives(g.lives);setShots([...g.shots]);setFoes([...g.foes]);setEnemyShots([...g.enemyShots]);setDrops([...g.drops]);setBoss(g.boss?{...g.boss}:null);
   if(g.lives<=0){setRunning(false);setEnded(true);setMessage('Sua nave foi destruída. A galáxia ainda precisa de você!');setBest(old=>{const value=Math.max(old,g.score);localStorage.setItem('mf_space_best',String(value));return value});onReward(Math.floor(g.score/25))}
  },20);
  return()=>clearInterval(id);
 },[running,onReward]);
 return <section className="space-nexus-card">
  <div className="space-nexus-hud"><span>ONDA {wave}</span><b>{score}</b><span>{'❤️'.repeat(lives)}{'🖤'.repeat(3-lives)}</span></div>
  <div className="space-nexus-arena" onPointerDown={e=>{if(!running)return;e.currentTarget.setPointerCapture?.(e.pointerId);moveTo(e.clientX,e.clientY,e.currentTarget)}} onPointerMove={e=>{if(!running)return;if(e.pointerType==='touch'||(e.buttons&1))moveTo(e.clientX,e.clientY,e.currentTarget)}}>
   <div className="space-stars"/><div className="space-nebula"/>
   {foes.map(f=><div key={f.id} className={'space-enemy '+(f.type==='brute'?'brute':f.type==='scout'?'scout':'')} style={{left:f.x+'%',top:f.y+'%'}}><span className="space-enemy-core"/></div>)}
   {enemyShots.map(b=><i key={b.id} className={'space-enemy-shot '+(b.kind==='boss'?'boss-shot':'')} style={{left:b.x+'%',top:b.y+'%'}}/>)}\n   {drops.map(d=><div key={d.id} className={'space-drop space-drop-'+d.type} style={{left:d.x+'%',top:d.y+'%'}}><span>{d.type==='shield'?'S':d.type==='rapid'?'R':d.type==='double'?'×2':'+'}</span></div>)}
   {shots.map(b=><i key={b.id} className="space-player-shot" style={{left:b.x+'%',top:b.y+'%'}}/>)}
   {boss&&<div className={'space-boss '+(boss.hp<=boss.max*.5?'phase-two':'')} style={{left:boss.x+'%',top:boss.y+'%'}}><span><span className="space-boss-core"><i/><i/><i/></span></span><b>{boss.name}</b><small>{boss.hp<=boss.max*.5?'FASE 2 · FÚRIA MÁXIMA':'FASE 1'}</small><i><em style={{width:(boss.hp/boss.max*100)+'%'}}/></i></div>}
   <div className={'space-player-ship '+(shieldActive?'shielded':'')} style={{left:ship.x+'%',top:ship.y+'%'}}><span className="ship-wing"/><span className="ship-body"/><span className="ship-flame"/></div>
   {!running&&<div className="space-overlay"><div className="space-overlay-icon"><span className="space-overlay-orbit"/></div><h3>{ended?'MISSÃO ENCERRADA':'SPACE NEXUS'}</h3><p>{ended?'Pontuação: '+score+' · Recorde: '+best:message}</p><button className="primary" onClick={start}>{ended?'Jogar novamente':'Iniciar missão'} <ChevronRight size={17}/></button></div>}
  </div>
  <div className="space-nexus-controls"><span>ARRASTE A NAVE E COLETE AS RECOMPENSAS</span></div>
  <div className="space-nexus-footer"><span>Recorde: {best}</span><span>Disparo automático</span><span>Escudo: {shieldActive?'ativo':'aguardando coleta'}</span><span>Chefões com evolução de combate</span></div>
 </section>
}
function FinanceFlapGame({onReward}){
 const modes=[{id:'easy',name:'Fácil',speed:2,desc:'Para aprender a voar',skin:'explorer',color:'#54d6b0'},{id:'normal',name:'Médio',speed:4,desc:'Um desafio equilibrado',skin:'guardian',color:'#8c83ff'},{id:'hard',name:'Difícil',speed:8,desc:'Só para os mais habilidosos',skin:'legend',color:'#ff8a9e'},{id:'infinite',name:'Infinito',speed:2,desc:'A velocidade aumenta com os pontos',skin:null,color:'#f3cb75'}];
 const birdItems=[{id:'classic',name:'Padrão',icon:'🐤',unlock:0},{id:'hoodie',name:'Moletom',icon:'🧥',unlock:5},{id:'crown',name:'Coroa',icon:'👑',unlock:10},{id:'ninja',name:'Ninja',icon:'🥷',unlock:20},{id:'galaxy',name:'Galáxia',icon:'🌌',unlock:30},{id:'explorer',name:'Explorador',icon:'🧭',story:'easy'},{id:'guardian',name:'Guardião',icon:'🛡️',story:'normal'},{id:'legend',name:'Lendário',icon:'🐉',story:'hard'}];
 const pipeItems=[{id:'ocean',name:'Oceano',icon:'🌊',unlock:0,colors:['#256e83','#36c6b2','#1c526b']},{id:'gold',name:'Ouro',icon:'✨',unlock:8,colors:['#9b672b','#f7d77d','#8a4c1b']},{id:'neon',name:'Neon',icon:'💠',unlock:15,colors:['#5637a8','#c65bff','#263e9b']},{id:'lava',name:'Vulcão',icon:'🔥',unlock:25,colors:['#8d302b','#ff8951','#5e202c']},{id:'crystal',name:'Cristal',icon:'💎',unlock:40,colors:['#247e9d','#9af5ff','#4a5cbd']}];
 const [mode,setMode]=useState(null),[bestScore,setBestScore]=useState(()=>Number(window.localStorage.getItem('mf_flap_best')||0));
 const [infiniteBest,setInfiniteBest]=useState(()=>Number(window.localStorage.getItem('mf_flap_best_infinite')||0));
 const [birdSkin,setBirdSkin]=useState(()=>window.localStorage.getItem('mf_flap_bird')||'classic');
 const [pipeSkin,setPipeSkin]=useState(()=>window.localStorage.getItem('mf_flap_pipe')||'ocean');
 const [unlockedStories,setUnlockedStories]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('mf_flap_story_unlocks')||'{}')}catch{return {}}});
 useEffect(()=>{window.localStorage.setItem('mf_flap_bird',birdSkin)},[birdSkin]);
 useEffect(()=>{window.localStorage.setItem('mf_flap_pipe',pipeSkin)},[pipeSkin]);
 const canvasRef=React.useRef(null),stateRef=React.useRef({birdY:190,velocity:0,pipes:[],frame:0,score:0,rewarded:false,spawnTimer:0});
 const [status,setStatus]=useState('choose'),[score,setScore]=useState(0);
 function begin(){const s=stateRef.current;s.birdY=190;s.velocity=0;s.pipes=[{x:360,gapY:145,passed:false}];s.frame=0;s.spawnTimer=0;s.score=0;s.rewarded=false;setScore(0);setStatus('playing')}
 function flap(){if(status==='ready'||status==='over'||status==='won'){begin();return}if(status==='playing')stateRef.current.velocity=-6.2}
 function backToModes(){setStatus('choose');setMode(null)}
 useEffect(()=>{if(status!=='playing'||!mode)return;const canvas=canvasRef.current,ctx=canvas.getContext('2d');let raf;const W=320,H=420;
 const loop=()=>{const s=stateRef.current;s.frame++;s.velocity+=.34;s.birdY+=s.velocity;
 const multiplier=mode.id==='infinite'?Math.min(10,2+s.score*.08):mode.speed;
 const speed=2.8*multiplier;
 const spawnEvery=Math.max(28,Math.round(105/(speed/2.8)));
 s.spawnTimer++;if(s.spawnTimer>=spawnEvery){s.spawnTimer=0;s.pipes.push({x:W+10,gapY:85+Math.random()*190,passed:false})}
 s.pipes.forEach(p=>{p.x-=speed;if(!p.passed&&p.x+48<66){p.passed=true;s.score+=1;setScore(s.score)}});
 s.pipes=s.pipes.filter(p=>p.x>-55);
 let hit=s.birdY<8||s.birdY>H-24;
 s.pipes.forEach(p=>{const overlap=66+14>p.x&&66-14<p.x+48;if(overlap&&(s.birdY-12<p.gapY-66||s.birdY+12>p.gapY+66))hit=true});
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#111a38');bg.addColorStop(1,'#091426');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#8ba9ff22';for(let i=0;i<22;i++){const x=(i*53+s.frame*(speed*.11))%W,y=(i*79)%H;ctx.fillRect(x,y,2,2)}
 const pipeStyle=pipeItems.find(x=>x.id===pipeSkin)||pipeItems[0];
 s.pipes.forEach(p=>{const grad=ctx.createLinearGradient(p.x,0,p.x+48,0);grad.addColorStop(0,pipeStyle.colors[0]);grad.addColorStop(.5,pipeStyle.colors[1]);grad.addColorStop(1,pipeStyle.colors[2]);ctx.fillStyle=grad;ctx.fillRect(p.x,0,48,p.gapY-66);ctx.fillRect(p.x,p.gapY+66,48,H);ctx.fillStyle=pipeStyle.colors[1];ctx.fillRect(p.x-4,p.gapY-78,56,12);ctx.fillRect(p.x-4,p.gapY+66,56,12);if(pipeSkin!=='ocean'){ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#fff';for(let y=18;y<p.gapY-82;y+=27)ctx.fillRect(p.x+9,y,30,2);for(let y=p.gapY+88;y<H-10;y+=27)ctx.fillRect(p.x+9,y,30,2);ctx.restore()}});
 ctx.save();ctx.translate(66,s.birdY);ctx.rotate(Math.max(-.45,Math.min(.7,s.velocity*.055)));ctx.fillStyle='#f5cf73';ctx.shadowColor='#f5cf73';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 if(birdSkin==='hoodie'){ctx.fillStyle='#8b5cf6';ctx.beginPath();ctx.arc(0,4,12,0,Math.PI);ctx.fill();ctx.fillRect(-9,2,18,8)}
 if(birdSkin==='crown'){ctx.fillStyle='#ffd76b';ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(-8,-21);ctx.lineTo(-2,-14);ctx.lineTo(2,-23);ctx.lineTo(7,-14);ctx.lineTo(11,-20);ctx.lineTo(10,-8);ctx.closePath();ctx.fill()}
 if(birdSkin==='ninja'){ctx.fillStyle='#e84c69';ctx.fillRect(-13,-7,26,5);ctx.beginPath();ctx.moveTo(10,-5);ctx.lineTo(21,1);ctx.lineTo(12,1);ctx.fill()}
 if(birdSkin==='galaxy'){ctx.strokeStyle='#c8a5ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,20,8,-.45,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(-2,-17,3,3)}
 if(birdSkin==='explorer'){ctx.fillStyle='#b77b42';ctx.fillRect(-10,2,20,8);ctx.fillStyle='#f6d18b';ctx.fillRect(-8,-12,16,4)}
 if(birdSkin==='guardian'){ctx.strokeStyle='#8bd6ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8bd6ff';ctx.fillRect(-10,-13,20,4)}
 if(birdSkin==='legend'){ctx.strokeStyle='#ff9a68';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ff9a68';ctx.beginPath();ctx.moveTo(-8,-10);ctx.lineTo(-13,-22);ctx.lineTo(-2,-15);ctx.lineTo(7,-23);ctx.lineTo(9,-9);ctx.fill()}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-4,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17213c';ctx.beginPath();ctx.arc(6,-4,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff9b72';ctx.beginPath();ctx.moveTo(12,1);ctx.lineTo(22,5);ctx.lineTo(12,8);ctx.fill();ctx.restore();
 ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(String(s.score),W/2,38);
 ctx.fillStyle='#a9c6ff';ctx.font='bold 9px sans-serif';ctx.fillText(mode.id==='infinite'?'VELOCIDADE x'+multiplier.toFixed(1):mode.name.toUpperCase()+' · x'+multiplier,W/2,55);
 if(mode.id!=='infinite'&&s.score>=100){s.rewarded=true;const next={...unlockedStories,[mode.id]:true};setUnlockedStories(next);window.localStorage.setItem('mf_flap_story_unlocks',JSON.stringify(next));setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});onReward(s.score);setStatus('won');return}
 if(hit){setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});if(mode.id==='infinite')setInfiniteBest(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best_infinite',String(value));return value});if(!s.rewarded){s.rewarded=true;onReward(s.score)}setStatus('over');return}
 raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[status,mode,birdSkin,pipeSkin]);
 const currentMultiplier=mode?.id==='infinite'?Math.min(10,2+score*.08):mode?.speed;
 return <div className="flap-game">
 {status==='choose'?<div className="flap-mode-select"><div className="flap-mode-heading"><b>ESCOLHA SEU MODO</b><span>História: alcance 100 pontos e conquiste uma roupa exclusiva</span></div><div className="flap-mode-grid">{modes.map(item=><button key={item.id} className={'flap-mode-card mode-'+item.id} onClick={()=>{setMode(item);setStatus('ready')}}><span className="flap-mode-icon">{item.id==='infinite'?'∞':item.id==='easy'?'🪽':item.id==='normal'?'⚡':'🔥'}</span><strong>{item.name}</strong><small>{item.id==='infinite'?'Recorde: '+infiniteBest+' pontos':'Velocidade inicial: '+item.speed+'x'}</small><em>{item.desc}</em>{item.id!=='infinite'&&<span className="flap-mode-reward">{unlockedStories[item.id]?'✓ Roupa conquistada':'🏆 Roupa exclusiva aos 100 pts'}</span>}</button>)}</div></div>:<>
 <div className="flap-mode-top"><button className="text-button" onClick={backToModes}>← Modos</button><b>{mode?.name} {mode?.id==='infinite'?'∞':'· '+mode?.speed+'x'}</b><span>{mode?.id==='infinite'?'Recorde: '+infiniteBest:'Meta: 100 pontos'}</span></div>
 <div className="flap-game-stage"><canvas ref={canvasRef} width="320" height="420" onPointerDown={flap} aria-label="Jogo Flappy Financeiro. Toque para voar."/>
 {status!=='playing'&&<div className="flap-overlay"><b>{status==='ready'?'Pronto para voar?':status==='won'?'FASE CONCLUÍDA! 🏆':'Fim de jogo!'}</b><span>{status==='ready'?'Toque para começar.':status==='won'?'Você alcançou 100 pontos e desbloqueou a roupa '+modes.find(x=>x.id===mode.id)?.name+'!': 'Pontuação: '+score+' · Toque para tentar novamente.'}</span>{status==='won'?<button className="primary" onClick={backToModes}>Escolher outro modo <ChevronRight size={16}/></button>:<button className="primary" onClick={begin}>{status==='ready'?'Começar':'Jogar novamente'} <ChevronRight size={16}/></button>}</div>}
 </div>
 <div className="flap-game-info"><span><Zap size={15}/> 1 ponto por obstáculo · 2 XP por ponto</span><b>{score}{mode?.id==='infinite'?' pontos':' / 100'}</b></div>
 <div className="flap-progress-track"><i style={{width:(mode?.id==='infinite'?Math.min(100,score):Math.min(100,score))+'%'}}/></div>
 <div className="flap-best-score"><Trophy size={14}/> {mode?.id==='infinite'?'Recorde infinito: '+infiniteBest:'Melhor pontuação geral: '+bestScore}</div>
 </>}
 <div className="flap-customization"><div className="flap-custom-group"><b>ROUPAS DO MASCOTE</b><div className="flap-skin-grid">{birdItems.map(item=>{const unlocked=item.story?!!unlockedStories[item.story]:bestScore>=item.unlock;return <button key={item.id} disabled={!unlocked} className={'flap-skin '+(birdSkin===item.id?'selected':'')+(!unlocked?' locked':'')} onClick={()=>setBirdSkin(item.id)}><span>{unlocked?item.icon:'🔒'}</span><strong>{item.name}</strong><small>{unlocked?'DESBLOQUEADO':item.story?'Zere '+modes.find(x=>x.id===item.story).name: item.unlock+' pontos'}</small></button>})}</div></div><div className="flap-custom-group"><b>DECORAÇÕES DOS CANOS</b><div className="flap-skin-grid">{pipeItems.map(item=><button key={item.id} disabled={bestScore<item.unlock} className={'flap-skin '+(pipeSkin===item.id?'selected':'')+(bestScore<item.unlock?' locked':'')} onClick={()=>setPipeSkin(item.id)}><span>{bestScore>=item.unlock?item.icon:'🔒'}</span><strong>{item.name}</strong><small>{bestScore>=item.unlock?'DESBLOQUEADO':item.unlock+' pontos'}</small></button>)}</div></div></div>
 </div>
}

function SetupScreen(){return <div className="setup-shell"><div className="setup-card"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Vamos conectar seu espaço privado</h1><p>O visual do site está pronto. Para ativar o login e salvar seus dados com segurança, configure seu projeto Supabase e as variáveis de ambiente.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL do projeto e a chave pública (anon/publishable) para um arquivo <code>.env</code>.</li><li>Ative o cadastro por e-mail em Authentication → Sign In / Providers. Assim, as pessoas poderão criar uma conta pela tela inicial.</li><li>Reinicie o site.</li></ol><div className="setup-warning"><ShieldCheck size={18}/><span>Nunca coloque a chave <b>service_role</b> no site. Use apenas a chave pública e mantenha o Row Level Security (RLS) ativo.</span></div></div></div>}
export default App;