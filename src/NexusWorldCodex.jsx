import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Compass,Lock,CheckCircle2,LoaderCircle,Sparkles,Globe2,ArrowUpRight} from 'lucide-react';
import './nexus-world.css';

const REGIONS=[
 {id:'aurora',name:'Mar de Aurora',type:'Oceano luminoso',desc:'Siga as correntes de luz que cercam o arquipélago.',icon:'✧',reward:'Fragmento da Aurora'},
 {id:'crystal',name:'Cavernas de Cristal',type:'Subsolo cristalino',desc:'Uma rede de cristais guarda ecos de antigas expedições.',icon:'◇',reward:'Núcleo Prismático'},
 {id:'ancient_gate',name:'Portal Ancestral',type:'Ruínas antigas',desc:'Símbolos esquecidos indicam uma passagem entre mundos.',icon:'⌘',reward:'Selo Ancestral'},
 {id:'sky_garden',name:'Jardim Celeste',type:'Território suspenso',desc:'Ilhas flutuantes escondem sementes de energia rara.',icon:'❋',reward:'Semente Celeste'},
 {id:'deep_signal',name:'Sinal das Profundezas',type:'Mistério abissal',desc:'Um sinal desconhecido pulsa sob o oceano.',icon:'⌁',reward:'Eco Abissal'}
];
export default function NexusWorldCodex({clan,userId,onToast=()=>{}}){
 const [discoveries,setDiscoveries]=useState([]),[event,setEvent]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!clan?.id)return;const [d,e]=await Promise.all([supabase.from('social_world_discoveries').select('id,discovery_key,discovered_by,discovered_at').eq('clan_id',clan.id).order('discovered_at'),supabase.from('social_world_events').select('*').order('starts_at',{ascending:false}).limit(1).maybeSingle()]);if(d.error)setError(d.error.message);else setDiscoveries(d.data||[]);if(e.error&&e.error.code!=='PGRST116')setError(e.error.message);else setEvent(e.data||null);setLoading(false);},[clan?.id]);
 useEffect(()=>{setLoading(true);load();if(!clan?.id)return;const ch=supabase.channel('nexus-codex-'+clan.id).on('postgres_changes',{event:'*',schema:'public',table:'social_world_discoveries',filter:'clan_id=eq.'+clan.id},load).subscribe();return()=>{supabase.removeChannel(ch);};},[clan?.id,load]);
 const discover=async region=>{if(!userId||discoveries.some(d=>d.discovery_key===region.id))return;setBusy(true);setError('');const {error:e}=await supabase.from('social_world_discoveries').insert({clan_id:clan.id,discovery_key:region.id,discovered_by:userId});if(e){if(e.code==='23505')await load();else setError(e.message);}else{await load();onToast('Novo território registrado no Codex!');}setBusy(false);};
 const found=new Set(discoveries.map(d=>d.discovery_key));const progress=found.size/REGIONS.length*100;const eventOpen=event&&new Date(event.ends_at)>new Date();
 return <section className="nwi-codex">
  <header className="nwi-codex-head"><div><span className="nwi-kicker"><Globe2 size={13}/> EXPLORAÇÃO · CODEX</span><h3>Além da ilha, existe um mundo.</h3><p>Descubra regiões desconhecidas. Cada descoberta fica registrada para toda a comunidade.</p></div><div className="nwi-codex-count"><b>{found.size}/5</b><small>DESCOBERTAS</small></div></header>
  {event&&<article className="nwi-world-event"><div className="nwi-event-icon"><Sparkles size={22}/></div><div className="nwi-event-copy"><span>EVENTO GLOBAL · {eventOpen?'EM ANDAMENTO':'ENCERRADO'}</span><h4>{event.title}</h4><p>{event.description}</p><div className="nwi-event-progress"><i style={{width:progress+'%'}}/></div><small>{found.size} de 5 territórios revelados pela sua equipe</small></div></article>}
  {error&&<div className="nwi-error">{error}</div>}
  {loading?<div className="nwi-codex-loading"><LoaderCircle className="nwi-spin"/> Consultando o Codex…</div>:<div className="nwi-region-grid">{REGIONS.map((region,index)=>{const done=found.has(region.id);const record=discoveries.find(d=>d.discovery_key===region.id);return <article className={'nwi-region-card '+(done?'discovered':'')} key={region.id}><div className="nwi-region-art"><span>{region.icon}</span><small>0{index+1}</small><i/></div><div className="nwi-region-copy"><span>{region.type}</span><h4>{region.name}</h4><p>{region.desc}</p><div className="nwi-region-reward">✦ {region.reward}</div><button type="button" disabled={busy||done||!eventOpen&&!!event} onClick={()=>discover(region)}>{done?<><CheckCircle2 size={15}/> Descoberto</>:busy?<LoaderCircle size={15} className="nwi-spin"/>:<><Compass size={15}/> Explorar território</>}</button>{record&&<small className="nwi-discovered-at">Registrado em {new Date(record.discovered_at).toLocaleDateString('pt-BR')}</small>}</div></article>})}</div>}
  {found.size===5&&<div className="nwi-portal-awake"><Sparkles size={19}/><div><b>Portal central ativado!</b><span>Sua comunidade revelou todos os territórios conhecidos. Novos mistérios poderão surgir em futuras expedições.</span></div></div>}
 </section>;
}
