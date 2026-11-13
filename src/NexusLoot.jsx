import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Coins,Gem,Trophy,Sparkles,RefreshCw} from 'lucide-react';

const number=n=>Number(n||0).toLocaleString('pt-BR');
const date=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
export default function NexusLoot({userId,view='collection'}){
 const [wallet,setWallet]=useState({coins:0,collection_score:0});
 const [items,setItems]=useState([]);
 const [drops,setDrops]=useState([]);
 const [ranking,setRanking]=useState([]);
 const [profiles,setProfiles]=useState({});
 const [globalRank,setGlobalRank]=useState(null);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);

 const load=useCallback(async(initial=false)=>{
  if(!userId||!supabase)return;
  if(initial)setLoading(true);else setRefreshing(true);
  try{
   const [w,i,d]=await Promise.all([
    supabase.from('nexus_loot_wallets').select('coins,collection_score').eq('user_id',userId).maybeSingle(),
    view==='collection'?supabase.from('nexus_loot_inventory').select('*').eq('user_id',userId).order('score_value',{ascending:false}):Promise.resolve({data:[]}),
    view==='collection'?supabase.from('nexus_loot_drops').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(12):Promise.resolve({data:[]})
   ]);
   const ownWallet=w.data||{coins:0,collection_score:0};
   setWallet(ownWallet);setItems(i.data||[]);setDrops(d.data||[]);

   // Busca o placar completo em páginas para calcular a posição real, inclusive fora do top 50.
   const allRows=[];
   const pageSize=500;
   for(let from=0;;from+=pageSize){
    const page=await supabase.from('nexus_loot_wallets')
     .select('user_id,coins,collection_score')
     .order('collection_score',{ascending:false})
     .order('user_id',{ascending:true})
     .range(from,from+pageSize-1);
    if(page.error)throw page.error;
    const batch=page.data||[];
    allRows.push(...batch);
    if(batch.length<pageSize)break;
   }
   const ownIndex=allRows.findIndex(row=>row.user_id===userId);
   setGlobalRank(ownIndex>=0?ownIndex+1:null);
   const topRows=allRows.slice(0,50);
   setRanking(topRows);
   const ids=[...new Set([...topRows.map(x=>x.user_id),userId])];
   if(ids.length){
    const p=await supabase.from('social_profiles').select('user_id,username,display_name,avatar').in('user_id',ids);
    if(p.error)throw p.error;
    setProfiles(Object.fromEntries((p.data||[]).map(x=>[x.user_id,x])));
   }else setProfiles({});
  }catch(error){console.warn('NEXUS ranking refresh:',error?.message||error)}
  finally{setLoading(false);setRefreshing(false)}
 },[userId,view]);

 useEffect(()=>{
  if(!userId)return;
  let active=true;
  const refresh=()=>{if(active)load(false)};
  load(true);
  const channel=supabase.channel('nexus-global-ranking-'+userId)
   .on('postgres_changes',{event:'*',schema:'public',table:'nexus_loot_wallets'},refresh)
   .subscribe();
  // Atualização periódica como alternativa caso o Realtime não esteja habilitado.
  const interval=window.setInterval(refresh,10000);
  return()=>{active=false;window.clearInterval(interval);supabase.removeChannel(channel)};
 },[userId,load]);

 if(loading)return <div className="nc-loading"><RefreshCw className="nc-spin"/> Carregando coleção…</div>;
 if(view==='ranking')return <div className="nc-board">
  <div className="nc-board-caption">RANKING GLOBAL · VALOR TOTAL DA COLEÇÃO</div>
  <div className="nc-my-global-rank"><div><small>SUA POSIÇÃO ATUAL</small><b>{globalRank?'#'+globalRank:'—'}</b></div><div><small>SUA PONTUAÇÃO</small><b>{number(wallet.collection_score)} pts</b></div><span>{refreshing?'Atualizando…':'Atualiza automaticamente'}</span></div>
  {ranking.length?ranking.map((r,index)=>{const p=profiles[r.user_id]||{};return <div className={'nc-rank-row '+(r.user_id===userId?'is-me':'')} key={r.user_id}><span className={'nc-rank-position rank-'+(index+1)}>{index<3?['🥇','🥈','🥉'][index]:index+1}</span><span className="nc-rank-avatar">{p.avatar||String(p.display_name||p.username||'J').slice(0,1).toUpperCase()}</span><span className="nc-rank-player"><b>{p.display_name||p.username||'Jogador'}{r.user_id===userId?' · Você':''}</b><small>{p.username?'@'+p.username:'Jogador NEXUS'}</small></span><span className="nc-rank-score"><b>{number(r.collection_score)}</b><small>pontos</small></span></div>}) : <p className="nc-empty">Ainda não há pontuações de coleção. Termine uma partida para começar!</p>}
  {globalRank&&globalRank>50&&<p className="nc-empty">Você está na posição #{globalRank}. O placar acima mostra os 50 primeiros jogadores.</p>}
 </div>;
 return <div className="nc-collection">
  <div className="nc-loot-wallet"><div><small>SALDO DE MOEDAS NEXUS</small><b><Coins size={20}/>{number(wallet.coins)}</b></div><div><small>VALOR TOTAL NO RANKING</small><b><Trophy size={20}/>{number(wallet.collection_score)} pts</b></div></div>
  <div className="nc-collection-head"><h4><Gem size={17}/> Artefatos e drops especiais</h4><small>Itens de maior raridade valem muito mais pontos — e são muito mais difíceis de encontrar.</small></div>
  {items.length?<div className="nc-loot-grid">{items.map(item=><article className={'nc-loot-item rarity-'+item.rarity} key={item.item_key}><span>{item.icon||'💎'}</span><div><b>{item.item_name}</b><small>{String(item.rarity||'comum').toUpperCase()} · {number(item.score_value)} pts cada</small></div><strong>×{item.quantity}</strong></article>)}</div>:<p className="nc-empty">Sua coleção ainda está vazia. Jogue partidas para receber moedas e tentar encontrar drops raros.</p>}
  <div className="nc-collection-head"><h4><Sparkles size={17}/> Drops recentes</h4><small>Recompensas recebidas nas últimas partidas.</small></div>
  {drops.length?drops.map(drop=><div className="nc-drop-row" key={drop.id}><span>{drop.icon||'🎁'}</span><div><b>{drop.item_name}</b><small>{date(drop.created_at)}</small></div><strong>+{number(drop.score_value)} pts</strong></div>):<p className="nc-empty">Nenhum drop registrado ainda.</p>}
 </div>;
}
