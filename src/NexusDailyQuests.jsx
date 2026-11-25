import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Flame,Gift,Check,Trophy,Target,Swords,Layers} from 'lucide-react';
import './nexus-daily.css';

const QUESTS=[
 {key:'daily-play-3',title:'Aquecimento',desc:'Jogue 3 partidas',goal:3,field:'matches',reward:40,Icon:Target},
 {key:'daily-win',title:'Vitória do dia',desc:'Vença 1 partida',goal:1,field:'wins',reward:50,Icon:Trophy},
 {key:'daily-variety',title:'Explorador',desc:'Jogue 2 jogos diferentes',goal:2,field:'games',reward:60,Icon:Layers},
 {key:'daily-play-6',title:'Maratona',desc:'Jogue 6 partidas',goal:6,field:'matches',reward:80,Icon:Swords}
];
export const LEAGUES=[
 {name:'Bronze',min:0,color:'#c08457'},{name:'Prata',min:500,color:'#b8c4d6'},{name:'Ouro',min:1500,color:'#ffc84a'},
 {name:'Platina',min:3000,color:'#59d4ff'},{name:'Diamante',min:6000,color:'#a78bfa'},{name:'Lenda',min:10000,color:'#ff6b81'}
];
export const LEAGUE_BONUS=[0,5,10,15,20,30];
export function leagueOf(xp){let i=0;LEAGUES.forEach((l,k)=>{if(xp>=l.min)i=k});return {cur:LEAGUES[i],next:LEAGUES[i+1]||null}}

export default function NexusDailyQuests({userId,gameXp=0,refreshKey=0,onToast=()=>{}}){
 const [st,setSt]=useState(null),[busy,setBusy]=useState(''),[err,setErr]=useState('');
 const load=useCallback(async()=>{if(!userId)return;const {data,error}=await supabase.rpc('nexus_daily_status');if(error){setErr('Não foi possível carregar as missões.');return}setErr('');setSt(data)},[userId]);
 useEffect(()=>{load()},[load,refreshKey]);
 const claim=async q=>{if(busy)return;setBusy(q.key);const {data,error}=await supabase.rpc('nexus_claim_daily_quest',{quest_key_input:q.key});setBusy('');if(error){onToast(error.message);return}onToast('+'+(data?.reward??q.reward)+' moedas resgatadas!'+(data?.bonus?` (bônus de ${data.bonus})`:''));load()};
 const {cur,next}=leagueOf(gameXp);const pct=next?Math.min(100,Math.round((gameXp-cur.min)/(next.min-cur.min)*100)):100;
 const li=LEAGUES.indexOf(cur),pctBonus=LEAGUE_BONUS[li],streakBonus=2*Math.min(st?.streak||0,7);const bonusOf=r=>Math.floor(r*pctBonus/100)+streakBonus;
 const claimed=st?.claimed||[];const done=QUESTS.filter(q=>claimed.includes(q.key)).length;
 return <section className="nxd" aria-label="Missões diárias e liga">
  <header className="nxd-head">
   <div className="nxd-league" style={{'--lc':cur.color}}><svg className="nxd-gem" viewBox="0 0 64 72" aria-hidden="true"><defs><linearGradient id="nxdg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95"/><stop offset=".35" stopColor="var(--lc)"/><stop offset="1" stopColor="#000" stopOpacity=".55"/></linearGradient></defs><polygon points="32,2 60,18 60,54 32,70 4,54 4,18" fill="url(#nxdg1)" stroke="var(--lc)" strokeWidth="2"/><polygon points="32,2 60,18 32,34 4,18" fill="#fff" opacity=".38"/><polygon points="32,34 60,18 60,54 32,70" fill="#000" opacity=".28"/><polygon points="32,34 4,18 4,54 32,70" fill="#fff" opacity=".08"/><text x="32" y="48" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" opacity=".9">{li+1}</text></svg><div><small>SUA LIGA</small><b>{cur.name}</b></div></div>
   <div className="nxd-streak" title="Dias seguidos jogando"><Flame size={18}/><b>{st?.streak||0}</b><small>{(st?.streak||0)===1?'dia':'dias'} seguidos</small></div>
  </header>
  <div className="nxd-league-bar"><span style={{width:pct+'%',background:cur.color}}/></div>
  <p className="nxd-league-note">{next?`${Math.max(0,next.min-gameXp)} XP para a liga ${next.name}`:'Você está na liga máxima. Mantenha o topo!'}</p>
  <div className="nxd-perks"><div><b>+{pctBonus}%</b><small>moedas das missões</small></div><div><b>+{streakBonus}</b><small>por missão · sequência</small></div><div><b>{next?'+'+LEAGUE_BONUS[li+1]+'%':'MAX'}</b><small>{next?'na liga '+next.name:'liga máxima'}</small></div></div>
  <div className="nxd-title"><b>Missões de hoje</b><span>{done}/{QUESTS.length} concluídas · renovam à meia-noite</span></div>
  {err&&<p className="nxd-err" role="alert">{err}</p>}
  <div className="nxd-list">{QUESTS.map(q=>{const cur_=Math.min(q.goal,Number(st?.[q.field]||0)),ok=cur_>=q.goal,got=claimed.includes(q.key);
   return <article key={q.key} className={'nxd-q'+(got?' got':ok?' ready':'')}>
    <span className="nxd-ic"><q.Icon size={18}/></span>
    <div className="nxd-body"><b>{q.title}</b><small>{q.desc} · {cur_}/{q.goal}</small><em><i style={{width:(cur_/q.goal*100)+'%'}}/></em></div>
    {got?<span className="nxd-done"><Check size={14}/> Resgatado</span>:<button type="button" disabled={!ok||!!busy} onClick={()=>claim(q)}><Gift size={14}/> {q.reward+bonusOf(q.reward)}</button>}
   </article>})}</div>
 </section>;
}
