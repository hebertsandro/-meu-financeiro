import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {Compass,Home,Telescope,Sprout,RadioTower,Wrench,Plus,X,LoaderCircle,Sparkles,Hammer,Trash2,Users,ArrowUpRight,Map,Ship} from 'lucide-react';
import './nexus-world.css';

const BUILDINGS=[
 {id:'house',name:'Casa',desc:'Um novo lar para a comunidade.',icon:Home},
 {id:'observatory',name:'Observatório',desc:'Um ponto de observação do universo.',icon:Telescope},
 {id:'garden',name:'Jardim',desc:'Um espaço verde para a ilha.',icon:Sprout},
 {id:'lighthouse',name:'Farol',desc:'Uma luz que guia exploradores.',icon:RadioTower},
 {id:'workshop',name:'Oficina',desc:'Onde novas ideias ganham forma.',icon:Wrench}
];
const SLOTS=[{x:285,y:220},{x:430,y:178},{x:570,y:218},{x:680,y:270},{x:525,y:300},{x:370,y:315},{x:220,y:300},{x:620,y:350}];

function IslandBuilding({type,x,y,onRemove,canRemove}){
 const common={strokeLinejoin:'round',strokeLinecap:'round'};
 return <g transform={`translate(${x} ${y})`} className="nwi-building">
  {type==='house'&&<><ellipse cx="0" cy="33" rx="43" ry="10" fill="#061b2a" opacity=".3"/><path d="M-31 0 L0 -19 L31 0 L31 31 L-31 31Z" fill="#d9e7e9" stroke="#6c9b9d" strokeWidth="2"/><path d="M-31 0 L0 -23 L31 0 L0 17Z" fill="#8d70d8" stroke="#c7b6ff" strokeWidth="2"/><path d="M-31 0 L0 17 L0 45 L-31 28Z" fill="#7ca9a5"/><path d="M0 17 L31 0 L31 29 L0 45Z" fill="#477f82"/><path d="M-10 8 L-10 33 L2 39 L2 15Z" fill="#2b5260"/><path d="M11 3 L23 -4 L23 8 L11 15Z" fill="#9eeaff"/><path d="M-23 -2 L-12 -9 L-12 3 L-23 10Z" fill="#9eeaff"/></>}
  {type==='observatory'&&<><ellipse cx="0" cy="34" rx="43" ry="10" fill="#061b2a" opacity=".3"/><path d="M-34 3 L0 -16 L34 3 L34 30 L-34 30Z" fill="#567e92" stroke="#a3d7e9" strokeWidth="2"/><path d="M-34 3 L0 22 L34 3" fill="none" stroke="#c3efff" strokeWidth="2"/><path d="M-24 1 A24 24 0 0 1 24 1 L24 13 L-24 13Z" fill="#a4d8ef" stroke="#d5f4ff" strokeWidth="2"/><path d="M-16 -4 Q0 -29 16 -4" fill="#6d7be1" stroke="#d1d5ff" strokeWidth="2"/><path d="M0 -23 V-5" stroke="#effaff" strokeWidth="2"/><circle cx="0" cy="-13" r="3" fill="#fff"/></>}
  {type==='garden'&&<><ellipse cx="0" cy="28" rx="39" ry="10" fill="#061b2a" opacity=".25"/><path d="M-34 0 Q0 -18 34 0 L27 25 Q0 38 -27 25Z" fill="#347d64" stroke="#7fd6a7" strokeWidth="2"/>{[-20,0,19].map((v,i)=><g key={i} transform={`translate(${v} ${i===1?-4:3})`}><path d="M0 10 V-10" stroke="#704c37" strokeWidth="5"/><circle cx="0" cy="-14" r="12" fill={i===1?'#8ee5a9':'#54b887'}/><circle cx="-7" cy="-18" r="6" fill="#b4f1c6"/></g>)}</>}
  {type==='lighthouse'&&<><ellipse cx="0" cy="36" rx="35" ry="9" fill="#061b2a" opacity=".3"/><path d="M-20 3 L20 3 L14 39 L-14 39Z" fill="#f0e6d5" stroke="#b9a88f" strokeWidth="2"/><path d="M-17 12 L17 12 L14 23 L-15 23Z" fill="#d66c76"/><path d="M-18 2 L0 -16 L18 2Z" fill="#d66c76" stroke="#f3b6ad" strokeWidth="2"/><rect x="-10" y="-7" width="20" height="12" rx="3" fill="#a6ecff" stroke="#effcff" strokeWidth="2"/><path d="M0 -8 L-44 -20 M0 -8 L44 -20" stroke="#b6f4ff" strokeWidth="2" opacity=".7" filter="url(#nwiGlow)"/></>}
  {type==='workshop'&&<><ellipse cx="0" cy="33" rx="43" ry="10" fill="#061b2a" opacity=".3"/><path d="M-33 0 L0 -19 L33 0 L33 30 L-33 30Z" fill="#647e91" stroke="#b2cbd8" strokeWidth="2"/><path d="M-33 0 L0 -20 L33 0 L0 18Z" fill="#d49b65" stroke="#f5d2a6" strokeWidth="2"/><path d="M-12 8 L12 -6 L12 30 L-12 40Z" fill="#314b60"/><path d="M-26 1 L-13 -6 L-13 7 L-26 14Z" fill="#9fe9ff"/><path d="M17 0 L26 -5 L26 7 L17 12Z" fill="#9fe9ff"/><path d="M-5 -21 L-5 -34 L5 -34 L5 -16" fill="#d7e4e7" stroke="#8199a6" strokeWidth="2"/></>}
  {canRemove&&<g className="nwi-remove" transform="translate(28 -31)" onClick={onRemove} role="button" tabIndex="0"><circle r="12" fill="#241b37" stroke="#ff9bba" strokeWidth="1.5"/><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff" strokeWidth="2.2"/></g>}
 </g>;
}

function Tree({x,y,scale=1}){return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0 V20" stroke="#72513d" strokeWidth="6" strokeLinecap="round"/><path d="M0 -27 C-25 -28 -24 -8 -8 -8 C-24 4 -8 13 2 3 C12 15 27 3 13 -9 C30 -22 13 -35 0 -27Z" fill="#318e70" stroke="#79d6a8" strokeWidth="2"/><path d="M-7 -22 Q0 -31 9 -22" fill="none" stroke="#b0f0c8" strokeWidth="2"/></g>}

function ClanIslandPreview({clan,index=0}){
 const uid=String(clan.id||index).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28)||String(index);
 const palettes=[
  {sea:'#123d66',sea2:'#257c94',grass:'#b6d99b',grass2:'#438e78',rock:'#315d66',roof:'#8e79d9',glow:'#9deaff'},
  {sea:'#17365f',sea2:'#387a9a',grass:'#c2dba0',grass2:'#559879',rock:'#395b69',roof:'#d68b75',glow:'#ffe0a6'},
  {sea:'#1c376b',sea2:'#367f98',grass:'#b8d6a0',grass2:'#4e997c',rock:'#34586a',roof:'#69a8d5',glow:'#b7d8ff'}
 ];
 const p=palettes[index%palettes.length];
 return <div className="nwi-preview-art" aria-hidden="true">
  <div className="nwi-preview-aurora"/>
  <svg viewBox="0 0 640 300" preserveAspectRatio="xMidYMid slice">
   <defs>
    <linearGradient id={uid+'sea'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.sea2}/><stop offset=".58" stopColor={p.sea}/><stop offset="1" stopColor="#111c43"/></linearGradient>
    <linearGradient id={uid+'land'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.grass}/><stop offset=".55" stopColor="#78b98e"/><stop offset="1" stopColor={p.grass2}/></linearGradient>
    <linearGradient id={uid+'cliff'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.rock}/><stop offset="1" stopColor="#172c4a"/></linearGradient>
    <filter id={uid+'shadow'}><feGaussianBlur stdDeviation="10"/></filter>
    <filter id={uid+'shine'}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   </defs>
   <path d="M0 0H640V300H0Z" fill={'url(#'+uid+'sea)'}/>
   <g opacity=".24" fill="none" stroke="#9beeff"><path d="M-20 75Q90 45 190 76T390 73T670 67" strokeWidth="2"/><path d="M-10 245Q110 213 230 244T470 240T670 230"/><path d="M40 110Q115 92 185 111M430 54Q500 37 580 53"/></g>
   <ellipse cx="325" cy="246" rx="240" ry="28" fill="#06172d" opacity=".5" filter={'url(#'+uid+'shadow)'}/>
   <path d="M85 164Q108 75 225 71Q310 19 397 70Q515 50 566 139Q612 207 526 242Q414 288 287 258Q153 283 94 218Z" fill={'url(#'+uid+'cliff)'} stroke="#77c6c2" strokeWidth="3"/>
   <path d="M103 150Q132 82 230 80Q316 34 397 79Q504 63 548 143Q580 194 510 223Q405 258 290 235Q165 255 116 207Z" fill={'url(#'+uid+'land)'} stroke="#d2efb5" strokeWidth="3"/>
   <path d="M138 151Q195 99 263 105Q344 58 424 105Q488 95 520 145" fill="none" stroke="#e8f6c8" strokeWidth="4" opacity=".45"/>
   <path d="M190 191Q260 155 322 176Q393 201 467 151" fill="none" stroke="#e6d8a8" strokeWidth="12" strokeLinecap="round"/>
   <path d="M190 191Q260 155 322 176Q393 201 467 151" fill="none" stroke="#fff0c9" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
   <g transform="translate(300 130)">
    <ellipse cy="36" rx="43" ry="10" fill="#18384b" opacity=".3"/>
    <path d="M-30 0L0 -19L30 0V31L-30 31Z" fill="#dbe7df" stroke="#739b9a" strokeWidth="2"/>
    <path d="M-30 0L0 -24L30 0L0 16Z" fill={p.roof} stroke="#d9d0ff" strokeWidth="2"/>
    <path d="M-30 0L0 16V44L-30 28Z" fill="#6faaa0"/><path d="M0 16L30 0V29L0 44Z" fill="#477e79"/>
    <path d="M-9 8V34L2 40V15Z" fill="#315366"/><path d="M12 2L23 -5V8L12 14Z" fill={p.glow}/>
   </g>
   <g transform="translate(420 118)"><path d="M0 10V-15" stroke="#76563f" strokeWidth="6"/><path d="M0 -42C-25 -40 -28 -20 -9 -17C-27 -4 -8 11 3 -1C17 13 31 -4 15 -18C34 -34 15 -50 0 -42Z" fill="#287d69" stroke="#8cd6a1" strokeWidth="2"/></g>
   <g transform="translate(208 135) scale(.8)"><path d="M0 10V-15" stroke="#76563f" strokeWidth="6"/><path d="M0 -42C-25 -40 -28 -20 -9 -17C-27 -4 -8 11 3 -1C17 13 31 -4 15 -18C34 -34 15 -50 0 -42Z" fill="#328b70" stroke="#9ce0a7" strokeWidth="2"/></g>
   <g transform="translate(475 172) scale(.65)"><path d="M0 10V-15" stroke="#76563f" strokeWidth="6"/><path d="M0 -42C-25 -40 -28 -20 -9 -17C-27 -4 -8 11 3 -1C17 13 31 -4 15 -18C34 -34 15 -50 0 -42Z" fill="#328b70"/></g>
   <path d="M85 222Q125 247 175 247M485 256Q548 236 575 204" fill="none" stroke="#7beaff" strokeWidth="2" opacity=".6"/>
   <g fill="#e5faff" filter={'url(#'+uid+'shine)'}><circle cx="145" cy="75" r="2"/><circle cx="525" cy="82" r="2"/><circle cx="570" cy="177" r="2"/></g>
   <g transform="translate(510 65)"><circle r="24" fill="#0b1c38" opacity=".72" stroke="#9fdcff" strokeOpacity=".5"/><path d="M0 -13L4 -4L13 0L4 4L0 13L-4 4L-13 0L-4 -4Z" fill="#e6f8ff"/><circle r="3" fill="#fff"/></g>
  </svg>
  <div className="nwi-preview-emblem">{clan.emblem||'✦'}</div>
  <div className="nwi-preview-overlay"><span>ILHA EXPLORÁVEL</span><b>{String(clan.tag||'NEXUS').toUpperCase()}</b></div>
 </div>;
}

export function NexusWorldLobby({clans=[],memberships=[],onOpenClan=()=>{},onJoinClan=()=>{},onCreate=()=>{}}){
 const myIds=new Set(memberships.map(m=>m.clan_id));
 return <section className="nwi-lobby">
  <header className="nwi-lobby-head">
   <div><span className="nwi-kicker"><Compass size={13}/> NEXUS WORLD <i/> ARQUIPÉLAGO</span><h2>Um universo. <span>Mil possibilidades.</span></h2><p>Ilhas criadas por comunidades. Cada clã constrói seu próprio lugar e deixa sua marca no universo.</p></div>
   <div className="nwi-world-mark"><span className="nwi-world-orbit"/><b>NW</b><i>✦</i></div>
  </header>
  <div className="nwi-lobby-toolbar"><div className="nwi-world-count"><span className="nwi-count-icon"><Map size={17}/></span><div><b>{clans.length.toLocaleString('pt-BR')} {clans.length===1?'ilha descoberta':'ilhas descobertas'}</b><small>ARQUIPÉLAGO CONHECIDO</small></div></div><button type="button" onClick={onCreate}><Plus size={17}/> Fundar meu clã</button></div>
  {clans.length===0?<div className="nwi-empty"><div className="nwi-empty-orb"><Ship size={28}/></div><b>Um mundo inteiro espera para nascer.</b><span>Fundar o primeiro clã é dar vida à primeira ilha do arquipélago.</span><button type="button" onClick={onCreate}><Plus size={16}/> Criar a primeira ilha</button></div>:<div className="nwi-clan-grid">{clans.map((cl,index)=>{const mine=myIds.has(cl.id);return <article className="nwi-clan-card" key={cl.id}>
   <ClanIslandPreview clan={cl} index={index}/>
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

export default function NexusWorldIsland({clan,userId,onToast=()=>{}}){
 const [buildings,setBuildings]=useState([]),[loading,setLoading]=useState(true),[adding,setAdding]=useState(false),[selectedType,setSelectedType]=useState('house'),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const canManage=!!userId;
 const load=useCallback(async()=>{if(!clan?.id)return;setLoading(true);const {data,error:e}=await supabase.from('social_clan_world_buildings').select('id,clan_id,building_type,slot,created_by,created_at').eq('clan_id',clan.id).order('slot');if(e)setError(e.message);else setBuildings(data||[]);setLoading(false);},[clan?.id]);
 useEffect(()=>{load();if(!clan?.id)return;const channel=supabase.channel('nexus-world-island-'+clan.id).on('postgres_changes',{event:'*',schema:'public',table:'social_clan_world_buildings',filter:'clan_id=eq.'+clan.id},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[clan?.id,load]);
 const occupied=useMemo(()=>new Set(buildings.map(b=>Number(b.slot))),[buildings]);
 const nextSlot=SLOTS.findIndex((_,i)=>!occupied.has(i+1))+1;
 const addBuilding=async()=>{if(!nextSlot||!canManage)return;setSaving(true);setError('');const {data,error:e}=await supabase.from('social_clan_world_buildings').insert({clan_id:clan.id,building_type:selectedType,slot:nextSlot,created_by:userId}).select().single();if(e){setError(e.code==='23505'?'Outro integrante acabou de construir nesse espaço. Atualize a ilha.':e.message);}else{setBuildings(old=>[...old,data].sort((a,b)=>a.slot-b.slot));setAdding(false);onToast('Construção adicionada à ilha!');}setSaving(false);};
 const removeBuilding=async item=>{const {error:e}=await supabase.from('social_clan_world_buildings').delete().eq('id',item.id);if(e)setError(e.message);else{setBuildings(old=>old.filter(x=>x.id!==item.id));onToast('Construção removida.');}};
 const count=buildings.length;
 return <section className="nexus-world-island">
  <header className="nwi-island-head"><div><span className="nwi-kicker"><Compass size={13}/> NEXUS WORLD · ILHA DO CLÃ</span><h2>{clan?.name||'Ilha desconhecida'}</h2><p>{clan?.motto||clan?.description||'Um lugar para construir algo que só pertence a vocês.'}</p></div><div className="nwi-island-stats"><span><Users size={14}/>{count} / 8 estruturas</span><small>ILHA EM EVOLUÇÃO</small></div></header>
  <div className="nwi-scene">
   <div className="nwi-sky-glow"/><div className="nwi-starfield"><i/><i/><i/><i/><i/><i/><i/></div>
   <svg className="nwi-island-svg" viewBox="0 0 900 520" role="img" aria-label={`Ilha 3D do clã ${clan?.name||''}, com ${count} construções`}>
    <defs>
     <linearGradient id="nwiWater" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#143c67"/><stop offset=".48" stopColor="#146b89"/><stop offset="1" stopColor="#142b58"/></linearGradient>
     <linearGradient id="nwiCliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#537b76"/><stop offset=".42" stopColor="#294e59"/><stop offset="1" stopColor="#172a49"/></linearGradient>
     <linearGradient id="nwiGrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b2d99b"/><stop offset=".45" stopColor="#65b58d"/><stop offset="1" stopColor="#368a7c"/></linearGradient>
     <radialGradient id="nwiAura"><stop offset="0" stopColor="#79eaff" stopOpacity=".5"/><stop offset="1" stopColor="#79eaff" stopOpacity="0"/></radialGradient>
     <filter id="nwiGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
     <filter id="nwiShadow"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <ellipse cx="452" cy="420" rx="355" ry="43" fill="#06152d" opacity=".55" filter="url(#nwiShadow)"/>
    <path d="M75 270 Q110 155 265 145 Q380 65 510 128 Q680 90 795 210 Q875 310 750 390 Q600 485 405 435 Q210 465 105 365Z" fill="url(#nwiWater)" stroke="#45b9d3" strokeWidth="3" opacity=".92"/>
    <path d="M105 285 Q165 200 275 190 Q390 120 505 160 Q665 125 755 230 Q825 315 725 370 Q570 435 410 395 Q230 425 135 350Z" fill="none" stroke="#7ceaff" strokeWidth="2" opacity=".4"/>
    <path d="M125 275 Q170 183 285 177 Q390 103 512 150 Q665 111 750 225 Q810 298 715 357 Q575 416 412 378 Q250 408 150 345Z" fill="url(#nwiCliff)" stroke="#8de3d2" strokeWidth="3"/>
    <path d="M150 245 Q200 175 295 168 Q395 108 510 146 Q655 120 735 220 Q780 280 705 330 Q575 380 420 350 Q270 378 175 320Z" fill="url(#nwiGrass)" stroke="#c4efb0" strokeWidth="3"/>
    <path d="M180 250 Q250 195 330 196 Q420 140 520 170 Q650 145 705 230" fill="none" stroke="#e0f4bd" strokeWidth="4" opacity=".42"/>
    <path d="M250 304 Q340 255 430 282 Q535 315 635 256" fill="none" stroke="#d7d6a0" strokeWidth="13" opacity=".85" strokeLinecap="round"/>
    <path d="M250 304 Q340 255 430 282 Q535 315 635 256" fill="none" stroke="#f5e5b5" strokeWidth="2" opacity=".8" strokeLinecap="round"/>
    <path d="M330 193 Q355 150 390 152 Q423 158 438 194" fill="#3e8d80" opacity=".65"/>
    <path d="M540 183 Q590 142 632 176 Q652 193 652 219" fill="#4a9b80" opacity=".7"/>
    <g opacity=".95"><Tree x={210} y={265} scale={1.05}/><Tree x={265} y={220} scale={.82}/><Tree x={690} y={265} scale={.9}/><Tree x={650} y={320} scale={.7}/><Tree x={470} y={185} scale={.62}/><Tree x={330} y={330} scale={.72}/><Tree x={570} y={345} scale={.78}/></g>
    <g opacity=".8" fill="#e5fff0"><circle cx="178" cy="304" r="3"/><circle cx="716" cy="296" r="3"/><circle cx="602" cy="190" r="3"/><circle cx="378" cy="350" r="3"/></g>
    {buildings.map(item=>{const pos=SLOTS[Number(item.slot)-1];return pos?<IslandBuilding key={item.id} type={item.building_type} x={pos.x} y={pos.y} canRemove={item.created_by===userId||clan?.created_by===userId} onRemove={()=>removeBuilding(item)}/>:null;})}
    <g className="nwi-island-marker" transform="translate(440 115)"><path d="M0 0 L0 -22" stroke="#d7f8ff" strokeWidth="2"/><circle cy="-29" r="8" fill="#e9fbff" filter="url(#nwiGlow)"/><circle cy="-29" r="3" fill="#fff"/></g>
    <path d="M115 350 Q180 395 255 395 M690 380 Q750 355 780 310" fill="none" stroke="#77e9ff" strokeWidth="2" opacity=".7" strokeLinecap="round"/>
   </svg>
   <div className="nwi-scene-caption"><span><i/> UNIVERSO COMPARTILHADO</span><b>{clan?.tag||'NEXUS'} · SETOR 01</b></div>
   {loading&&<div className="nwi-loading"><LoaderCircle className="nwi-spin"/> Sincronizando ilha…</div>}
  </div>
  <div className="nwi-build-bar"><div><span className="nwi-kicker">CONSTRUA SUA HISTÓRIA</span><b>{count===0?'Sua ilha está esperando a primeira construção.':count===8?'Sua ilha está completa!':'Cada construção deixa sua marca neste mundo.'}</b><small>As construções ficam salvas para todos os integrantes do clã.</small></div><button type="button" disabled={!!loading||!!saving||!nextSlot} onClick={()=>setAdding(true)}><Plus size={17}/> {nextSlot?'Construir':'Ilha completa'}</button></div>
  {error&&<div className="nwi-error" role="alert">{error}</div>}
  {adding&&<div className="nwi-builder-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAdding(false);}}><section className="nwi-builder" role="dialog" aria-modal="true" aria-label="Adicionar construção"><header><div><span className="nwi-kicker">EXPANSÃO DA ILHA</span><h3>O que vamos construir?</h3></div><button type="button" onClick={()=>setAdding(false)} aria-label="Fechar"><X size={20}/></button></header><div className="nwi-building-options">{BUILDINGS.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={selectedType===item.id?'selected':''} onClick={()=>setSelectedType(item.id)}><span><Icon size={21}/></span><b>{item.name}</b><small>{item.desc}</small></button>})}</div><div className="nwi-builder-foot"><small>Espaço {nextSlot} de 8 · escolha visual compartilhada</small><button type="button" onClick={addBuilding} disabled={saving}>{saving?<LoaderCircle className="nwi-spin" size={16}/>:<Hammer size={16}/>} Construir</button></div></section></div>}
  <div className="nwi-island-note"><Sparkles size={15}/> A ilha é compartilhada: qualquer integrante pode contribuir. Quem construiu ou fundou o clã pode remover construções para reorganizar o espaço.</div>
 </section>;
}
