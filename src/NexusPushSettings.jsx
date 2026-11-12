import React,{useEffect,useState} from 'react';
import {Bell,BellRing,Smartphone} from 'lucide-react';
import {supabase} from './supabase';

const VAPID_PUBLIC_KEY='BCay49BvqxHdAPmTOEwxxyUhU7Brg0ElRvU9QdLMEwIorYHa7uOutg9DVZu9HiBGxftBr0VZwfKk9n12YdTD8Cs';
const decodeKey=value=>{const pad='='.repeat((4-value.length%4)%4);const raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));};
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

export default function NexusPushSettings({userId}){
 const [supported,setSupported]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState('');
 async function saveSubscription(subscription){
  const json=subscription.toJSON(),keys=json.keys||{};
  const {error:e}=await supabase.from('push_subscriptions').upsert({
   user_id:userId,endpoint:json.endpoint,p256dh:keys.p256dh,auth:keys.auth,
   device_info:navigator.userAgent.slice(0,500),updated_at:new Date().toISOString()
  },{onConflict:'endpoint'});
  if(e)throw e;
  // Remove any legacy duplicate; all new delivery uses the shared subscription table.
  await supabase.from('nexus_push_subscriptions').delete().eq('user_id',userId).eq('endpoint',json.endpoint);
 }
 useEffect(()=>{let alive=true;const check=async()=>{
  const ok='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
  if(!alive)return;setSupported(ok);if(!ok)return;
  try{
   const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
   await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription();
   if(sub){await saveSubscription(sub);if(alive)setEnabled(true);}
   else if(alive)setEnabled(false);
  }catch(e){if(alive)setError(e.message||'Não foi possível verificar as notificações.');}
 };if(userId)check();return()=>{alive=false;};},[userId]);
 async function enable(){
  if(!userId||busy)return;setBusy(true);setError('');setHint('');
  try{
   if(isIOS&&!isStandalone){setHint('No iPhone: toque em Compartilhar → Adicionar à Tela de Início. Abra o Meu Financeiro pelo novo ícone e ative as notificações por lá.');return;}
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw new Error('Permissão de notificação não concedida. Ative nas configurações do navegador.');
   const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
   await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(VAPID_PUBLIC_KEY)});
   await saveSubscription(sub);setEnabled(true);setHint('Notificações ativadas neste aparelho. Mensagens, Feed e avisos do app serão entregues automaticamente.');
  }catch(e){setError(e.message||'Não foi possível ativar as notificações.');}
  finally{setBusy(false);}
 }
 async function disable(){
  setBusy(true);setError('');setHint('');
  try{
   const reg=await navigator.serviceWorker.getRegistration('/');
   const sub=await reg?.pushManager.getSubscription();
   if(sub){
    await supabase.from('push_subscriptions').delete().eq('user_id',userId).eq('endpoint',sub.endpoint);
    await supabase.from('nexus_push_subscriptions').delete().eq('user_id',userId).eq('endpoint',sub.endpoint);
    await sub.unsubscribe();
   }
   setEnabled(false);setHint('Notificações desativadas neste aparelho.');
  }catch(e){setError(e.message||'Não foi possível desativar as notificações.');}
  finally{setBusy(false);}
 }
 if(!supported)return <div className="nexus-push-settings"><Smartphone size={19}/><div><b>Notificações no celular</b><small>Este navegador não oferece suporte a notificações push. No iPhone, use o Meu Financeiro instalado na Tela de Início com iOS 16.4 ou superior.</small></div></div>;
 return <div className="nexus-push-settings"><span className="nexus-push-icon">{enabled?<BellRing size={19}/>:<Bell size={19}/>}</span><div className="nexus-push-copy"><b>Notificações do NEXUS</b><small>{enabled?'Este aparelho está inscrito para receber mensagens, atividades do Feed e avisos.':'Ative uma vez para receber mensagens, atividades do Feed e avisos mesmo fora do site.'}</small>{hint&&<small className="nexus-push-hint">{hint}</small>}{error&&<small className="nexus-push-error">{error}</small>}</div><button type="button" disabled={busy} onClick={enabled?disable:enable}>{busy?'Aguarde…':enabled?'Desativar':'Ativar notificações'}</button></div>;
}
