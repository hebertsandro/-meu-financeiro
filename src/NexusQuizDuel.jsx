import React,{useEffect,useMemo,useRef,useState} from 'react';

const SECONDS=12,PER=5;
function seeded(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export default function NexusQuizDuel({questions,seed,onScore=()=>{},onFinish=()=>{}}){
 const list=useMemo(()=>{const r=seeded(seed),a=[...questions];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,PER)},[questions,seed]);
 const [i,setI]=useState(0),[picked,setPicked]=useState(null),[score,setScore]=useState(0),[left,setLeft]=useState(SECONDS),[done,setDone]=useState(false),[hits,setHits]=useState(0);
 const doneRef=useRef(false),start=useRef(Date.now());
 const q=list[i];
 useEffect(()=>{start.current=Date.now();setLeft(SECONDS);const t=setInterval(()=>{const l=Math.max(0,SECONDS-(Date.now()-start.current)/1000);setLeft(l);if(l<=0){clearInterval(t);answer(-1)}},100);return()=>clearInterval(t)},[i]);// eslint-disable-line
 function finish(total){if(doneRef.current)return;doneRef.current=true;setDone(true);onFinish(total)}
 function answer(idx){
  if(picked!==null||done)return;
  setPicked(idx);
  let total=score;
  if(idx===q.correct){const bonus=Math.round(50*Math.max(0,SECONDS-(Date.now()-start.current)/1000)/SECONDS);total=score+100+bonus;setScore(total);setHits(h=>h+1);onScore(total)}
  setTimeout(()=>{if(i>=list.length-1)finish(total);else{setI(v=>v+1);setPicked(null)}},1200);
 }
 if(!q)return null;
 if(done)return <div className="nxq nxq-done"><b>{score}</b><span>pontos · {hits}/{list.length} acertos</span><small>Aguardando o placar final do duelo…</small></div>;
 return <div className="nxq"><div className="nxq-top"><span>Pergunta {i+1}/{list.length}</span><span>{q.category}</span></div><div className="nxq-timer"><i style={{width:(left/SECONDS*100)+'%'}} className={left<4?'low':''}/></div><h4>{q.question}</h4><div className="nxq-opts">{q.options.map((o,k)=><button type="button" key={k} disabled={picked!==null} className={picked===null?'':k===q.correct?'ok':k===picked?'bad':'dim'} onClick={()=>answer(k)}>{o}</button>)}</div>{picked!==null&&<p className="nxq-exp">{picked===q.correct?'✅ Acertou! ':picked===-1?'⏱️ Tempo esgotado. ':'❌ Errou. '}{q.explanation}</p>}</div>;
}
