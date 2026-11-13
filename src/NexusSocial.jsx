import React,{useCallback,useEffect,useMemo,useState} from 'react';
import './nexus-social-refined.css';
import './nexus-social-next.css';
import './nexus-social-premium.css';
import './nexus-social-polish.css';
import './nexus-player-profile.css';
import {Search,Users,UserPlus,Check,X,RefreshCw,ShieldCheck,UserRound,AtSign,Lock,Eye,CalendarClock,Trophy,Zap,Star,Flame,MessageCircle,Bell,CheckCheck,Pencil,Grid3X3,Heart,MessageCircleMore} from 'lucide-react';
import {supabase} from './supabase';
import NexusCommunity from './NexusCommunity';
import NexusFeed from './NexusFeed';
import NexusPushSettings from './NexusPushSettings';

const PROFILE_FIELDS='user_id,username,display_name,bio,avatar,avatar_frame,card_frame,equipped_gems,equipped_medals,game_xp,game_correct,username_changed_at,is_suspended';
const initials=(name='')=>String(name).trim().split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'NX';
const dateText=value=>value?new Date(value).toLocaleDateString('pt-BR'):'';
const daysUntilChange=value=>{if(!value)return 0;const elapsed=Date.now()-new Date(value).getTime();return Math.max(0,30-Math.floor(elapsed/86400000));};
const achievements=p=>[
 {name:'Primeira vitória',desc:'Acertar uma pergunta',icon:'🏆',unlocked:Number(p.game_correct||0)>=1},
 {name:'Subindo de nível',desc:'Alcançar 500 XP',icon:'⚡',unlocked:Number(p.game_xp||0)>=500},
 {name:'Mente afiada',desc:'Acertar 5 perguntas',icon:'⭐',unlocked:Number(p.game_correct||0)>=5},
 {name:'Explorador',desc:'Alcançar 1.000 XP',icon:'🔥',unlocked:Number(p.game_xp||0)>=1000}
];
function PublicPlayerProfile({person,onClose,onFollowToggle,onEdit}){
 const [posts,setPosts]=useState([]),[postsLoading,setPostsLoading]=useState(true),[selectedPost,setSelectedPost]=useState(null);
 const [earnedGameMedals,setEarnedGameMedals]=useState([]),[earnedRankMedals,setEarnedRankMedals]=useState([]),[earnedMedalsLoading,setEarnedMedalsLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{setEarnedMedalsLoading(true);const [games,ranks]=await Promise.all([supabase.from('competition_game_medals').select('game_key,medals_count').eq('user_id',person.user_id),supabase.from('competition_rank_medals').select('medal_key,medals_count').eq('user_id',person.user_id)]);if(active){setEarnedGameMedals(games.data||[]);setEarnedRankMedals(ranks.data||[]);setEarnedMedalsLoading(false);}})();return()=>{active=false}},[person.user_id]);
 useEffect(()=>{let active=true;(async()=>{try{const {data,error}=await supabase.from('social_posts').select('id,body,image_path,video_path,created_at').eq('author_id',person.user_id).order('created_at',{ascending:false}).limit(60);if(error)throw error;const rows=await Promise.all((data||[]).map(async p=>{const path=p.image_path||p.video_path;const bucket='nexus-posts';const {data:media}=path?await supabase.storage.from(bucket).createSignedUrl(path,3600):{data:null};return {...p,mediaUrl:media?.signedUrl||''};}));if(active)setPosts(rows);}catch{if(active)setPosts([]);}finally{if(active)setPostsLoading(false);}})();return()=>{active=false;};},[person.user_id]);
 const own=person.user_id===person.viewerId;
 const xp=Number(person.game_xp||0),correct=Number(person.game_correct||0),level=Math.floor(xp/500)+1,gems=Array.isArray(person.equipped_gems)?person.equipped_gems:[];
 const tier=xp>=4500?'LENDÁRIO':xp>=2000?'ELITE':xp>=1000?'VETERANO':xp>=500?'EXPLORADOR':'JOGADOR';
 const medals=achievements(person);
 return <div className="social-profile-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="social-public-profile" role="dialog" aria-modal="true" aria-label={'Perfil de '+person.display_name}>
  <header className="social-public-head"><div><span>PERFIL</span><h2>{person.display_name||person.username}</h2><small>@{person.username}</small></div><div className="social-profile-head-actions">{own&&<button className="social-profile-edit-trigger" onClick={()=>onEdit?.(person)}><Pencil size={15}/> Editar perfil</button>}<button onClick={onClose} aria-label="Fechar perfil"><X size={20}/></button></div></header>
  <div className={'social-public-card player-card-frame frame-'+(person.card_frame||'cyan')+(gems.length===4?' frame-chromatic':'')}>
   <div className={'frame-gem-ornament ornament-'+(person.card_frame||'cyan')}>{gems.map(id=><i key={id} className={'gemstone gem-'+id}/>)}</div>
   <div className="game-world-top"><span className="world-label"><span className="live-pulse"/> CENTRAL DO JOGADOR</span><span className="season-pill">JORNADA NEXUS</span></div>
   <div className="player-identity"><div className={'player-avatar profile-big-avatar frame-'+(person.avatar_frame||'violet')+(gems.length===4?' frame-chromatic':'')}><span>{person.avatar||'👾'}</span><i><Zap size={12}/></i></div><div className="player-info"><span>{tier}</span><h2>{person.display_name||person.username}</h2><div className="player-social-identity"><b>@{person.username}</b></div>{person.bio&&<p className="player-social-bio">{person.bio}</p>}{person.clan&&<div className="player-clan-badge">{person.clan.clan_emblem} {person.clan.clan_name} [{person.clan.clan_tag}] · {person.clan.clan_role==='leader'?'ADM':person.clan.clan_role==='officer'?'OFICIAL':'MEMBRO'}</div>}<div className="player-level-line"><b>NÍVEL {level}</b><span>{xp%500}/500 XP para o próximo nível</span></div><div className="player-xp-track"><i style={{width:(xp%500)/5+'%'}}/></div></div><div className="player-xp-total"><strong>{xp}</strong><small>XP TOTAL</small></div></div>
   <div className="world-stats"><div><Flame size={17}/><span><b>{correct}</b> desafios concluídos</span></div><div><Trophy size={17}/><span><b>{Math.floor(xp/500)}</b> níveis conquistados</span></div><div><Star size={17}/><span><b>{gems.length}/4</b> joias equipadas</span></div><div><Users size={17}/><span><b>{person.followersCount||0}</b> seguidores · <b>{person.followingCount||0}</b> seguindo</span></div><div className="social-reputation-stat"><ShieldCheck size={17}/><span><b>{Number(person.socialContribution||0)}</b> pontos de contribuição · {Number(person.socialPosts||0)} posts e {Number(person.socialComments||0)} comentários</span></div></div>
  </div>

  <section className="social-public-honors"><div className="social-public-honors-title"><div><span>CONQUISTAS</span><b>Medalhas e honrarias</b></div><Trophy size={19}/></div><div className="social-public-honors-grid">
   {own&&person.viewerEmail?.toLowerCase()==="hebertsandro877@gmail.com"&&<><article className="social-public-honor founder"><span>👑</span><div><b>Fundador</b><small>Criador do Meu Financeiro</small></div><em>OFICIAL</em></article><article className="social-public-honor founder"><span>⚡</span><div><b>Fundador NEXUS</b><small>Idealizador da comunidade</small></div></article><article className="social-public-honor founder"><span>🛡️</span><div><b>Administrador oficial</b><small>Responsável pelo projeto</small></div></article></>}
   {earnedGameMedals.filter(m=>(Array.isArray(person.equipped_medals)?person.equipped_medals:[]).includes('game:'+m.game_key)).map(m=><article className="social-public-honor" key={"g-"+m.game_key}><span>🏅</span><div><b>{{"space-nexus":"Space Nexus","piggy-run":"Asas da Fortuna",quiz:"Quiz Financeiro"}[m.game_key]||m.game_key}</b><small>Medalhas de competição</small></div><strong>×{Number(m.medals_count||0)}</strong></article>)}
   {earnedRankMedals.filter(m=>(Array.isArray(person.equipped_medals)?person.equipped_medals:[]).includes('rank:'+m.medal_key)).map(m=><article className="social-public-honor" key={"r-"+m.medal_key}><span>{m.medal_key==="global-season"?"🌍":m.medal_key==="weekly-tournament"?"🏆":"👥"}</span><div><b>{{"global-season":"Campeão global","weekly-tournament":"Campeão semanal","friends-weekly":"Campeão dos amigos"}[m.medal_key]||"Medalha de competição"}</b><small>Vitórias em rankings e torneios</small></div><strong>×{Number(m.medals_count||0)}</strong></article>)}
   {!earnedMedalsLoading&&!earnedGameMedals.length&&!earnedRankMedals.length&&!(own&&person.viewerEmail?.toLowerCase()==="hebertsandro877@gmail.com")&&<p className="social-public-honors-empty">🏆 As medalhas conquistadas em competições aparecerão aqui.</p>}
   {earnedMedalsLoading&&<p className="social-public-honors-empty">Carregando conquistas…</p>}
  </div></section>
  <section className="social-profile-posts"><div className="social-profile-posts-heading"><div><span>PUBLICAÇÕES</span><h3>Momentos de {own?'sua jornada':(person.display_name||'jogador')}</h3></div><Grid3X3 size={19}/></div>{postsLoading?<div className="social-profile-posts-empty">Carregando publicações…</div>:posts.length?<div className="social-profile-post-grid">{posts.map(post=><button type="button" className="social-profile-post-tile" key={post.id} onClick={()=>setSelectedPost(post)}>{post.mediaUrl?(post.video_path?<video src={post.mediaUrl} muted playsInline/>:<img src={post.mediaUrl} alt="Publicação do jogador"/>):<span className="social-profile-text-tile">{post.body||'Publicação'}</span>}<i><Heart size={14}/><MessageCircleMore size={14}/></i></button>)}</div>:<div className="social-profile-posts-empty"><Grid3X3 size={25}/><b>Nenhuma publicação ainda</b><span>Quando {own?'você publicar':'este jogador publicar'} algo, aparecerá aqui.</span></div>}</section>
  {selectedPost&&<div className="social-profile-post-viewer" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedPost(null)}}><article><button className="social-profile-post-close" onClick={()=>setSelectedPost(null)} aria-label="Fechar"><X size={19}/></button>{selectedPost.video_path&&selectedPost.mediaUrl?<video src={selectedPost.mediaUrl} controls playsInline/>:selectedPost.image_path&&selectedPost.mediaUrl?<img src={selectedPost.mediaUrl} alt="Publicação"/>:null}<div className="social-profile-post-caption"><b>{person.display_name||person.username}</b><p>{selectedPost.body}</p><time>{new Date(selectedPost.created_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}</time></div></article></div>}
  <div className="social-public-section"><div className="social-public-section-title"><div><span>PROGRESSO</span><h3>Conquistas</h3></div><Trophy size={20}/></div><div className="social-public-achievements">{medals.map(a=><article className={'social-public-achievement '+(a.unlocked?'unlocked':'locked')} key={a.name}><span>{a.icon}</span><div><b>{a.name}</b><small>{a.desc}</small></div><strong>{a.unlocked?'CONQUISTADA':'BLOQUEADA'}</strong></article>)}</div></div>
  <div className="social-public-section"><div className="social-public-section-title"><div><span>PERSONALIZAÇÃO</span><h3>Itens equipados</h3></div></div><div className="social-equipped-items"><span className={'social-equipped-frame frame-'+(person.avatar_frame||'violet')}>Avatar · {person.avatar_frame||'violet'}</span><span className={'social-equipped-frame frame-'+(person.card_frame||'cyan')}>Central · {person.card_frame||'cyan'}</span>{gems.map(g=><span className="social-equipped-gem" key={g}>💎 {g}</span>)}</div></div>
  <footer className="social-public-footer"><ShieldCheck size={16}/> Perfil público somente para visualização. Ninguém pode alterar os dados deste jogador por aqui.{person.user_id!==person.viewerId&&<button className={'social-follow-button '+(person.isFollowing?'following':'')} onClick={()=>onFollowToggle(person)}>{person.isFollowing?<><Check size={15}/> Seguindo</>:<><UserPlus size={15}/> Seguir jogador</>}</button>}</footer>
 </section></div>;
}

