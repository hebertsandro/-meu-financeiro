import React,{useMemo,useState} from 'react';
import {Rocket,Brain,Feather,Gem,Shield,Play,Zap,Sparkles,Gamepad2,ChevronRight} from 'lucide-react';

// Biblioteca de jogos NEXUS 2: cards limpos, categorias, "continuar" e progresso de nível.
const GAMES=[
 {key:'space',name:'Space Nexus',desc:'Chefões, combos e ondas infinitas.',cat:'acao',Icon:Rocket,hue:'a',bestKey:'mf_space_best',unit:'pts'},
 {key:'flap',name:'Asas da Fortuna',desc:'Controle o voo e supere o recorde.',cat:'acao',Icon:Feather,hue:'b',bestKey:'mf_flap_best',unit:'pts'},
 {key:'quiz',name:'Quiz Financeiro',desc:'Cinco perguntas, XP a cada acerto.',cat:'conhecimento',Icon:Brain,hue:'c',bestKey:'',unit:''},
 {key:'extra-gems',name:'Gem Match',desc:'Combine gemas e bata a meta.',cat:'logica',Icon:Gem,hue:'d',bestKey:'mf_best_extra-gems',unit:'pts'},
 {key:'extra-defense',name:'Defesa do Cofrinho',desc:'Posicione torres e proteja a base.',cat:'estrategia',Icon:Shield,hue:'e',bestKey:'mf_best_extra-defense',unit:'pts'}
];
const CATS=[['todos','Todos'],['acao','Ação'],['estrategia','Estratégia'],['logica','Lógica'],['conhecimento','Conhecimento']];
const LAST_KEY='mf_last_game';
const read=k=>{try{return window.localStorage.getItem(k)}catch{return null}};
const write=(k,v)=>{try{window.localStorage.setItem(k,v)}catch{}};
const num=v=>Math.max(0,Math.floor(Number(v)||0));

export default function NexusGameLibrary({gameXp=0,onOpen=()=>{}}){
 const [cat,setCat]=useState('todos');
 const xp=num(gameXp),level=Math.floor(xp/500)+1,into=xp%500,pct=Math.round(into/500*100);
 const games=useMemo(()=>GAMES.map(g=>({...g,best:g.bestKey?num(read(g.bestKey)):0})),[]);
 const lastKey=read(LAST_KEY);
 const last=games.find(g=>g.key===lastKey);
 const open=key=>{write(LAST_KEY,key);onOpen(key)};
 const list=games.filter(g=>cat==='todos'||g.cat===cat);
 return <div className="nx2-lib">
  <header className="nx2-lib-head">
   <div className="nx2-lib-title"><span className="nx2-eyebrow">ARCADE NEXUS</span><h2>Jogos</h2></div>
   <div className="nx2-level" aria-label={'Nível '+level+', '+xp+' XP'}>
    <div className="nx2-level-top"><span className="nx2-level-badge"><Zap size={14}/> Nível {level}</span><b>{xp.toLocaleString('pt-BR')} XP</b></div>
    <div className="nx2-bar" role="progressbar" aria-valuemin="0" aria-valuemax="500" aria-valuenow={into}><i style={{width:pct+'%'}}/></div>
    <small>{500-into} XP para o nível {level+1}</small>
   </div>
  </header>
  {last&&<button type="button" className={'nx2-continue hue-'+last.hue} onClick={()=>open(last.key)}>
   <span className="nx2-continue-icon"><last.Icon size={24}/></span>
   <span className="nx2-continue-copy"><small>CONTINUAR JOGANDO</small><b>{last.name}</b><em>{last.best?'Seu recorde: '+last.best.toLocaleString('pt-BR')+' '+last.unit:'Toque para voltar à ação'}</em></span>
   <span className="nx2-continue-go"><Play size={16}/></span>
  </button>}
  <div className="nx2-cats" role="tablist" aria-label="Categorias">{CATS.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={cat===id} className={cat===id?'active':''} onClick={()=>setCat(id)}>{label}</button>)}</div>
  <div className="nx2-grid">
   {list.map(g=>{const isNew=!g.best&&g.key!==lastKey;return <button key={g.key} type="button" className={'nx2-card hue-'+g.hue} onClick={()=>open(g.key)}>
    <span className="nx2-card-art"><g.Icon size={28}/>{isNew&&<em><Sparkles size={11}/> Novo</em>}</span>
    <span className="nx2-card-body"><b>{g.name}</b><small>{g.desc}</small>
     <span className="nx2-card-meta">{g.best?<span>Recorde <b>{g.best.toLocaleString('pt-BR')}</b></span>:<span>{g.bestKey?'Sem recorde ainda':'Rodada diária'}</span>}</span></span>
    <ChevronRight size={18} className="nx2-card-go"/>
   </button>})}
   {!list.length&&<p className="nx2-empty"><Gamepad2 size={20}/> Nenhum jogo nesta categoria ainda.</p>}
  </div>
 </div>;
}
