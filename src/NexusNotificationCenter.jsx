import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Bell,BellRing,Send,Heart,MessageCircle,UserPlus,Trophy,CheckCheck,X,ChevronDown,Trash2,Inbox} from 'lucide-react';
import {supabase} from './supabase';
import PushNotifications from './PushNotifications';
import './nexus-notifications.css';

const kindOf=n=>{
 const t=(n.title||'').toLowerCase();
 if(t.includes('mensagem'))return {k:'msg',Icon:Send,to:'social-conversations',label:'Mensagem'};
 if(t.includes('amizade')||t.includes('solicita')||t.includes('amig'))return {k:'friend',Icon:UserPlus,to:'social-conversations',label:'Amizade'};
 if(t.includes('curt')||t.includes('rea'))return {k:'like',Icon:Heart,to:'social-feed',label:'Reação'};
 if(t.includes('coment')||t.includes('publica')||t.includes('sinal')||t.includes('pulso'))return {k:'post',Icon:MessageCircle,to:'social-feed',label:'Feed'};
 if(t.includes('duelo')||t.includes('liga')||t.includes('rank')||t.includes('missão'))return {k:'game',Icon:Trophy,to:'games',label:'Jogos'};
 return {k:'sys',Icon:Bell,to:null,label:n.category==='social'?'Nexus':'Aviso'};
};
const dayKey=d=>{const a=new Date(d),b=new Date();a.setHours(0,0,0,0);b.setHours(0,0,0,0);const diff=Math.round((b-a)/864e5);return diff<=0?'Hoje':diff===1?'Ontem':diff<7?'Esta semana':'Anteriores'};
const timeText=d=>{const x=new Date(d),diff=(Date.now()-x)/6e4;if(diff<1)return 'agora';if(diff<60)return Math.floor(diff)+' min';if(diff<1440)return Math.floor(diff/60)+' h';return x.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})};
const ORDER=['Hoje','Ontem','Esta semana','Anteriores'];

export default function NexusNotificationCenter({session,onGo=()=>{},onToast=()=>{},variant='page',onClose=()=>{}}){
 const userId=session?.user?.id;
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all'),[pushOpen,setPushOpen]=useState(false);
 const load=useCallback(async()=>{
  if(!userId)return;
  const {data,error}=await supabase.from('notifications').select('id,title,message,category,is_read,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(120);
  if(!error)setRows(data||[]);setLoading(false);
 },[userId]);
 useEffect(()=>{load();if(!userId)return;const ch=supabase.channel('nx-notif-center-'+userId+variant).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[userId,load,variant]);
 const changed=()=>window.dispatchEvent(new Event('nx:notifications-changed'));
 const unread=rows.filter(n=>!n.is_read).length;
 // agrupa avisos repetidos (mesmo título no mesmo dia)
 const groups=useMemo(()=>{
  const list=rows.filter(n=>filter==='all'||!n.is_read);
  const map=new Map();
  for(const n of list){const key=dayKey(n.created_at)+'|'+(n.title||'')+'|'+(n.created_at||'').slice(0,10);const g=map.get(key);if(g){g.items.push(n)}else map.set(key,{key,day:dayKey(n.created_at),items:[n]})}
  const out={};for(const g of map.values()){(out[g.day]=out[g.day]||[]).push(g)}return out;
 },[rows,filter]);
 async function markIds(ids){if(!ids.length)return;const {error}=await supabase.from('notifications').update({is_read:true}).in('id',ids).eq('user_id',userId);if(!error){setRows(r=>r.map(n=>ids.includes(n.id)?{...n,is_read:true}:n));changed()}}
 async function markAll(){const ids=rows.filter(n=>!n.is_read).map(n=>n.id);await markIds(ids);onToast('Tudo marcado como lido.')}
 async function clearRead(){const ids=rows.filter(n=>n.is_read).map(n=>n.id);if(!ids.length)return;const {error}=await supabase.from('notifications').delete().in('id',ids).eq('user_id',userId);if(!error){setRows(r=>r.filter(n=>!n.is_read));changed();onToast('Avisos lidos removidos.')}}
 async function remove(g){const ids=g.items.map(n=>n.id);const {error}=await supabase.from('notifications').delete().in('id',ids).eq('user_id',userId);if(!error){setRows(r=>r.filter(n=>!ids.includes(n.id)));changed()}}
 function open(g){const n=g.items[0],k=kindOf(n);markIds(g.items.filter(x=>!x.is_read).map(x=>x.id));if(k.to){onClose();onGo(k.to)}}
 const body=<div className={'nxn nxn-'+variant}>
  <header className="nxn-head"><div><h2>Notificações</h2><p>{unread?unread+(unread===1?' novidade esperando':' novidades esperando'):'Você está em dia ✨'}</p></div>{variant==='sheet'&&<button type="button" className="nxn-x" onClick={onClose} aria-label="Fechar"><X size={20}/></button>}</header>
  <div className="nxn-bar"><div className="nxn-seg"><button type="button" className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>Todas</button><button type="button" className={filter==='unread'?'on':''} onClick={()=>setFilter('unread')}>Não lidas{unread>0&&<i>{unread}</i>}</button></div><div className="nxn-tools"><button type="button" onClick={markAll} disabled={!unread} title="Marcar tudo como lido" aria-label="Marcar tudo como lido"><CheckCheck size={18}/></button><button type="button" onClick={clearRead} disabled={!rows.some(n=>n.is_read)} title="Limpar lidas" aria-label="Limpar lidas"><Trash2 size={17}/></button></div></div>
  <div className="nxn-device"><button type="button" onClick={()=>setPushOpen(v=>!v)} aria-expanded={pushOpen}><BellRing size={17}/><span><b>Avisos no aparelho</b><small>Receba alertas mesmo com o app fechado</small></span><ChevronDown size={18} className={pushOpen?'up':''}/></button>{pushOpen&&<div className="nxn-device-body"><PushNotifications session={session} onToast={onToast}/></div>}</div>
  <div className="nxn-list">
   {loading?<div className="nxn-empty"><span className="spinner"/></div>:ORDER.every(d=>!groups[d])?<div className="nxn-empty"><Inbox size={34}/><b>{filter==='unread'?'Nada novo por aqui':'Nenhuma notificação ainda'}</b><p>Mensagens, reações e avisos do Nexus aparecem neste lugar.</p></div>:ORDER.filter(d=>groups[d]).map(d=><section key={d}><h4 className="nxn-day">{d}</h4>{groups[d].map(g=>{const n=g.items[0],k=kindOf(n),isUnread=g.items.some(x=>!x.is_read);return <article key={g.key} className={'nxn-item k-'+k.k+(isUnread?' unread':'')}><button type="button" className="nxn-main" onClick={()=>open(g)}><span className="nxn-ic"><k.Icon size={19}/></span><span className="nxn-tx"><b>{n.title||'Atualização do Nexus'}</b><small>{n.message||'Você tem uma nova atualização.'}</small><em>{k.label}{g.items.length>1?' · +'+(g.items.length-1)+' parecidas':''}</em></span><time>{timeText(n.created_at)}</time>{isUnread&&<i className="nxn-dot"/>}</button><button type="button" className="nxn-del" onClick={()=>remove(g)} aria-label="Excluir"><X size={15}/></button></article>})}</section>)}
  </div>
 </div>;
 if(variant==='sheet')return createPortal(<div className="nxn-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>{body}</div>,document.body);
 return body;
}
