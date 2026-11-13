import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {supabase} from './supabase';
import {Compass,Home,Telescope,Sprout,RadioTower,Wrench,Plus,X,LoaderCircle,Sparkles,Hammer,Trash2,Users,ArrowUpRight,Map,Ship,BookOpen,Orbit,Anchor,Coins,Zap,Clock,UserPlus} from 'lucide-react';
import './nexus-world.css';

const BUILDINGS=[
 {id:'house',name:'Casa',desc:'Um conjunto de casas conectado por passarelas.',icon:Home},
 {id:'observatory',name:'Observatório',desc:'Um domo para observar os mistérios do universo.',icon:Telescope},
 {id:'garden',name:'Jardim',desc:'Um refúgio vivo de natureza e energia.',icon:Sprout},
 {id:'lighthouse',name:'Farol',desc:'Uma luz que guia exploradores.',icon:RadioTower},
 {id:'workshop',name:'Oficina',desc:'O centro criativo da comunidade.',icon:Wrench},
 {id:'archive',name:'Arquivo antigo',desc:'Guarda as memórias da equipe.',icon:BookOpen},
 {id:'portal',name:'Portal de expedições',desc:'Atravesse o portal para descobrir territórios e registrar achados no Codex.',icon:Orbit},
 {id:'dock',name:'Hangar de exploração',desc:'Uma plataforma de pouso para os exploradores e seus equipamentos.',icon:Anchor}
];
const SLOTS=[{x:285,y:220},{x:430,y:178},{x:570,y:218},{x:680,y:270},{x:525,y:300},{x:370,y:315},{x:220,y:300},{x:620,y:350}];

