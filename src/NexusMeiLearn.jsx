import React,{useCallback,useEffect,useRef,useState} from 'react';
import {BookOpen,Play,Pause,SkipForward,SkipBack,ArrowLeft,Download,Volume2,VolumeX,CheckCircle2,Clock3} from 'lucide-react';
import {EBOOKS,LESSONS} from './mei-content';

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toMd=b=>`# ${b.title}\n_${b.sub}_\n\n`+b.chapters.map((c,i)=>`## ${i+1}. ${c.h}\n\n${c.p.join('\n\n')}`).join('\n\n')+'\n\n---\nMaterial educativo do Meu Financeiro · Nexus Negócios. Não substitui contador nem recomendação de investimento.\n';

function Viz({v}){
 if(!v)return null;
 if(v.k==='big')return <div className="mei-viz big"><b>{v.v}</b><span>{v.s}</span></div>;
 if(v.k==='steps')return <div className="mei-viz steps">{v.items.map((s,i)=><React.Fragment key={s}><span style={{animationDelay:i*.35+'s'}}>{s}</span>{i<v.items.length-1&&<i>→</i>}</React.Fragment>)}</div>;
 if(v.k==='list')return <ul className="mei-viz list">{v.items.map((s,i)=><li key={s} style={{animationDelay:i*.3+'s'}}>{s}</li>)}</ul>;
 const max=Math.max(...v.items.map(x=>x[1]));
 return <div className="mei-viz bars">{v.items.map(([l,n],i)=><div key={l}><small>{l}</small><em><i style={{width:(n/max*100)+'%',animationDelay:i*.25+'s'}}/></em><b>{n}</b></div>)}</div>;
}

function Lesson({lesson,onBack,onDone}){
 const [i,setI]=useState(0),[playing,setPlaying]=useState(false),[voice,setVoice]=useState(true),tRef=useRef(null);
 const sc=lesson.scenes[i],canTts=typeof window!=='undefined'&&'speechSynthesis'in window;
 const stop=useCallback(()=>{clearTimeout(tRef.current);if(canTts)window.speechSynthesis.cancel()},[canTts]);
 const next=useCallback(()=>setI(x=>{if(x>=lesson.scenes.length-1){setPlaying(false);onDone(lesson.id);return x}return x+1}),[lesson,onDone]);
 useEffect(()=>{
  stop();if(!playing)return;
  const words=sc.say.split(/\s+/).length,fallback=Math.max(5000,words*420);
  if(voice&&canTts){const u=new SpeechSynthesisUtterance(sc.say);u.lang='pt-BR';u.rate=1;u.onend=()=>{tRef.current=setTimeout(next,700)};u.onerror=()=>{tRef.current=setTimeout(next,fallback)};window.speechSynthesis.speak(u)}
  else tRef.current=setTimeout(next,fallback);
  return stop;
 },[i,playing,voice]);// eslint-disable-line
 useEffect(()=>()=>stop(),[stop]);
 return <div className="mei-player"><button type="button" className="mei-back" onClick={()=>{stop();onBack()}}><ArrowLeft size={16}/> Aulas</button>
  <div className="mei-stage" key={i}><small>{lesson.emoji} {lesson.title} · cena {i+1}/{lesson.scenes.length}</small><h3>{sc.t}</h3><Viz v={sc.viz}/><p className="mei-say">{sc.say}</p></div>
  <div className="mei-seg">{lesson.scenes.map((_,k)=><button type="button" key={k} className={k<i?'done':k===i?'on':''} onClick={()=>{setI(k)}} aria-label={'Cena '+(k+1)}/>)}</div>
  <div className="mei-ctl"><button type="button" onClick={()=>setI(x=>Math.max(0,x-1))} aria-label="Anterior"><SkipBack size={20}/></button><button type="button" className="play" onClick={()=>setPlaying(p=>!p)} aria-label={playing?'Pausar':'Reproduzir'}>{playing?<Pause size={24}/>:<Play size={24}/>}</button><button type="button" onClick={()=>setI(x=>Math.min(lesson.scenes.length-1,x+1))} aria-label="Próxima"><SkipForward size={20}/></button>{canTts&&<button type="button" className={voice?'on':''} onClick={()=>setVoice(v=>!v)} aria-label="Narração por voz">{voice?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>}</div>
  {!canTts&&<small className="mei-hint">Seu aparelho não tem narração por voz. A aula avança sozinha pelo tempo de leitura.</small>}</div>;
}

function Ebook({book,onBack,onRead}){
 const [c,setC]=useState(0),ch=book.chapters[c];
 const dl=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([toMd(book)],{type:'text/markdown'}));a.download=book.id+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
 return <div className="mei-ebook"><button type="button" className="mei-back" onClick={onBack}><ArrowLeft size={16}/> E-books</button>
  <header style={{'--g':book.color}}><span>{book.emoji}</span><div><h3>{book.title}</h3><small>{book.sub}</small></div><button type="button" onClick={dl} aria-label="Baixar e-book"><Download size={18}/></button></header>
  <nav>{book.chapters.map((x,k)=><button type="button" key={k} className={k===c?'on':''} onClick={()=>{setC(k);onRead(book.id,k)}}>{k+1}</button>)}</nav>
  <article key={c}><h4>{c+1}. {ch.h}</h4>{ch.p.map((p,k)=><p key={k}>{p}</p>)}</article>
  <div className="mei-pager"><button type="button" disabled={c===0} onClick={()=>setC(c-1)}>← Anterior</button><button type="button" className="pri" onClick={()=>{if(c<book.chapters.length-1){setC(c+1);onRead(book.id,c+1)}else{onRead(book.id,c);onBack()}}}>{c<book.chapters.length-1?'Próximo capítulo →':'Concluir'}</button></div></div>;
}

