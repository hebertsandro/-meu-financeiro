import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Swords,Plus,LogIn,Copy,Share2,RefreshCw,Trophy,ArrowLeft,Play,Clock3} from 'lucide-react';
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

export default function NexusDuels({userId,onPlay=()=>{},onToast=()=>{}}){
 const [list,setList]=useState(null),[roomId,setRoomId]=useState(null),[st,setSt]=useState(null),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[creating,setCreating]=useState(false);
 const loadList=useCallback(async()=>{if(!userId)return;const {data}=await supabase.rpc('duel_list');setList(data||[])},[userId]);
 const loadRoom=useCallback(async()=>{if(!roomId)return;const {data,error}=await supabase.rpc('duel_status',{room_input:roomId});if(error){onToast(error.message);setRoomId(null);return}setSt(data)},[roomId,onToast]);
 useEffect(()=>{loadList()},[loadList]);
 useEffect(()=>{if(!roomId){setSt(null);return}loadRoom();const t=setInterval(loadRoom,4000);return()=>clearInterval(t)},[roomId,loadRoom]);
 useEffect(()=>{const h=()=>{loadList();loadRoom()};window.addEventListener('nx:duel-updated',h);document.addEventListener('visibilitychange',h);return()=>{window.removeEventListener('nx:duel-updated',h);document.removeEventListener('visibilitychange',h)}},[loadList,loadRoom]);
 const create=async key=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('duel_create',{game_key_input:key});setBusy(false);if(error){onToast(error.message);return}setCreating(false);await loadList();setRoomId(data.id)};
 const join=async()=>{if(busy||code.trim().length<4)return;setBusy(true);const {data,error}=await supabase.rpc('duel_join',{code_input:code});setBusy(false);if(error){onToast(error.message);return}setCode('');await loadList();setRoomId(data.id)};
 const rematch=async()=>{if(busy)return;setBusy(true);const {error}=await supabase.rpc('duel_rematch',{room_input:roomId});setBusy(false);if(error){onToast(error.message);return}onToast('Revanche! Nova rodada aberta.');loadRoom()};
 const share=async room=>{const text=`Me desafie no ${gameOf(room.game_key).label}! Entre no Meu Financeiro > Jogos > Duelos e use o código ${room.code}.`;try{if(navigator.share){await navigator.share({text});return}await navigator.clipboard.writeText(text);onToast('Convite copiado!')}catch{}};

 if(roomId&&st){
  const r=st.room,me=st.players.find(p=>p.user_id===userId),opp=st.players.find(p=>p.user_id!==userId),g=gameOf(r.game_key);
  const sc=(uid,round)=>st.scores.find(s=>s.user_id===uid&&s.round===round)?.score;
  const mine=sc(userId,r.round),theirs=opp?sc(opp.user_id,r.round):undefined,bothDone=mine!=null&&theirs!=null;
  const myWins=st.wins[userId]||0,theirWins=opp?st.wins[opp.user_id]||0:0;
  const verdict=bothDone?(mine>theirs?'win':mine<theirs?'lose':'tie'):null;
  const past=[...new Set(st.scores.map(s=>s.round))].filter(x=>x<r.round||bothDone).sort((a,b)=>b-a);
  return <section className="nxd2">
   <button type="button" className="nxd2-back" onClick={()=>{setRoomId(null);loadList()}}><ArrowLeft size={16}/> Duelos</button>
   <header className="nxd2-head"><span>{g.icon} {g.label.toUpperCase()} · RODADA {r.round}</span>
    <div className="nxd2-vs"><div><Av p={me}/><b>Você</b></div><div className="nxd2-tally"><strong>{myWins}</strong><i>×</i><strong>{theirWins}</strong><small>vitórias</small></div><div>{opp?<><Av p={opp}/><b>{opp.name}</b></>:<><span className="nxd2-av empty" style={{'--s':'52px'}}>?</span><b>Aguardando…</b></>}</div></div></header>
   {!opp&&<div className="nxd2-wait"><Clock3 size={18}/><div><b>Esperando seu adversário</b><small>Passe o código <strong className="nxd2-code">{r.code}</strong> para um amigo entrar.</small></div><button type="button" onClick={()=>share(r)}><Share2 size={15}/> Convidar</button></div>}
   {opp&&<div className={'nxd2-round '+(verdict||'')}>
     <div className="nxd2-side"><small>VOCÊ</small><b>{mine!=null?fmt(mine):'—'}</b><em>{mine!=null?'jogou':'ainda não jogou'}</em></div>
     <div className="nxd2-mid">{verdict==='win'?<><Trophy size={26}/><b>VITÓRIA!</b></>:verdict==='lose'?<><b>DERROTA</b><small>Peça revanche</small></>:verdict==='tie'?<b>EMPATE</b>:<Swords size={26}/>}</div>
     <div className="nxd2-side"><small>{opp.name.toUpperCase().slice(0,12)}</small><b>{theirs!=null?(mine!=null?fmt(theirs):'✓'):'—'}</b><em>{theirs!=null?'já jogou':'aguardando'}</em></div>
    </div>}
   {opp&&mine==null&&<button type="button" className="nxd2-primary" onClick={()=>onPlay(r)}><Play size={18}/> Jogar minha rodada</button>}
   {opp&&mine!=null&&!bothDone&&<p className="nxd2-note"><Clock3 size={14}/> Placar enviado. Aguardando {opp.name} jogar…</p>}
   {bothDone&&<button type="button" className="nxd2-primary alt" disabled={busy} onClick={rematch}><RefreshCw size={18}/> Revanche</button>}
   {past.length>0&&<div className="nxd2-hist"><small>HISTÓRICO DA SALA</small>{past.map(n=>{const a=sc(userId,n),b=opp?sc(opp.user_id,n):null;if(a==null||b==null)return null;return <div key={n}><span>Rodada {n}</span><b>{fmt(a)}</b><i>×</i><b>{fmt(b)}</b><em className={a>b?'w':a<b?'l':'t'}>{a>b?'Vitória':a<b?'Derrota':'Empate'}</em></div>})}</div>}
   <p className="nxd2-foot">Sala <strong>{r.code}</strong> · só vale partida jogada depois de abrir a rodada.</p>
  </section>;
 }
 return <section className="nxd2">
  <header className="nxd2-head solo"><span>MULTIPLAYER</span><h3>Duelos</h3><small>Crie uma sala, passe o código e veja quem faz mais pontos. Peça revanche e acompanhe quem vence mais.</small></header>
  <div className="nxd2-actions">
   <button type="button" className="nxd2-primary" onClick={()=>setCreating(v=>!v)}><Plus size={18}/> Criar sala</button>
   <div className="nxd2-join"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="CÓDIGO" maxLength={6} aria-label="Código da sala" inputMode="text" autoCapitalize="characters"/><button type="button" onClick={join} disabled={busy||code.length<4}><LogIn size={16}/> Entrar</button></div>
  </div>
  {creating&&<div className="nxd2-games">{DUEL_GAMES.map(g=><button type="button" key={g.key} disabled={busy} onClick={()=>create(g.key)}><i>{g.icon}</i><b>{g.label}</b></button>)}</div>}
  <div className="nxd2-list">{list===null?<div className="nxd2-skel"><i/><i/></div>:list.length===0?<p className="nxd2-empty">Nenhum duelo ainda. Crie uma sala e chame um amigo!</p>:list.map(x=>{const g=gameOf(x.game_key);const state=x.waiting?'Esperando adversário':x.my_done&&x.their_done?'Rodada concluída':x.my_done?'Aguardando adversário':'Sua vez de jogar';return <button type="button" key={x.id} className={'nxd2-room'+(!x.waiting&&!x.my_done?' turn':'')} onClick={()=>setRoomId(x.id)}><span className="nxd2-room-ic">{g.icon}</span><div><b>{g.label}{x.opponent?` · vs ${x.opponent}`:''}</b><small>Rodada {x.round} · {state}{x.waiting?` · código ${x.code}`:''}</small></div><Swords size={18}/></button>})}</div>
 </section>;
}
