import React,{useCallback,useEffect,useState} from 'react';
import {Search,Users,UserPlus,Check,X,RefreshCw,ShieldCheck,UserRound,AtSign,MessageCircle,Lock} from 'lucide-react';
import {supabase} from './supabase';

const initials=(name='')=>String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'NX';

export default function NexusSocial({session,playerProfile,onPlayerProfileChange=()=>{},onToast=()=>{}}){
 const userId=session?.user?.id;
 const [profile,setProfile]=useState(null),[name,setName]=useState(''),[username,setUsername]=useState(''),[bio,setBio]=useState('');
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[friends,setFriends]=useState([]),[incoming,setIncoming]=useState([]),[outgoing,setOutgoing]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState('friends');
 const load=useCallback(async()=>{
  if(!userId||!supabase)return;
  setLoading(true);setError('');
  try{
   const [p,f,inc,out]=await Promise.all([
    supabase.from('social_profiles').select('*').eq('user_id',userId).maybeSingle(),
    supabase.from('social_friendships').select('id,user_a,user_b,created_at').or('user_a.eq.'+userId+',user_b.eq.'+userId).order('created_at',{ascending:false}),
    supabase.from('social_friend_requests').select('id,sender_id,receiver_id,created_at').eq('receiver_id',userId).eq('status','pending').order('created_at',{ascending:false}),
    supabase.from('social_friend_requests').select('id,sender_id,receiver_id,created_at').eq('sender_id',userId).eq('status','pending').order('created_at',{ascending:false})
   ]);
   for(const r of [p,f,inc,out])if(r.error)throw r.error;
   const prof=p.data;setProfile(prof);setName(prof?.display_name||playerProfile?.name||session.user.user_metadata?.name||'');setUsername(prof?.username||'');setBio(prof?.bio||'');
   if(prof?.display_name&&prof.display_name!==playerProfile?.name)onPlayerProfileChange(p=>({...p,name:prof.display_name}));
   if(prof?.avatar&&prof.avatar!==playerProfile?.avatar)onPlayerProfileChange(p=>({...p,avatar:prof.avatar}));
   const ids=[...new Set([...(f.data||[]).map(x=>x.user_a===userId?x.user_b:x.user_a),...(inc.data||[]).map(x=>x.sender_id),...(out.data||[]).map(x=>x.receiver_id)])];
   const people=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,bio,avatar').in('user_id',ids):{data:[],error:null};
   if(people.error)throw people.error;
   const map=Object.fromEntries((people.data||[]).map(x=>[x.user_id,x]));
   setFriends((f.data||[]).map(x=>({...x,person:map[x.user_a===userId?x.user_b:x.user_a]})).filter(x=>x.person));
   setIncoming((inc.data||[]).map(x=>({...x,person:map[x.sender_id]})).filter(x=>x.person));
   setOutgoing((out.data||[]).map(x=>({...x,person:map[x.receiver_id]})).filter(x=>x.person));
  }catch(e){setError(e.message||'Não foi possível carregar o NEXUS Social.');}
  finally{setLoading(false);}
 },[userId,session]);
 useEffect(()=>{load()},[load]);
 async function saveProfile(e){
  e.preventDefault();if(!userId)return;
  const clean=username.toLowerCase().trim();
  if(!/^[a-z0-9_]{3,20}$/.test(clean)){setError('O usuário deve ter de 3 a 20 caracteres: letras, números ou _.');return;}
  setBusy(true);setError('');
  const syncedName=name.trim().slice(0,40);const syncedAvatar=playerProfile?.avatar||'👾';
  const {error:e1}=await supabase.from('social_profiles').upsert({user_id:userId,username:clean,display_name:syncedName,bio:bio.trim().slice(0,160),avatar:syncedAvatar,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(e1)setError(e1.code==='23505'?'Esse nome de usuário já está em uso.':e1.message);else{onPlayerProfileChange(p=>({...p,name:syncedName,avatar:syncedAvatar}));onToast('Perfil do jogador e perfil social sincronizados!');load();}
  setBusy(false);
 }
 async function searchPeople(e){
  e?.preventDefault();const q=query.trim().replace(/^@/,'');if(q.length<2){setResults([]);return;}
  setBusy(true);setError('');
  const {data,error:e1}=await supabase.from('social_profiles').select('user_id,username,display_name,bio,avatar').ilike('username','%'+q+'%').neq('user_id',userId).limit(20);
  if(e1)setError(e1.message);else setResults(data||[]);
  setBusy(false);
 }
 async function requestFriend(id){
  setBusy(true);setError('');
  const {error:e1}=await supabase.from('social_friend_requests').insert({sender_id:userId,receiver_id:id});
  if(e1)setError(e1.code==='23505'?'Já existe uma solicitação ou amizade.':e1.message);else{onToast('Solicitação enviada!');setResults(r=>r.filter(x=>x.user_id!==id));load();}
  setBusy(false);
 }
 async function answerRequest(id,status){
  setBusy(true);setError('');
  const {error:e1}=await supabase.rpc('social_respond_friend_request',{request_id:id,accept_request:status==='accepted'});
  if(e1)setError(e1.message);else{onToast(status==='accepted'?'Amizade adicionada!':'Solicitação recusada.');load();}
  setBusy(false);
 }
 if(!userId)return <section className="social-empty"><Lock/><h3>Entre na sua conta</h3><p>O NEXUS Social funciona com uma conta autenticada.</p></section>;
 return <section className="nexus-social">
  <div className="social-hero"><div><span>SEU UNIVERSO, SUA COMUNIDADE</span><h2>NEXUS <em>Social</em></h2><p>Conheça pessoas, construa amizades e evolua em comunidade.</p></div><div className="social-hero-icon"><Users size={34}/></div></div>
  {error&&<div className="social-error" role="alert">{error}</div>}
  <div className="social-layout">
   <div className="social-main">
    <div className="social-tabs"><button className={tab==='friends'?'active':''} onClick={()=>setTab('friends')}><Users size={16}/> Amigos</button><button className={tab==='discover'?'active':''} onClick={()=>setTab('discover')}><Search size={16}/> Descobrir</button><button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}><UserPlus size={16}/> Solicitações {incoming.length>0&&<b>{incoming.length}</b>}</button></div>
    {loading?<div className="social-loading"><span className="spinner"/> Carregando comunidade...</div>:<>
     {tab==='friends'&&<div className="social-panel"><div className="social-panel-heading"><div><h3>Suas amizades</h3><p>{friends.length} conexão(ões) na sua rede</p></div><button className="social-icon-button" onClick={load} aria-label="Atualizar"><RefreshCw size={17}/></button></div>{friends.length?<div className="social-people">{friends.map(x=><article className="social-person" key={x.id}><div className="social-avatar">{x.person.avatar||initials(x.person.display_name)}</div><div className="social-person-info"><b>{x.person.display_name||x.person.username}</b><small>@{x.person.username}</small>{x.person.bio&&<p>{x.person.bio}</p>}</div><span className="social-friend-tag"><Check size={13}/> Amigo</span></article>)}</div>:<div className="social-empty-inline"><Users size={28}/><b>Sua comunidade começa aqui</b><p>Encontre pessoas e envie sua primeira solicitação de amizade.</p><button className="social-primary" onClick={()=>setTab('discover')}>Encontrar pessoas <Search size={15}/></button></div>}</div>}
     {tab==='discover'&&<div className="social-panel"><div className="social-panel-heading"><div><h3>Encontrar pessoas</h3><p>Busque pelo nome de usuário.</p></div></div><form className="social-search" onSubmit={searchPeople}><AtSign size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite um @usuário"/><button disabled={busy||query.trim().length<2}><Search size={16}/> Buscar</button></form><div className="social-people">{results.map(p=><article className="social-person" key={p.user_id}><div className="social-avatar">{p.avatar||initials(p.display_name)}</div><div className="social-person-info"><b>{p.display_name||p.username}</b><small>@{p.username}</small>{p.bio&&<p>{p.bio}</p>}</div><button className="social-add-button" disabled={busy} onClick={()=>requestFriend(p.user_id)}><UserPlus size={15}/> Adicionar</button></article>)}</div>{!results.length&&<div className="social-empty-inline"><Search size={26}/><p>Pesquise um nome de usuário para encontrar pessoas.</p></div>}</div>}
     {tab==='requests'&&<div className="social-panel"><div className="social-panel-heading"><div><h3>Solicitações recebidas</h3><p>Escolha quem deseja adicionar à sua rede.</p></div></div>{incoming.length?<div className="social-people">{incoming.map(x=><article className="social-person" key={x.id}><div className="social-avatar">{x.person.avatar||initials(x.person.display_name)}</div><div className="social-person-info"><b>{x.person.display_name||x.person.username}</b><small>@{x.person.username}</small></div><div className="social-request-actions"><button aria-label="Aceitar" disabled={busy} onClick={()=>answerRequest(x.id,'accepted')}><Check size={16}/></button><button aria-label="Recusar" disabled={busy} onClick={()=>answerRequest(x.id,'rejected')}><X size={16}/></button></div></article>)}</div>:<div className="social-empty-inline"><UserPlus size={26}/><p>Nenhuma solicitação recebida no momento.</p></div>}{outgoing.length>0&&<div className="social-outgoing"><b>Enviadas ({outgoing.length})</b>{outgoing.map(x=><span key={x.id}>@{x.person.username}</span>)}</div>}</div>}
    </>}
   </div>
   <aside className="social-side"><div className="social-panel social-profile-editor"><div className="social-panel-heading"><div><h3>Seu perfil social</h3><p>Como as pessoas encontram você.</p></div><UserRound size={19}/></div><form onSubmit={saveProfile}><label>Nome de exibição<input maxLength={40} value={name} onChange={e=>setName(e.target.value)} placeholder="Como quer ser chamado?"/></label><label>Nome de usuário<input maxLength={20} value={username} onChange={e=>setUsername(e.target.value)} placeholder="seu_usuario"/></label><label>Sobre você<textarea maxLength={160} rows={3} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Conte um pouco sobre você..."/></label><small className="social-hint">Seu nome de usuário será público. Não coloque telefone, endereço ou dados pessoais na bio.</small><button className="social-primary" disabled={busy||!name.trim()||!username.trim()}>{busy?'Salvando...':'Salvar perfil'}</button></form></div><div className="social-safety-note"><ShieldCheck size={18}/><div><b>Comunidade segura</b><p>Estamos construindo os controles de bloqueio, denúncia e privacidade antes de liberar conversas privadas.</p></div></div></aside>
  </div>
 </section>;
}
