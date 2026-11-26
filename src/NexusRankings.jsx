import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Trophy,Crown,Medal,Users,RefreshCw,Swords,Gift,Timer} from 'lucide-react';
import {leagueOf} from './NexusDailyQuests';
import './nexus-rankings.css';

export const RANK_GAMES=[
 {key:'league',label:'Liga',unit:'XP'},
 {key:'space-nexus',label:'Space Nexus',unit:'pts'},
 {key:'piggy-run',label:'Finance Flap',unit:'pts'},
 {key:'extra-gems',label:'Gemas',unit:'pts'},
 {key:'extra-defense',label:'Defesa',unit:'pts'},
 {key:'quiz',label:'Quiz',unit:'acertos'}
];
const nameOf=p=>p?.display_name||p?.username||'Jogador';
const initials=n=>String(n||'NX').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const fmt=n=>Number(n||0).toLocaleString('pt-BR');

function Av({p,size=40}){return <span className={'nxr-av frame-'+(p?.avatar_frame||'violet')} style={{'--s':size+'px'}}>{p?.avatar||initials(nameOf(p))}</span>}

export default function NexusRankings({userId,onToast=()=>{}}){
 const [tab,setTab]=useState('league'),[data,setData]=useState(null),[period,setPeriod]=useState('week'),[prizes,setPrizes]=useState(null),[now,setNow]=useState(Date.now()),[loading,setLoading]=useState(true),[err,setErr]=useState('');
 const game=RANK_GAMES.find(g=>g.key===tab);const isLeague=tab==='league';const weekly=!isLeague&&period==='week';
 const load=useCallback(async()=>{
  if(!userId)return;setLoading(true);setErr('');
  const {data:d,error}=isLeague?await supabase.rpc('nexus_league_leaderboard',{limit_input:50}):await supabase.rpc('nexus_rank_board',{game_key_input:tab,period_input:period,limit_input:50});
  setLoading(false);if(error){setErr('Não foi possível carregar o ranking agora.');setData(null);return}setData(d);
 },[userId,tab,isLeague,period]);
 useEffect(()=>{load()},[load]);
 const loadPrizes=useCallback(async()=>{if(!userId)return;const {data:d}=await supabase.rpc('nexus_weekly_prizes',{claim_input:false});setPrizes(d)},[userId]);
 useEffect(()=>{loadPrizes()},[loadPrizes]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t)},[]);
 const claim=async()=>{const {data:d,error}=await supabase.rpc('nexus_weekly_prizes',{claim_input:true});if(error){onToast(error.message);return}onToast(`Prêmios da semana: +${d.total} moedas!`);setPrizes(d)};
 const pending=(prizes?.prizes||[]).filter(x=>!x.claimed);
 const left=data?.ends_at?Math.max(0,new Date(data.ends_at).getTime()-now):0;const dLeft=Math.floor(left/864e5),hLeft=Math.floor(left%864e5/36e5);
 const top=data?.top||[],me=data?.me;
 const gap=data?.above&&me?Math.max(1,data.above.best-me.best+1):0;
 const value=r=>isLeague?r.game_xp:r.best;
 const lg=r=>isLeague?leagueOf(r.game_xp).cur:null;
 const podium=top.slice(0,3);const rest=top.slice(3);
 const row=(r,extra='')=><li key={r.user_id} className={'nxr-row'+(r.user_id===userId?' me':'')+extra}>
  <b className="nxr-pos">{r.rank}</b><Av p={r} size={38}/>
  <div className="nxr-who"><b>{nameOf(r)}</b><small>{isLeague?<span style={{color:lg(r).color}}>Liga {lg(r).name}</span>:`${fmt(r.matches)} partidas${r.wins?` · ${fmt(r.wins)} vitórias`:''}`}</small></div>
  <strong className="nxr-val">{fmt(value(r))}<small>{game.unit}</small></strong>
 </li>;
 return <section className="nxr" aria-label="Ranking global">
  <div className="nxr-tabs" role="tablist">{RANK_GAMES.map(g=><button type="button" role="tab" aria-selected={tab===g.key} key={g.key} className={tab===g.key?'on':''} onClick={()=>setTab(g.key)}>{g.key==='league'?<Crown size={13}/>:null}{g.label}</button>)}</div>
  {pending.length>0&&<div className="nxr-prize"><Gift size={22}/><div><b>Você foi top 3 na semana passada!</b><small>{pending.map(x=>`${(RANK_GAMES.find(g=>g.key===x.game_key)||{}).label||x.game_key} #${x.rank}`).join(' · ')}</small></div><button type="button" onClick={claim}>+{prizes.total}</button></div>}
  <header className="nxr-head"><div><span>TOP GLOBAL</span><h3>{isLeague?'Ranking das ligas':game.label}</h3><small>{isLeague?'Quem tem mais XP de jogos':weekly?'Melhor pontuação desta semana':'Melhor pontuação de todos os tempos'}{data?.players?` · ${fmt(data.players)} jogadores`:''}</small></div><button type="button" className="nxr-refresh" onClick={load} aria-label="Atualizar ranking" disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/></button></header>
  {!isLeague&&<div className="nxr-period"><div role="tablist">{[['week','Semana'],['all','Geral']].map(([k,l])=><button type="button" role="tab" aria-selected={period===k} key={k} className={period===k?'on':''} onClick={()=>setPeriod(k)}>{l}</button>)}</div>{weekly&&data?.ends_at&&<span><Timer size={13}/> zera em {dLeft>0?dLeft+'d ':''}{hLeft}h · top 3 ganha 300/150/75 moedas</span>}</div>}
  {me&&<div className="nxr-me"><Trophy size={18}/><div><small>SUA POSIÇÃO</small><b>#{me.rank}</b></div><div><small>{isLeague?'SEU XP':'SUA MELHOR MARCA'}</small><b>{fmt(value(me))} {game.unit}</b></div></div>}
  {!me&&!loading&&!err&&<div className="nxr-me empty"><Users size={18}/><div><small>VOCÊ AINDA NÃO ESTÁ NO RANKING</small><b>{isLeague?'Ganhe XP jogando':'Jogue uma partida para entrar'}</b></div></div>}
  {!isLeague&&me&&data?.above&&<div className="nxr-rival"><Swords size={18}/><div><small>SEU RIVAL</small><b>{nameOf(data.above)} · #{data.above.rank}</b></div><span>faltam <strong>{fmt(gap)}</strong> {game.unit} para passar</span></div>}
  {!isLeague&&me&&me.rank===1&&<div className="nxr-rival king"><Crown size={18}/><div><small>VOCÊ LIDERA</small><b>Defenda o topo!</b></div></div>}
  {err&&<p className="nxr-err" role="alert">{err}</p>}
  {loading&&!data&&<div className="nxr-skel"><i/><i/><i/></div>}
  {podium.length>0&&<div className="nxr-podium">{[podium[1],podium[0],podium[2]].map((r,i)=>r&&<div key={r.user_id} className={'nxr-pod p'+r.rank+(r.user_id===userId?' me':'')}><span className="nxr-medal">{r.rank===1?<Crown size={18}/>:<Medal size={16}/>}</span><Av p={r} size={r.rank===1?58:46}/><b>{nameOf(r)}</b><strong>{fmt(value(r))}<small>{game.unit}</small></strong><em>#{r.rank}</em></div>)}</div>}
  {rest.length>0&&<ol className="nxr-list">{rest.map(r=>row(r))}</ol>}
  {!loading&&!err&&top.length===0&&<p className="nxr-empty">Ninguém pontuou aqui ainda. Seja o primeiro do top!</p>}
 </section>;
}
