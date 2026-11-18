import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Zap,Coins,Lock,Check,ShoppingBag,Sparkles,Shield,Heart,Star,RefreshCw,Crown} from 'lucide-react';
import './nexus-progression.css';

const skills=[
 {id:'extra-heart',name:'Coração extra',desc:'Comece Dungeon Rush e Defesa do Cofrinho com uma vida adicional.',cost:100,icon:'❤️',tier:'DEFESA'},
 {id:'coin-boost',name:'Ímã de moedas',desc:'Dobre as moedas coletadas e os pontos de gemas nos novos jogos.',cost:140,icon:'🧲',tier:'ECONOMIA'}
];
const shop=[
 {id:'cosmetic-neon-trail',name:'Rastro Neon',desc:'Efeito de energia para sua identidade Arcade.',cost:90,icon:'🌌',rarity:'RARO',kind:'Cosmético'},
 {id:'cosmetic-prism-frame',name:'Moldura Prisma',desc:'Um acabamento prismático para o painel NEXUS.',cost:160,icon:'💠',rarity:'ÉPICO',kind:'Moldura'},
 {id:'title-star-pilot',name:'Piloto Estelar',desc:'Título exclusivo para jogadores de ação.',cost:120,icon:'🚀',rarity:'RARO',kind:'Título'},
 {id:'title-guardian',name:'Guardião do Cofrinho',desc:'Título de quem protege cada moeda.',cost:180,icon:'🛡️',rarity:'ÉPICO',kind:'Título'}
];
const pass=[
 {id:'pass-title-recruit',xp:250,name:'Recruta NEXUS',icon:'🎖️',type:'Título'},
 {id:'pass-trail-blue',xp:500,name:'Rastro Azul',icon:'💫',type:'Cosmético'},
 {id:'pass-title-explorer',xp:1000,name:'Explorador',icon:'🧭',type:'Título'},
 {id:'pass-frame-prism',xp:1500,name:'Fragmento Prisma',icon:'💎',type:'Cosmético'},
 {id:'pass-title-veteran',xp:2000,name:'Veterano NEXUS',icon:'👑',type:'Título'}
];
const labels={'pass-title-recruit':'Recruta NEXUS','pass-title-explorer':'Explorador','pass-title-veteran':'Veterano NEXUS','title-star-pilot':'Piloto Estelar','title-guardian':'Guardião do Cofrinho'};
export default function NexusProgression({userId,gameXp=0,onToast=()=>{}}){
 const [tab,setTab]=useState('skills'),[progress,setProgress]=useState({unlocked_skills:[],owned_cosmetics:[],equipped_title:null,equipped_cosmetic:null}),[coins,setCoins]=useState(0),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!userId)return;const [p,w]=await Promise.all([supabase.from('nexus_player_progress').select('*').eq('user_id',userId).maybeSingle(),supabase.from('nexus_loot_wallets').select('coins').eq('user_id',userId).maybeSingle()]);if(p.error&&p.error.code!=='PGRST116')setError(p.error.message);setProgress(p.data||{unlocked_skills:[],owned_cosmetics:[],equipped_title:null,equipped_cosmetic:null});setCoins(Number(w.data?.coins||0));},[userId]);
 useEffect(()=>{load()},[load]);
 const act=async(key,fn)=>{if(busy)return;setBusy(key);setError('');const {error:e}=await supabase.rpc(fn,{[fn==='nexus_progression_unlock_skill'?'skill_key_input':fn==='nexus_progression_claim_pass_reward'?'reward_key_input':fn==='nexus_progression_equip'?'item_key_input':'cosmetic_key_input']:key});setBusy('');if(e){setError(e.message);return}onToast('Progresso NEXUS atualizado!');await load()};
 const owned=progress.owned_cosmetics||[],unlocked=progress.unlocked_skills||[];
 const titleName=labels[progress.equipped_title]||progress.equipped_title||'Sem título equipado';
 return <section className="npx-hub">
  <header className="npx-head"><div><span>PROGRESSÃO · PERSONALIZAÇÃO · RECOMPENSAS</span><h3>Construa sua lenda NEXUS</h3><p>Desbloqueie habilidades, resgate recompensas gratuitas e personalize sua identidade.</p></div><div className="npx-wallet"><Coins size={19}/><b>{coins.toLocaleString('pt-BR')}</b><small>MOEDAS</small></div></header>
  <div className="npx-player-strip"><div className="npx-player-orb">👾</div><div><small>SEU TÍTULO ATUAL</small><b>{titleName}</b><span>{gameXp.toLocaleString('pt-BR')} XP acumulados</span></div><div className="npx-player-level"><Zap size={15}/><b>NÍVEL {Math.floor(gameXp/500)+1}</b></div></div>
  <nav className="npx-tabs">{[['skills','Árvore de habilidades'],['pass','Passe gratuito'],['shop','Loja NEXUS']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id==='skills'?<Shield size={15}/>:id==='pass'?<Star size={15}/>:<ShoppingBag size={15}/>} {label}</button>)}</nav>
  {error&&<div className="npx-error">{error}</div>}
  {tab==='skills'&&<div className="npx-section"><div className="npx-section-title"><div><span>CAMINHO DO JOGADOR</span><h4>Árvore de habilidades</h4></div><small>Gaste moedas para liberar vantagens nos novos jogos.</small></div><div className="npx-skill-grid">{skills.map((s,i)=>{const done=unlocked.includes(s.id);return <article className={'npx-skill-card '+(done?'unlocked':'')} key={s.id}><div className="npx-skill-top"><span>{s.icon}</span><small>TRILHA {String(i+1).padStart(2,'0')} · {s.tier}</small></div><h5>{s.name}</h5><p>{s.desc}</p><div className="npx-skill-bottom">{done?<b className="npx-owned"><Check size={15}/> DESBLOQUEADA</b>:<><span><Coins size={14}/> {s.cost}</span><button disabled={!!busy||coins<s.cost} onClick={()=>act(s.id,'nexus_progression_unlock_skill')}>{busy===s.id?'Liberando...':coins<s.cost?'Moedas insuficientes':'Desbloquear'}</button></>}</div></article>})}</div><div className="npx-note"><Sparkles size={15}/> As habilidades Coração extra e Ímã de moedas já alteram a jogabilidade dos quatro novos desafios.</div></div>}
  {tab==='pass'&&<div className="npx-section"><div className="npx-section-title"><div><span>TEMPORADA ATUAL · GRATUITO</span><h4>Passe de temporada</h4></div><small>Sem compra, sem eventos pagos: jogue e resgate.</small></div><div className="npx-pass-progress"><div><b>{gameXp.toLocaleString('pt-BR')} XP</b><span>Próxima recompensa: {pass.find(x=>gameXp<x.xp)?.xp?.toLocaleString('pt-BR')||'todas liberadas'} XP</span></div><div className="npx-pass-track"><i style={{width:Math.min(100,gameXp/2000*100)+'%'}}/></div></div><div className="npx-pass-list">{pass.map((p,i)=>{const claimed=owned.includes(p.id),ready=gameXp>=p.xp;return <article key={p.id} className={'npx-pass-item '+(claimed?'claimed':ready?'ready':'locked')}><span className="npx-pass-icon">{p.icon}</span><div><small>ETAPA {String(i+1).padStart(2,'0')} · {p.xp} XP</small><b>{p.name}</b><span>{p.type} · recompensa gratuita</span></div>{claimed?<b className="npx-claimed"><Check size={14}/> RESGATADA</b>:ready?<button disabled={!!busy} onClick={()=>act(p.id,'nexus_progression_claim_pass_reward')}>{busy===p.id?'Resgatando...':'Resgatar'}</button>:<span className="npx-lock"><Lock size={14}/> BLOQUEADA</span>}</article>})}</div></div>}
  {tab==='shop'&&<div className="npx-section"><div className="npx-section-title"><div><span>ITENS PERMANENTES</span><h4>Loja NEXUS</h4></div><small>Compre com moedas conquistadas jogando.</small></div><div className="npx-shop-grid">{shop.map(item=>{const has=owned.includes(item.id);const equipped=progress.equipped_cosmetic===item.id||progress.equipped_title===item.id;return <article key={item.id} className={'npx-shop-item '+(has?'owned':'')}><div className="npx-shop-art"><span>{item.icon}</span><small>{item.rarity}</small></div><div className="npx-shop-copy"><small>{item.kind}</small><b>{item.name}</b><p>{item.desc}</p><div className="npx-shop-actions">{has?<button className="npx-equip" disabled={!!busy||equipped} onClick={()=>act(item.id,'nexus_progression_equip')}>{equipped?<><Check size={14}/> Equipado</>:'Equipar'}</button>:<button disabled={!!busy||coins<item.cost} onClick={()=>act(item.id,'nexus_progression_purchase_cosmetic')}>{busy===item.id?'Comprando...':<><Coins size={14}/> {item.cost} · Comprar</>}</button>}</div></div></article>})}</div><p className="npx-note"><Crown size={15}/> Títulos e cosméticos ficam vinculados à sua conta. A loja não usa dinheiro real.</p></div>}
 </section>;
}
