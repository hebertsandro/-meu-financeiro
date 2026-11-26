import React,{useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {Swords,Plus,LogIn,Share2,RefreshCw,Trophy,ArrowLeft,Play,Clock3,Users,Check,X,Wifi,WifiOff} from 'lucide-react';
import './nexus-duels.css';

export const DUEL_GAMES=[
 {key:'space-nexus',label:'Space Nexus',icon:'🚀',app:'space'},
 {key:'piggy-run',label:'Asas da Fortuna',icon:'🐷',app:'flap'},
 {key:'extra-gems',label:'Gem Match',icon:'💎',app:'extra-gems'},
 {key:'extra-defense',label:'Defesa do Cofrinho',icon:'🏰',app:'extra-defense'}
];
const gameOf=k=>DUEL_GAMES.find(g=>g.key===k)||{label:k,icon:'🎮'};
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const initials=n=>String(n||'?').trim().slice(0,2).toUpperCase();
function Av({p,size=52}){return <span className={'nxd2-av frame-'+(p?.frame||'violet')} style={{'--s':size+'px'}}>{p?.avatar||initials(p?.name)}</span>}


const EMOTES=['😂','🔥','😴','👏','🤡','💀','😈','🥶'];
const TAUNTS=['Tá fácil! 😎','Vem que vem!','GG!','Treme! 😈','Foi sorte...','Revanche?'];
const nowMs=()=>Date.now();

export default function NexusDuels({userId,onToast=()=>{},armDuel=()=>{},renderGame=()=>null}){
 const [list,setList]=useState(null),[roomId,setRoomId]=useState(null),[st,setSt]=useState(null),[busy,setBusy]=useState(false),[code,setCode]=useState('');
 const [step,setStep]=useState(null),[pickGame,setPickGame]=useState(null),[friends,setFriends]=useState(null);
 const [phase,setPhase]=useState('lobby'),[ready,setReady]=useState(false),[count,setCount]=useState(0),[myScore,setMyScore]=useState(0),[peer,setPeer]=useState(null),[bubbles,setBubbles]=useState([]);
 const chRef=useRef(null),lastEmote=useRef(0),peerAt=useRef(0),stateRef=useRef({}),scoreRef=useRef(0);
 const loadList=useCallback(async()=>{if(!userId)return;const {data}=await supabase.rpc('duel_list');setList(data||[])},[userId]);
 const loadRoom=useCallback(async()=>{if(!roomId)return;const {data,error}=await supabase.rpc('duel_status',{room_input:roomId});if(error){onToast(error.message);setRoomId(null);return}setSt(data)},[roomId,onToast]);
 useEffect(()=>{loadList()},[loadList]);
 useEffect(()=>{if(!roomId){setSt(null);return}loadRoom();const t=setInterval(loadRoom,5000);return()=>clearInterval(t)},[roomId,loadRoom]);
 // estado local compartilhado com o adversário
 stateRef.current={ready,playing:phase==='playing',score:myScore};scoreRef.current=myScore;
 const send=useCallback((event,payload={})=>{try{chRef.current?.send({type:'broadcast',event,payload:{uid:userId,...payload}})}catch{}},[userId]);
 useEffect(()=>{
  if(!roomId||!userId)return;
  const ch=supabase.channel('duel-'+roomId,{config:{broadcast:{self:false}}});chRef.current=ch;
  ch.on('broadcast',{event:'state'},({payload})=>{if(payload?.uid===userId)return;peerAt.current=nowMs();setPeer(payload)})
   .on('broadcast',{event:'emote'},({payload})=>{if(payload?.uid===userId)return;pushBubble(payload.text,false)})
   .on('broadcast',{event:'refresh'},()=>{loadRoom();loadList()})
   .subscribe(status=>{if(status==='SUBSCRIBED')send('state',stateRef.current)});
  const t=setInterval(()=>{send('state',stateRef.current);if(nowMs()-peerAt.current>7000)setPeer(p=>p?{...p,stale:true}:p)},2000);
  return()=>{clearInterval(t);try{supabase.removeChannel(ch)}catch{}chRef.current=null;setPeer(null);setPhase('lobby');setReady(false)};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[roomId,userId]);
 useEffect(()=>{send('state',{ready,playing:phase==='playing',score:myScore})},[ready,phase]); // eslint-disable-line react-hooks/exhaustive-deps
 const lastSent=useRef(0);
 const onScore=useCallback(v=>{setMyScore(v);const t=nowMs();if(t-lastSent.current>350){lastSent.current=t;send('state',{ready:true,playing:true,score:v})}},[send]);
 // fim de partida (App envia o placar e dispara o evento)
 useEffect(()=>{const h=()=>{setPhase('lobby');setReady(false);setMyScore(0);loadRoom();loadList();send('refresh')};window.addEventListener('nx:duel-updated',h);return()=>window.removeEventListener('nx:duel-updated',h)},[loadRoom,loadList,send]);
 useEffect(()=>{const h=()=>{if(document.visibilityState==='visible'){loadList();loadRoom()}};document.addEventListener('visibilitychange',h);return()=>document.removeEventListener('visibilitychange',h)},[loadList,loadRoom]);
 // contagem sincronizada quando os dois estão prontos
 const peerFresh=peer&&!peer.stale;
 useEffect(()=>{if(phase==='lobby'&&ready&&peerFresh&&peer.ready){setPhase('count');setCount(3)}},[ready,peerFresh,peer,phase]);
 useEffect(()=>{if(phase!=='count')return;if(count<=0){startRun();return}const t=setTimeout(()=>setCount(c=>c-1),1000);return()=>clearTimeout(t)},[phase,count]); // eslint-disable-line react-hooks/exhaustive-deps
 function startRun(){const r=st?.room;if(!r)return;armDuel({id:r.id,game_key:r.game_key});setMyScore(0);setPhase('playing')}
 function pushBubble(text,mine){const id=nowMs()+Math.random();setBubbles(b=>[...b.slice(-3),{id,text,mine}]);setTimeout(()=>setBubbles(b=>b.filter(x=>x.id!==id)),2600)}
 const emote=text=>{const t=nowMs();if(t-lastEmote.current<1200)return;lastEmote.current=t;send('emote',{text});pushBubble(text,true)};

 const create=async key=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('duel_create',{game_key_input:key});setBusy(false);if(error){onToast(error.message);return}setStep(null);await loadList();setRoomId(data.id)};
 const invite=async friend=>{if(busy||!pickGame)return;setBusy(true);const {data,error}=await supabase.rpc('duel_invite',{game_key_input:pickGame,friend_input:friend.user_id});setBusy(false);if(error){onToast(error.message);return}onToast('Convite enviado para '+(friend.display_name||friend.username)+'!');setStep(null);setPickGame(null);await loadList();setRoomId(data.id)};
 const join=async()=>{if(busy||code.trim().length<4)return;setBusy(true);const {data,error}=await supabase.rpc('duel_join',{code_input:code});setBusy(false);if(error){onToast(error.message);return}setCode('');await loadList();setRoomId(data.id)};
 const accept=async id=>{setBusy(true);const {error}=await supabase.rpc('duel_accept',{room_input:id});setBusy(false);if(error){onToast(error.message);return}await loadList();setRoomId(id)};
 const decline=async id=>{await supabase.rpc('duel_decline',{room_input:id});loadList()};
 const rematch=async()=>{if(busy)return;setBusy(true);const {error}=await supabase.rpc('duel_rematch',{room_input:roomId});setBusy(false);if(error){onToast(error.message);return}onToast('Revanche! Nova rodada aberta.');loadRoom();send('refresh')};
 const share=async room=>{const text=`Me desafie no ${gameOf(room.game_key).label}! Entre no Meu Financeiro > Jogos > Duelos e use o código ${room.code}.`;try{if(navigator.share){await navigator.share({text});return}await navigator.clipboard.writeText(text);onToast('Convite copiado!')}catch{}};
 const openFriends=async key=>{setPickGame(key);setStep('friends');if(friends)return;const {data:fr}=await supabase.from('social_friendships').select('user_a,user_b').or('user_a.eq.'+userId+',user_b.eq.'+userId);const ids=[...new Set((fr||[]).map(f=>f.user_a===userId?f.user_b:f.user_a))];if(!ids.length){setFriends([]);return}const {data:ps}=await supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame').in('user_id',ids);setFriends(ps||[])};

 if(roomId&&st){
  const r=st.room,me=st.players.find(p=>p.user_id===userId),opp=st.players.find(p=>p.user_id!==userId),g=gameOf(r.game_key);
  const sc=(uid,round)=>st.scores.find(s=>s.user_id===uid&&s.round===round)?.score;
  const mine=sc(userId,r.round),theirs=opp?sc(opp.user_id,r.round):undefined,bothDone=mine!=null&&theirs!=null;
  const myWins=st.wins[userId]||0,theirWins=opp?st.wins[opp.user_id]||0:0;
  const verdict=bothDone?(mine>theirs?'win':mine<theirs?'lose':'tie'):null;
  const past=[...new Set(st.scores.map(s=>s.round))].filter(x=>x<r.round||bothDone).sort((a,b)=>b-a);
  const online=peerFresh;const peerPlaying=online&&peer.playing;
  const bubblesEl=<div className="nxd2-bubbles" aria-live="polite">{bubbles.map(b=><div key={b.id} className={b.mine?'mine':''}>{b.mine?'Você':(opp?.name||'Rival')}: <b>{b.text}</b></div>)}</div>;
  const emoteBar=opp&&<div className="nxd2-emotes" role="group" aria-label="Provocar adversário"><div>{EMOTES.map(e=><button type="button" key={e} onClick={()=>emote(e)} aria-label={'Enviar '+e}>{e}</button>)}</div><div className="taunts">{TAUNTS.map(t=><button type="button" key={t} onClick={()=>emote(t)}>{t}</button>)}</div></div>;
  if(phase==='count')return <section className="nxd2 nxd2-countdown">{bubblesEl}<div><small>{g.icon} {g.label}</small><b key={count}>{count>0?count:'JÁ!'}</b><span>Os dois estão prontos. Boa sorte!</span></div></section>;
  if(phase==='playing')return <section className="nxd2 nxd2-play">{bubblesEl}
   <div className="nxd2-live"><div className="me"><small>VOCÊ</small><b>{fmt(myScore)}</b></div><div className="vs"><Swords size={18}/><small>AO VIVO</small></div><div className="them"><small>{(opp?.name||'RIVAL').toUpperCase().slice(0,10)}</small><b>{online&&peer.playing?fmt(peer.score):online?(peer.score>0?fmt(peer.score):'…'):'—'}</b><em className={online?'on':'off'}>{online?(peer.playing?'jogando':'na sala'):'offline'}</em></div></div>
   <div className="nxd2-game">{renderGame(r,onScore)}</div>{emoteBar}</section>;
  return <section className="nxd2">{bubblesEl}
   <button type="button" className="nxd2-back" onClick={()=>{setRoomId(null);loadList()}}><ArrowLeft size={16}/> Duelos</button>
   <header className="nxd2-head"><span>{g.icon} {g.label.toUpperCase()} · RODADA {r.round}</span>
    <div className="nxd2-vs"><div><Av p={me}/><b>Você</b></div><div className="nxd2-tally"><strong>{myWins}</strong><i>×</i><strong>{theirWins}</strong><small>vitórias</small></div><div>{opp?<><Av p={opp}/><b>{opp.name}</b><em className={'nxd2-presence '+(online?'on':'off')}>{online?<><Wifi size={11}/> {peerPlaying?'jogando':'na sala'}</>:<><WifiOff size={11}/> fora</>}</em></>:<><span className="nxd2-av empty" style={{'--s':'52px'}}>?</span><b>Aguardando…</b></>}</div></div></header>
   {!opp&&<div className="nxd2-wait"><Clock3 size={18}/><div><b>Esperando seu adversário</b><small>Código <strong className="nxd2-code">{r.code}</strong> · ou convide um amigo pela lista.</small></div><button type="button" onClick={()=>share(r)}><Share2 size={15}/> Compartilhar</button></div>}
   {opp&&<div className={'nxd2-round '+(verdict||'')}>
     <div className="nxd2-side"><small>VOCÊ</small><b>{mine!=null?fmt(mine):'—'}</b><em>{mine!=null?'jogou':'ainda não jogou'}</em></div>
     <div className="nxd2-mid">{verdict==='win'?<><Trophy size={26}/><b>VITÓRIA!</b></>:verdict==='lose'?<><b>DERROTA</b><small>Peça revanche</small></>:verdict==='tie'?<b>EMPATE</b>:<Swords size={26}/>}</div>
     <div className="nxd2-side"><small>{opp.name.toUpperCase().slice(0,12)}</small><b>{theirs!=null?(mine!=null?fmt(theirs):'✓'):'—'}</b><em>{theirs!=null?'já jogou':peerPlaying?'jogando agora':'aguardando'}</em></div>
    </div>}
   {opp&&mine==null&&!ready&&<button type="button" className="nxd2-primary" onClick={()=>setReady(true)}><Play size={18}/> Estou pronto</button>}
   {opp&&mine==null&&ready&&<div className="nxd2-readybox"><p><Clock3 size={14}/> {online?`Aguardando ${opp.name} ficar pronto…`:`${opp.name} não está na sala agora.`}</p><div><button type="button" className="nxd2-primary alt" onClick={startRun}><Play size={16}/> Jogar sem esperar</button><button type="button" className="nxd2-ghost" onClick={()=>setReady(false)}>Cancelar</button></div></div>}
   {opp&&mine!=null&&!bothDone&&<p className="nxd2-note"><Clock3 size={14}/> Placar enviado. {peerPlaying?`${opp.name} está jogando agora — veja ao vivo!`:`Aguardando ${opp.name} jogar…`}</p>}
   {opp&&mine!=null&&!bothDone&&peerPlaying&&<div className="nxd2-spy"><small>{opp.name.toUpperCase()} AO VIVO</small><b>{fmt(peer.score)}</b><span>{peer.score>mine?`faltam ${fmt(mine-peer.score)}`:`precisa de ${fmt(mine-peer.score+1)} para virar`}</span></div>}
   {bothDone&&<button type="button" className="nxd2-primary alt" disabled={busy} onClick={rematch}><RefreshCw size={18}/> Revanche</button>}
   {emoteBar}
   {past.length>0&&<div className="nxd2-hist"><small>HISTÓRICO DA SALA</small>{past.map(n=>{const a=sc(userId,n),b=opp?sc(opp.user_id,n):null;if(a==null||b==null)return null;return <div key={n}><span>Rodada {n}</span><b>{fmt(a)}</b><i>×</i><b>{fmt(b)}</b><em className={a>b?'w':a<b?'l':'t'}>{a>b?'Vitória':a<b?'Derrota':'Empate'}</em></div>})}</div>}
   <p className="nxd2-foot">Sala <strong>{r.code}</strong> · placar validado pelo servidor.</p>
  </section>;
 }
 const invites=(list||[]).filter(x=>x.invite_to_me),rooms=(list||[]).filter(x=>!x.invite_to_me);
 return <section className="nxd2">
  <header className="nxd2-head solo"><span>MULTIPLAYER</span><h3>Duelos</h3><small>Jogue dentro da sala com placar ao vivo, provoque seu rival com emojis e peça revanche.</small></header>
  {invites.length>0&&<div className="nxd2-invites"><small>CONVITES PARA VOCÊ</small>{invites.map(x=>{const g=gameOf(x.game_key);return <div key={x.id}><span className="nxd2-room-ic">{g.icon}</span><div><b>{x.opponent||'Um amigo'} te desafiou</b><small>{g.label}</small></div><button type="button" className="ok" disabled={busy} onClick={()=>accept(x.id)} aria-label="Aceitar"><Check size={18}/></button><button type="button" onClick={()=>decline(x.id)} aria-label="Recusar"><X size={18}/></button></div>})}</div>}
  <div className="nxd2-actions">
   <button type="button" className="nxd2-primary" onClick={()=>{setStep(step?null:'game');setPickGame(null)}}><Plus size={18}/> Novo duelo</button>
   <div className="nxd2-join"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="CÓDIGO" maxLength={6} aria-label="Código da sala" autoCapitalize="characters"/><button type="button" onClick={join} disabled={busy||code.length<4}><LogIn size={16}/> Entrar</button></div>
  </div>
  {step==='game'&&<div className="nxd2-games">{DUEL_GAMES.map(g=><button type="button" key={g.key} disabled={busy} onClick={()=>{setPickGame(g.key);setStep('how')}}><i>{g.icon}</i><b>{g.label}</b></button>)}</div>}
  {step==='how'&&pickGame&&<div className="nxd2-how"><b>{gameOf(pickGame).icon} {gameOf(pickGame).label}</b><button type="button" onClick={()=>create(pickGame)} disabled={busy}><Share2 size={16}/> Criar sala com código</button><button type="button" onClick={()=>openFriends(pickGame)} disabled={busy}><Users size={16}/> Convidar um amigo</button></div>}
  {step==='friends'&&<div className="nxd2-friends"><small>ESCOLHA UM AMIGO</small>{friends===null?<p>Carregando…</p>:friends.length===0?<p>Você ainda não tem amigos adicionados. Use o código da sala.</p>:friends.map(f=><button type="button" key={f.user_id} disabled={busy} onClick={()=>invite(f)}><Av p={{avatar:f.avatar,frame:f.avatar_frame,name:f.display_name||f.username}} size={38}/><span><b>{f.display_name||f.username}</b><small>@{f.username}</small></span><Swords size={16}/></button>)}</div>}
  <div className="nxd2-list">{list===null?<div className="nxd2-skel"><i/><i/></div>:rooms.length===0?<p className="nxd2-empty">Nenhum duelo ainda. Crie uma sala e chame um amigo!</p>:rooms.map(x=>{const g=gameOf(x.game_key);const state=x.waiting?'Esperando adversário':x.my_done&&x.their_done?'Rodada concluída':x.my_done?'Aguardando adversário':'Sua vez de jogar';return <button type="button" key={x.id} className={'nxd2-room'+(!x.waiting&&!x.my_done?' turn':'')} onClick={()=>setRoomId(x.id)}><span className="nxd2-room-ic">{g.icon}</span><div><b>{g.label}{x.opponent?` · vs ${x.opponent}`:''}</b><small>Rodada {x.round} · {state}{x.waiting?` · código ${x.code}`:''}</small></div><Swords size={18}/></button>})}</div>
 </section>;
}
