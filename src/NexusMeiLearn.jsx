import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Play,Pause,X,ArrowLeft,Download,Volume2,VolumeX,CheckCircle2,Clock3,ChevronRight,RotateCcw} from 'lucide-react';
import {EBOOKS,LESSONS} from './mei-content';

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toMd=b=>`# ${b.title}\n_${b.sub}_\n\n`+b.chapters.map((c,i)=>`## ${i+1}. ${c.h}\n\n${c.p.join('\n\n')}`).join('\n\n')+'\n\nMaterial educativo do Meu Financeiro. Não substitui contador nem recomendação de investimento.\n';
const canTts=()=>typeof window!=='undefined'&&'speechSynthesis'in window;
function pickVoice(){
 if(!canTts())return null;
 const all=window.speechSynthesis.getVoices(),v=all.filter(x=>/pt[-_]BR/i.test(x.lang)||/portugu/i.test(x.name));
 for(const p of ['Luciana','Francisca','Google português','Google Português','Thalita','Antonio','Felipe']){const f=v.find(x=>x.name.includes(p));if(f)return f}
 return v[0]||null;
}

function Viz({v}){
 if(!v)return null;
 if(v.k==='big'){return <div className="mei-viz big"><b>{v.v}</b><span>{v.s}</span><i className="shine"/></div>}
 if(v.k==='steps')return <div className="mei-viz steps">{v.items.map((s,i)=><React.Fragment key={s}><span style={{animationDelay:.25+i*.45+'s'}}><em>{i+1}</em>{s}</span>{i<v.items.length-1&&<i style={{animationDelay:.45+i*.45+'s'}}>↓</i>}</React.Fragment>)}</div>;
 if(v.k==='list')return <ul className="mei-viz list">{v.items.map((s,i)=><li key={s} style={{animationDelay:.25+i*.4+'s'}}><span>✓</span>{s}</li>)}</ul>;
 const max=Math.max(...v.items.map(x=>x[1]));
 return <div className="mei-viz bars">{v.items.map(([l,n],i)=><div key={l}><small>{l}</small><em><i style={{width:(n/max*100)+'%',animationDelay:.2+i*.2+'s'}}/></em><b>{n}</b></div>)}</div>;
}

