import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Play,Pause,X,ArrowLeft,Download,Volume2,VolumeX,CheckCircle2,Clock3,ChevronRight,RotateCcw} from 'lucide-react';
import {EBOOKS,LESSONS} from './mei-content';

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toMd=b=>`# ${b.title}\n_${b.sub}_\n\n`+b.chapters.map((c,i)=>`## ${i+1}. ${c.h}\n\n${c.p.join('\n\n')}`).join('\n\n')+'\n\nMaterial educativo do Meu Financeiro. Não substitui contador nem recomendação de investimento.\n';
const AUDIO='https://daakxwcxgajqzdehybha.supabase.co/storage/v1/object/public/mei-audio';
const canTts=()=>typeof window!=='undefined'&&'speechSynthesis'in window;
const FEM=['Luciana','Francisca','Google português','Google Português','Thalita','Maria','Fernanda','Vitória','Camila'],MAS=['Felipe','Antonio','Antônio','Daniel','Ricardo','Jorge','Eddy','Reed','Rocko','Grandpa','Donato','Marcos'];
const ptVoices=()=>canTts()?window.speechSynthesis.getVoices().filter(x=>/pt[-_]BR/i.test(x.lang)||/portugu/i.test(x.name)):[];
function pickVoice(g='f'){
 if(!canTts())return {v:null,pitch:1};
 const all=ptVoices();
 const pref=store.get('nx-mei-vname','');const chosen=pref&&all.find(v=>v.name===pref);if(chosen)return {v:chosen,pitch:1};
 const rank=v=>/enhanced|premium|aprimorad|natural|neural/i.test(v.name)?0:1;
 const want=g==='m'?MAS:FEM,other=g==='m'?FEM:MAS;
 const named=all.filter(v=>want.some(n=>v.name.includes(n))).sort((x,y)=>rank(x)-rank(y));
 if(named[0])return {v:named[0],pitch:1};
 const neutral=all.filter(v=>!other.some(n=>v.name.includes(n))).sort((x,y)=>rank(x)-rank(y));
 return {v:neutral[0]||all[0]||null,pitch:g==='m'?.7:1.04};
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
 const sc=lesson.scenes,[i,setI]=useState(0),[started,setStarted]=useState(false),[playing,setPlaying]=useState(false),[speaking,setSpeaking]=useState(false),[voiceOn,setVoiceOn]=useState(()=>store.get('nx-mei-voice',true)),[fin,setFin]=useState(false),[pos,setPos]=useState(0),[vErr,setVErr]=useState(false),[tested,setTested]=useState(''),[vg,setVg]=useState(()=>store.get('nx-mei-vg','f')),[rate,setRate]=useState(()=>store.get('nx-mei-rate',1)),[panel,setPanel]=useState(false),[vlist,setVlist]=useState(()=>ptVoices()),[vname,setVname]=useState(()=>store.get('nx-mei-vname',''));
 const R=useRef({i:0,playing:false,voice:voiceOn,timer:null,tick:null,hasB:false}),hasTts=canTts(),aud=useRef(null),standalone=typeof window!=='undefined'&&(window.navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches);
 if(!aud.current&&typeof Audio!=='undefined')aud.current=new Audio();
 R.current.voice=voiceOn;R.current.g=vg;R.current.rate=rate;
 const clear=()=>{clearTimeout(R.current.timer);clearTimeout(R.current.wd);const A=aud.current;if(A){A.onended=A.onerror=A.onplaying=A.ontimeupdate=null;try{A.pause()}catch{}}clearInterval(R.current.tick);if(hasTts&&(window.speechSynthesis.speaking||window.speechSynthesis.pending))window.speechSynthesis.cancel();setSpeaking(false)};
 const go=useCallback((n,autoplay=true)=>{
  clear();
  if(n>=sc.length){setPlaying(false);R.current.playing=false;setFin(true);onDone(lesson.id);return}
  n=Math.max(0,n);R.current.i=n;setI(n);setPos(0);setFin(false);
  if(!autoplay){setPlaying(false);R.current.playing=false;return}
  R.current.playing=true;setPlaying(true);
  const text=sc[n].say,len=text.length,rate=R.current.rate||1,g=R.current.g||'f';
  const after=()=>{if(R.current.playing&&R.current.i===n)R.current.timer=setTimeout(()=>go(n+1),1100)};
  const est=()=>{const t0=Date.now();R.current.hasB=false;R.current.tick=setInterval(()=>{if(!R.current.hasB)setPos(Math.min(len,Math.floor((Date.now()-t0)/1000*14*rate)))},120)};
  const A=aud.current;
  const speakTts=()=>{
  if(R.current.voice&&hasTts){
   const busy=window.speechSynthesis.speaking||window.speechSynthesis.pending;
   const u=new SpeechSynthesisUtterance(text);const pk=pickVoice(g),v=pk.v;if(v)u.voice=v;u.lang=v?.lang||'pt-BR';u.rate=Math.min(1.3,rate*.92);u.pitch=pk.pitch;u.volume=1;R.current.started=false;
   u.onstart=()=>{R.current.started=true;setVErr(false);setSpeaking(true);est()};
   u.onboundary=e=>{if(typeof e.charIndex==='number'){R.current.hasB=true;setPos(e.charIndex)}};
   u.onend=()=>{clearInterval(R.current.tick);setSpeaking(false);setPos(len);if(R.current.playing&&R.current.i===n)go(n+1)};
   u.onerror=e=>{clearInterval(R.current.tick);setSpeaking(false);if(e?.error==='interrupted'||e?.error==='canceled')return;setVErr(true);setPos(len);after()};
   const doSpeak=()=>{try{window.speechSynthesis.resume();window.speechSynthesis.speak(u)}catch{setVErr(true);after()}};
   if(busy){window.speechSynthesis.cancel();R.current.timer=setTimeout(doSpeak,150)}else doSpeak();
   R.current.wd=setTimeout(()=>{if(!R.current.started&&R.current.i===n&&R.current.playing){setVErr(true);est();R.current.timer=setTimeout(()=>{setPos(len);after()},Math.max(4500,len*75))}},3500);
  }else{est();R.current.timer=setTimeout(()=>{clearInterval(R.current.tick);setPos(len);after()},Math.max(4500,len*75))}};
  const maleDev=g==='m'&&ptVoices().some(v=>MAS.some(x=>v.name.includes(x)))||(g==='m'&&!!store.get('nx-mei-vname',''));
  if(R.current.voice&&A&&!maleDev){
   let fell=false;const fall=()=>{if(fell)return;fell=true;A.onended=A.onerror=A.onplaying=A.ontimeupdate=null;speakTts()};
   A.onplaying=()=>{R.current.started=true;setVErr(false);setSpeaking(true)};
   A.ontimeupdate=()=>{if(A.duration>0)setPos(Math.floor(len*A.currentTime/A.duration))};
   A.onended=()=>{setSpeaking(false);setPos(len);if(R.current.playing&&R.current.i===n)go(n+1)};
   A.onerror=fall;A.src=`${AUDIO}/${lesson.id}-${n}-f.mp3`;A.playbackRate=rate;
   const pr=A.play();if(pr&&pr.catch)pr.catch(fall);
  }else speakTts();
 },[sc,lesson.id,onDone,hasTts]);// eslint-disable-line
 useEffect(()=>{let f;if(hasTts){window.speechSynthesis.getVoices();f=()=>setVlist(ptVoices());window.speechSynthesis.addEventListener?.('voiceschanged',f);setTimeout(f,600)}return()=>{R.current.playing=false;clear();if(f)window.speechSynthesis.removeEventListener?.('voiceschanged',f)}},[]);// eslint-disable-line
 const start=()=>{const A=aud.current;if(A){try{A.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';A.play()?.catch(()=>{})}catch{}}setStarted(true);go(0)};
 const chooseG=g=>{setVg(g);store.set('nx-mei-vg',g);setVname('');store.set('nx-mei-vname','')};const chooseV=n=>{setVname(n);store.set('nx-mei-vname',n)};const chooseRate=r=>{setRate(r);store.set('nx-mei-rate',r);if(aud.current)aud.current.playbackRate=r};
 const vpanel=<div className="vpanel"><b>Voz da aula</b><div className="chips"><button type="button" className={vg==='f'?'on':''} onClick={()=>chooseG('f')}>👩 Feminina</button><button type="button" className={vg==='m'?'on':''} onClick={()=>chooseG('m')}>👨 Masculina</button></div>{vlist.length>0&&<><b>Voz do aparelho</b><select className="vsel" value={vname} onChange={e=>chooseV(e.target.value)}><option value="">Automática ({vg==='m'?'masculina':'feminina'})</option>{vlist.map(v=><option key={v.name+v.lang} value={v.name}>{v.name}{/enhanced|premium|aprimorad|natural|neural/i.test(v.name)?' ★ natural':''}</option>)}</select></>}<b>Velocidade</b><div className="chips">{[.9,1,1.15].map(r=><button type="button" key={r} className={rate===r?'on':''} onClick={()=>chooseRate(r)}>{r===1?'Normal':r+'x'}</button>)}</div><small>{vg==='m'&&!vlist.some(v=>MAS.some(n=>v.name.includes(n)))&&vlist.length>0?'Seu aparelho não tem voz masculina instalada; usei a feminina em tom grave. ':''}Para soar bem mais natural no iPhone: Ajustes › Acessibilidade › Conteúdo Falado › Vozes › Português (Brasil) e baixe “Felipe” e “Luciana” na versão Aprimorada. Depois escolha a voz aqui.</small></div>;
 const testVoice=()=>{if(!hasTts){setTested('Seu aparelho não tem voz.');return}setTested('Tocando…');const u=new SpeechSynthesisUtterance('Olá! Esta é a voz das aulas do Nexus.');const pk=pickVoice(vg),v=pk.v;if(v)u.voice=v;u.lang=v?.lang||'pt-BR';u.pitch=pk.pitch;u.rate=rate*.92;u.onend=()=>setTested('Se você ouviu, é só começar a aula.');u.onerror=()=>setTested('Não saiu som. Verifique o volume e o modo silencioso do aparelho.');if(window.speechSynthesis.speaking)window.speechSynthesis.cancel();window.speechSynthesis.speak(u);setTimeout(()=>setTested(t=>t==='Tocando…'?'Sem retorno de áudio. Verifique o volume e o modo silencioso (iPhone: botão lateral).':t),4000)};
 const toggle=()=>{if(R.current.playing){R.current.playing=false;setPlaying(false);clear()}else go(R.current.i)};
 const nav=d=>{const was=R.current.playing;go(R.current.i+d,was)};
 const text=sc[i].say,words=[];let c=0;text.split(/(\s+)/).forEach(w=>{words.push([w,c]);c+=w.length});
 return createPortal(<div className="mei-cine" role="dialog" aria-label={lesson.title}>
  <div className="aur"><i/><i/><i/></div>
  <header><div className="segs">{sc.map((_,k)=><span key={k} className={k<i||fin?'done':k===i?'on':''}/>)}</div>
   <div className="bar"><span className="ttl">{lesson.emoji} {lesson.title}</span><button type="button" onClick={()=>setPanel(p=>!p)} aria-label="Escolher voz" aria-expanded={panel}>🎙️</button>{hasTts&&<button type="button" onClick={()=>{const v=!voiceOn;setVoiceOn(v);store.set('nx-mei-voice',v);if(!v&&hasTts){window.speechSynthesis.cancel();setSpeaking(false)}}} aria-label={voiceOn?'Desligar voz':'Ligar voz'}>{voiceOn?<Volume2 size={20}/>:<VolumeX size={20}/>}</button>}<button type="button" onClick={()=>{R.current.playing=false;clear();onClose()}} aria-label="Fechar"><X size={22}/></button></div></header>
  {!started?<div className="intro"><div className="orb big"><span>{lesson.emoji}</span></div><h2>{lesson.title}</h2><p>{sc.length} cenas · {lesson.min} min · com narração</p><button type="button" className="go" onClick={start}><Play size={22}/> Começar aula</button>{vpanel}{hasTts?<button type="button" className="ghost" onClick={testVoice}><Volume2 size={16}/> Testar voz</button>:<small>Seu aparelho não tem voz. A aula roda com legendas.</small>}{tested&&<small>{tested}</small>}</div>
  :fin?<div className="intro fin"><div className="confetti">{Array.from({length:18},(_,k)=><i key={k} style={{left:(k*5.5+2)+'%',animationDelay:(k%6)*.18+'s',background:['#7c5cff','#2fd2ff','#1fcf8a','#ffb34d','#ff7b95'][k%5]}}/>)}</div><div className="orb big"><span>🎉</span></div><h2>Aula concluída!</h2><p>Você terminou “{lesson.title}”.</p>{next&&<button type="button" className="go" onClick={onNext}>Próxima aula <ChevronRight size={20}/></button>}<button type="button" className="ghost" onClick={()=>{setFin(false);go(0)}}><RotateCcw size={16}/> Ver de novo</button></div>
  :<>{vErr&&voiceOn&&<div className="verr" role="status">🔇 Sem som? Aumente o volume e tire o modo silencioso. No iPhone, o app da tela de início costuma bloquear a voz do aparelho: abra pelo Safari ou use as narrações gravadas. A aula segue com legendas.</div>}<div className="tapL" onClick={()=>nav(-1)}/><div className="tapR" onClick={()=>nav(1)}/>
   {panel&&<div className="vpop">{vpanel}</div>}<main key={i}><div className={'orb'+(speaking?' talk':'')}><span>{lesson.emoji}</span><b/><b/>{speaking&&<div className="wave"><i/><i/><i/><i/><i/></div>}</div><h3>{sc[i].t}</h3><Viz v={sc[i].viz}/></main>
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
