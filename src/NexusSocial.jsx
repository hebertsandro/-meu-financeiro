import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Search,Users,UserPlus,Check,X,RefreshCw,ShieldCheck,UserRound,AtSign,Lock,Eye,CalendarClock,Trophy,Zap,Star,Flame,MessageCircle} from 'lucide-react';
import {supabase} from './supabase';
import NexusCommunity from './NexusCommunity';

const PROFILE_FIELDS='user_id,username,display_name,bio,avatar,avatar_frame,card_frame,equipped_gems,game_xp,game_correct,username_changed_at,is_suspended';
const initials=(name='')=>String(name).trim().split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'NX';
const dateText=value=>value?new Date(value).toLocaleDateString('pt-BR'):'';
const daysUntilChange=value=>{if(!value)return 0;const elapsed=Date.now()-new Date(value).getTime();return Math.max(0,30-Math.floor(elapsed/86400000));};
const achievements=p=>[
 {name:'Primeira vitória',desc:'Acertar uma pergunta',icon:'🏆',unlocked:Number(p.game_correct||0)>=1},
 {name:'Subindo de nível',desc:'Alcançar 500 XP',icon:'⚡',unlocked:Number(p.game_xp||0)>=500},
 {name:'Mente afiada',desc:'Acertar 5 perguntas',icon:'⭐',unlocked:Number(p.game_correct||0)>=5},
 {name:'Explorador',desc:'Alcançar 1.000 XP',icon:'🔥',unlocked:Number(p.game_xp||0)>=1000}
];
function PublicPlayerProfile({person,onClose}){
 const xp=Number(person.game_xp||0),correct=Number(person.game_correct||0),level=Math.floor(xp/500)+1,gems=Array.isArray(person.equipped_gems)?person.equipped_gems:[];
 const tier=xp>=4500?'LENDÁRIO':xp>=2000?'ELITE':xp>=1000?'VETERANO':xp>=500?'EXPLORADOR':'JOGADOR';
 const medals=achievements(person);
 return <div className="social-profile-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="social-public-profile" role="dialog" aria-modal="true" aria-label={'Perfil de '+person.display_name}>
  <header className="social-public-head"><div><span>PERFIL DO JOGADOR</span><h2>Conheça {person.display_name||person.username}</h2></div><button onClick={onClose} aria-label="Fechar perfil"><X size={20}/></button></header>
  <div className={'social-public-card player-card-frame frame-'+(person.card_frame||'cyan')+(gems.length===4?' frame-chromatic':'')}>
   <div className={'frame-gem-ornament ornament-'+(person.card_frame||'cyan')}>{gems.map(id=><i key={id} className={'gemstone gem-'+id}/>)}</div>
   <div className="game-world-top"><span className="world-label"><span className="live-pulse"/> CENTRAL DO JOGADOR</span><span className="season-pill">JORNADA NEXUS</span></div>
   <div className="player-identity"><div className={'player-avatar profile-big-avatar frame-'+(person.avatar_frame||'violet')+(gems.length===4?' frame-chromatic':'')}><span>{person.avatar||'👾'}</span><i><Zap size={12}/></i></div><div className="player-info"><span>{tier}</span><h2>{person.display_name||person.username}</h2><div className="player-social-identity"><b>@{person.username}</b></div>{person.bio&&<p className="player-social-bio">{person.bio}</p>}{person.clan&&<div className="player-clan-badge">{person.clan.clan_emblem} {person.clan.clan_name} [{person.clan.clan_tag}] · {person.clan.clan_role==='leader'?'ADM':person.clan.clan_role==='officer'?'OFICIAL':'MEMBRO'}</div>}<div className="player-level-line"><b>NÍVEL {level}</b><span>{xp%500}/500 XP para o próximo nível</span></div><div className="player-xp-track"><i style={{width:(xp%500)/5+'%'}}/></div></div><div className="player-xp-total"><strong>{xp}</strong><small>XP TOTAL</small></div></div>
   <div className="world-stats"><div><Flame size={17}/><span><b>{correct}</b> desafios concluídos</span></div><div><Trophy size={17}/><span><b>{Math.floor(xp/500)}</b> níveis conquistados</span></div><div><Star size={17}/><span><b>{gems.length}/4</b> joias equipadas</span></div></div>
  </div>
  <div className="social-public-section"><div className="social-public-section-title"><div><span>PROGRESSO</span><h3>Conquistas</h3></div><Trophy size={20}/></div><div className="social-public-achievements">{medals.map(a=><article className={'social-public-achievement '+(a.unlocked?'unlocked':'locked')} key={a.name}><span>{a.icon}</span><div><b>{a.name}</b><small>{a.desc}</small></div><strong>{a.unlocked?'CONQUISTADA':'BLOQUEADA'}</strong></article>)}</div></div>
  <div className="social-public-section"><div className="social-public-section-title"><div><span>PERSONALIZAÇÃO</span><h3>Itens equipados</h3></div></div><div className="social-equipped-items"><span className={'social-equipped-frame frame-'+(person.avatar_frame||'violet')}>Avatar · {person.avatar_frame||'violet'}</span><span className={'social-equipped-frame frame-'+(person.card_frame||'cyan')}>Central · {person.card_frame||'cyan'}</span>{gems.map(g=><span className="social-equipped-gem" key={g}>💎 {g}</span>)}</div></div>
  <footer className="social-public-footer"><ShieldCheck size={16}/> Perfil público somente para visualização. Ninguém pode alterar os dados deste jogador por aqui.</footer>
 </section></div>;
}
export default function NexusSocial({session,playerProfile,gameXp=0,gameCorrect=0,onPlayerProfileChange=()=>{},onToast=()=>{}}){
 const userId=session?.user?.id;
 const [profile,setProfile]=useState(null),[username,setUsername]=useState(''),[bio,setBio]=useState('');
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[friends,setFriends]=useState([]),[incoming,setIncoming]=useState([]),[outgoing,setOutgoing]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState('community'),[viewPerson,setViewPerson]=useState(null);
 const daysLeft=daysUntilChange(profile?.username_changed_at);
 const usernameChanged=!!profile&&username.trim().toLowerCase()!==String(profile.username||'').toLowerCase();
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
   const prof=p.data;const {data:ownClan}=await supabase.rpc('social_get_player_clan',{target_user:userId});const ownClanInfo=ownClan?.[0]||null;const profileWithClan=prof?{...prof,clan:ownClanInfo}:prof;setProfile(profileWithClan);setUsername(prof?.username||'');setBio(prof?.bio||'');
    if(prof)onPlayerProfileChange(prev=>({...prev,username:prof.username||'',bio:prof.bio||'',clan:ownClanInfo}));
   const ids=[...new Set([...(f.data||[]).map(x=>x.user_a===userId?x.user_b:x.user_a),...(inc.data||[]).map(x=>x.sender_id),...(out.data||[]).map(x=>x.receiver_id)])];
   const people=ids.length?await supabase.from('social_profiles').select(PROFILE_FIELDS).in('user_id',ids):{data:[],error:null};
   if(people.error)throw people.error;
   const map=Object.fromEntries((people.data||[]).map(x=>[x.user_id,x]));
   setFriends((f.data||[]).map(x=>({...x,person:map[x.user_a===userId?x.user_b:x.user_a]})).filter(x=>x.person));
   setIncoming((inc.data||[]).map(x=>({...x,person:map[x.sender_id]})).filter(x=>x.person));
   setOutgoing((out.data||[]).map(x=>({...x,person:map[x.receiver_id]})).filter(x=>x.person));
  }catch(e){setError(e.message||'Não foi possível carregar o NEXUS Social.');}
  finally{setLoading(false);}
 },[userId,session,onPlayerProfileChange]);
 useEffect(()=>{load()},[load]);\n  useEffect(()=>{if(!userId)return;const channel=supabase.channel('nexus-social-friends-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'social_friend_requests',filter:'receiver_id=eq.'+userId},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'social_friend_requests',filter:'sender_id=eq.'+userId},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'social_friendships'},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[userId,load]);
 async function saveProfile(e){
  e.preventDefault();if(!userId)return;
  const clean=username.toLowerCase().trim();
  if(!/^[a-z0-9_]{3,20}$/.test(clean)){setError('O @ deve ter de 3 a 20 caracteres: letras, números ou _.');return;}
  if(usernameChanged&&daysLeft>0){setError('Você poderá alterar seu @ novamente em '+daysLeft+' dia(s).');return;}
  setBusy(true);setError('');
  const syncedName=String(playerProfile?.name||session.user.user_metadata?.name||'Jogador').trim().slice(0,40);
  const syncedAvatar=playerProfile?.avatar||'👾';
  const cleanBio=bio.trim().slice(0,160);
  const {data,error:e1}=await supabase.from('social_profiles').upsert({user_id:userId,username:clean,display_name:syncedName,bio:cleanBio,avatar:syncedAvatar,avatar_frame:playerProfile?.frame||'violet',card_frame:playerProfile?.cardFrame||'cyan',equipped_gems:Array.isArray(playerProfile?.gems)?playerProfile.gems:[],game_xp:Number(gameXp||0),game_correct:Number(gameCorrect||0),updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('*').single();
  if(e1)setError(e1.message.includes('30 dias')?'O @ só pode ser alterado a cada 30 dias.':e1.code==='23505'?'Esse @ já está em uso.':e1.message);
  else{setProfile(data);setUsername(data.username);onPlayerProfileChange(p=>({...p,username:data.username,bio:data.bio}));onToast('Seu perfil social foi atualizado!');}
  setBusy(false);
 }
 async function searchPeople(e){
  e?.preventDefault();const q=query.trim().replace(/^@/,'');if(q.length<2){setResults([]);return;}
  setBusy(true);setError('');
  const {data,error:e1}=await supabase.from('social_profiles').select(PROFILE_FIELDS).ilike('username','%'+q+'%').neq('user_id',userId).eq('is_suspended',false).limit(20);
  if(e1)setError(e1.message);else setResults(data||[]);
  setBusy(false);
 }
 async function openPerson(person){
  if(!person?.user_id)return;
  const [{data,error:e1},{data:clanData}]=await Promise.all([supabase.from('social_profiles').select('*').eq('user_id',person.user_id).maybeSingle(),supabase.rpc('social_get_player_clan',{target_user:person.user_id})]);
  if(e1)setError(e1.message);else if(data&&!data.is_suspended)setViewPerson({...data,clan:clanData?.[0]||null});
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
 const personRow=(p,action)=><article className="social-person social-person-clickable" key={p.user_id} onClick={()=>openPerson(p)}><div className={'social-avatar frame-'+(p.avatar_frame||'violet')}>{p.avatar||initials(p.display_name)}</div><div className="social-person-info"><b>{p.display_name||p.username}</b><small>@{p.username}</small>{p.bio&&<p>{p.bio}</p>}<small className="social-person-progress"><Zap size={12}/> {Number(p.game_xp||0)} XP · Nível {Math.floor(Number(p.game_xp||0)/500)+1}</small></div><div className="social-person-actions"><button className="social-view-button" onClick={e=>{e.stopPropagation();openPerson(p)}}><Eye size={15}/> Ver perfil</button>{action}</div></article>;
 if(!userId)return <section className="social-empty"><Lock/><h3>Entre na sua conta</h3><p>O NEXUS Social funciona com uma conta autenticada.</p></section>;
 return <section className="nexus-social">
  <div className="social-hero"><div><span>SEU UNIVERSO, SUA COMUNIDADE</span><h2>NEXUS <em>Social</em></h2><p>Conheça pessoas, visite suas centrais de jogador e construa amizades.</p></div><div className="social-hero-icon"><Users size={34}/></div></div>
  {error&&<div className="social-error" role="alert">{error}</div>}
  <div className="social-layout">
   <div className="social-main">
    <div className="social-tabs"><button className={tab==='community'?'active':''} onClick={()=>setTab('community')}><MessageCircle size={16}/> Conversas {incoming.length>0&&<b>{incoming.length}</b>}</button><button className={tab==='discover'?'active':''} onClick={()=>setTab('discover')}><Search size={16}/> Descobrir</button></div>
    {loading?<div className="social-loading"><span className="spinner"/> Carregando comunidade...</div>:<>
     
     {tab==='discover'&&<div className="social-panel"><div className="social-panel-heading"><div><h3>Encontrar pessoas</h3><p>Busque pelo @usuário e abra a Central do Jogador.</p></div></div><form className="social-search" onSubmit={searchPeople}><AtSign size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite um @usuário"/><button disabled={busy||query.trim().length<2}><Search size={16}/> Buscar</button></form><div className="social-people">{results.map(p=>personRow(p,<button className="social-add-button" disabled={busy} onClick={e=>{e.stopPropagation();requestFriend(p.user_id)}}><UserPlus size={15}/> Adicionar</button>))}</div>{!results.length&&<div className="social-empty-inline"><Search size={26}/><p>Pesquise um nome de usuário para encontrar pessoas.</p></div>}</div>}
     
    </>}
    {tab==='community'&&<NexusCommunity userId={userId} friends={friends} incoming={incoming} outgoing={outgoing} onAnswerFriendRequest={answerRequest} onToast={onToast} onClanChange={clan=>onPlayerProfileChange(p=>({...p,clan}))}/>}
   </div>
   <aside className="social-side"><div className="social-panel social-profile-editor"><div className="social-panel-heading"><div><span className="social-section-kicker">SUA IDENTIDADE</span><h3>Seu perfil social</h3><p>Uma identidade única em todo o Meu Financeiro.</p></div><UserRound size={21}/></div><div className="social-editor-identity"><div className={'social-editor-avatar frame-'+(playerProfile?.frame||'violet')}>{playerProfile?.avatar||'👾'}</div><div><b>{playerProfile?.name||'Seu jogador'}</b><span>@{profile?.username||'seu_usuario'}</span><small>Nome, avatar e molduras vêm de Meu perfil</small></div></div>{profile&&<button type="button" className="social-view-button social-own-preview" onClick={()=>setViewPerson({...profile,display_name:playerProfile?.name||profile.display_name,avatar:playerProfile?.avatar||profile.avatar,avatar_frame:playerProfile?.frame||profile.avatar_frame,card_frame:playerProfile?.cardFrame||profile.card_frame,equipped_gems:playerProfile?.gems||profile.equipped_gems,game_xp:profile.game_xp,game_correct:profile.game_correct,bio})}><Eye size={15}/> Visualizar meu perfil público</button>}<form onSubmit={saveProfile}><label className="social-field-label"><span><AtSign size={15}/> Nome de usuário</span><input maxLength={20} value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="seu_usuario" disabled={!!profile&&daysLeft>0}/></label>{profile&&<div className="social-username-lock">{daysLeft>0?<><Lock size={15}/><span>Você poderá trocar seu @ em <b>{daysLeft} dia(s)</b>. Última alteração: {dateText(profile.username_changed_at)}.</span></>:<><CalendarClock size={15}/><span>Seu @ pode ser alterado uma vez a cada 30 dias.</span></>}</div>}<label className="social-field-label"><span>Biografia <small>{bio.length}/160</small></span><textarea maxLength={160} rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Conte um pouco sobre você..."/></label><div className="social-hint"><ShieldCheck size={15}/> Seu nome, avatar, XP, conquistas e molduras são sincronizados com Meu perfil. Seu @ e sua biografia ficam visíveis para a comunidade.</div><button className="social-primary social-save-button" disabled={busy||!playerProfile?.name?.trim()||!username.trim()||(usernameChanged&&daysLeft>0)}>{busy?'Salvando...':profile?'Salvar alterações':'Criar meu perfil social'}</button></form></div><div className="social-safety-note"><ShieldCheck size={18}/><div><b>Comunidade segura</b><p>Seu perfil público é somente para visualização. Suas informações financeiras nunca são exibidas.</p></div></div></aside>
  </div>
  {viewPerson&&<PublicPlayerProfile person={viewPerson} onClose={()=>setViewPerson(null)}/>}
 </section>;
}