function Player({lesson,next,onClose,onDone,onNext}){
 const sc=lesson.scenes,[i,setI]=useState(0),[started,setStarted]=useState(false),[playing,setPlaying]=useState(false),[speaking,setSpeaking]=useState(false),[voiceOn,setVoiceOn]=useState(()=>store.get('nx-mei-voice',true)),[fin,setFin]=useState(false),[pos,setPos]=useState(0);
 const R=useRef({i:0,playing:false,voice:voiceOn,timer:null,tick:null,hasB:false}),hasTts=canTts();
 R.current.voice=voiceOn;
 const clear=()=>{clearTimeout(R.current.timer);clearInterval(R.current.tick);if(hasTts)window.speechSynthesis.cancel();setSpeaking(false)};
 const go=useCallback((n,autoplay=true)=>{
  clear();
  if(n>=sc.length){setPlaying(false);R.current.playing=false;setFin(true);onDone(lesson.id);return}
  n=Math.max(0,n);R.current.i=n;setI(n);setPos(0);setFin(false);
  if(!autoplay){setPlaying(false);R.current.playing=false;return}
  R.current.playing=true;setPlaying(true);
  const text=sc[n].say,len=text.length,rate=1;
  const after=()=>{if(R.current.playing&&R.current.i===n)R.current.timer=setTimeout(()=>go(n+1),1100)};
  const est=()=>{const t0=Date.now();R.current.hasB=false;R.current.tick=setInterval(()=>{if(!R.current.hasB)setPos(Math.min(len,Math.floor((Date.now()-t0)/1000*14*rate)))},120)};
  if(R.current.voice&&hasTts){
   R.current.started=false;const u=new SpeechSynthesisUtterance(text);const v=pickVoice();if(v)u.voice=v;u.lang='pt-BR';u.rate=rate;u.pitch=1;
   u.onstart=()=>{R.current.started=true;setSpeaking(true);est()};
   u.onboundary=e=>{if(typeof e.charIndex==='number'){R.current.hasB=true;setPos(e.charIndex)}};
   u.onend=()=>{clearInterval(R.current.tick);setSpeaking(false);setPos(len);after()};
   u.onerror=()=>{clearInterval(R.current.tick);setSpeaking(false);setPos(len);after()};
   window.speechSynthesis.speak(u);
   R.current.timer=setTimeout(()=>{if(!R.current.started&&R.current.i===n&&R.current.playing){est();R.current.timer=setTimeout(()=>{setPos(len);after()},Math.max(4000,len*70))}},1500);
  }else{est();R.current.timer=setTimeout(()=>{clearInterval(R.current.tick);setPos(len);after()},Math.max(4500,len*75))}
 },[sc,lesson.id,onDone,hasTts]);// eslint-disable-line
 useEffect(()=>{if(hasTts)window.speechSynthesis.getVoices();return()=>{R.current.playing=false;clear()}},[]);// eslint-disable-line
 const start=()=>{setStarted(true);go(0)};
 const toggle=()=>{if(R.current.playing){R.current.playing=false;setPlaying(false);clear()}else go(R.current.i)};
 const nav=d=>{const was=R.current.playing;go(R.current.i+d,was)};
 const text=sc[i].say,words=[];let c=0;text.split(/(\s+)/).forEach(w=>{words.push([w,c]);c+=w.length});
 return createPortal(<div className="mei-cine" role="dialog" aria-label={lesson.title}>
  <div className="aur"><i/><i/><i/></div>
  <header><div className="segs">{sc.map((_,k)=><span key={k} className={k<i||fin?'done':k===i?'on':''}/>)}</div>
   <div className="bar"><span className="ttl">{lesson.emoji} {lesson.title}</span>{hasTts&&<button type="button" onClick={()=>{const v=!voiceOn;setVoiceOn(v);store.set('nx-mei-voice',v);if(!v&&hasTts){window.speechSynthesis.cancel();setSpeaking(false)}}} aria-label={voiceOn?'Desligar voz':'Ligar voz'}>{voiceOn?<Volume2 size={20}/>:<VolumeX size={20}/>}</button>}<button type="button" onClick={()=>{R.current.playing=false;clear();onClose()}} aria-label="Fechar"><X size={22}/></button></div></header>
  {!started?<div className="intro"><div className="orb big"><span>{lesson.emoji}</span></div><h2>{lesson.title}</h2><p>{sc.length} cenas · {lesson.min} min · com narração</p><button type="button" className="go" onClick={start}><Play size={22}/> Começar aula</button>{!hasTts&&<small>Seu aparelho não tem voz. A aula roda com legendas.</small>}</div>
  :fin?<div className="intro fin"><div className="confetti">{Array.from({length:18},(_,k)=><i key={k} style={{left:(k*5.5+2)+'%',animationDelay:(k%6)*.18+'s',background:['#7c5cff','#2fd2ff','#1fcf8a','#ffb34d','#ff7b95'][k%5]}}/>)}</div><div className="orb big"><span>🎉</span></div><h2>Aula concluída!</h2><p>Você terminou “{lesson.title}”.</p>{next&&<button type="button" className="go" onClick={onNext}>Próxima aula <ChevronRight size={20}/></button>}<button type="button" className="ghost" onClick={()=>{setFin(false);go(0)}}><RotateCcw size={16}/> Ver de novo</button></div>
  :<><div className="tapL" onClick={()=>nav(-1)}/><div className="tapR" onClick={()=>nav(1)}/>
   <main key={i}><div className={'orb'+(speaking?' talk':'')}><span>{lesson.emoji}</span><b/><b/>{speaking&&<div className="wave"><i/><i/><i/><i/><i/></div>}</div><h3>{sc[i].t}</h3><Viz v={sc[i].viz}/></main>
   <footer><p className="cap">{words.map(([w,s],k)=><span key={k} className={s+w.length<=pos?'said':s<=pos?'now':''}>{w}</span>)}</p><div className="ctl"><button type="button" onClick={()=>nav(-1)} aria-label="Cena anterior" disabled={i===0}>‹</button><button type="button" className="play" onClick={toggle} aria-label={playing?'Pausar':'Continuar'}>{playing?<Pause size={26}/>:<Play size={26}/>}</button><button type="button" onClick={()=>nav(1)} aria-label="Próxima cena">›</button></div></footer></>}
 </div>,document.body);
}