function IslandBuilding({type,x,y,onRemove,canRemove,worker=null,glowId='nwiGlow',onActivate}) {
 const isPortal=type==='portal';
 return <g transform={`translate(${x} ${y})`} className={`nwi-building nwi-building-${type}`} onClick={isPortal?onActivate:undefined} role={isPortal?'button':undefined} tabIndex={isPortal?0:undefined} aria-label={isPortal?'Abrir expedições':undefined} style={isPortal?{cursor:'pointer'}:undefined}>
  <ellipse cx="0" cy="43" rx="52" ry="12" fill="#07192a" opacity=".28"/>
  {type==='house'&&<g className="nwi-architecture"><path d="M-42 3L0 -29 42 3V35L0 59 -42 35Z" fill="#d7e7e8" stroke="#f5ffff" strokeWidth="2.5"/><path d="M-42 3L0 -29 42 3 0 32Z" fill="#2c8791" stroke="#b8f5ed" strokeWidth="2.5"/><path d="M-42 3L0 32V59L-42 35Z" fill="#6caaa0"/><path d="M0 32L42 3V35L0 59Z" fill="#367a82"/><path d="M-20 -13L0 -29 20 -13 0 2Z" fill="#f2fbeb"/><path d="M-12 22L3 31V54L-12 47Z" fill="#203c53" stroke="#b7e9e7" strokeWidth="2"/><path d="M15 8L29 -2V14L15 24Z" fill="#b5f6ff" stroke="#f4ffff" strokeWidth="2"/><path d="M-32 8L-19 -2V14L-32 23Z" fill="#b5f6ff" stroke="#f4ffff" strokeWidth="2"/><path d="M-47 4L0 -34 47 4" fill="none" stroke="#fff" strokeWidth="3" opacity=".8"/><path d="M-36 38L-10 52M10 52L36 38" stroke="#d9fff0" strokeWidth="2" opacity=".8"/></g>}
  {type==='observatory'&&<g className="nwi-architecture"><path d="M-42 9L0 -14 42 9V36L0 57 -42 36Z" fill="#456f8b" stroke="#c8f3ff" strokeWidth="2.5"/><path d="M-31 8A31 31 0 0 1 31 8V22H-31Z" fill="#78d0e5" stroke="#eaffff" strokeWidth="2"/><path d="M-25 3Q-21 -38 0 -43Q21 -38 25 3Z" fill="#435eaa" stroke="#e3eaff" strokeWidth="3"/><path d="M-25 3Q0 -10 25 3" fill="none" stroke="#b8f5ff" strokeWidth="2"/><path d="M0 -42V-8M-17 -30H17" stroke="#fff" strokeWidth="2.5"/><circle cy="-24" r="5" fill="#fff6b2" filter={`url(#${glowId})`}/><path d="M-36 10L0 30 36 10" fill="none" stroke="#e3fbff" strokeWidth="2" opacity=".8"/><path d="M-18 40V49M0 43V54M18 40V49" stroke="#a8d8ea" strokeWidth="2"/></g>}
  {type==='garden'&&<g className="nwi-architecture"><path d="M-43 8Q0 -9 43 8L34 34Q0 49 -34 34Z" fill="#286f5c" stroke="#9ce9b7" strokeWidth="2.5"/><path d="M-35 8Q0 -26 35 8" fill="none" stroke="#c6f8d6" strokeWidth="3"/>{[-21,0,21].map((v,i)=><g key={i} transform={`translate(${v} ${i===1?-4:4})`}><path d="M0 18V-12" stroke="#79583d" strokeWidth="5"/><path d="M0 -16Q-22 -36 -20 -12Q-8 -2 0 -8Q8 -2 20 -12Q22 -36 0 -16Z" fill={i===1?'#b4f2c5':'#61c98e'} stroke="#d7ffe0" strokeWidth="1.5"/><circle cy="-17" r="5" fill="#eaffb2"/></g>)}<path d="M-29 18Q0 32 29 18" fill="none" stroke="#e6ffc9" strokeWidth="2"/></g>}
  {type==='lighthouse'&&<g className="nwi-architecture"><path d="M-24 2L24 2L16 43H-16Z" fill="#f0e9d9" stroke="#fff" strokeWidth="2.5"/><path d="M-21 13H21L18 25H-19Z" fill="#d96d70"/><path d="M-19 2L0 -21 19 2Z" fill="#d96d70" stroke="#ffd4c8" strokeWidth="2"/><rect x="-13" y="-11" width="26" height="14" rx="4" fill="#a6edff" stroke="#f5ffff" strokeWidth="2"/><path d="M-15 -5L-52 -24M15 -5L52 -24" stroke="#b8f4ff" strokeWidth="3" opacity=".8" filter={`url(#${glowId})`}/><path d="M-28 43H28" stroke="#b9e5e9" strokeWidth="4"/><path d="M0 2V42" stroke="#d3c9b6" strokeWidth="2"/></g>}
  {type==='workshop'&&<g className="nwi-architecture"><path d="M-42 4L0 -26 42 4V36L0 58 -42 36Z" fill="#718b9b" stroke="#e4f6f6" strokeWidth="2.5"/><path d="M-42 4L0 -30 42 4 0 31Z" fill="#d29a62" stroke="#ffe4bc" strokeWidth="2.5"/><path d="M-16 21L16 3V48L-16 57Z" fill="#28485e"/><path d="M-32 7L-18 -3V14L-32 23ZM18 5L31 -4V13L18 22Z" fill="#a9efff" stroke="#f5ffff" strokeWidth="2"/><path d="M-8 -28V-49H8V-19" fill="#dce9ec" stroke="#8297a4" strokeWidth="2"/><path d="M-8 -49Q-23 -65 -9 -72Q4 -64 8 -49" fill="#c7f1ff" opacity=".55"/><path d="M-35 39L-18 49M20 48L35 39" stroke="#ffe2ae" strokeWidth="3"/></g>}
  {type==='archive'&&<g className="nwi-architecture"><path d="M-39 5L0 -22 39 5V37L0 59 -39 37Z" fill="#526c79" stroke="#e0f2e8" strokeWidth="2.5"/><path d="M-39 5L0 -22 39 5 0 29Z" fill="#c0a66f" stroke="#ffebbf" strokeWidth="2"/><path d="M-27 10V39M-9 22V50M9 22V50M27 10V39" stroke="#f6e7c6" strokeWidth="5"/><path d="M-32 4L0 -29 32 4" fill="none" stroke="#f7edce" strokeWidth="4"/><circle cy="-4" r="6" fill="#fff3b2" filter={`url(#${glowId})`}/></g>}
  {type==='portal'&&<g className="nwi-architecture"><ellipse cy="28" rx="46" ry="15" fill="#15536a" stroke="#9ff5ed" strokeWidth="3"/><ellipse cy="-9" rx="31" ry="42" fill="#122c4a" stroke="#a4f4ed" strokeWidth="7"/><ellipse cy="-9" rx="22" ry="33" fill="#1c7c89" stroke="#d1fff0" strokeWidth="2"/><ellipse cy="-9" rx="14" ry="25" fill="#a8f7e6" opacity=".48"/><path d="M-22 -30Q0 -57 22 -30M-22 12Q0 39 22 12" fill="none" stroke="#fff" strokeWidth="2.5"/><circle cx="-9" cy="-13" r="3" fill="#fff"/><circle cx="10" cy="2" r="2" fill="#fff"/><path d="M-40 -12L-49 -20M40 -12L49 -20" stroke="#a5fff0" strokeWidth="3" filter={`url(#${glowId})`}/></g>}
  {type==='dock'&&<g className="nwi-architecture"><path d="M-48 4L0 -20 48 4 0 29Z" fill="#b58b60" stroke="#ffe0b5" strokeWidth="2.5"/><path d="M-35 11V35M0 29V52M35 11V35" stroke="#9a704e" strokeWidth="7"/><path d="M-50 37Q0 56 50 37" fill="none" stroke="#f1d4a4" strokeWidth="6"/><path d="M-15 -2V-43M-15 -41L17 -25H-15" fill="#e8f4f7" stroke="#fff" strokeWidth="2"/><path d="M-37 2L-23 -5M23 -5L37 2" stroke="#ffe4bf" strokeWidth="2"/></g>}
  {worker&&<g className="nwi-worker-sprite" transform="translate(34 -34) scale(.72)" aria-label={worker.npc_name}><ellipse cy="25" rx="13" ry="4" fill="#07192b" opacity=".35"/><path d="M-9 5Q-12 14 -8 21H8Q12 14 9 5Z" fill="#2d9d8d" stroke="#d9fff3" strokeWidth="1.6"/><circle cy="-4" r="10" fill="#ffd5b5" stroke="#fff2df" strokeWidth="1.5"/><path d="M-10 -7Q-9 -18 2 -16Q12 -14 10 -4L5 -8L-5 -8Z" fill="#3e4d65"/><circle cx="-3" cy="-4" r="1.3" fill="#25344b"/><circle cx="3" cy="-4" r="1.3" fill="#25344b"/><path d="M-3 2Q0 5 3 2" fill="none" stroke="#b76e68" strokeWidth="1.2"/><path d="M-6 20L-8 27M6 20L8 27" stroke="#e1f2ff" strokeWidth="3" strokeLinecap="round"/><path d="M-10 9L-17 16M10 9L17 16" stroke="#ffd5b5" strokeWidth="3.2" strokeLinecap="round"/><path d="M-10 -10Q0 -23 10 -10" fill="none" stroke="#ffdc8a" strokeWidth="3"/></g>}
  {canRemove&&<g className="nwi-remove" transform="translate(34 -34)" onClick={e=>{e.stopPropagation();onRemove?.();}} role="button" tabIndex="0" aria-label="Remover estrutura"><circle r="12" fill="#102b3a" stroke="#ff9b9b" strokeWidth="1.5"/><path d="M-4 -4L4 4M4 -4L-4 4" stroke="#fff" strokeWidth="2.2"/></g>}
  {isPortal&&<g className="nwi-portal-action" transform="translate(0 76)"><rect x="-66" y="-12" width="132" height="24" rx="12" fill="#0d3441" stroke="#9cf4df" strokeWidth="1"/><text textAnchor="middle" y="4" fill="#dffff6" fontSize="10" fontWeight="800">ABRIR EXPEDIÇÕES ↗</text></g>}
 </g>;
}

