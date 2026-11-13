import React,{useCallback,useEffect,useMemo,useState} from 'react';
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
 {id:'portal',name:'Portal dimensional',desc:'Um elo com territórios distantes.',icon:Orbit},
 {id:'dock',name:'Porto aéreo',desc:'Ponto de chegada dos visitantes.',icon:Anchor}
];
const SLOTS=[{x:285,y:220},{x:430,y:178},{x:570,y:218},{x:680,y:270},{x:525,y:300},{x:370,y:315},{x:220,y:300},{x:620,y:350}];

function IslandBuilding({type,x,y,onRemove,canRemove,worker=null,glowId='nwiGlow'}){
 const common={strokeLinejoin:'round',strokeLinecap:'round'};
 return <g transform={`translate(${x} ${y})`} className="nwi-building">
  {type==='house'&&<><path d="M-40 4L0 -25 40 4V34L0 54 -40 34Z" fill="#dce9e9" stroke="#f7ffff" strokeWidth="2.5"/><path d="M-40 4L0 -25 40 4 0 31Z" fill="#7662c8" stroke="#d9ccff" strokeWidth="3"/><path d="M-40 4L0 31V54L-40 34Z" fill="#80b2ad"/><path d="M0 31L40 4V34L0 54Z" fill="#477f86"/><path d="M-12 23V46L2 53V30Z" fill="#294b5c" stroke="#a8d6df" strokeWidth="1.5"/><path d="M14 10L28 1V17L14 26Z" fill="#a6f1ff" stroke="#efffff" strokeWidth="2"/><path d="M-29 5L-16 -4V11L-29 20Z" fill="#a6f1ff" stroke="#efffff" strokeWidth="2"/><path d="M-40 4L0 -30 40 4" fill="none" stroke="#fff" strokeWidth="3" opacity=".7"/><path d="M-32 36L-9 49M8 49L32 35" stroke="#d8f7ed" strokeWidth="2" opacity=".7"/></>}
  {type==='observatory'&&<><path d="M-40 8L0 -14 40 8V34L0 53 -40 34Z" fill="#537d99" stroke="#d3f4ff" strokeWidth="2.5"/><path d="M-30 6A30 30 0 0 1 30 6V19H-30Z" fill="#91d9ed" stroke="#efffff" strokeWidth="2"/><path d="M-23 1Q0 -37 23 1" fill="#6574d3" stroke="#e3e2ff" strokeWidth="3"/><path d="M0 -31V-5M-17 -20H17" stroke="#fff" strokeWidth="2.5"/><circle cy="-18" r="5" fill="#fff6b2" filter={`url(#${glowId})`}/><path d="M-35 9L0 29 35 9" fill="none" stroke="#e3fbff" strokeWidth="2" opacity=".7"/></>}
  {type==='garden'&&<><ellipse cx="0" cy="28" rx="39" ry="10" fill="#061b2a" opacity=".25"/><path d="M-34 0 Q0 -18 34 0 L27 25 Q0 38 -27 25Z" fill="#347d64" stroke="#7fd6a7" strokeWidth="2"/>{[-20,0,19].map((v,i)=><g key={i} transform={`translate(${v} ${i===1?-4:3})`}><path d="M0 10 V-10" stroke="#704c37" strokeWidth="5"/><circle cx="0" cy="-14" r="12" fill={i===1?'#8ee5a9':'#54b887'}/><circle cx="-7" cy="-18" r="6" fill="#b4f1c6"/></g>)}</>}
  {type==='lighthouse'&&<><ellipse cx="0" cy="36" rx="35" ry="9" fill="#061b2a" opacity=".3"/><path d="M-20 3 L20 3 L14 39 L-14 39Z" fill="#f0e6d5" stroke="#b9a88f" strokeWidth="2"/><path d="M-17 12 L17 12 L14 23 L-15 23Z" fill="#d66c76"/><path d="M-18 2 L0 -16 L18 2Z" fill="#d66c76" stroke="#f3b6ad" strokeWidth="2"/><rect x="-10" y="-7" width="20" height="12" rx="3" fill="#a6ecff" stroke="#effcff" strokeWidth="2"/><path d="M0 -8 L-44 -20 M0 -8 L44 -20" stroke="#b6f4ff" strokeWidth="2" opacity=".7" filter={`url(#${glowId})`}/></>}
  {type==='workshop'&&<><path d="M-40 4L0 -23 40 4V34L0 53 -40 34Z" fill="#718b9b" stroke="#d8edf2" strokeWidth="2.5"/><path d="M-40 4L0 -25 40 4 0 29Z" fill="#d49a61" stroke="#ffe1b5" strokeWidth="2.5"/><path d="M-14 21L14 4V44L-14 52Z" fill="#2d4b62"/><path d="M-31 5L-17 -4V12L-31 21Z" fill="#a6edff" stroke="#efffff" strokeWidth="1.5"/><path d="M17 4L30 -4V12L17 20Z" fill="#a6edff" stroke="#efffff" strokeWidth="1.5"/><path d="M-6 -25V-44H7V-18" fill="#dce9ec" stroke="#879ba8" strokeWidth="2"/><path d="M-6 -44Q-20 -57 -8 -65Q3 -57 7 -44" fill="#d4efff" opacity=".45"/></>}
    {type==='archive'&&<><path d="M-36 4L0 -18 36 4V34L0 52 -36 34Z" fill="#6c688b" stroke="#e1d5ff" strokeWidth="2"/><path d="M-36 4L0 -18 36 4 0 27Z" fill="#a99bd6"/><path d="M-23 10V35M0 25V48M23 10V35" stroke="#f6eaff" strokeWidth="5"/><circle cy="-3" r="5" fill="#fff3b2"/></>}
  {type==='portal'&&<><ellipse cy="18" rx="38" ry="14" fill="#1c5268" stroke="#80efff" strokeWidth="2"/><ellipse cy="-8" rx="24" ry="33" fill="#142d65" stroke="#a9eaff" strokeWidth="5"/><ellipse cy="-8" rx="15" ry="24" fill="#8b79ef" opacity=".7"/><path d="M-18 -23Q0 -41 18 -23M-18 7Q0 25 18 7" fill="none" stroke="#f1faff" strokeWidth="2"/></>}
  {type==='dock'&&<><path d="M-42 3L0 -18 42 3 0 24Z" fill="#b78b61" stroke="#f0d4a8" strokeWidth="2"/><path d="M-31 8V27M0 25V43M31 8V27" stroke="#b78b61" strokeWidth="6"/><path d="M-45 28Q0 45 45 28" fill="none" stroke="#e9c18d" strokeWidth="5"/><path d="M-15 -4V-37M-15 -35L14 -22H-15" fill="#e8f4f7" stroke="#fff" strokeWidth="2"/></>}
  {worker&&<g className="nwi-worker-sprite" transform="translate(34 -29) scale(.62)" aria-label={worker.npc_name}>
   <ellipse cy="24" rx="12" ry="3.5" fill="#08172a" opacity=".35"/>
   <path d="M-8 4Q-11 13 -7 20L7 20Q11 12 8 4Z" fill="#6b8dff" stroke="#d9e5ff" strokeWidth="1.5"/>
   <circle cy="-3" r="9" fill="#ffd4b2" stroke="#fff0dc" strokeWidth="1.5"/>
   <path d="M-9 -5Q-8 -16 2 -14Q10 -12 9 -4L5 -7L-5 -7Z" fill="#4d3d72"/>
   <circle cx="-3" cy="-3" r="1.2" fill="#26324c"/><circle cx="3" cy="-3" r="1.2" fill="#26324c"/>
   <path d="M-2 2Q0 4 2 2" fill="none" stroke="#b86e69" strokeWidth="1"/>
   <path d="M-5 19L-7 26M5 19L7 26" stroke="#d7e9ff" strokeWidth="3" strokeLinecap="round"/>
   <path d="M-9 8L-15 14M9 8L15 14" stroke="#ffd4b2" strokeWidth="3" strokeLinecap="round"/>
   <circle cx="13" cy="-14" r="5" fill="#9df3cb" stroke="#edfff6" strokeWidth="1.2"/><path d="M13 -17V-11M10 -14H16" stroke="#236c58" strokeWidth="1"/>
  </g>}
  {canRemove&&<g className="nwi-remove" transform="translate(28 -31)" onClick={onRemove} role="button" tabIndex="0"><circle r="12" fill="#241b37" stroke="#ff9bba" strokeWidth="1.5"/><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff" strokeWidth="2.2"/></g>}
 </g>;
}

function Tree({x,y,scale=1}){return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0 V20" stroke="#72513d" strokeWidth="6" strokeLinecap="round"/><path d="M0 -27 C-25 -28 -24 -8 -8 -8 C-24 4 -8 13 2 3 C12 15 27 3 13 -9 C30 -22 13 -35 0 -27Z" fill="#318e70" stroke="#79d6a8" strokeWidth="2"/><path d="M-7 -22 Q0 -31 9 -22" fill="none" stroke="#b0f0c8" strokeWidth="2"/></g>}


export function NexusWorldLobby({clans=[],memberships=[],onOpenClan=()=>{},onJoinClan=()=>{},onCreate=()=>{}}){
 const myIds=new Set(memberships.map(m=>m.clan_id));
 return <section className="nwi-lobby">
  <header className="nwi-lobby-head">
   <div><span className="nwi-kicker"><Compass size={13}/> NEXUS WORLD <i/> ARQUIPÉLAGO</span><h2>Um universo. <span>Mil possibilidades.</span></h2><p>Ilhas criadas por comunidades. Cada clã constrói seu próprio lugar e deixa sua marca no universo.</p></div>
   <div className="nwi-world-mark"><span className="nwi-world-orbit"/><b>NW</b><i>✦</i></div>
  </header>
  <div className="nwi-lobby-toolbar"><div className="nwi-world-count"><span className="nwi-count-icon"><Map size={17}/></span><div><b>{clans.length.toLocaleString('pt-BR')} {clans.length===1?'ilha descoberta':'ilhas descobertas'}</b><small>ARQUIPÉLAGO CONHECIDO</small></div></div><button type="button" onClick={onCreate}><Plus size={17}/> Fundar meu clã</button></div>
  {clans.length===0?<div className="nwi-empty"><div className="nwi-empty-orb"><Ship size={28}/></div><b>Um mundo inteiro espera para nascer.</b><span>Fundar o primeiro clã é dar vida à primeira ilha do arquipélago.</span><button type="button" onClick={onCreate}><Plus size={16}/> Criar a primeira ilha</button></div>:<div className="nwi-clan-grid">{clans.map((cl,index)=>{const mine=myIds.has(cl.id);return <article className="nwi-clan-card" key={cl.id}>
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

export default function NexusWorldIsland({clan,userId,onToast=()=>{},preview=false}){
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
   <svg className="nwi-island-svg" viewBox="0 0 900 520" role="img" aria-label={`Ilha 3D do clã ${clan?.name||''}, com ${count} construções`}>
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
    {buildings.map(item=>{const pos=SLOTS[Number(item.slot)-1];return pos?<IslandBuilding key={item.id} type={item.building_type} x={pos.x} y={pos.y} worker={workersByBuilding[item.id]} canRemove={!preview&&(item.created_by===userId||clan?.created_by===userId)} glowId={`${sceneKey}-glow`} onRemove={()=>removeBuilding(item)}/>:null;})}
    <g className="nwi-island-marker" transform="translate(440 115)"><path d="M0 0 L0 -22" stroke="#d7f8ff" strokeWidth="2"/><circle cy="-29" r="8" fill="#e9fbff" filter={`url(#${sceneKey}-glow)`}/><circle cy="-29" r="3" fill="#fff"/></g>
    <path d="M115 350 Q180 395 255 395 M690 380 Q750 355 780 310" fill="none" stroke="#77e9ff" strokeWidth="2" opacity=".7" strokeLinecap="round"/>
   </svg>
   <div className="nwi-scene-caption"><span><i/> UNIVERSO COMPARTILHADO</span><b>{clan?.tag||'NEXUS'} · SETOR 01</b></div>
   {loading&&<div className="nwi-loading"><LoaderCircle className="nwi-spin"/> Sincronizando ilha…</div>}
  </div>
  {!preview&&<div className="nwi-build-bar"><div><span className="nwi-kicker">CONSTRUA SUA HISTÓRIA</span><b>{count===0?'Sua ilha está esperando a primeira construção.':count===8?'Sua ilha está completa!':'Cada construção deixa sua marca neste mundo.'}</b><small>As construções ficam salvas para todos os integrantes do clã.</small></div><button type="button" disabled={!!loading||!!saving||!nextSlot} onClick={()=>setAdding(true)}><Plus size={17}/> {nextSlot?'Construir':'Ilha completa'}</button></div>}
  {!preview&&canManage&&<section className="nwi-worker-economy">
   <header className="nwi-worker-head"><div><span className="nwi-kicker"><Users size={13}/> VIDA NA ILHA</span><h3>Pequenos trabalhadores</h3><p>Contrate ajudantes para cuidar das construções. Eles trabalham enquanto você estiver fora e dividem a produção com toda a ilha.</p></div><div className="nwi-worker-balances"><span><Zap size={14}/>{playerXp.toLocaleString('pt-BR')} XP</span><span><Coins size={14}/>{playerCoins.toLocaleString('pt-BR')} moedas</span></div></header>
   <div className="nwi-worker-summary"><div><b>{workers.length} / {buildings.length}</b><small>CONSTRUÇÕES COM EQUIPE</small></div><div><b>+2 XP</b><small>POR TRABALHADOR / HORA</small></div><div><b>+1 <Coins size={12}/></b><small>POR TRABALHADOR / HORA</small></div><button type="button" onClick={claimWorkers} disabled={claiming||!workers.length}>{claiming?<LoaderCircle size={15} className="nwi-spin"/>:<Sparkles size={15}/>} Recolher produção</button></div>
   <div className="nwi-worker-list">{buildings.map(building=>{const worker=workersByBuilding[building.id],label=BUILDINGS.find(x=>x.id===building.building_type)?.name||'Construção';return <article className={'nwi-worker-card '+(worker?'is-staffed':'')} key={building.id}><div className="nwi-worker-avatar">{worker?'🧑‍🔧':'🏗️'}</div><div className="nwi-worker-info"><b>{label}</b>{worker?<><span>{worker.npc_name} · trabalhando</span><small>Produz 2 XP + 1 moeda por hora · limite de 8 horas acumuladas</small></>:<><span>Sem trabalhador</span><small>Contrate alguém para ativar a produção desta construção.</small></>}</div>{worker?<span className="nwi-worker-status"><i/> ATIVO</span>:<div className="nwi-hire-actions"><button type="button" disabled={saving||playerCoins<30} onClick={()=>hireWorker(building,'coins')}><Coins size={13}/> 30</button><button type="button" disabled={saving||playerXp<100} onClick={()=>hireWorker(building,'xp')}><Zap size={13}/> 100 XP</button></div>}</article>})}{!buildings.length&&<p className="nwi-workers-empty">Construa sua primeira estrutura para contratar o primeiro morador da ilha.</p>}</div>
   <p className="nwi-worker-foot"><Clock size={13}/> A produção é acumulada por até 8 horas. Qualquer integrante pode recolher a produção; os recursos são divididos igualmente entre todos os membros da ilha.</p>
  </section>}
  {!preview&&error&&<div className="nwi-error" role="alert">{error}</div>}
  {!preview&&adding&&<div className="nwi-builder-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAdding(false);}}><section className="nwi-builder" role="dialog" aria-modal="true" aria-label="Adicionar construção"><header><div><span className="nwi-kicker">EXPANSÃO DA ILHA</span><h3>O que vamos construir?</h3></div><button type="button" onClick={()=>setAdding(false)} aria-label="Fechar"><X size={20}/></button></header><div className="nwi-building-options">{BUILDINGS.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={selectedType===item.id?'selected':''} onClick={()=>setSelectedType(item.id)}><span><Icon size={21}/></span><b>{item.name}</b><small>{item.desc}</small></button>})}</div><div className="nwi-builder-foot"><small>Espaço {nextSlot} de 8 · escolha visual compartilhada</small><button type="button" onClick={addBuilding} disabled={saving}>{saving?<LoaderCircle className="nwi-spin" size={16}/>:<Hammer size={16}/>} Construir</button></div></section></div>}
  {!preview&&<div className="nwi-island-note"><Sparkles size={15}/> A ilha é compartilhada: qualquer integrante pode contribuir. Quem construiu ou fundou o clã pode remover construções para reorganizar o espaço.</div>}
 </section>;
}