function Ebook({book,onBack,onRead}){
 const [c,setC]=useState(0),ch=book.chapters[c];
 const dl=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([toMd(book)],{type:'text/markdown'}));a.download=book.id+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
 return <div className="mei-ebook"><button type="button" className="mei-back" onClick={onBack}><ArrowLeft size={16}/> E-books</button>
  <header style={{'--g':book.color}}><span>{book.emoji}</span><div><h3>{book.title}</h3><small>{book.sub}</small></div><button type="button" onClick={dl} aria-label="Baixar e-book"><Download size={18}/></button></header>
  <nav>{book.chapters.map((x,k)=><button type="button" key={k} className={k===c?'on':''} onClick={()=>{setC(k);onRead(book.id,k)}}>{k+1}</button>)}</nav>
  <article key={c}><h4>{c+1}. {ch.h}</h4>{ch.p.map((p,k)=><p key={k}>{p}</p>)}</article>
  <div className="mei-pager"><button type="button" disabled={c===0} onClick={()=>setC(c-1)}>← Anterior</button><button type="button" className="pri" onClick={()=>{if(c<book.chapters.length-1){setC(c+1);onRead(book.id,c+1)}else{onRead(book.id,c);onBack()}}}>{c<book.chapters.length-1?'Próximo →':'Concluir'}</button></div></div>;
}

export default function NexusMeiLearn({userId}){
 const k='nx-mei-learn:'+userId;
 const [sub,setSub]=useState('aulas'),[book,setBook]=useState(null),[lesson,setLesson]=useState(null),[prog,setProg]=useState(()=>store.get(k,{lessons:[],books:{}}));
 const doneLesson=useCallback(id=>setProg(p=>{const n={...p,lessons:[...new Set([...p.lessons,id])]};store.set(k,n);return n}),[k]);
 const read=(id,ch)=>setProg(p=>{const n={...p,books:{...p.books,[id]:Math.max(p.books[id]??-1,ch)}};store.set(k,n);return n});
 if(book)return <Ebook book={book} onBack={()=>setBook(null)} onRead={read}/>;
 const total=LESSONS.length+EBOOKS.length,done=prog.lessons.length+EBOOKS.filter(b=>(prog.books[b.id]??-1)>=b.chapters.length-1).length;
 const idx=lesson?LESSONS.findIndex(l=>l.id===lesson.id):-1,nextL=idx>=0?LESSONS[idx+1]:null;
 return <div className="mei-learn">
  {lesson&&<Player key={lesson.id} lesson={lesson} next={nextL} onClose={()=>setLesson(null)} onDone={doneLesson} onNext={()=>setLesson(nextL)}/>}
  <div className="mei-prog"><span>Sua trilha · {done}/{total}</span><em><i style={{width:(done/total*100)+'%'}}/></em></div>
  <div className="mei-sub"><button type="button" className={sub==='aulas'?'on':''} onClick={()=>setSub('aulas')}><Play size={14}/> Videoaulas</button><button type="button" className={sub==='ebooks'?'on':''} onClick={()=>setSub('ebooks')}><BookOpen size={14}/> E-books</button></div>
  {sub==='aulas'?<div className="mei-list">{LESSONS.map(l=><button type="button" key={l.id} className="mei-row" onClick={()=>setLesson(l)}><span className="em">{l.emoji}</span><span className="tx"><b>{l.title}</b><small><Clock3 size={11}/> {l.min} min · {l.level}</small></span>{prog.lessons.includes(l.id)?<CheckCircle2 size={20} className="ok"/>:<span className="pl"><Play size={15}/></span>}</button>)}</div>
  :<div className="mei-list">{EBOOKS.map(b=>{const r=(prog.books[b.id]??-1)+1;return <button type="button" key={b.id} className="mei-row" onClick={()=>setBook(b)}><span className="em book" style={{'--g':b.color}}>{b.emoji}</span><span className="tx"><b>{b.title}</b><small><BookOpen size={11}/> {b.chapters.length} capítulos · {r}/{b.chapters.length} lidos</small></span><ChevronRight size={18}/></button>})}</div>}
 </div>;
}
