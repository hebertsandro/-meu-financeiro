import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Gift,Check,Lock,Coins,Flame} from 'lucide-react';
import {LEAGUES,LEAGUE_BONUS,leagueOf} from './NexusDailyQuests';
import './nexus-leagues.css';

export const LEAGUE_CHEST=[0,100,250,500,1000,2000];
const fmt=n=>Number(n||0).toLocaleString('pt-BR');

export default function NexusLeagues({userId,gameXp=0,onToast=()=>{}}){
 const [claimed,setClaimed]=useState([]),[busy,setBusy]=useState(-1);
 const load=useCallback(async()=>{if(!userId)return;const {data}=await supabase.rpc('nexus_league_reward_status');if(data?.claimed)setClaimed(data.claimed)},[userId]);
 useEffect(()=>{load()},[load]);
 const {cur}=leagueOf(gameXp);const curIdx=LEAGUES.indexOf(cur);
 const open=async i=>{if(busy>=0)return;setBusy(i);const {data,error}=await supabase.rpc('nexus_claim_league_reward',{league_idx_input:i});setBusy(-1);if(error){onToast(error.message);return}onToast(`Baú da liga ${LEAGUES[i].name}: +${data?.coins||LEAGUE_CHEST[i]} moedas!`);load()};
 return <section className="nxl" aria-label="Tabela de ligas">
  <header><span>EVOLUÇÃO</span><h3>Tabela de ligas</h3><small>Suba de liga com XP de jogos. Cada liga dá bônus permanentes e um baú de promoção.</small></header>
  <ol className="nxl-list">{LEAGUES.map((l,i)=>{
   const reached=i<=curIdx,isCur=i===curIdx,got=claimed.includes(i),next=LEAGUES[i+1];
   const pct=isCur&&next?Math.min(100,Math.round((gameXp-l.min)/(next.min-l.min)*100)):reached?100:0;
   return <li key={l.name} className={'nxl-row'+(isCur?' cur':'')+(reached?' on':' off')} style={{'--lc':l.color}}>
    <span className="nxl-badge"><b>{i+1}</b></span>
    <div className="nxl-main">
     <div className="nxl-top"><b>{l.name}</b>{isCur&&<em>VOCÊ ESTÁ AQUI</em>}{!reached&&<span><Lock size={12}/> {fmt(l.min-gameXp)} XP</span>}</div>
     <small>{i===0?'Início da jornada':`A partir de ${fmt(l.min)} XP`}</small>
     <div className="nxl-perks"><span><Coins size={12}/> +{LEAGUE_BONUS[i]}% moedas das missões</span><span><Flame size={12}/> +2 por dia de sequência (máx. 14)</span></div>
     {(isCur&&next)&&<div className="nxl-bar"><i style={{width:pct+'%'}}/></div>}
    </div>
    <div className="nxl-chest">{i===0?<small>—</small>:got?<span className="done"><Check size={14}/> Aberto</span>:reached?<button type="button" disabled={busy>=0} onClick={()=>open(i)}><Gift size={14}/> {fmt(LEAGUE_CHEST[i])}</button>:<span className="lock"><Gift size={14}/> {fmt(LEAGUE_CHEST[i])}</span>}</div>
   </li>})}</ol>
 </section>;
}
