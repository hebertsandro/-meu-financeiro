import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChartNoAxesCombined,
  Check, ChevronRight, CircleDollarSign, CreditCard, LayoutDashboard, LockKeyhole, Pencil, CalendarClock,
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
  ['Visão geral',LayoutDashboard,'overview'],['Movimentações',Activity,'transactions'],
  ['Cartões',CreditCard,'cards'],['Contas e dívidas',ReceiptText,'debts'],
  ['Metas',Target,'goals'],['Parcelas',CalendarClock,'installments'],['Notificações',Bell,'notifications'],['Relatórios',ChartNoAxesCombined,'reports']
];

function App(){
  const [session,setSession]=useState(null), [loading,setLoading]=useState(true);
  const [page,setPage]=useState('overview'), [mobileMenu,setMobileMenu]=useState(false);
  const [data,setData]=useState({transactions:[],cards:[],debts:[],goals:[],installments:[],card_limit_history:[],goal_movements:[],notifications:[]});
  const [modal,setModal]=useState(null), [toast,setToast]=useState('');
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authError,setAuthError]=useState(''), [authMode,setAuthMode]=useState('login'), [authNotice,setAuthNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [adminUsers,setAdminUsers]=useState([]),[adminBusy,setAdminBusy]=useState(false),[adminError,setAdminError]=useState(''),[adminMessage,setAdminMessage]=useState(''),[maintenance,setMaintenance]=useState(false),[maintenanceMessage,setMaintenanceMessage]=useState('Estamos realizando uma manutenção. Voltaremos em breve.');
  const [maintenanceCheckDone,setMaintenanceCheckDone]=useState(false);
  const isAdmin=session?.user?.email?.toLowerCase()===ADMIN_EMAIL;

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
    const tables=['transactions','cards','debts','goals','installments','card_limit_history','goal_movements','notifications'];
    const results=await Promise.all(tables.map(t=>supabase.from(t).select('*').order(t==='card_limit_history'?'changed_at':'created_at',{ascending:false})));
    const next={};
    results.forEach((r,i)=>{next[tables[i]]=r.data||[]});
    setData(next);
  }
  async function saveItem(table, values){
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
    const {error}=await supabase.from(table).insert({...values,user_id:session.user.id});
    setBusy(false);
    if(error){notify('Não foi possível salvar. Confira se o banco foi configurado.');return false}
    await loadData();setModal(null);notify('Salvo com sucesso!');const messages={transactions:values.type==='entrada'?['Entrada registrada',(values.description||'Sua entrada')+': '+brl(values.amount)+' registrada.','entradas']:['Gasto registrado',(values.description||'Novo gasto')+': '+brl(values.amount)+' registrado.','gastos'],debts:['Conta adicionada',values.title+': '+brl(values.amount)+' cadastrada.','contas'],installments:['Compra parcelada adicionada',values.description+': '+values.installment_count+' parcelas de aproximadamente '+brl(Number(values.total_amount)/Number(values.installment_count))+'.','parcelas'],goals:['Nova meta criada','A meta '+values.name+' foi adicionada.','metas']};if(messages[table])await addNotification(...messages[table]);return true;
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
    if(error||result?.error){setAdminError(result?.error||'Não foi possível concluir a ação. Verifique se a função administrativa foi publicada e configurada.');return}
    if(action==='list_users'){setAdminUsers(result.users||[]);setAdminMessage('Lista de contas atualizada.');return}
    if(action==='get_maintenance'){setMaintenance(!!result.settings?.maintenance_mode);setMaintenanceMessage(result.settings?.maintenance_message||'Estamos realizando uma manutenção. Voltaremos em breve.');return}
    if(action==='set_maintenance'){setMaintenance(!!result.maintenance_mode);setAdminMessage(result.maintenance_mode?'Modo manutenção ativado.':'Modo manutenção desativado.');return}
    if(action==='reset_password'){setAdminMessage('Link de redefinição gerado: '+(result.action_link||'Confira o e-mail do usuário.'));return}
    setAdminMessage(action==='ban_user'?'Conta bloqueada.':action==='unban_user'?'Conta desbloqueada.':'Conta excluída definitivamente.');
    await adminAction('list_users');
  }
  async function deleteItem(table,id){
    const {error}=await supabase.from(table).delete().eq('id',id);
    if(error){notify('Não foi possível excluir.');return}
    await loadData();notify('Registro excluído.');
  }

  const currentMonth=monthStart();
  const income=data.transactions.filter(t=>t.type==='entrada'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const expenses=data.transactions.filter(t=>t.type==='gasto'&&t.date>=currentMonth).reduce((a,t)=>a+Number(t.amount),0);
  const paidIn=data.transactions.filter(t=>t.type==='entrada').reduce((a,t)=>a+Number(t.amount),0);
  const paidOut=data.transactions.filter(t=>t.type==='gasto').reduce((a,t)=>a+Number(t.amount),0);
  const balance=paidIn-paidOut;
  const openDebts=data.debts.filter(d=>d.status!=='Pago').reduce((a,d)=>a+Number(d.amount),0);
  const cardUsed=data.cards.reduce((a,c)=>a+Number(c.used||0),0);
  const goalTotal=data.goals.reduce((a,g)=>a+Math.max(0,Number(g.target)-Number(g.saved)),0);
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
    <main className="main-area"><header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><div className="crumb">Meu espaço <ChevronRight size={14}/><b>{[...menu,...(isAdmin?[['Painel ADM',ShieldCheck,'admin']]:[])].find(x=>x[2]===page)?.[0]||'Visão geral'}</b></div><div className="top-actions"><button className="notification-bell" aria-label="Abrir notificações" onClick={()=>setPage("notifications")}><Bell size={18}/>{unreadCount>0&&<i>{unreadCount>9?"9+":unreadCount}</i>}</button><span className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span><div className="avatar">EU</div></div></header>
    <div className="content">
      <div className="page-heading"><div><div className="eyebrow">SEU DINHEIRO, MAIS CLARO</div><h1>{page==='overview'?'Visão geral':page==='admin'?'Painel administrativo':menu.find(x=>x[2]===page)?.[0]}</h1><p>{page==='admin'?'Gerencie contas com acesso administrativo protegido no servidor.':page==='overview'?'Aqui está um resumo da sua vida financeira.':page==='transactions'?'Registre o que entra e o que sai.':page==='cards'?'Acompanhe os limites e o uso dos seus cartões.':page==='debts'?'Organize contas, parcelas e dívidas.':page==='goals'?'Transforme planos em metas possíveis.':page==='installments'?'Acompanhe compras parceladas e quando cada uma termina.':'Entenda seus hábitos financeiros.'}</p></div>{['transactions','cards','debts','goals','installments'].includes(page)&&<button className="primary" onClick={()=>setModal(page)}><Plus size={18}/> Adicionar</button>}</div>
      {page==='admin'&&isAdmin&&<section className="panel">
        <div className="panel-head"><div><h3>Administração de contas</h3><p>Área exclusiva do administrador · ações verificadas pela Edge Function</p></div><div className="item-actions"><button className="delete-btn" disabled={adminBusy} onClick={()=>adminAction('get_maintenance')}>Consultar manutenção</button><button className="primary" disabled={adminBusy} onClick={()=>adminAction('list_users')}><RefreshCw size={16}/> Atualizar contas</button></div></div>
        <div className="stat-grid"><Stat icon={Users} label="Contas carregadas" value={String(adminUsers.length)} tone="blue" detail="Lista retornada pelo Supabase Auth"/><Stat icon={ShieldCheck} label="Acesso" value="Protegido" tone="green" detail="Validação também no servidor"/></div>
        <div className="history-box"><h3>Disponibilidade do site</h3><p className="muted">Ative a manutenção para impedir o uso normal do sistema durante ajustes. O painel administrativo continua acessível.</p><label className="field-label">Mensagem exibida aos usuários</label><input value={maintenanceMessage} maxLength={240} onChange={e=>setMaintenanceMessage(e.target.value)}/><div className="item-actions"><button className="primary" disabled={adminBusy} onClick={()=>adminAction('set_maintenance',null,{enabled:!maintenance,message:maintenanceMessage})}>{maintenance?'Desativar manutenção':'Ativar manutenção'}</button><b>{maintenance?'Manutenção ativa':'Site liberado'}</b></div></div>
        {adminError&&<div className="error">{adminError}</div>}{adminMessage&&<div className="auth-notice">{adminMessage}</div>}
        {!adminUsers.length?<Empty icon={Users} title="Carregue as contas cadastradas" text="Toque em Atualizar contas para consultar os usuários do Supabase."/>:<div className="simple-list">{adminUsers.map(u=><div className="simple-row" key={u.id}><div className="row-icon"><Users size={18}/></div><div className="row-main"><b>{u.email||'Sem e-mail'}</b><span>{u.id} · Criada em {u.created_at?new Date(u.created_at).toLocaleDateString('pt-BR'):'—'}</span><span>{u.banned_until&&new Date(u.banned_until)>new Date()?'Bloqueada':'Ativa'} · Último acesso: {u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('pt-BR'):'Nunca'}</span></div><button className="delete-btn" disabled={adminBusy||u.email?.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction(u.banned_until&&new Date(u.banned_until)>new Date()?'unban_user':'ban_user',u.id)}>{u.banned_until&&new Date(u.banned_until)>new Date()?<><UserCheck size={15}/> Desbloquear</>:<><Ban size={15}/> Bloquear</>}</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('reset_password',u.id)}><KeyRound size={15}/> Redefinir senha</button><button className="delete-btn" disabled={adminBusy||!u.email||u.email.toLowerCase()===ADMIN_EMAIL} onClick={()=>adminAction('delete_user',u.id)}><X size={15}/> Excluir conta</button></div>)}</div>}
        <p className="muted">A exclusão de contas é definitiva e não pode ser desfeita. Por segurança, o painel nunca exibe senhas. A redefinição gera um link seguro do Supabase. A conta administradora não pode ser bloqueada por esta tela.</p>
      </section>}
      {page==='overview'&&<><div className="hero-card"><div className="hero-copy"><div className="hero-label"><CircleDollarSign size={16}/> RESUMO GERAL</div><div className="hero-title">Seu saldo registrado</div><div className="hero-balance">{brl(balance)}</div><div className="hero-note"><span className="status-dot"/>Calculado com as movimentações que você registrou</div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-coin"><Wallet size={39}/></div><div className="floating-chip"><TrendingUp size={16}/><span>Controle em dia</span></div></div></div>
      <div className="stat-grid"><Stat icon={ArrowDownLeft} label="Entradas do mês" value={brl(income)} tone="green" detail="Recebimentos registrados"/><Stat icon={ArrowUpRight} label="Gastos do mês" value={brl(expenses)} tone="red" detail="Despesas registradas"/><Stat icon={CreditCard} label="Uso dos cartões" value={brl(cardUsed)} tone="blue" detail={`${data.cards.length} cartão(ões) cadastrado(s)`}/><Stat icon={ReceiptText} label="Contas em aberto" value={brl(openDebts)} tone="purple" detail={`${data.debts.filter(d=>d.status!=='Pago').length} registro(s) pendente(s)`}/></div>
      <div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Fluxo financeiro</h3><p>Entradas e gastos dos últimos 6 meses</p></div><span className="panel-icon"><TrendingUp size={18}/></span></div><div className="chart-wrap">{chartData.some(d=>d.Entradas||d.Gastos)?<ResponsiveContainer width="100%" height={220}><AreaChart data={chartData} margin={{top:10,right:8,left:-20,bottom:0}}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35d39a" stopOpacity={.22}/><stop offset="95%" stopColor="#35d39a" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7085" stopOpacity={.2}/><stop offset="95%" stopColor="#ff7085" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#263044" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="month" tick={{fill:'#8290a8',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#8290a8',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip contentStyle={{background:'#111a2a',border:'1px solid #2b3850',borderRadius:12,color:'#f4f7fc'}} formatter={v=>brl(v)}/><Area type="monotone" dataKey="Entradas" stroke="#35d39a" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="Gastos" stroke="#ff7085" strokeWidth={2.5} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer>:<Empty icon={ChartNoAxesCombined} title="Seu gráfico começa aqui" text="Registre entradas e gastos para ver sua evolução."/>}</div><div className="legend"><span><i className="green-dot"/> Entradas</span><span><i className="red-dot"/> Gastos</span></div></section>
      <section className="panel"><div className="panel-head"><div><h3>Insights para você</h3><p>Sugestões com base nos registros</p></div><span className="panel-icon insight"><Activity size={18}/></span></div><div className="insights">{suggestions.map((s,i)=><div className="insight-row" key={i}><div className="insight-mark">{i===0?<TrendingUp size={17}/>:i===1?<Bell size={17}/>:<Check size={17}/>}</div><p>{s}</p></div>)}</div><div className="insight-disclaimer">Dicas informativas baseadas nos dados registrados, não aconselhamento financeiro profissional.</div></section></div>
      <section className="panel recent-panel"><div className="panel-head"><div><h3>Últimas movimentações</h3><p>Seus registros mais recentes</p></div><button className="text-button" onClick={()=>setPage('transactions')}>Ver todas <ChevronRight size={16}/></button></div><TransactionList items={data.transactions.slice(0,5)} onDelete={id=>deleteItem('transactions',id)}/></section></>}
      {page==='transactions'&&<section className="panel"><div className="panel-head"><div><h3>Movimentações</h3><p>Entradas e gastos registrados</p></div></div><TransactionList items={data.transactions} onDelete={id=>deleteItem('transactions',id)}/></section>}
      {page==='cards'&&<section className="panel"><div className="panel-head"><div><h3>Meus cartões</h3><p>Limite total disponível calculado com os dados informados</p></div></div>{data.cards.length?<div className="item-grid">{data.cards.map(c=><div className="finance-item" key={c.id}><div className="item-top"><span className="panel-icon"><CreditCard size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>changeCardLimit(c)}>Editar limite</button><button className="delete-btn" onClick={()=>deleteItem('cards',c.id)}>Excluir</button></div></div><h3>{c.name}</h3><div className="item-number">{brl(c.used)} <small>utilizados</small></div><div className="progress"><i style={{width:`${Math.min(100,Number(c.limit_amount)?Number(c.used)/Number(c.limit_amount)*100:0)}%`}}/></div><div className="item-meta"><span>Limite {brl(c.limit_amount)}</span><b>Disponível {brl(Number(c.limit_amount)-Number(c.used))}</b></div>{c.due_day&&<p className="muted">Vencimento: dia {c.due_day}</p>}{data.installments.filter(i=>i.card_id===c.id).length>0&&<div className="goal-history"><b>Compras parceladas neste cartão</b>{data.installments.filter(i=>i.card_id===c.id).map(i=><span key={i.id}>{i.description} · {brl(Number(i.total_amount)/Number(i.installment_count))}/mês · {Number(i.paid_count||0)}/{i.installment_count} pagas</span>)}</div>}<button className="delete-btn" onClick={()=>setModal({type:'installments',cards:data.cards,card_id:c.id})}>+ Adicionar parcela neste cartão</button></div>)}</div>:<Empty icon={CreditCard} title="Nenhum cartão cadastrado" text="Adicione um cartão para acompanhar limite e uso."/>}{data.card_limit_history.length>0&&<div className="history-box"><h3>Histórico de alterações de limite</h3>{data.card_limit_history.slice(0,8).map(h=><div className="history-row" key={h.id}><span>{data.cards.find(c=>c.id===h.card_id)?.name||'Cartão'}</span><span>{brl(h.previous_limit)} → <b>{brl(h.new_limit)}</b></span><small>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</small></div>)}</div>}</section>}
      {page==='installments'&&<section className="panel"><div className="panel-head"><div><h3>Compras parceladas</h3><p>Veja o valor mensal, o que falta pagar e a previsão de término.</p></div></div>{data.installments.length?<div className="simple-list">{data.installments.map(i=>{const monthly=Number(i.total_amount)/Number(i.installment_count);const remaining=Number(i.installment_count)-Number(i.paid_count||0);const end=new Date(`${i.first_due_date}T12:00:00`);end.setMonth(end.getMonth()+Number(i.installment_count)-1);return <div className="simple-row" key={i.id}><div className="row-icon"><CalendarClock size={18}/></div><div className="row-main"><b>{i.description}</b><span>{i.paid_count||0}/{i.installment_count} pagas · faltam {remaining} · termina em {end.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'})}</span><span>{brl(monthly)} por mês · primeira parcela {new Date(i.first_due_date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><strong>{brl(i.total_amount)}</strong><button className="delete-btn" onClick={async()=>{const next=Math.min(Number(i.installment_count),Number(i.paid_count||0)+1);const {error}=await supabase.from('installments').update({paid_count:next}).eq('id',i.id);if(error)notify('Não foi possível atualizar as parcelas.');else{await loadData();notify('Parcela marcada como paga.')}}}>Pagar próxima</button><button className="delete-btn" onClick={()=>deleteItem('installments',i.id)}>Excluir</button></div>})}</div>:<Empty icon={CalendarClock} title="Nenhuma compra parcelada" text="Cadastre uma compra para acompanhar parcelas e data de término."/>}</section>}
      {page==='debts'&&<section className="panel"><div className="panel-head"><div><h3>Contas e dívidas</h3><p>Marque o que já foi pago e mantenha tudo organizado</p></div></div>{data.debts.length?<div className="simple-list">{data.debts.map(d=><div className="simple-row" key={d.id}><div className="row-icon"><ReceiptText size={18}/></div><div className="row-main"><b>{d.title}</b><span>{d.due_date?`Vence em ${new Date(d.due_date+'T12:00:00').toLocaleDateString('pt-BR')}`:'Sem vencimento informado'} · {d.status}</span></div><strong>{brl(d.amount)}</strong><button className="delete-btn" onClick={()=>deleteItem('debts',d.id)}>Excluir</button></div>)}</div>:<Empty icon={ReceiptText} title="Tudo começa com um registro" text="Cadastre contas, parcelas e dívidas para acompanhar os vencimentos."/>}</section>}
      {page==='goals'&&<section className="panel"><div className="panel-head"><div><h3>Minhas metas</h3><p>Acompanhe o progresso de cada objetivo</p></div></div>{data.goals.length?<div className="item-grid">{data.goals.map(g=>{const pct=Math.min(100,Number(g.target)?Number(g.saved)/Number(g.target)*100:0);return <div className="finance-item" key={g.id}><div className="item-top"><span className="panel-icon"><Target size={20}/></span><div className="item-actions"><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'deposito'})}}>Depositar</button><button className="delete-btn" onClick={()=>{setModal({type:'goalMovement',goal:g,movement_type:'retirada'})}}>Retirar</button><button className="delete-btn" onClick={()=>deleteItem('goals',g.id)}>Excluir</button></div></div><h3>{g.name}</h3><div className="item-number">{brl(g.saved)} <small>de {brl(g.target)}</small></div><div className="progress goal-progress"><i style={{width:`${pct}%`}}/></div><div className="item-meta"><span>{pct.toFixed(0)}% concluído</span><b>Faltam {brl(Number(g.target)-Number(g.saved))}</b></div>{g.deadline&&<p className="muted">Prazo: {new Date(g.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</p>}{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).length>0&&<div className="goal-history"><b>Últimas movimentações</b>{data.goal_movements.filter(m=>m.goal_id===g.id).slice(0,3).map(m=><span key={m.id}>{m.movement_type==='deposito'?'+':'−'} {brl(m.amount)} · {new Date(m.created_at).toLocaleDateString('pt-BR')}</span>)}</div>}</div>})}</div>:<Empty icon={Target} title="Qual é o seu próximo objetivo?" text="Crie uma meta e acompanhe quanto falta para alcançá-la."/>}</section>}
      {page==='notifications'&&<section className="panel"><div className="panel-head"><div><h3>Central de notificações</h3><p>{unreadCount?unreadCount+' não lida(s)':'Você está em dia.'}</p></div>{unreadCount>0&&<button className="text-button" onClick={markAllNotificationsRead}>Marcar todas como lidas</button>}</div>{data.notifications.length?<div className="simple-list">{data.notifications.map(n=><div className={'simple-row notification-row '+(n.is_read?'read':'')} key={n.id}><div className="row-icon"><Bell size={18}/></div><div className="row-main"><b>{n.title}</b><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString('pt-BR')} · {n.category}</small></div>{!n.is_read&&<button className="delete-btn" onClick={()=>markNotificationRead(n.id)}>Marcar lida</button>}<button className="delete-btn" onClick={()=>deleteItem('notifications',n.id)}>Excluir</button></div>)}</div>:<Empty icon={Bell} title="Nenhuma notificação por enquanto" text="Avisos sobre seus registros aparecerão aqui."/>}</section>}
      {page==='reports'&&<><div className="stat-grid"><Stat icon={ArrowDownLeft} label="Entradas registradas" value={brl(paidIn)} tone="green" detail="Todo o período"/><Stat icon={ArrowUpRight} label="Gastos registrados" value={brl(paidOut)} tone="red" detail="Todo o período"/><Stat icon={Wallet} label="Saldo calculado" value={brl(balance)} tone="blue" detail="Entradas menos gastos"/><Stat icon={Target} label="Falta para metas" value={brl(goalTotal)} tone="purple" detail="Total restante"/></div><div className="two-col"><section className="panel"><div className="panel-head"><div><h3>Fluxo dos últimos meses</h3><p>Comparação mensal</p></div></div><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}><CartesianGrid stroke="#263044" strokeDasharray="4 4"/><XAxis dataKey="month" tick={{fill:'#8290a8',fontSize:11}}/><YAxis tick={{fill:'#8290a8',fontSize:10}}/><Tooltip formatter={v=>brl(v)}/><Area dataKey="Entradas" stroke="#35d39a" fill="#35d39a" fillOpacity={.12}/><Area dataKey="Gastos" stroke="#ff7085" fill="#ff7085" fillOpacity={.12}/></AreaChart></ResponsiveContainer></section><section className="panel"><div className="panel-head"><div><h3>Gastos por categoria</h3><p>Distribuição registrada</p></div></div>{categories.length?<div className="category-list">{categories.map(c=><div className="category-row" key={c.name}><span>{c.name}</span><b>{brl(c.value)}</b><div className="progress"><i style={{width:`${Math.min(100,c.value/Math.max(...categories.map(x=>x.value))*100)}%`}}/></div></div>)}</div>:<Empty icon={ChartNoAxesCombined} title="Sem dados suficientes" text="Registre despesas e escolha categorias para ver a análise."/ >}</section></div></>}
      <footer className="footer"><span>MEU FINANCEIRO <i>•</i> FEITO PARA SUA ROTINA</span><span><ShieldCheck size={14}/> Seus dados dependem da configuração segura da sua conta</span></footer>
    </div></main>
    {modal&&<EntryModal type={typeof modal==='string'?modal:modal.type} extra={typeof modal==='string'?(modal==='installments'?{cards:data.cards}:null):modal} onClose={()=>setModal(null)} onSave={saveItem} busy={busy}/>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function Stat({icon:Icon,label,value,tone,detail}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>}
function Empty({icon:Icon,title,text}){return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><b>{title}</b><p>{text}</p></div>}
function TransactionList({items,onDelete}){return items.length?<div className="transaction-list">{items.map(t=><div className="transaction-row" key={t.id}><div className={`transaction-icon ${t.type}`} >{t.type==='entrada'?<ArrowDownLeft size={19}/>:<ArrowUpRight size={19}/>}</div><div className="transaction-main"><b>{t.description||t.category||'Movimentação'}</b><span>{t.category||'Sem categoria'} · {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div><div className={`transaction-amount ${t.type}`}>{t.type==='entrada'?'+':'−'} {brl(t.amount)}</div><button className="delete-btn" onClick={()=>onDelete(t.id)}>Excluir</button></div>)}</div>:<Empty icon={Activity} title="Ainda não há movimentações" text="Adicione sua primeira entrada ou gasto para começar a acompanhar seu dinheiro."/>}
function EntryModal({type,extra,onClose,onSave,busy}){
 const [f,setF]=useState({date:today(),type:'gasto',category:'Alimentação',status:'Pendente',name:'',description:'',amount:'',limit_amount:'',used:'0',due_day:'',title:'',due_date:'',target:'',saved:'0',deadline:'',installment_count:'2',first_due_date:today(),paid_count:'0',note:'',card_id:extra?.card_id||''});
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 const title={transactions:'Nova movimentação',cards:'Adicionar cartão',debts:'Nova conta ou dívida',goals:'Criar meta',installments:'Nova compra parcelada',goalMovement:extra?.movement_type==='retirada'?'Retirar dinheiro da meta':'Adicionar dinheiro à meta'}[type];
 async function submit(e){e.preventDefault();let table=type,values;
 if(type==='transactions')values={date:f.date,type:f.type,category:f.category,description:f.description,amount:Number(f.amount)};
 if(type==='cards')values={name:f.name,limit_amount:Number(f.limit_amount),used:Number(f.used||0),due_day:f.due_day?Number(f.due_day):null};
 if(type==='debts')values={title:f.title,amount:Number(f.amount),due_date:f.due_date||null,status:f.status};
 if(type==='goals')values={name:f.name,target:Number(f.target),saved:Number(f.saved||0),deadline:f.deadline||null};
 if(type==='installments')values={description:f.description,total_amount:Number(f.amount),installment_count:Number(f.installment_count),first_due_date:f.first_due_date,card_id:f.card_id||null,paid_count:Number(f.paid_count||0)};
 if(type==='goalMovement')values={goal_id:extra.goal.id,movement_type:extra.movement_type,amount:Number(f.amount),note:f.note||null};
 await onSave(table,values);
 }
 return <div className="modal-backdrop" onClick={onClose}><form className="modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ORGANIZE SUAS FINANÇAS</div><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div>
 {type==='transactions'&&<><label>Tipo<select value={f.type} onChange={e=>set('type',e.target.value)}><option value="gasto">Gasto</option><option value="entrada">Entrada</option></select></label><label>Descrição<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: mercado, salário…"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Data<input required type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></label></div><label>Categoria<select value={f.category} onChange={e=>set('category',e.target.value)}>{['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Compras','Salário','Freelance','Contas','Outros'].map(x=><option key={x}>{x}</option>)}</select></label></>}
 {type==='cards'&&<><label>Nome do cartão<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: Cartão principal"/></label><div className="form-row"><label>Limite total (R$)<input required type="number" min="0" step=".01" value={f.limit_amount} onChange={e=>set('limit_amount',e.target.value)} placeholder="0,00"/></label><label>Valor utilizado (R$)<input required type="number" min="0" step=".01" value={f.used} onChange={e=>set('used',e.target.value)}/></label></div><label>Dia do vencimento (opcional)<input type="number" min="1" max="31" value={f.due_day} onChange={e=>set('due_day',e.target.value)} placeholder="Ex.: 10"/></label></>}
 {type==='debts'&&<><label>Nome da conta ou dívida<input required value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Ex.: conta de internet"/></label><div className="form-row"><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Vencimento<input type="date" value={f.due_date} onChange={e=>set('due_date',e.target.value)}/></label></div><label>Situação<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Pendente</option><option>Pago</option></select></label></>}
 {type==='installments'&&<><label>O que foi comprado?<input required value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Ex.: celular, televisão…"/></label><div className="form-row"><label>Valor total (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)}/></label><label>Quantidade de parcelas<input required type="number" min="2" max="120" value={f.installment_count} onChange={e=>set('installment_count',e.target.value)}/></label></div><label>Data de vencimento da 1ª parcela<input required type="date" value={f.first_due_date} onChange={e=>set('first_due_date',e.target.value)}/></label><label>Cartão (opcional)<select value={f.card_id||''} onChange={e=>set('card_id',e.target.value)}><option value="">Não vincular a um cartão</option>{(extra?.cards||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="muted">Valor aproximado por parcela: {brl(Number(f.amount||0)/Math.max(1,Number(f.installment_count||1)))}</p></>}
 {type==='goalMovement'&&<><p className="muted">Meta: {extra?.goal?.name} · Saldo atual: {brl(extra?.goal?.saved)}</p><label>Valor (R$)<input required type="number" min="0.01" step=".01" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00"/></label><label>Observação (opcional)<input value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Ex.: dinheiro separado do salário"/></label></>}
 {type==='goals'&&<><label>Nome da meta<input required value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Ex.: reserva de emergência"/></label><div className="form-row"><label>Quanto quero juntar (R$)<input required type="number" min=".01" step=".01" value={f.target} onChange={e=>set('target',e.target.value)} placeholder="1000,00"/></label><label>Já tenho (R$)<input type="number" min="0" step=".01" value={f.saved} onChange={e=>set('saved',e.target.value)}/></label></div><label>Prazo (opcional)<input type="date" value={f.deadline} onChange={e=>set('deadline',e.target.value)}/></label></>}
 <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}><Plus size={17}/>{busy?'Salvando…':'Salvar registro'}</button></div></form></div>
}
function SetupScreen(){return <div className="setup-shell"><div className="setup-card"><div className="brand"><div className="brand-icon"><Wallet size={22}/></div><span>meu<span className="brand-accent">financeiro</span></span></div><div className="setup-symbol"><LockKeyhole size={28}/></div><h1>Vamos conectar seu espaço privado</h1><p>O visual do site está pronto. Para ativar o login e salvar seus dados com segurança, configure seu projeto Supabase e as variáveis de ambiente.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL do projeto e a chave pública (anon/publishable) para um arquivo <code>.env</code>.</li><li>Ative o cadastro por e-mail em Authentication → Sign In / Providers. Assim, as pessoas poderão criar uma conta pela tela inicial.</li><li>Reinicie o site.</li></ol><div className="setup-warning"><ShieldCheck size={18}/><span>Nunca coloque a chave <b>service_role</b> no site. Use apenas a chave pública e mantenha o Row Level Security (RLS) ativo.</span></div></div></div>}
export default App;