import {useEffect} from 'react';

const CHECK_EVERY = 30000;

export default function AutoUpdate(){
  useEffect(()=>{
    let stopped=false;
    let timer=null;
    let currentVersion='';
    let pendingVersion='';
    let reloading=false;

    const safeToReload=()=>{
      const el=document.activeElement;
      const typing=el && (
        ['INPUT','TEXTAREA','SELECT'].includes(el.tagName) ||
        el.isContentEditable
      );
      return !typing && document.visibilityState==='visible';
    };

    const applyUpdate=()=>{
      if(stopped || reloading || !pendingVersion || !safeToReload()) return;
      reloading=true;
      try{sessionStorage.setItem('mf-app-version',pendingVersion);}catch{}
      window.location.reload();
    };

    const check=async()=>{
      if(stopped || document.visibilityState!=='visible') return;
      try{
        const response=await fetch('/version.json?check='+Date.now(),{
          cache:'no-store',
          headers:{'Cache-Control':'no-cache'}
        });
        if(!response.ok) return;
        const data=await response.json();
        const next=String(data.version||'');
        if(!next) return;
        if(!currentVersion){
          currentVersion=next;
          let seen='';
          try{seen=sessionStorage.getItem('mf-app-version')||'';}catch{}
          if(!seen){
            try{sessionStorage.setItem('mf-app-version',next);}catch{}
          }else if(seen!==next){
            pendingVersion=next;
          }
          return;
        }
        if(next!==currentVersion){
          pendingVersion=next;
          currentVersion=next;
          applyUpdate();
        }
      }catch{}
    };

    check();
    timer=window.setInterval(check,CHECK_EVERY);
    const onFocus=()=>applyUpdate();
    const onVisibility=()=>{if(document.visibilityState==='visible'){applyUpdate();check();}};
    document.addEventListener('focusout',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      stopped=true;
      if(timer) window.clearInterval(timer);
      document.removeEventListener('focusout',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[]);
  return null;
}
