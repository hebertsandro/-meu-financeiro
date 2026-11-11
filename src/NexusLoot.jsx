import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Coins,Gem,Trophy,Sparkles,Package,RefreshCw} from 'lucide-react';

const number=n=>Number(n||0).toLocaleString('pt-BR');
const date=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
export default function NexusLoot({userId,view='collection'}){
 const [wallet,setWallet]=useState({coins:0,collection_score:0});
 const [items,setItems]=useState([]);
 const [drops,setDrops]=useState([]);
 const [ranking,setRanking]=useState([]);
 const [profiles,setProfiles]=useState({});
 const [loading,setLoading]=useState(true);
 const load=async()=>{
  if(!userId)return;
  setLoading(true);
  const [w,i,d,r]=await Promise.all([
   supabase.from('nexus_loot_wallets').select('coins,collection_score').eq('user_id',userId).maybeSingle(),
   supabase.from('nexus_loot_inventory').select('*').eq('user_id',userId).order('score_value',{ascending:false}),
   supabase.from('nexus_loot_drops').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(12),
   supabase.from('nexus_loot_wallets').select('user_id,coins,collection_score').order('collection_score',{ascending:false}).limit(50)
  ]);
  setWallet(w.data||{coins:0,collection_score:0});setItems(i.data||[]);setDrops(d.data||[]);
  const rows=r.data||[];setRanking(rows);
  const ids=rows.map(x=>x.user_id);
  if(ids.length){
   const p=await supabase.from('social_profiles').select('user_id,username,display_name,avatar').in('user_id',ids);
   setProfiles(Object.fromEntries((p.data||[]).map(x=>[x.user_id,x])));
  }
  setLoading(false);
 };
 useEffect(()=>{load()},[userId]);
 if(loading)return <div className="nc-loading"><RefreshCw className="nc-spin"/> Carregando coleção…</div>;
 if(view==='ranking')return <div className="nc-board"><div className="nc-board-caption">RANKING GLOBAL · VALOR TOTAL DA COLEÇÃO</div>{ranking.length?ranking.map((r,index)=>{const p=profiles[r.user_id]||{};return <div className={'nc-rank-row '+(r.user_id===userId?'is-me':'')} key={r.user_id}><span className={'nc-rank-position rank-'+(index+1)}>{index<3?['🥇','🥈','🥉'][index]:index+1}</span><span className="nc-rank-avatar">{p.avatar||String(p.display_name||p.username||'J').slice(0,1).toUpperCase()}</span><span className="nc-rank-player"><b>{p.display_name||p.username||'Jogador'}{r.user_id===userId?' · Você':''}</b><small>{p.username?'@'+p.username:'Jogador NEXUS'}</small></span><span className="nc-rank-score"><b>{number(r.collection_score)}</b><small>pontos</small></span></div>}) : <p className="nc-empty">Ainda não há pontuações de coleção. Termine uma partida para começar!</p>}</div>;
 return <div className="nc-collection">
  <div className="nc-loot-wallet"><div><small>SALDO DE MOEDAS NEXUS</small><b><Coins size={20}/>{number(wallet.coins)}</b></div><div><small>VALOR TOTAL NO RANKING</small><b><Trophy size={20}/>{number(wallet.collection_score)} pts</b></div></div>
  <div className="nc-collection-head"><h4><Gem size={17}/> Artefatos e drops especiais</h4><small>Itens de maior raridade valem muito mais pontos — e são muito mais difíceis de encontrar.</small></div>
  {items.length?<div className="nc-loot-grid">{items.map(item=><article className={'nc-loot-item rarity-'+item.rarity} key={item.item_key}><span>{item.icon||'💎'}</span><div><b>{item.item_name}</b><small>{String(item.rarity||'comum').toUpperCase()} · {number(item.score_value)} pts cada</small></div><strong>×{item.quantity}</strong></article>)}</div>:<p className="nc-empty">Sua coleção ainda está vazia. Jogue partidas para receber moedas e tentar encontrar drops raros.</p>}
  <div className="nc-collection-head"><h4><Sparkles size={17}/> Drops recentes</h4><small>Recompensas recebidas nas últimas partidas.</small></div>
  {drops.length?drops.map(drop=><div className="nc-drop-row" key={drop.id}><span>{drop.icon||'🎁'}</span><div><b>{drop.item_name}</b><small>{date(drop.created_at)}</small></div><strong>+{number(drop.score_value)} pts</strong></div>):<p className="nc-empty">Nenhum drop registrado ainda.</p>}
 </div>;
}