export default function NexusMeiLearn({userId}){
 const k='nx-mei-learn:'+userId;
 const [sub,setSub]=useState('aulas'),[book,setBook]=useState(null),[lesson,setLesson]=useState(null),[prog,setProg]=useState(()=>store.get(k,{lessons:[],books:{}}));
 const save=p=>{setProg(p);store.set(k,p)};
 const doneLesson=useCallback(id=>setProg(p=>{const n={...p,lessons:[...new Set([...p.lessons,id])]};store.set(k,n);return n}),[k]);
 const read=(id,ch)=>save({...prog,books:{...prog.books,[id]:Math.max(prog.books[id]??-1,ch)}});
 if(lesson)return <Lesson lesson={lesson} onBack={()=>setLesson(null)} onDone={doneLesson}/>;
 if(book)return <Ebook book={book} onBack={()=>setBook(null)} onRead={read}/>;
 const total=LESSONS.length+EBOOKS.length,done=prog.lessons.length+EBOOKS.filter(b=>(prog.books[b.id]??-1)>=b.chapters.length-1).length;
 return <div className="mei-learn">
  <div className="mei-prog"><div><b>Sua trilha</b><small>{done} de {total} concluídos</small></div><em><i style={{width:(done/total*100)+'%'}}/></em></div>
  <div className="mei-sub"><button type="button" className={sub==='aulas'?'on':''} onClick={()=>setSub('aulas')}><Play size={15}/> Videoaulas</button><button type="button" className={sub==='ebooks'?'on':''} onClick={()=>setSub('ebooks')}><BookOpen size={15}/> E-books</button></div>
  {sub==='aulas'?<><p className="mei-note">Videoaulas animadas com narração pela voz do seu aparelho. Toque em ▶ e acompanhe cena por cena.</p><div className="mei-cards">{LESSONS.map(l=><button type="button" key={l.id} className="mei-card" onClick={()=>setLesson(l)}><span className="emoji">{l.emoji}</span><b>{l.title}</b><small><Clock3 size={12}/> {l.min} min · {l.level}</small>{prog.lessons.includes(l.id)&&<i className="ok"><CheckCircle2 size={16}/></i>}</button>)}</div></>
  :<div className="mei-cards">{EBOOKS.map(b=>{const r=(prog.books[b.id]??-1)+1;return <button type="button" key={b.id} className="mei-card book" style={{'--g':b.color}} onClick={()=>setBook(b)}><span className="cover">{b.emoji}</span><b>{b.title}</b><small>{b.sub}</small><small><BookOpen size={12}/> {b.chapters.length} capítulos · {b.level}</small><em><i style={{width:(r/b.chapters.length*100)+'%'}}/></em></button>})}</div>}
 </div>;
}