export function PlayerPostGrid({userId,displayName='jogador'}){
 const [posts,setPosts]=useState([]),[loadingPosts,setLoadingPosts]=useState(true),[selected,setSelected]=useState(null);
 useEffect(()=>{let active=true;(async()=>{try{
  const {data,error}=await supabase.from('social_posts').select('id,body,image_path,video_path,created_at').eq('author_id',userId).order('created_at',{ascending:false}).limit(60);
  if(error)throw error;
  const rows=await Promise.all((data||[]).filter(p=>p.image_path||p.video_path).map(async p=>{const path=p.image_path||p.video_path;const {data:media}=await supabase.storage.from('nexus-posts').createSignedUrl(path,3600);return {...p,mediaUrl:media?.signedUrl||''};}));
  if(active)setPosts(rows.filter(p=>p.mediaUrl));
 }catch(e){console.warn('Publicações do jogador:',e.message);if(active)setPosts([]);}finally{if(active)setLoadingPosts(false);}})();return()=>{active=false;};},[userId]);
 return <section className="social-profile-posts player-central-posts"><div className="social-profile-posts-heading"><div><span>SEU ESPAÇO SOCIAL</span><h3>Publicações</h3></div><Grid3X3 size={19}/></div>{loadingPosts?<div className="social-profile-posts-empty">Carregando publicações…</div>:posts.length?<div className="social-profile-post-grid">{posts.map(post=><button type="button" className="social-profile-post-tile" key={post.id} onClick={()=>setSelected(post)}>{post.video_path?<video src={post.mediaUrl} muted playsInline/>:<img src={post.mediaUrl} alt={'Publicação de '+displayName}/>}<i><Heart size={14}/><MessageCircleMore size={14}/></i></button>)}</div>:<div className="social-profile-posts-empty"><Grid3X3 size={25}/><b>Suas publicações aparecerão aqui</b><span>Publique uma foto ou vídeo no Feed para montar seu perfil.</span></div>}{selected&&<div className="social-profile-post-viewer" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><article><button className="social-profile-post-close" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={19}/></button>{selected.video_path?<video src={selected.mediaUrl} controls playsInline/>:<img src={selected.mediaUrl} alt="Publicação"/>}<div className="social-profile-post-caption"><b>{displayName}</b><p>{selected.body}</p><time>{new Date(selected.created_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}</time></div></article></div>}</section>;
}

export default function NexusSocial({view='conversations',session,playerProfile,gameXp=0,gameCorrect=0,onPlayerProfileChange=()=>{},onToast=()=>{},onOpenPlayerHub=()=>{},onOpenFeed=()=>{}}){
 const userId=session?.user?.id;
 const [profile,setProfile]=useState(null),[username,setUsername]=useState(''),[bio,setBio]=useState('');
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[friends,setFriends]=useState([]),[incoming,setIncoming]=useState([]),[outgoing,setOutgoing]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState('community'),[viewPerson,setViewPerson]=useState(null);
 const [editingProfile,setEditingProfile]=useState(false),[editName,setEditName]=useState(''),[editBio,setEditBio]=useState(''),[editUsername,setEditUsername]=useState('');
 const [socialNotifications,setSocialNotifications]=useState([]),[showSocialNotifications,setShowSocialNotifications]=useState(false),[notificationsLoading,setNotificationsLoading]=useState(false);
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
 useEffect(()=>{load()},[load]);
 const loadSocialNotifications=useCallback(async(silent=false)=>{
  if(!userId||!supabase)return;if(!silent)setNotificationsLoading(true);
  const {data,error:e}=await supabase.from('notifications').select('id,title,message,category,is_read,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(40);
  if(!e)setSocialNotifications(data||[]);else console.warn('NEXUS notifications:',e.message);
  if(!silent)setNotificationsLoading(false);
 },[userId]);
 useEffect(()=>{loadSocialNotifications();if(!userId)return;const channel=supabase.channel('nexus-social-notifications-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>loadSocialNotifications(true)).subscribe();return()=>{supabase.removeChannel(channel);};},[userId,loadSocialNotifications]);
 async function markSocialNotificationRead(id){const {error:e}=await supabase.from('notifications').update({is_read:true}).eq('id',id).eq('user_id',userId);if(!e)setSocialNotifications(old=>old.map(n=>n.id===id?{...n,is_read:true}:n));}
 async function markAllSocialNotificationsRead(){const ids=socialNotifications.filter(n=>!n.is_read).map(n=>n.id);if(!ids.length)return;const {error:e}=await supabase.from('notifications').update({is_read:true}).eq('user_id',userId).eq('is_read',false);if(e)setError(e.message);else setSocialNotifications(old=>old.map(n=>({...n,is_read:true})));}
  useEffect(()=>{if(!userId)return;const channel=supabase.channel('nexus-social-friends-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'social_friend_requests',filter:'receiver_id=eq.'+userId},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'social_friend_requests',filter:'sender_id=eq.'+userId},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'social_friendships'},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[userId,load]);
 async function saveProfile(e){
  e.preventDefault();if(!userId)return;
  const clean=username.toLowerCase().trim();
  if(!/^[a-z0-9_]{3,20}$/.test(clean)){setError('O @ deve ter de 3 a 20 caracteres: letras, números ou _.');return;}
  if(usernameChanged&&daysLeft>0){setError('Você poderá alterar seu @ novamente em '+daysLeft+' dia(s).');return;}
  setBusy(true);setError('');
  const syncedName=String(playerProfile?.name||session.user.user_metadata?.name||'Jogador').trim().slice(0,40);
  const syncedAvatar=playerProfile?.avatar||'👾';
  const cleanBio=String(profile?.bio??bio).trim().slice(0,160);
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
  const [{data,error:e1},{data:clanData},{count:followersCount},{count:followingCount},{data:followRow},{count:postCount},{count:commentCount}]=await Promise.all([
   supabase.from('social_profiles').select('*').eq('user_id',person.user_id).maybeSingle(),
   supabase.rpc('social_get_player_clan',{target_user:person.user_id}),
   supabase.from('social_follows').select('follower_id',{count:'exact',head:true}).eq('following_id',person.user_id),
   supabase.from('social_follows').select('following_id',{count:'exact',head:true}).eq('follower_id',person.user_id),
   supabase.from('social_follows').select('follower_id').eq('follower_id',userId).eq('following_id',person.user_id).maybeSingle(),
   supabase.from('social_posts').select('id',{count:'exact',head:true}).eq('author_id',person.user_id),
   supabase.from('social_post_comments').select('id',{count:'exact',head:true}).eq('author_id',person.user_id).is('deleted_at',null)
  ]);
  if(e1)setError(e1.message);else if(data&&!data.is_suspended){const contribution=(postCount||0)*5+(commentCount||0)*2;setViewPerson({...data,clan:clanData?.[0]||null,followersCount:followersCount||0,followingCount:followingCount||0,socialContribution:contribution,socialPosts:postCount||0,socialComments:commentCount||0,isFollowing:!!followRow,viewerId:userId});}
 }
 async function toggleFollow(person){
  if(!person?.user_id||person.user_id===userId)return;
  const result=person.isFollowing?await supabase.from('social_follows').delete().eq('follower_id',userId).eq('following_id',person.user_id):await supabase.from('social_follows').insert({follower_id:userId,following_id:person.user_id});
  if(result.error)setError(result.error.message);else{onToast(person.isFollowing?'Você deixou de seguir este jogador.':'Agora você está seguindo este jogador.');await openPerson(person);}
 }
 async function requestFriend(id){
  setBusy(true);setError('');
  const {data:request,error:e1}=await supabase.from('social_friend_requests').insert({sender_id:userId,receiver_id:id}).select('id').single();
  if(e1)setError(e1.code==='23505'?'Já existe uma solicitação ou amizade.':e1.message);else{await supabase.functions.invoke('nexus-push',{body:{type:'friend_request',record_id:request.id}}).catch(()=>{});onToast('Solicitação enviada!');setResults(r=>r.filter(x=>x.user_id!==id));load();}
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
  <div className="social-hero"><div><span>{view==='feed'?'NEXUS COMMUNITY · PUBLICAÇÕES':'NEXUS MESSAGES · CONEXÕES'}</span><h2>NEXUS <em>{view==='feed'?'Feed':'Conversas'}</em></h2><p>{view==='feed'?'Compartilhe momentos, ideias e conquistas com a comunidade.':'Converse com amigos, organize grupos e gerencie solicitações.'}</p></div><div className="social-hero-icon">{view==='feed'?<MessageCircle size={34}/>:<Users size={34}/>}</div></div>
  <NexusPushSettings userId={userId}/>
  <div className="nxs-notification-wrap">
   <button type="button" className="nxs-notification-trigger" aria-expanded={showSocialNotifications} onClick={()=>{setShowSocialNotifications(v=>!v);if(!showSocialNotifications)loadSocialNotifications();}}><Bell size={17}/><span>Notificações</span>{socialNotifications.some(n=>!n.is_read)&&<i>{socialNotifications.filter(n=>!n.is_read).length>99?'99+':socialNotifications.filter(n=>!n.is_read).length}</i>}</button>
   {showSocialNotifications&&<section className="nxs-notification-panel" aria-label="Central de notificações"><header><div><b>Central de notificações</b><small>Mensagens, interações e novidades do NEXUS</small></div><button type="button" onClick={()=>setShowSocialNotifications(false)} aria-label="Fechar notificações"><X size={17}/></button></header><div className="nxs-notification-actions"><span>{socialNotifications.filter(n=>!n.is_read).length} não lidas</span><button type="button" onClick={markAllSocialNotificationsRead} disabled={!socialNotifications.some(n=>!n.is_read)}><CheckCheck size={14}/> Marcar todas como lidas</button></div><div className="nxs-notification-list">{notificationsLoading?<div className="nxs-notification-empty">Carregando notificações…</div>:socialNotifications.length?socialNotifications.map(n=><button type="button" key={n.id} className={'nxs-notification-item '+(!n.is_read?'unread':'')} onClick={()=>markSocialNotificationRead(n.id)}><span className="nxs-notification-dot"/><span><b>{n.title||'Atualização do NEXUS'}</b><small>{n.message||'Você tem uma nova atualização.'}</small><time>{new Date(n.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time></span></button>):<div className="nxs-notification-empty"><Bell size={24}/><b>Tudo em dia!</b><span>Suas notificações aparecerão aqui.</span></div>}</div></section>}
  </div>
  {error&&<div className="social-error" role="alert">{error}</div>}
  <div className="social-layout">
   <div className="social-main">
    {view==='conversations'&&<div className="social-tabs"><button className={tab==='community'?'active':''} onClick={()=>setTab('community')}><Users size={16}/> Conversas {incoming.length>0&&<b>{incoming.length}</b>}</button><button className={tab==='discover'?'active':''} onClick={()=>setTab('discover')}><UserPlus size={16}/> Adicionar amigos</button></div>}
    {loading?<div className="social-loading"><span className="spinner"/> Carregando comunidade...</div>:<>
     
     {view==='feed'&&<NexusFeed userId={userId} playerProfile={playerProfile} friends={friends} onToast={onToast} onOpenProfile={openPerson}/>}

     {tab==='discover'&&<div className="social-panel"><div className="social-panel-heading"><div><h3>Encontrar pessoas</h3><p>Busque pelo @usuário e abra a Central do Jogador.</p></div></div><form className="social-search" onSubmit={searchPeople}><AtSign size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite um @usuário"/><button disabled={busy||query.trim().length<2}><Search size={16}/> Buscar</button></form><div className="social-people">{results.map(p=>personRow(p,<button className="social-add-button" disabled={busy} onClick={e=>{e.stopPropagation();requestFriend(p.user_id)}}><UserPlus size={15}/> Adicionar</button>))}</div>{!results.length&&<div className="social-empty-inline"><Search size={26}/><p>Pesquise um nome de usuário para encontrar pessoas.</p></div>}</div>}
     
    </>}
    {view==='conversations'&&tab==='community'&&<NexusCommunity mode="chat" userId={userId} playerProfile={playerProfile} friends={friends} incoming={incoming} outgoing={outgoing} onAnswerFriendRequest={answerRequest} onToast={onToast} onOpenProfile={openPerson} onOpenFeed={onOpenFeed} onClanChange={clan=>onPlayerProfileChange(p=>({...p,clan}))}/>}
   </div>
   <aside className="social-side">
   {view==='feed'&&<div className="social-panel social-context-card"><div className="social-context-kicker">VISÃO DA COMUNIDADE</div><h3>Seu espaço no NEXUS</h3><p>Compartilhe conquistas, ideias e momentos da sua jornada. O feed reúne publicações recentes de toda a comunidade.</p><div className="social-context-stats"><div><b>{friends.length}</b><span>Amizades</span></div><div><b>{incoming.length}</b><span>Solicitações</span></div><div><b>{Number(gameXp||0)}</b><span>XP atual</span></div></div><div className="social-context-rule"><span>✦</span><div><b>Mostre sua evolução</b><small>Compartilhe metas alcançadas, recordes e dicas que possam ajudar outros jogadores.</small></div></div><div className="social-context-rule"><ShieldCheck size={17}/><div><b>Convivência em primeiro lugar</b><small>Não publique dados pessoais, senhas ou informações financeiras.</small></div></div></div>}
   {view==='conversations'&&<div className="social-panel social-context-card"><div className="social-context-kicker">CENTRAL DE CONEXÕES</div><h3>Sua rede de amigos</h3><p>Gerencie suas conexões e mantenha suas conversas organizadas em um só lugar.</p><div className="social-context-stats"><div><b>{friends.length}</b><span>Amigos</span></div><div><b>{incoming.length}</b><span>Recebidas</span></div><div><b>{outgoing.length}</b><span>Enviadas</span></div></div><div className="social-context-rule"><MessageCircle size={17}/><div><b>Conversas privadas</b><small>Suas mensagens são destinadas aos participantes da conversa.</small></div></div><div className="social-context-rule"><Users size={17}/><div><b>Grupos particulares</b><small>Crie um grupo e convide seus amigos para trocar ideias e jogar juntos.</small></div></div><div className="social-context-rule"><ShieldCheck size={17}/><div><b>Você no controle</b><small>Use as solicitações para aceitar convites e administrar novas conexões.</small></div></div></div>}

   <div className="social-panel social-profile-editor"><div className="social-panel-heading"><div><span className="social-section-kicker">SEU PERFIL OFICIAL</span><h3>Central do Jogador</h3><p>Seu perfil único, suas publicações e personalizações ficam na Central do Jogador.</p></div><UserRound size={21}/></div><button type="button" className="social-view-button social-own-preview" onClick={onOpenPlayerHub}><Eye size={15}/> Abrir meu perfil oficial</button></div><div className="social-safety-note"><ShieldCheck size={18}/><div><b>Privacidade protegida</b><p>Seu perfil público não exibe informações financeiras, saldos ou movimentações.</p></div></div>
  </aside>
  </div>
  {editingProfile&&<div className="social-profile-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingProfile(false)}}><form className="social-profile-edit-modal" onSubmit={async e=>{e.preventDefault();const cleanName=editName.trim().replace(/\\s+/g,' ').slice(0,40),cleanBio=editBio.trim().slice(0,160),cleanUser=editUsername.trim().toLowerCase();if(cleanName.length<2){setError('Informe um nome com pelo menos 2 caracteres.');return;}if(!/^[a-z0-9_]{3,20}$/.test(cleanUser)){setError('O @ deve ter de 3 a 20 caracteres: letras, números ou _.');return;}if(cleanUser!==profile?.username&&daysLeft>0){setError('Você poderá alterar seu @ novamente em '+daysLeft+' dia(s).');return;}setBusy(true);setError('');const {data,error:e1}=await supabase.from('social_profiles').update({display_name:cleanName,bio:cleanBio,username:cleanUser,username_changed_at:cleanUser!==profile?.username?new Date().toISOString():profile?.username_changed_at,updated_at:new Date().toISOString()}).eq('user_id',userId).select('*').single();if(e1){setError(e1.code==='23505'?'Esse @ já está em uso.':e1.message);setBusy(false);return;}const {error:authError}=await supabase.auth.updateUser({data:{name:cleanName}});if(authError)console.warn('Não foi possível sincronizar o nome da conta:',authError.message);setProfile(data);setUsername(data.username);setBio(data.bio||'');onPlayerProfileChange(p=>({...p,name:cleanName,username:data.username,bio:data.bio||''}));setEditingProfile(false);onToast('Perfil atualizado!');setBusy(false);}}><header><div><span>SEU ESPAÇO</span><h2>Editar perfil</h2><p>Atualize as informações que aparecem para outras pessoas.</p></div><button type="button" onClick={()=>setEditingProfile(false)} aria-label="Fechar"><X size={19}/></button></header><label>Nome<input value={editName} onChange={e=>setEditName(e.target.value)} maxLength={40} required/></label><label>Nome de usuário (@)<input value={editUsername} onChange={e=>setEditUsername(e.target.value.replace(/^@/,''))} maxLength={20} required/><small>{daysLeft>0?'Você poderá alterar o @ em '+daysLeft+' dia(s).':'Você pode alterar o @ uma vez a cada 30 dias.'}</small></label><label>Biografia<textarea value={editBio} onChange={e=>setEditBio(e.target.value)} maxLength={160} rows={4} placeholder="Conte um pouco sobre você…"/></label><footer><button type="button" onClick={()=>setEditingProfile(false)}>Cancelar</button><button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</button></footer></form></div>}
  {viewPerson&&<PublicPlayerProfile person={{...viewPerson,viewerEmail:session?.user?.email||""}} onClose={()=>setViewPerson(null)} onFollowToggle={toggleFollow} onEdit={person=>{setEditName(person.display_name||'');setEditBio(person.bio||'');setEditUsername(person.username||'');setViewPerson(null);setEditingProfile(true);}}/>}
 </section>;
}
