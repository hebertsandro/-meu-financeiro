import React,{useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {Zap,Coins,Lock,Check,ShoppingBag,Sparkles,Shield,Star,Crown,Gift} from 'lucide-react';
import './nexus-progression.css';

// ── Árvore de habilidades ────────────────────────────────────────────────
const SKILLS={
 'extra-heart':{name:'Coração extra',icon:'❤️',cost:100,req:[],desc:'Comece Masmorra e Corrida com 1 vida adicional.'},
 'iron-core':{name:'Núcleo reforçado',icon:'🛡️',cost:160,req:['extra-heart'],desc:'O Núcleo da Defesa do Cofrinho começa com +4 de vida.'},
 'sell-bonus':{name:'Reciclagem',icon:'♻️',cost:220,req:['iron-core'],desc:'Torres vendidas devolvem 85% do valor em vez de 60%.'},
 'coin-boost':{name:'Ímã de moedas',icon:'🧲',cost:140,req:[],desc:'Dobra os pontos de moedas na Corrida e de combinações nas Gemas.'},
 'start-cash':{name:'Caixa inicial',icon:'💰',cost:150,req:['coin-boost'],desc:'Comece a Defesa do Cofrinho com +60 créditos.'},
 'gem-moves':{name:'Mãos de ouro',icon:'💎',cost:200,req:['start-cash'],desc:'Ganhe +4 jogadas extras no Gem Match.'},
 'quick-cd':{name:'Recarga veloz',icon:'⚡',cost:120,req:[],desc:'Pulso Nova e Campo Crio recarregam em 8s em vez de 12s.'},
 'tower-discount':{name:'Engenharia',icon:'🔧',cost:240,req:['quick-cd'],desc:'Todas as torres custam 15% menos.'},
 'score-plus':{name:'Precisão',icon:'🎯',cost:260,req:['tower-discount'],desc:'+8% de pontuação final nos quatro desafios.'},
 'legend':{name:'Lenda NEXUS',icon:'👑',cost:600,req:['sell-bonus','gem-moves','score-plus'],desc:'Domínio total: +20% de pontuação final em todos os desafios.'}
};
const BRANCHES=[
 {id:'def',name:'DEFESA',color:'#ff6b81',ids:['extra-heart','iron-core','sell-bonus']},
 {id:'eco',name:'ECONOMIA',color:'#ffd166',ids:['coin-boost','start-cash','gem-moves']},
 {id:'mas',name:'MAESTRIA',color:'#a78bfa',ids:['quick-cd','tower-discount','score-plus']}
];

// ── Passe da temporada ───────────────────────────────────────────────────
const PASS=[
 {id:'pass-coins-1',xp:150,name:'40 moedas',icon:'🪙',type:'Moedas'},
 {id:'pass-title-recruit',xp:250,name:'Recruta NEXUS',icon:'🎖️',type:'Título'},
 {id:'pass-coins-2',xp:400,name:'60 moedas',icon:'🪙',type:'Moedas'},
 {id:'pass-trail-blue',xp:500,name:'Rastro Azul',icon:'💫',type:'Moldura'},
 {id:'pass-coins-3',xp:750,name:'80 moedas',icon:'🪙',type:'Moedas'},
 {id:'pass-title-explorer',xp:1000,name:'Explorador',icon:'🧭',type:'Título'},
 {id:'pass-coins-4',xp:1250,name:'120 moedas',icon:'💰',type:'Moedas'},
 {id:'pass-frame-prism',xp:1500,name:'Fragmento Prisma',icon:'💎',type:'Moldura'},
 {id:'pass-coins-5',xp:1750,name:'150 moedas',icon:'💰',type:'Moedas'},
 {id:'pass-title-veteran',xp:2000,name:'Veterano NEXUS',icon:'👑',type:'Título'},
 {id:'pass-title-champion',xp:3000,name:'Campeão da Temporada',icon:'🏆',type:'Título'}
];
const PASS_MAX=PASS[PASS.length-1].xp;

// ── Loja ────────────────────────────────────────────────────────────────
const SHOP=[
 {id:'title-nexus-legend',name:'Lenda Viva',desc:'O título mais raro da NEXUS.',cost:600,icon:'🏆',rarity:'LENDÁRIO',kind:'Título'},
 {id:'cosmetic-ruby-aura',name:'Aura Rubi',desc:'Moldura rubi no avatar e no cartão do jogador.',cost:320,icon:'🔥',rarity:'LENDÁRIO',kind:'Moldura',ring:'#ff4d6d'},
 {id:'cosmetic-gold-crown',name:'Coroa Dourada',desc:'Moldura dourada no avatar e no cartão do jogador.',cost:240,icon:'👑',rarity:'ÉPICO',kind:'Moldura',ring:'#ffd166'},
 {id:'cosmetic-prism-frame',name:'Moldura Prisma',desc:'Acabamento cromado para o cartão do jogador.',cost:160,icon:'💠',rarity:'ÉPICO',kind:'Moldura',ring:'#c9a6ff'},
 {id:'cosmetic-neon-trail',name:'Rastro Neon',desc:'Moldura ciano neon no avatar.',cost:90,icon:'🌌',rarity:'RARO',kind:'Moldura',ring:'#55e5f5'},
 {id:'title-coin-baron',name:'Barão das Moedas',desc:'Para quem domina a economia.',cost:260,icon:'🪙',rarity:'ÉPICO',kind:'Título'},
 {id:'title-void-hunter',name:'Caçador do Vácuo',desc:'Título de quem enfrenta o Space Nexus.',cost:220,icon:'🌠',rarity:'ÉPICO',kind:'Título'},
 {id:'title-guardian',name:'Guardião do Cofrinho',desc:'Título de quem protege cada moeda.',cost:180,icon:'🛡️',rarity:'ÉPICO',kind:'Título'},
 {id:'title-gem-master',name:'Mestre das Gemas',desc:'Título para os reis das combinações.',cost:140,icon:'💎',rarity:'RARO',kind:'Título'},
 {id:'title-star-pilot',name:'Piloto Estelar',desc:'Título exclusivo para jogadores de ação.',cost:120,icon:'🚀',rarity:'RARO',kind:'Título'}
];
const TITLES={
 'title-star-pilot':'Piloto Estelar','title-guardian':'Guardião do Cofrinho','title-gem-master':'Mestre das Gemas','title-void-hunter':'Caçador do Vácuo',
 'title-coin-baron':'Barão das Moedas','title-nexus-legend':'Lenda Viva','pass-title-recruit':'Recruta NEXUS','pass-title-explorer':'Explorador',
 'pass-title-veteran':'Veterano NEXUS','pass-title-champion':'Campeão da Temporada'
};
const RARITY={'RARO':'#59d4ff','ÉPICO':'#b48cff','LENDÁRIO':'#ffb347'};
const EMPTY={unlocked_skills:[],owned_cosmetics:[],equipped_title:null,equipped_cosmetic:null};

export default function NexusProgression({userId,gameXp=0,onToast=()=>{}}){
 const [tab,setTab]=useState('skills'),[progress,setProgress]=useState(EMPTY),[coins,setCoins]=useState(0),[season,setSeason]=useState(null),[seasonXp,setSeasonXp]=useState(0),[claimedPass,setClaimedPass]=useState([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[sel,setSel]=useState('extra-heart'),[filter,setFilter]=useState('Todos');
 const trackRef=useRef(null);
 const load=useCallback(async()=>{
  if(!userId)return;const now=new Date().toISOString();
  const [p,w,s]=await Promise.all([
   supabase.from('nexus_player_progress').select('*').eq('user_id',userId).maybeSingle(),
   supabase.from('nexus_loot_wallets').select('coins').eq('user_id',userId).maybeSingle(),
   supabase.from('competition_seasons').select('id,name,ends_at').eq('status','active').lte('starts_at',now).gt('ends_at',now).order('starts_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(p.error&&p.error.code!=='PGRST116')setError(p.error.message);
  setProgress(p.data||EMPTY);setCoins(Number(w.data?.coins||0));setSeason(s.data||null);
  if(s.data){
   const [score,claims]=await Promise.all([
    supabase.from('competition_season_scores').select('xp_points').eq('season_id',s.data.id).eq('user_id',userId).maybeSingle(),
    supabase.from('nexus_player_pass_claims').select('reward_key').eq('season_id',s.data.id).eq('user_id',userId)
   ]);
   setSeasonXp(Number(score.data?.xp_points||0));setClaimedPass((claims.data||[]).map(x=>x.reward_key));
  }else{setSeasonXp(0);setClaimedPass([])}
 },[userId]);
 useEffect(()=>{load()},[load]);
 const act=async(key,fn,label)=>{
  if(busy)return;setBusy(key);setError('');
  const args=fn==='nexus_progression_unlock_skill'?{skill_key_input:key}:fn==='nexus_progression_claim_pass_reward'?{reward_key_input:key,season_id_input:season?.id}:(fn==='nexus_progression_equip'||fn==='nexus_progression_unequip')?{item_key_input:key}:{cosmetic_key_input:key};
  const {error:e}=await supabase.rpc(fn,args);setBusy('');
  if(e){setError(e.message);return}
  onToast(label||'Progresso NEXUS atualizado!');await load();
 };
 const owned=progress.owned_cosmetics||[],unlocked=progress.unlocked_skills||[];
 const titleName=TITLES[progress.equipped_title]||'Sem título equipado';
 const level=Math.floor(gameXp/500)+1,levelPct=(gameXp%500)/5;
 const status=id=>{const s=SKILLS[id];if(unlocked.includes(id))return 'owned';return s.req.every(r=>unlocked.includes(r))?'available':'locked'};
 const claimable=PASS.filter(p=>!!season&&seasonXp>=p.xp&&!claimedPass.includes(p.id)).length;
 useEffect(()=>{
  if(tab!=='pass'||!trackRef.current)return;
  const idx=Math.max(0,PASS.findIndex(p=>!claimedPass.includes(p.id)));
  const el=trackRef.current.children[idx];if(el)trackRef.current.scrollTo({left:Math.max(0,el.offsetLeft-24),behavior:'smooth'});
 },[tab,claimedPass.length]);

 const Node=({id})=>{const s=SKILLS[id],st=status(id);return <button type="button" className={'npx-node '+st+(sel===id?' sel':'')} onClick={()=>setSel(id)} aria-label={s.name}><span className="npx-node-ico">{st==='locked'?<Lock size={18}/>:s.icon}</span><b>{s.name}</b><small><Coins size={10}/> {s.cost}</small></button>};
 const selSkill=SKILLS[sel],selStatus=status(sel);
 const missing=selSkill.req.filter(r=>!unlocked.includes(r)).map(r=>SKILLS[r].name);
 const shopItems=SHOP.filter(i=>filter==='Todos'||i.kind===filter);
 const featured=SHOP.find(i=>!owned.includes(i.id))||SHOP[0];
 const Preview=({item})=>item.kind==='Título'?<div className="npx-prev-title" style={{'--rc':RARITY[item.rarity]}}><span>{item.icon}</span><em>{item.name}</em></div>:<div className="npx-prev-ring" style={{'--ring':item.ring}}><i>{item.icon}</i></div>;

 return <section className={'npx-hub '+(progress.equipped_cosmetic==='cosmetic-neon-trail'?'equipped-neon':'')+' '+(progress.equipped_cosmetic==='cosmetic-prism-frame'?'equipped-prism':'')}>
  <header className="npx-head">
   <div><span>PROGRESSÃO · PASSE · LOJA</span><h3>Construa sua lenda NEXUS</h3></div>
   <div className="npx-wallet"><Coins size={19}/><b>{coins.toLocaleString('pt-BR')}</b><small>MOEDAS</small></div>
  </header>
  <div className="npx-player-strip">
   <div className="npx-player-orb">👾</div>
   <div className="npx-player-main"><small>SEU TÍTULO</small><b>{titleName}</b>
    <div className="npx-xp"><i style={{width:levelPct+'%'}}/></div><span>{gameXp.toLocaleString('pt-BR')} XP · faltam {500-(gameXp%500)} para o nível {level+1}</span></div>
   <div className="npx-player-level"><Zap size={15}/><b>NV {level}</b></div>
  </div>
  <nav className="npx-tabs">{[['skills','Árvore',<Shield size={15} key="a"/>],['pass','Passe',<Star size={15} key="b"/>],['shop','Loja',<ShoppingBag size={15} key="c"/>]].map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{icon} {label}{id==='pass'&&claimable>0&&<em>{claimable}</em>}</button>)}</nav>
  {error&&<div className="npx-error">{error}</div>}

  {tab==='skills'&&<div className="npx-section">
   <div className="npx-section-title"><div><span>CAMINHO DO JOGADOR</span><h4>Árvore de habilidades</h4></div><small>{unlocked.length}/{Object.keys(SKILLS).length} liberadas</small></div>
   <div className="npx-tree">
    <div className="npx-tree-heads">{BRANCHES.map(b=><b key={b.id} style={{'--bc':b.color}}>{b.name}</b>)}</div>
    {[0,1,2].map(row=><div className="npx-tree-row" key={row}>{BRANCHES.map(b=><div className={'npx-cell '+(row<2?'link ':'')+(status(b.ids[row])==='owned'&&row<2?'lit':'')} style={{'--bc':b.color}} key={b.id}><Node id={b.ids[row]}/></div>)}</div>)}
    <div className="npx-capstone-wrap"><div className={'npx-cap-lines '+(['sell-bonus','gem-moves','score-plus'].every(r=>unlocked.includes(r))?'lit':'')}/><Node id="legend"/></div>
   </div>
   <article className={'npx-detail '+selStatus}>
    <div className="npx-detail-ico">{selSkill.icon}</div>
    <div className="npx-detail-copy"><small>{selStatus==='owned'?'DESBLOQUEADA':selStatus==='locked'?'BLOQUEADA':'DISPONÍVEL'}</small><b>{selSkill.name}</b><p>{selSkill.desc}</p>
     {selStatus==='locked'&&<p className="npx-need">Requer: {missing.join(', ')}</p>}</div>
    <div className="npx-detail-act">{selStatus==='owned'?<b className="npx-owned"><Check size={15}/> ATIVA</b>:<><span><Coins size={14}/> {selSkill.cost}</span><button disabled={!!busy||selStatus==='locked'||coins<selSkill.cost} onClick={()=>act(sel,'nexus_progression_unlock_skill','Habilidade desbloqueada!')}>{busy===sel?'Liberando...':selStatus==='locked'?'Bloqueada':coins<selSkill.cost?'Faltam moedas':'Desbloquear'}</button></>}</div>
   </article>
   <p className="npx-note"><Sparkles size={15}/> As habilidades valem para os 4 desafios extras: Masmorra, Gemas, Corrida e Defesa.</p>
  </div>}

  {tab==='pass'&&<div className="npx-section">
   <div className="npx-section-title"><div><span>{season?.name||'TEMPORADA NEXUS'} · GRATUITO</span><h4>Passe da temporada</h4></div><small>{season?'Termina em '+new Date(season.ends_at).toLocaleDateString('pt-BR'):'Jogue uma partida para ativar'}</small></div>
   <div className="npx-pass-hero">
    <div className="npx-pass-xp"><b>{seasonXp.toLocaleString('pt-BR')}</b><small>XP DA TEMPORADA</small></div>
    <div className="npx-pass-bar"><i style={{width:Math.min(100,seasonXp/PASS_MAX*100)+'%'}}/>{PASS.map(p=><u key={p.id} className={seasonXp>=p.xp?'on':''} style={{left:p.xp/PASS_MAX*100+'%'}}/>)}</div>
    <span>{PASS.find(p=>seasonXp<p.xp)?'Próxima: '+PASS.find(p=>seasonXp<p.xp).name+' em '+PASS.find(p=>seasonXp<p.xp).xp+' XP':'Todas as recompensas liberadas!'}</span>
   </div>
   <div className="npx-track" ref={trackRef}>{PASS.map((p,i)=>{
    const claimed=claimedPass.includes(p.id),ready=!!season&&seasonXp>=p.xp,equipped=progress.equipped_title===p.id||progress.equipped_cosmetic===p.id,canEquip=p.type!=='Moedas';
    return <article key={p.id} className={'npx-tier '+(claimed?'claimed':ready?'ready':'locked')}>
     <div className="npx-tier-n"><span>{i+1}</span></div>
     <div className="npx-tier-card"><i>{p.icon}</i><small>{p.type.toUpperCase()}</small><b>{p.name}</b><em>{p.xp} XP</em>
      {claimed?(canEquip?<button disabled={!!busy} onClick={()=>act(p.id,equipped?'nexus_progression_unequip':'nexus_progression_equip',equipped?'Item removido.':'Equipado!')}>{equipped?'Remover':'Equipar'}</button>:<span className="npx-claimed"><Check size={13}/> RECEBIDO</span>)
       :ready?<button className="go" disabled={!!busy} onClick={()=>act(p.id,'nexus_progression_claim_pass_reward','Recompensa resgatada!')}><Gift size={13}/> {busy===p.id?'...':'Resgatar'}</button>
       :<span className="npx-lock"><Lock size={12}/> {Math.max(0,p.xp-seasonXp)} XP</span>}
     </div></article>})}</div>
  </div>}

  {tab==='shop'&&<div className="npx-section">
   <div className="npx-section-title"><div><span>ITENS PERMANENTES</span><h4>Loja NEXUS</h4></div><small>Compre com moedas ganhas jogando</small></div>
   {!owned.includes(featured.id)&&<article className="npx-featured" style={{'--rc':RARITY[featured.rarity]}}>
    <div className="npx-feat-art"><Preview item={featured}/></div>
    <div className="npx-feat-copy"><small>★ DESTAQUE · {featured.rarity}</small><b>{featured.name}</b><p>{featured.desc}</p>
     <button disabled={!!busy||coins<featured.cost} onClick={()=>act(featured.id,'nexus_progression_purchase_cosmetic','Item comprado!')}><Coins size={14}/> {featured.cost} · {coins<featured.cost?'Faltam moedas':'Comprar'}</button></div>
   </article>}
   <div className="npx-filters">{['Todos','Título','Moldura'].map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f==='Todos'?'Todos':f+'s'}</button>)}</div>
   <div className="npx-shop-grid">{shopItems.map(item=>{
    const has=owned.includes(item.id),equipped=progress.equipped_cosmetic===item.id||progress.equipped_title===item.id;
    return <article key={item.id} className={'npx-shop-item '+(has?'owned':'')} style={{'--rc':RARITY[item.rarity]}}>
     <div className="npx-shop-art"><Preview item={item}/><small>{item.rarity}</small></div>
     <div className="npx-shop-copy"><small>{item.kind}</small><b>{item.name}</b><p>{item.desc}</p>
      {has?<button className="npx-equip" disabled={!!busy} onClick={()=>act(item.id,equipped?'nexus_progression_unequip':'nexus_progression_equip',equipped?'Item removido.':'Equipado!')}>{equipped?<><Check size={14}/> Equipado · remover</>:'Equipar'}</button>
       :<button disabled={!!busy||coins<item.cost} onClick={()=>act(item.id,'nexus_progression_purchase_cosmetic','Item comprado!')}>{busy===item.id?'Comprando...':<><Coins size={14}/> {item.cost} · Comprar</>}</button>}
     </div></article>})}</div>
   <p className="npx-note"><Crown size={15}/> Itens ficam na sua conta e aparecem no seu perfil. A loja não usa dinheiro real.</p>
  </div>}
 </section>;
}


// ── Coleção (usada no editor de perfil) ──────────────────────────────────
const FRAME_OF=key=>key==='cosmetic-gold-crown'?{frame:'gold',cardFrame:'gold'}:key==='cosmetic-ruby-aura'?{frame:'ruby',cardFrame:'ruby'}:(key==='cosmetic-prism-frame'||key==='pass-frame-prism')?{cardFrame:'chrome'}:{frame:'cyan'};
export function NexusCollection({userId,onApplied=()=>{},onToast=()=>{}}){
 const [progress,setProgress]=useState(EMPTY),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!userId)return;const {data,error:e}=await supabase.from('nexus_player_progress').select('owned_cosmetics,equipped_title,equipped_cosmetic').eq('user_id',userId).maybeSingle();if(e){setError('Não foi possível carregar sua coleção.');return}setProgress({...EMPTY,...(data||{})})},[userId]);
 useEffect(()=>{load()},[load]);
 const info={};SHOP.forEach(i=>{info[i.id]={name:i.name,icon:i.icon,kind:i.kind}});PASS.forEach(i=>{if(i.type!=='Moedas')info[i.id]={name:i.name,icon:i.icon,kind:i.type}});
 const owned=(progress.owned_cosmetics||[]).filter(k=>info[k]);
 const act=async(key,on)=>{if(busy)return;setBusy(key);setError('');const {error:e}=await supabase.rpc(on?'nexus_progression_equip':'nexus_progression_unequip',{item_key_input:key});setBusy('');if(e){setError(e.message);return}
  const isTitle=info[key].kind==='Título';
  onApplied(isTitle?{title:on?(TITLES[key]||''):''}:on?FRAME_OF(key):{frame:'violet',cardFrame:'violet'});onToast(on?'Equipado!':'Item removido.');await load()};
 if(!owned.length)return <div className="profile-choice-group nx2-collection"><b>Coleção da loja</b><p className="muted">Títulos e molduras que você conquistar ou comprar aparecem aqui para equipar e remover.</p></div>;
 const row=(key)=>{const it=info[key],eq=progress.equipped_title===key||progress.equipped_cosmetic===key;return <div key={key} className={'nx2-col-item'+(eq?' on':'')}><i>{it.icon}</i><span><b>{it.name}</b><small>{it.kind}</small></span><button type="button" disabled={!!busy} onClick={()=>act(key,!eq)}>{eq?'Remover':'Equipar'}</button></div>};
 return <div className="profile-choice-group nx2-collection"><b>Coleção da loja <small> · títulos e molduras conquistados</small></b>{error&&<p className="muted" role="alert">{error}</p>}<div className="nx2-col-list">{owned.map(row)}</div></div>;
}
