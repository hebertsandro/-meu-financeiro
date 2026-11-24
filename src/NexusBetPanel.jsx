import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Coins,Target,Flame,Shield,X} from 'lucide-react';
import './nexus-bets.css';

export const betKeyOf=id=>id==='space'?'space-nexus':id==='flap'?'piggy-run':id;
const TIERS=[
 {key:'safe',name:'Seguro',mult:1.5,f:.8,Icon:Shield,hint:'80% do seu recorde'},
 {key:'bold',name:'Desafio',mult:2.5,f:1,Icon:Target,hint:'igualar seu recorde'},
 {key:'wild',name:'Ousado',mult:4,f:1.3,Icon:Flame,hint:'30% acima do recorde'}
];
const STAKES=[10,25,50,100];

export default function NexusBetPanel({userId,gameId,onToast=()=>{}}){
 const gameKey=betKeyOf(gameId);
 const [st,setSt]=useState(null),[stake,setStake]=useState(25),[tier,setTier]=useState('bold'),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const load=useCallback(async()=>{if(!userId||!gameKey)return;const {data,error}=await supabase.rpc('nexus_bet_status',{game_key_input:gameKey});if(!error)setSt(data)},[userId,gameKey]);
 useEffect(()=>{load()},[load]);
 if(!userId||!st)return null;
 const base=Math.max(st.best||0,5);
 const place=async()=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('nexus_place_bet',{game_key_input:gameKey,stake_input:stake,tier_input:tier});setBusy(false);if(error){onToast(error.message);return}onToast(`Aposta feita! Passe de ${data.target} pontos para ganhar.`);setOpen(false);load()};
 const cancel=async()=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('nexus_cancel_bet');setBusy(false);if(error){onToast(error.message);return}onToast(`Aposta cancelada. ${data?.refund||0} moedas devolvidas.`);load()};
 const ob=st.open;
 if(ob){const sameGame=ob.game_key===gameKey;return <section className="nxb live"><div className="nxb-live"><span className="nxb-ic"><Target size={18}/></span><div><b>Aposta ativa{sameGame?'':' em outro jogo'}</b><small>Faça {ob.target} pontos ou mais · ganhe {Math.floor(ob.stake*Number(ob.multiplier))} moedas (aposta de {ob.stake})</small></div><button type="button" onClick={cancel} disabled={busy} aria-label="Cancelar aposta"><X size={16}/></button></div></section>}
 return <section className="nxb"><button type="button" className="nxb-toggle" onClick={()=>setOpen(o=>!o)} aria-expanded={open}><span className="nxb-ic"><Coins size={18}/></span><div><b>Aposta de confiança</b><small>{open?'Escolha o risco e a quantidade de moedas':'Aposte moedas que você passa da meta e ganhe mais'}</small></div><em>{st.coins} <Coins size={12}/></em></button>
  {open&&<div className="nxb-body">
   <div className="nxb-tiers">{TIERS.map(t=>{const target=Math.max(t.key==='safe'?1:t.key==='bold'?2:3,Math.ceil(base*t.f));return <button type="button" key={t.key} className={tier===t.key?'on':''} onClick={()=>setTier(t.key)}><t.Icon size={16}/><b>{t.name}</b><span>{target} pts</span><small>x{t.mult}</small></button>})}</div>
   <div className="nxb-stakes">{STAKES.map(v=><button type="button" key={v} className={stake===v?'on':''} disabled={v>st.coins} onClick={()=>setStake(v)}>{v}</button>)}</div>
   <p className="nxb-note">Se você passar da meta na próxima partida, recebe {Math.floor(stake*TIERS.find(t=>t.key===tier).mult)} moedas. Se não passar, perde {stake}. {!st.best&&'Sem recorde ainda: a meta usa uma base mínima.'}</p>
   <button type="button" className="nxb-go" disabled={busy||stake>st.coins} onClick={place}>{stake>st.coins?'Moedas insuficientes':`Apostar ${stake} moedas`}</button>
   {st.history?.length>0&&<div className="nxb-hist"><small>Últimas apostas</small>{st.history.map((h,i)=><span key={i} className={h.status}>{h.status==='won'?'+'+h.payout:'-'+h.stake}</span>)}</div>}
  </div>}</section>;
}