function Tree({x,y,scale=1}){return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0 V20" stroke="#72513d" strokeWidth="6" strokeLinecap="round"/><path d="M0 -27 C-25 -28 -24 -8 -8 -8 C-24 4 -8 13 2 3 C12 15 27 3 13 -9 C30 -22 13 -35 0 -27Z" fill="#318e70" stroke="#79d6a8" strokeWidth="2"/><path d="M-7 -22 Q0 -31 9 -22" fill="none" stroke="#b0f0c8" strokeWidth="2"/></g>}


export function NexusWorldLobby({clans=[],memberships=[],onOpenClan=()=>{},onJoinClan=()=>{},onCreate=()=>{}}){
 const myIds=new Set(memberships.map(m=>m.clan_id));
 return <section className="nwi-lobby">
  <header className="nwi-lobby-head">
   <div><span className="nwi-kicker"><Compass size={13}/> NEXUS WORLD <i/> ARQUIPÉLAGO</span><h2>Um universo. <span>Mil possibilidades.</span></h2><p>Ilhas criadas por jogadores. Cada comunidade constrói seu próprio lugar e deixa sua marca no universo.</p></div>
   <div className="nwi-world-mark"><span className="nwi-world-orbit"/><b>NW</b><i>✦</i></div>
  </header>
  <div className="nwi-lobby-toolbar"><div className="nwi-world-count"><span className="nwi-count-icon"><Map size={17}/></span><div><b>{clans.length.toLocaleString('pt-BR')} {clans.length===1?'ilha descoberta':'ilhas descobertas'}</b><small>ARQUIPÉLAGO CONHECIDO</small></div></div><button type="button" onClick={onCreate}><Plus size={17}/> Criar minha ilha</button></div>
  {clans.length===0?<div className="nwi-empty"><div className="nwi-empty-orb"><Ship size={28}/></div><b>Um mundo inteiro espera para nascer.</b><span>Criar a primeira comunidade é dar vida ao primeiro território do arquipélago.</span><button type="button" onClick={onCreate}><Plus size={16}/> Criar a primeira ilha</button></div>:<div className="nwi-clan-grid">{clans.map((cl,index)=>{const mine=myIds.has(cl.id);return <article className="nwi-clan-card" key={cl.id}>
   <NexusWorldIsland clan={cl} preview/>
   <div className="nwi-card-copy">
    <div className="nwi-card-meta"><span>{mine?'SUA ILHA':'ILHA DO ARQUIPÉLAGO'}</span><i>·</i><b>[{cl.tag||'NEXUS'}]</b></div>
    <h3>{cl.name}</h3>
    <p>{cl.description||'Uma comunidade. Uma ilha. Uma história que ainda vai ser construída.'}</p>
    <button type="button" onClick={()=>mine?onOpenClan(cl):onJoinClan(cl)}><span>{mine?'Explorar minha ilha':'Descobrir esta ilha'}</span><ArrowUpRight size={16}/></button>
   </div>
  </article>})}</div>}
  <footer className="nwi-lobby-foot"><Sparkles size={15}/><span>O arquipélago cresce conforme novas comunidades surgem e transformam suas ilhas.</span></footer>
 </section>;
}

export default function NexusWorldIsland({clan,userId,onToast=()=>{},preview=false,onOpenCodex=()=>{}}){
 const [buildings,setBuildings]=useState([]),[workers,setWorkers]=useState([]),[loading,setLoading]=useState(true),[adding,setAdding]=useState(false),[selectedType,setSelectedType]=useState('house'),[saving,setSaving]=useState(false),[claiming,setClaiming]=useState(false),[error,setError]=useState(''),[playerXp,setPlayerXp]=useState(0),[playerCoins,setPlayerCoins]=useState(0);
 const canManage=!!userId;
 const load=useCallback(async()=>{if(!clan?.id)return;setLoading(true);const [b,w,p,wallet]=await Promise.all([
  supabase.from('social_clan_world_buildings').select('id,clan_id,building_type,slot,created_by,created_at').eq('clan_id',clan.id).order('slot'),
  supabase.from('social_world_workers').select('id,clan_id,building_id,npc_name,hired_at,last_collected_at').eq('clan_id',clan.id),
  userId&&!preview?supabase.from('social_profiles').select('game_xp').eq('user_id',userId).maybeSingle():Promise.resolve({data:null,error:null}),
  userId&&!preview?supabase.from('nexus_loot_wallets').select('coins').eq('user_id',userId).maybeSingle():Promise.resolve({data:null,error:null})
 ]);if(b.error||w.error||p.error||wallet.error)setError((b.error||w.error||p.error||wallet.error).message);else{setBuildings(b.data||[]);setWorkers(w.data||[]);setPlayerXp(Number(p.data?.game_xp||0));setPlayerCoins(Number(wallet.data?.coins||0));}setLoading(false);},[clan?.id,userId,preview]);
 useEffect(()=>{load();if(!clan?.id)return;const channel=supabase.channel('nexus-world-island-'+clan.id).on('postgres_changes',{event:'*',schema:'public',table:'social_clan_world_buildings',filter:'clan_id=eq.'+clan.id},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'social_world_workers',filter:'clan_id=eq.'+clan.id},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[clan?.id,load]);
 const occupied=useMemo(()=>new Set(buildings.map(b=>Number(b.slot))),[buildings]);
 const nextSlot=SLOTS.findIndex((_,i)=>!occupied.has(i+1))+1;
 const addBuilding=async()=>{if(!nextSlot||!canManage)return;setSaving(true);setError('');const {data,error:e}=await supabase.from('social_clan_world_buildings').insert({clan_id:clan.id,building_type:selectedType,slot:nextSlot,created_by:userId}).select().single();if(e){setError(e.code==='23505'?'Outro integrante acabou de construir nesse espaço. Atualize a ilha.':e.message);}else{setBuildings(old=>[...old,data].sort((a,b)=>a.slot-b.slot));setAdding(false);onToast('Construção adicionada à ilha!');}setSaving(false);};
 const removeBuilding=async item=>{const {error:e}=await supabase.from('social_clan_world_buildings').delete().eq('id',item.id);if(e)setError(e.message);else{setBuildings(old=>old.filter(x=>x.id!==item.id));onToast('Construção removida.');}};
 const workersByBuilding=useMemo(()=>Object.fromEntries(workers.map(w=>[w.building_id,w])),[workers]);
 const hireWorker=async(building,payment)=>{setSaving(true);setError('');const {data,error:e}=await supabase.rpc('nexus_world_hire_worker',{target_building:building.id,payment_method:payment});if(e)setError(e.message);else{await load();onToast((data?.npc_name||'Trabalhador')+' contratado para a '+(BUILDINGS.find(x=>x.id===building.building_type)?.name||'construção')+'!');}setSaving(false);};
 const claimWorkers=async()=>{if(!workers.length)return;setClaiming(true);setError('');const {data,error:e}=await supabase.rpc('nexus_world_claim_workers',{target_clan:clan.id});if(e)setError(e.message);else{await load();onToast(data?.xp||data?.coins?'Produção recolhida: +'+(data.xp||0)+' XP e +'+(data.coins||0)+' moedas!':'Seus trabalhadores ainda estão produzindo. Volte quando completar uma hora.');}setClaiming(false);};
 const count=buildings.length;
 const sceneKey=String(clan?.id||"nexus-world").replace(/[^a-zA-Z0-9_-]/g,"");
 return <section className={preview?"nexus-world-island nwi-island-preview":"nexus-world-island"} data-theme={clan?.color_theme||"violet"}>
  {!preview&&<header className="nwi-island-head"><div><span className="nwi-kicker"><Compass size={13}/> NEXUS WORLD · TERRITÓRIO COMPARTILHADO</span><h2>{clan?.name||'Ilha desconhecida'}</h2><p>{clan?.motto||clan?.description||'Um lugar para construir algo que só pertence a vocês.'}</p></div><div className="nwi-island-stats"><span><Users size={14}/>{count} / 8 estruturas</span><small>ILHA EM EVOLUÇÃO</small></div></header>}
  <div className={preview?"nwi-scene nwi-scene-preview":"nwi-scene"}>
   <div className="nwi-sky-glow"/><div className="nwi-starfield"><i/><i/><i/><i/><i/><i/><i/></div>
   <svg className="nwi-island-svg" viewBox="0 0 900 520" role="img" aria-label={`Ilha 3D da comunidade ${clan?.name||''}, com ${count} construções`}>
    <defs>
     <linearGradient id={`${sceneKey}-water`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#143c67"/><stop offset=".48" stopColor="#146b89"/><stop offset="1" stopColor="#142b58"/></linearGradient>
     <linearGradient id={`${sceneKey}-cliff`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#537b76"/><stop offset=".42" stopColor="#294e59"/><stop offset="1" stopColor="#172a49"/></linearGradient>
     <linearGradient id={`${sceneKey}-grass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b2d99b"/><stop offset=".45" stopColor="#65b58d"/><stop offset="1" stopColor="#368a7c"/></linearGradient>
     <radialGradient id={`${sceneKey}-aura`}><stop offset="0" stopColor="#79eaff" stopOpacity=".5"/><stop offset="1" stopColor="#79eaff" stopOpacity="0"/></radialGradient>
     <filter id={`${sceneKey}-glow`}><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
     <filter id={`${sceneKey}-shadow`}><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <ellipse cx="452" cy="420" rx="355" ry="43" fill="#06152d" opacity=".55" filter={`url(#${sceneKey}-shadow)`}/>
    <path d="M75 270 Q110 155 265 145 Q380 65 510 128 Q680 90 795 210 Q875 310 750 390 Q600 485 405 435 Q210 465 105 365Z" fill={`url(#${sceneKey}-water)`} stroke="#45b9d3" strokeWidth="3" opacity=".92"/>
    <path d="M105 285 Q165 200 275 190 Q390 120 505 160 Q665 125 755 230 Q825 315 725 370 Q570 435 410 395 Q230 425 135 350Z" fill="none" stroke="#7ceaff" strokeWidth="2" opacity=".4"/>
    <path d="M125 275 Q170 183 285 177 Q390 103 512 150 Q665 111 750 225 Q810 298 715 357 Q575 416 412 378 Q250 408 150 345Z" fill={`url(#${sceneKey}-cliff)`} stroke="#8de3d2" strokeWidth="3"/>
    <path d="M150 245 Q200 175 295 168 Q395 108 510 146 Q655 120 735 220 Q780 280 705 330 Q575 380 420 350 Q270 378 175 320Z" fill={`url(#${sceneKey}-grass)`} stroke="#c4efb0" strokeWidth="3"/>
    <path d="M180 250 Q250 195 330 196 Q420 140 520 170 Q650 145 705 230" fill="none" stroke="#e0f4bd" strokeWidth="4" opacity=".42"/>
    <path d="M250 304 Q340 255 430 282 Q535 315 635 256" fill="none" stroke="#d7d6a0" strokeWidth="13" opacity=".85" strokeLinecap="round"/>
    <path d="M250 304 Q340 255 430 282 Q535 315 635 256" fill="none" stroke="#f5e5b5" strokeWidth="2" opacity=".8" strokeLinecap="round"/>
    <path d="M330 193 Q355 150 390 152 Q423 158 438 194" fill="#3e8d80" opacity=".65"/>
    <path d="M540 183 Q590 142 632 176 Q652 193 652 219" fill="#4a9b80" opacity=".7"/>
    <g opacity=".95"><Tree x={210} y={265} scale={1.05}/><Tree x={265} y={220} scale={.82}/><Tree x={690} y={265} scale={.9}/><Tree x={650} y={320} scale={.7}/><Tree x={470} y={185} scale={.62}/><Tree x={330} y={330} scale={.72}/><Tree x={570} y={345} scale={.78}/></g>
    <g opacity=".8" fill="#e5fff0"><circle cx="178" cy="304" r="3"/><circle cx="716" cy="296" r="3"/><circle cx="602" cy="190" r="3"/><circle cx="378" cy="350" r="3"/></g>
    {buildings.map(item=>{const pos=SLOTS[Number(item.slot)-1];return pos?<IslandBuilding key={item.id} type={item.building_type} x={pos.x} y={pos.y} worker={workersByBuilding[item.id]} canRemove={!preview&&(item.created_by===userId||clan?.created_by===userId)} glowId={`${sceneKey}-glow`} onRemove={()=>removeBuilding(item)} onActivate={onOpenCodex}/>:null;})}
    <g className="nwi-island-marker" transform="translate(440 115)"><path d="M0 0 L0 -22" stroke="#d7f8ff" strokeWidth="2"/><circle cy="-29" r="8" fill="#e9fbff" filter={`url(#${sceneKey}-glow)`}/><circle cy="-29" r="3" fill="#fff"/></g>
    <path d="M115 350 Q180 395 255 395 M690 380 Q750 355 780 310" fill="none" stroke="#77e9ff" strokeWidth="2" opacity=".7" strokeLinecap="round"/>
   </svg>
   <div className="nwi-scene-caption"><span><i/> UNIVERSO COMPARTILHADO</span><b>{clan?.tag||'NEXUS'} · SETOR 01</b></div>
   {loading&&<div className="nwi-loading"><LoaderCircle className="nwi-spin"/> Sincronizando ilha…</div>}
  </div>
  {!preview&&<div className="nwi-build-bar"><div><span className="nwi-kicker">CONSTRUA SUA HISTÓRIA</span><b>{count===0?'Sua ilha está esperando a primeira construção.':count===8?'Sua ilha está completa!':'Cada construção deixa sua marca neste mundo.'}</b><small>As construções ficam salvas para todos os integrantes da comunidade.</small></div><button type="button" disabled={!!loading||!!saving||!nextSlot} onClick={()=>setAdding(true)}><Plus size={17}/> {nextSlot?'Construir':'Ilha completa'}</button></div>}
  {!preview&&canManage&&<section className="nwi-worker-economy">
   <header className="nwi-worker-head"><div><span className="nwi-kicker"><Users size={13}/> VIDA NA ILHA</span><h3>Pequenos trabalhadores</h3><p>Contrate ajudantes para cuidar das construções. Eles trabalham enquanto você estiver fora e dividem a produção com toda a ilha.</p></div><div className="nwi-worker-balances"><span><Zap size={14}/>{playerXp.toLocaleString('pt-BR')} XP</span><span><Coins size={14}/>{playerCoins.toLocaleString('pt-BR')} moedas</span></div></header>
   <div className="nwi-worker-summary"><div><b>{workers.length} / {buildings.length}</b><small>CONSTRUÇÕES COM EQUIPE</small></div><div><b>+2 XP</b><small>POR TRABALHADOR / HORA</small></div><div><b>+1 <Coins size={12}/></b><small>POR TRABALHADOR / HORA</small></div><button type="button" onClick={claimWorkers} disabled={claiming||!workers.length}>{claiming?<LoaderCircle size={15} className="nwi-spin"/>:<Sparkles size={15}/>} Recolher produção</button></div>
   <div className="nwi-worker-list">{buildings.map(building=>{const worker=workersByBuilding[building.id],label=BUILDINGS.find(x=>x.id===building.building_type)?.name||'Construção';return <article className={'nwi-worker-card '+(worker?'is-staffed':'')} key={building.id}><div className="nwi-worker-avatar">{worker?'🧑‍🔧':'🏗️'}</div><div className="nwi-worker-info"><b>{label}</b>{worker?<><span>{worker.npc_name} · trabalhando</span><small>Produz 2 XP + 1 moeda por hora · limite de 8 horas acumuladas</small></>:<><span>Sem trabalhador</span><small>Contrate alguém para ativar a produção desta construção.</small></>}</div>{worker?<span className="nwi-worker-status"><i/> ATIVO</span>:<div className="nwi-hire-actions"><button type="button" disabled={saving||playerCoins<30} onClick={()=>hireWorker(building,'coins')}><Coins size={13}/> 30</button><button type="button" disabled={saving||playerXp<100} onClick={()=>hireWorker(building,'xp')}><Zap size={13}/> 100 XP</button></div>}</article>})}{!buildings.length&&<p className="nwi-workers-empty">Construa sua primeira estrutura para contratar o primeiro morador da ilha.</p>}</div>
   <p className="nwi-worker-foot"><Clock size={13}/> A produção é acumulada por até 8 horas. Qualquer integrante pode recolher a produção; os recursos são divididos igualmente entre todos os membros da ilha.</p>
  </section>}
  {!preview&&error&&<div className="nwi-error" role="alert">{error}</div>}
  {!preview&&adding&&createPortal(<div className="nwi-builder-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAdding(false);}}><section className="nwi-builder" role="dialog" aria-modal="true" aria-label="Adicionar construção"><header><div><span className="nwi-kicker">EXPANSÃO DA ILHA</span><h3>Escolha a próxima estrutura</h3></div><button type="button" onClick={()=>setAdding(false)} aria-label="Fechar"><X size={20}/></button></header><div className="nwi-building-options">{BUILDINGS.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={selectedType===item.id?'selected':''} onClick={()=>setSelectedType(item.id)}><span><Icon size={21}/></span><b>{item.name}</b><small>{item.desc}</small></button>})}</div><div className="nwi-builder-foot"><small>Terreno {nextSlot} de 8 · construção compartilhada</small><button type="button" onClick={addBuilding} disabled={saving}>{saving?<LoaderCircle className="nwi-spin" size={16}/>:<Hammer size={16}/>} Construir</button></div></section></div>,document.body)}
  {!preview&&<div className="nwi-island-note"><Sparkles size={15}/> Cada estrutura muda a silhueta da ilha. O portal abre as expedições e o Codex da comunidade. Quem construiu ou fundou a comunidade pode remover estruturas.</div>}
 </section>;
}
