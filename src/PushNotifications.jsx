import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Smartphone } from 'lucide-react';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BCay49BvqxHdAPmTOEwxxyUhU7Brg0ElRvU9QdLMEwIorYHa7uOutg9DVZu9HiBGxftBr0VZwfKk9n12YdTD8Cs';
function decodeBase64Url(value){
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=window.atob(base64);
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
function isInstalled(){return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;}
function iosVersion(){
  const match=navigator.userAgent.match(/OS (\d+)[._](\d+)/i);
  return match?Number(match[1])+Number(match[2])/100:0;
}

export default function PushNotifications({session,onToast}){
  const [status,setStatus]=useState('checking');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let active=true;
    (async()=>{
      if(!session?.user?.id || !('serviceWorker' in navigator)){if(active)setStatus('unsupported');return;}
      try{
        const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
        await navigator.serviceWorker.ready;
        const subscription=await registration.pushManager.getSubscription();
        if(!active)return;
        if(subscription){setStatus('enabled');return;}
        if(!('PushManager' in window) || !('Notification' in window)){setStatus('unsupported');return;}
        if(Notification.permission==='denied'){setStatus('denied');return;}
        setStatus('off');
      }catch(error){if(active){setStatus('error');setMessage(error?.message||'Não foi possível preparar as notificações.');}}
    })();
    return()=>{active=false};
  },[session?.user?.id]);

  async function activate(){
    if(!session?.user?.id || busy)return;
    setBusy(true);setMessage('');
    try{
      if(isIos() && iosVersion()>0 && iosVersion()<16.4){
        setStatus('unsupported');setMessage('Este iPhone precisa do iOS 16.4 ou superior para receber notificações do site.');return;
      }
      if(isIos() && !isInstalled()){
        setMessage('No iPhone, primeiro adicione o Meu Financeiro à Tela de Início pelo Safari. Depois abra pelo ícone e toque em ativar.');return;
      }
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){setStatus(permission==='denied'?'denied':'off');setMessage('A permissão não foi concedida. Você pode alterá-la nos ajustes do navegador.');return;}
      const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(VAPID_PUBLIC_KEY)});
      const json=subscription.toJSON();
      const keys=json.keys||{};
      const {error}=await supabase.from('push_subscriptions').upsert({
        user_id:session.user.id,
        endpoint:json.endpoint,
        p256dh:keys.p256dh,
        auth:keys.auth,
        device_info:navigator.userAgent.slice(0,500),
        updated_at:new Date().toISOString()
      },{onConflict:'endpoint'});
      if(error)throw error;
      setStatus('enabled');
      setMessage('Notificações ativadas neste aparelho. 🔔');
      onToast?.('Notificações ativadas neste aparelho!');
    }catch(error){
      console.error('Push subscription:',error);
      setMessage(error?.message||'Não foi possível ativar as notificações.');
      setStatus('error');
    }finally{setBusy(false);}
  }

  async function disable(){
    setBusy(true);
    try{
      const registration=await navigator.serviceWorker.getRegistration('/');
      const subscription=await registration?.pushManager.getSubscription();
      if(subscription){
        const endpoint=subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint',endpoint).eq('user_id',session.user.id);
      }
      setStatus('off');setMessage('Notificações desativadas neste aparelho.');
    }catch(error){setMessage(error?.message||'Não foi possível desativar.');}
    finally{setBusy(false);}
  }

  return <div style={{marginBottom:18,padding:16,borderRadius:16,border:'1px solid rgba(132,112,255,.28)',background:'linear-gradient(120deg,rgba(112,83,255,.12),rgba(31,180,207,.07))'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div style={{width:42,height:42,borderRadius:13,display:'grid',placeItems:'center',background:'rgba(132,112,255,.18)',color:'#b9a9ff'}}><BellRing size={21}/></div>
      <div style={{flex:1,minWidth:180}}>
        <b style={{display:'block',color:'var(--text,#f4f5ff)'}}>Notificações no aparelho</b>
        <span style={{display:'block',fontSize:12,opacity:.72,marginTop:3}}>{status==='enabled'?'Este aparelho está inscrito para receber avisos.':status==='denied'?'A permissão foi bloqueada nas configurações.':'Receba avisos importantes mesmo com o site fechado.'}</span>
      </div>
      {status==='enabled'?<button className="delete-btn" disabled={busy} onClick={disable}>Desativar neste aparelho</button>:<button className="primary" disabled={busy||status==='unsupported'||status==='checking'||status==='denied'} onClick={activate}><Smartphone size={16}/>{busy?'Ativando…':'Ativar notificações'}</button>}
    </div>
    {isIos()&&status!=='enabled'&&<p style={{fontSize:12,margin:'12px 0 0',opacity:.78}}>No iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início → abra o ícone criado. O recurso exige iOS 16.4 ou superior.</p>}
    {status==='unsupported'&&<p style={{fontSize:12,margin:'10px 0 0',color:'#f2bd70'}}>Este navegador ou versão do sistema não oferece suporte a notificações push do site. A Central de Notificações do Meu Financeiro continua disponível.</p>}
    {message&&<p role="status" style={{fontSize:12,margin:'10px 0 0',color:status==='error'?'#ff9a9a':'#a8e8c5'}}>{message}</p>}
  </div>;
}
