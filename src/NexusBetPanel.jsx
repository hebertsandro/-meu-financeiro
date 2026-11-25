import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Coins,Target,Flame,Shield,X,HelpCircle,Trophy,TrendingDown} from 'lucide-react';
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
 const [st,setSt]=useState(null),[stake,setStake]=useState(25),[tier,setTier]=useState('bold'),[busy,setBusy]=useState(false),[open,setOpen]=useState(false),[help,setHelp]=useState(false),[result,setResult]=useState(null);
 const load=useCallback(async()=>{if(!userId||!gameKey)return;const {data,error}=await supabase.rpc('nexus_bet_status',{game_key_input:gameKey});if(!error)setSt(data)},[userId,gameKey]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{
  const onResolved=e=>{const b=e.detail;if(b?.resolved)setResult(b);setOpen(false);load()};
  const onVis=()=>{if(document.visibilityState==='visible')load()};
  window.addEventListener('nx:bet-resolved',onResolved);
  document.addEventListener('visibilitychange',onVis);
  return()=>{window.removeEventListener('nx:bet-resolved',onResolved);document.removeEventListener('visibilitychange',onVis)};
 },[load]);
 if(!userId||!st)return null;
 const base=Math.max(st.best||0,5);
 const place=async()=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('nexus_place_bet',{game_key_input:gameKey,stake_input:stake,tier_input:tier});setBusy(false);if(error){onToast(error.message);return}setResult(null);onToast(`Investimento feito! Passe de ${data.target} pontos para lucrar.`);setOpen(false);load()};
 const cancel=async()=>{if(busy)return;setBusy(true);const {data,error}=await supabase.rpc('nexus_cancel_bet');setBusy(false);if(error){onToast(error.message);return}onToast(`Investimento cancelado. ${data?.refund||0} moedas devolvidas.`);load()};
 const ob=st.open;
 const resultBox=result&&!ob&&<div className={'nxb-result '+(result.status==='won'?'won':'lost')} role="status">{result.status==='won'?<Trophy size={20}/>:<TrendingDown size={20}/>}<div><b>{result.status==='won'?`Investimento valeu! +${result.payout} moedas`:`Investimento perdido: -${result.stake} moedas`}</b><small>Você fez {result.score} de {result.target} pontos. {result.status==='won'?'Meta batida!':'Não bateu a meta.'} Faça um novo investimento para a próxima partida.</small></div><button type="button" onClick={()=>setResult(null)} aria-label="Fechar"><X size={16}/></button></div>;
 const helpBox=help&&<div className="nxb-help" role="dialog" aria-label="Como funcionam os investimentos"><div className="nxb-help-head"><b>Como funcionam os investimentos</b><button type="button" onClick={()=>setHelp(false)} aria-label="Fechar"><X size={16}/></button></div><table><thead><tr><th>Risco</th><th>Meta</th><th>Retorno</th></tr></thead><tbody>{TIERS.map(t=><tr key={t.key}><td>{t.name}</td><td>{t.hint}</td><td>x{t.mult}</td></tr>)}</tbody></table><ul><li>Invista de 10 a 100 moedas antes de jogar.</li><li>Vale só para a <b>próxima partida</b> daquele jogo. Depois dela o resultado aparece aqui e o investimento se encerra.</li><li>Bateu a meta: recebe valor × retorno. Não bateu: perde o valor investido.</li><li>Só um investimento aberto por vez. Dá para cancelar e receber as moedas de volta antes de jogar.</li></ul></div>;

 if(ob){const sameGame=ob.game_key===gameKey;return <section className="nxb live">{resultBox}<div className="nxb-live"><span className="nxb-ic"><Target size={18}/></span><div><b>Investimento ativo{sameGame?' · próxima partida':' em outro jogo'}</b><small>Faça {ob.target} pontos ou mais · retorno de {Math.floor(ob.stake*Number(ob.multiplier))} moedas (investido: {ob.stake})</small></div><button type="button" onClick={cancel} disabled={busy} aria-label="Cancelar investimento"><X size={16}/></button></div><button type="button" className="nxb-q" onClick={()=>setHelp(h=>!h)} aria-label="Ver tabela de investimentos"><HelpCircle size={16}/> Ver tabela</button>{helpBox}</section>}
 return <section className="nxb">{resultBox}<button type="button" className="nxb-toggle" onClick={()=>setOpen(o=>!o)} aria-expanded={open}><span className="nxb-ic"><Coins size={18}/></span><div><b>Investimento de confiança</b><small>{open?'Escolha o risco e o valor em moedas':'Invista moedas que você passa da meta e lucre'}</small></div><em>{st.coins} <Coins size={12}/></em></button>
  <button type="button" className="nxb-q" onClick={()=>setHelp(h=>!h)} aria-label="Ver tabela de investimentos" aria-expanded={help}><HelpCircle size={16}/> Como funciona</button>{helpBox}
  {open&&<div className="nxb-body">
   <div className="nxb-tiers">{TIERS.map(t=>{const target=Math.max(t.key==='safe'?1:t.key==='bold'?2:3,Math.ceil(base*t.f));return <button type="button" key={t.key} className={tier===t.key?'on':''} onClick={()=>setTier(t.key)}><t.Icon size={16}/><b>{t.name}</b><span>{target} pts</span><small>x{t.mult}</small></button>})}</div>
   <div className="nxb-stakes">{STAKES.map(v=><button type="button" key={v} className={stake===v?'on':''} disabled={v>st.coins} onClick={()=>setStake(v)}>{v}</button>)}</div>
   <p className="nxb-note">Se você passar da meta na próxima partida, recebe {Math.floor(stake*TIERS.find(t=>t.key===tier).mult)} moedas. Se não passar, perde {stake}. {!st.best&&'Sem recorde ainda: a meta usa uma base mínima.'}</p>
   <button type="button" className="nxb-go" disabled={busy||stake>st.coins} onClick={place}>{stake>st.coins?'Moedas insuficientes':`Investir ${stake} moedas`}</button>
   {st.history?.length>0&&<div className="nxb-hist"><small>Últimos investimentos</small>{st.history.map((h,i)=><span key={i} className={h.status}>{h.status==='won'?'+'+h.payout:'-'+h.stake}</span>)}</div>}
  </div>}</section>;
}
