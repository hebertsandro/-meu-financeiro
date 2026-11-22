import React,{useEffect,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {ShipArt,EnemyArt,BossArt} from './SpaceNexusArt.jsx';

const Foe=React.memo(function Foe({type,x,y,hp,maxHp}){return <div className={'space-enemy '+type} style={{left:x+'%',top:y+'%'}}><EnemyArt type={type}/><i className="space-enemy-hp" style={{width:(hp/maxHp*100)+'%'}}/></div>});
const Bolt=React.memo(function Bolt({x,y,cls}){return <i className={cls} style={{left:x+'%',top:y+'%'}}/>});
export default function SpaceNexusGame({onReward,onMatch,onLoot}){
 const modes={
  easy:{label:'Fácil',waves:10,hp:140,spawn:86,speed:.72,bossHp:1,fire:1.25},
  medium:{label:'Médio',waves:15,hp:110,spawn:72,speed:1,bossHp:1.35,fire:1},
  hard:{label:'Difícil',waves:20,hp:80,spawn:60,speed:1.3,bossHp:1.8,fire:.78},
  infinite:{label:'Infinito',waves:99999,hp:100,spawn:68,speed:1.05,bossHp:1.45,fire:.92}
 };
 const bossRoster=[
  {name:'DEVORADOR ESTELAR',id:'devourer',style:'spread',hp:18,attackEvery:78,description:'Rajada tripla em leque'},
  {name:'GENERAL VORTEX',id:'vortex',style:'cross',hp:22,attackEvery:68,description:'Disparos cruzados e rápidos'},
  {name:'TITÃ NEBULAR',id:'titan',style:'slam',hp:28,attackEvery:92,description:'Onda de energia em área'},
  {name:'RAINHA SINGULAR',id:'queen',style:'aimed',hp:25,attackEvery:58,description:'Mira diretamente na nave'},
  {name:'COLOSSO ÔMEGA',id:'omega',style:'spiral',hp:34,attackEvery:52,description:'Espiral de projéteis'}
 ];
 const [mode,setMode]=useState('medium'),[running,setRunning]=useState(false),[ended,setEnded]=useState(false),[victory,setVictory]=useState(false),[score,setScore]=useState(0),[lives,setLives]=useState(110),[nova,setNova]=useState(0),[ship,setShip]=useState({x:50,y:84}),[shots,setShots]=useState([]),[foes,setFoes]=useState([]),[enemyShots,setEnemyShots]=useState([]),[drops,setDrops]=useState([]),[boss,setBoss]=useState(null),[wave,setWave]=useState(1),[best,setBest]=useState(()=>Number(localStorage.getItem('mf_space_best')||0)),[message,setMessage]=useState('Escolha a dificuldade e prepare sua nave!'),[shieldActive,setShieldActive]=useState(false),[bossesDefeated,setBossesDefeated]=useState(0),[combo,setCombo]=useState(0),[fx,setFx]=useState([]),[hitFx,setHitFx]=useState(0),[buffs,setBuffs]=useState({rapid:false,double:false});const keysRef=React.useRef({});const pausedRef=React.useRef(false);const [paused,setPaused]=useState(false);const togglePause=()=>{pausedRef.current=!pausedRef.current;setPaused(pausedRef.current)};
 const castNova=()=>{const g=game.current;if(!g||g.phase==='finished'||pausedRef.current||(g.nova||0)<100)return;g.nova=0;g.foes.forEach(f=>{g.score+=20;g.killed++;g.fx.push({id:'fxn'+g.tick+f.id,x:f.x,y:f.y,type:'boom',ttl:g.tick+50})});g.foes=[];g.enemyShots=[];if(g.boss)g.boss.hp=Math.max(1,g.boss.hp-Math.ceil(g.boss.max*.18));g.fx.push({id:'fxnw'+g.tick,x:g.ship.x,y:g.ship.y,type:'shockwave',ttl:g.tick+70});setMessage('NOVA! Onda de energia varreu a tela!')};
 const game=React.useRef({});const callbacksRef=React.useRef({onReward,onMatch,onLoot});callbacksRef.current={onReward,onMatch,onLoot};
 const moveTo=(clientX,clientY,arena)=>{const r=arena.getBoundingClientRect();const x=Math.max(5,Math.min(95,(clientX-r.left)/r.width*100));const y=Math.max(9,Math.min(91,(clientY-r.top)/r.height*100));game.current.ship={x,y};setShip({x,y})};
 const finish=(won,g)=>{
  setRunning(false);setEnded(true);setVictory(won);setMessage(won?'GALÁXIA SALVA! CAMPANHA CONCLUÍDA!':'Sua nave foi destruída. A galáxia ainda precisa de você!');
  setBest(old=>{const value=Math.max(old,g.score);localStorage.setItem('mf_space_best',String(value));return value});
  void callbacksRef.current.onMatch?.({gameKey:'space-nexus',score:g.score,xpEarned:Number(g.xpEarned)||0,mode:mode,won,durationSeconds:Math.floor(g.tick/120)});
 };
 const start=()=>{
  const cfg=modes[mode];
  game.current={tick:0,ship:{x:50,y:84},score:0,lives:cfg.hp,nova:0,wave:1,shots:[],foes:[],enemyShots:[],drops:[],boss:null,shield:false,rapidUntil:0,doubleUntil:0,spawned:0,killed:0,bossesDefeated:0,xpEarned:0,phase:'wave',bossAttack:0,mode,combo:0,comboUntil:0,bestCombo:0,invUntil:0,fx:[]};
  setScore(0);setLives(cfg.hp);setNova(0);setShip({x:50,y:84});setShots([]);setFoes([]);setEnemyShots([]);setDrops([]);setBoss(null);setWave(1);setShieldActive(false);setBossesDefeated(0);setCombo(0);setFx([]);setHitFx(0);setBuffs({rapid:false,double:false});pausedRef.current=false;setPaused(false);setVictory(false);setEnded(false);setMessage('O esquadrão alienígena está chegando!');setRunning(true);
 };
 useEffect(()=>{
  if(!running)return;
  const keyTarget=e=>/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'');const onKeyDown=e=>{if(keyTarget(e))return;const k=String(e.key).toLowerCase();if(k==='p'||k==='escape'){togglePause();return}if(k==='q'||k==='e'||k===' '){castNova();e.preventDefault();return}if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(k)){keysRef.current[k]=true;if(k.startsWith('arrow'))e.preventDefault()}};const onKeyUp=e=>{keysRef.current[String(e.key).toLowerCase()]=false};window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);const onVis=()=>{if(document.hidden&&!pausedRef.current){pausedRef.current=true;setPaused(true)}};document.addEventListener('visibilitychange',onVis);
  let raf=0,last=0,accumulator=0;const STEP=1000/120;const frame=(timestamp)=>{raf=requestAnimationFrame(frame);if(pausedRef.current){last=timestamp;accumulator=0;return}if(!last)last=timestamp;const elapsed=Math.min(50,Math.max(0,timestamp-last));last=timestamp;accumulator=Math.min(STEP*4,accumulator+elapsed);let steps=0;while(accumulator>=STEP&&steps<4){accumulator-=1000/120;steps++;
   const g=game.current;if(!g||g.phase==='finished')return;
   g.tick++;const n=g.tick,cfg=modes[g.mode],w=g.wave;
   const kk=keysRef.current;const kx=((kk.arrowright||kk.d)?1:0)-((kk.arrowleft||kk.a)?1:0),ky=((kk.arrowdown||kk.s)?1:0)-((kk.arrowup||kk.w)?1:0);
   if(kx||ky){g.ship={x:Math.max(5,Math.min(95,g.ship.x+kx*.55)),y:Math.max(9,Math.min(91,g.ship.y+ky*.45))}}
   if(g.combo&&n>=g.comboUntil)g.combo=0;
   const baseRate=Math.max(14,Math.round((17*cfg.fire-Math.floor(w/5))*2));const fireRate=n<g.rapidUntil?Math.max(9,Math.round(baseRate*.6)):baseRate;
   if(n%fireRate===0){g.shots.push({id:n+'p',x:g.ship.x,y:g.ship.y-7});if(n<g.doubleUntil){g.shots.push({id:n+'pl',x:g.ship.x-2.5,y:g.ship.y-7},{id:n+'pr',x:g.ship.x+2.5,y:g.ship.y-7})}}
   const bossWave=w%5===0;
   const waveTarget=5+w*2;
   const spawnEvery=Math.max(32,Math.round((cfg.spawn-w*2.8)*2));
   if(!bossWave&&g.spawned<waveTarget&&n%spawnEvery===0&&g.foes.length<Math.min(7,3+Math.ceil(w/3))){
    const roll=Math.random();let type='drone',hp=1;
    if(w>=2&&roll>.73){type='scout';hp=1}
    if(w>=3&&roll>.86){type='brute';hp=2}
    if(w>=6&&roll>.94){type='tank';hp=3}
    if(w>=9&&roll>.975){type='phantom';hp=2}
    if(w>=4&&Math.random()<.09){type='ufo';hp=2}
    if(w>=3&&Math.random()<.08){type='asteroid';hp=3}
    if(w>=5&&Math.random()<.10){type='kamikaze';hp=1}
    if(w>=7&&Math.random()<.08){type='bomber';hp=3}
    g.foes.push({id:n+'e',x:9+Math.random()*82,y:3,hp,maxHp:hp,type,fire:type==='bomber'||(type!=='asteroid'&&type!=='kamikaze'&&Math.random()>(.72-(w*.012))),phase:Math.random()*Math.PI*2});
    g.spawned++;
   }
   g.foes.forEach(f=>{
    const base=f.type==='scout'?.34:f.type==='brute'?.19:f.type==='tank'?.15:f.type==='phantom'?.27:f.type==='ufo'?.21:.23;
    f.y+=base*cfg.speed*Math.min(2.4,1+Math.max(0,w-1)*.10)*.5;
    if(f.type==='kamikaze'){f.y+=.12;if(f.y>18)f.x+=Math.sign(g.ship.x-f.x)*.2}
    if(f.type==='asteroid')f.x=Math.max(4,Math.min(96,f.x+Math.sin(f.phase)*.06));
    if(f.type==='scout'||f.type==='phantom'||f.type==='ufo')f.x+=Math.sin(n*.0225+f.phase)*(f.type==='phantom'?.14:f.type==='ufo'?.2:.08);
   });
   g.shots.forEach(b=>{b.y-=.59});
   g.enemyShots.forEach(b=>{b.x+=(b.vx||0)*.5;b.y+=(b.vy||.58)*.5});
   g.drops.forEach(d=>{d.y+=.09});
   if(!bossWave&&n%Math.max(70,(105-Math.floor(w*2))*2)===0){g.foes.filter(f=>f.fire).slice(-2).forEach((f,i)=>{(f.type==='bomber'?[-.14,0,.14]:[0]).forEach((vx,j)=>g.enemyShots.push({id:'m'+n+f.id+i+j,x:f.x,y:f.y+3,kind:'minion',vx,vy:.48*cfg.speed}))})}
   if(bossWave&&!g.boss&&g.spawned>=0&&g.foes.length===0&&g.phase!=='boss-cleared'){
    const b=bossRoster[(Math.floor((w-1)/5))%bossRoster.length],hp=Math.round((b.hp+w*2)*cfg.bossHp);
    g.boss={...b,hp,max:hp,x:50,y:10,direction:1,attackCount:0};g.phase='boss';g.enemyShots=[];setMessage('CHEFÃO: '+b.name+' — '+b.description+'!');
   }
   if(g.boss){
    const b=g.boss;b.attackCount++;
    const move=b.id==='titan'?.19:b.id==='queen'?.42:.3;
    b.x+=b.direction*move*cfg.speed*.5;
    if(b.x>=79){b.x=79;b.direction=-1}else if(b.x<=21){b.x=21;b.direction=1}
    if(b.id==='queen')b.y=10+Math.sin(n*.035)*3;
    if(b.attackCount%(b.attackEvery*2)===0){
     const push=(x,vx,vy=.62)=>g.enemyShots.push({id:'b'+n+g.enemyShots.length+Math.random(),x:Math.max(2,Math.min(98,x)),y:b.y+9,vx:vx*.5,vy:vy*cfg.speed*.5,kind:'boss'});
     if(b.style==='spread'){[-13,0,13].forEach(dx=>push(b.x+dx,dx*.009,.58))}
     else if(b.style==='cross'){[-.28,0,.28].forEach(vx=>push(b.x,vx,.78));[-.18,.18].forEach(vx=>push(b.x,vx,.55))}
     else if(b.style==='slam'){for(let x=8;x<=92;x+=14)push(x,(x-b.x)*.002,.72)}
     else if(b.style==='aimed'){const dx=(g.ship.x-b.x)*.008;push(b.x,dx,.82);push(b.x-7,dx-.07,.65);push(b.x+7,dx+.07,.65)}
     else {for(let i=0;i<5;i++){const angle=(b.attackCount*.12)+(i*Math.PI*2/5);push(b.x,Math.cos(angle)*.24,.58+Math.sin(angle)*.12)}}
     if(g.enemyShots.length>28)g.enemyShots=g.enemyShots.slice(-28);
    }
   }
   const remainingShots=[];
   for(const shot of g.shots){
    let hit=false;
    for(const foe of g.foes){
     const radius=foe.type==='tank'?7:foe.type==='brute'?6.5:5;
     if(Math.abs(shot.x-foe.x)<radius&&shot.y>=foe.y-4&&shot.y<=foe.y+5){
      foe.hp--;hit=true;
      if(foe.hp<=0){if(g.xpEarned<(g.mode==='infinite'?60:35)){const earned=callbacksRef.current.onReward?.(1,'space-nexus-direct');g.xpEarned+=Number(earned)||0;}void Promise.resolve(callbacksRef.current.onLoot?.('space-nexus','enemy_kill')).then(item=>{if(item){g.drops.push({id:'loot-'+n+'-'+foe.id,type:'loot',icon:item.icon||'💎',x:foe.x,y:foe.y});setDrops([...g.drops]);setMessage('DROP! '+item.icon+' '+item.item_name+' · +'+Number(item.score_value||0).toLocaleString('pt-BR')+' pontos na coleção')}}).catch(()=>{});g.combo=n<(g.comboUntil||0)?(g.combo||0)+1:1;g.comboUntil=n+360;g.bestCombo=Math.max(g.bestCombo||0,g.combo);g.score+=Math.round((foe.type==='bomber'?60:foe.type==='kamikaze'?25:foe.type==='asteroid'?15:foe.type==='tank'?55:foe.type==='brute'?35:foe.type==='phantom'?40:foe.type==='ufo'?30:foe.type==='scout'?20:10)*(1+Math.min(2,Math.floor(g.combo/5)*.5)));g.fx.push({id:'fx'+n+foe.id,x:foe.x,y:foe.y,type:'boom',ttl:n+50});if(foe.type==='ufo'){const r2=Math.random();g.drops.push({id:'ufo-'+n+'-'+foe.id,type:r2<.25?'bomb':r2<.5?'shield':r2<.75?'rapid':'double',x:foe.x,y:foe.y})}g.killed++;g.nova=Math.min(100,(g.nova||0)+5);if(Math.random()<.10){const roll=Math.random();const type=roll<.32?'shield':roll<.60?'rapid':roll<.80?'double':roll<.92?'bomb':'repair';g.drops.push({id:'drop-'+n+'-'+foe.id,type,x:foe.x,y:foe.y})}if(g.killed%4===0&&Math.random()<.72)g.drops.push({id:'coin-'+n+'-'+foe.id,type:'coin',x:foe.x,y:foe.y})}
      break;
     }
    }
    if(!hit&&g.boss&&Math.abs(shot.x-g.boss.x)<18&&shot.y>=g.boss.y-3&&shot.y<=g.boss.y+17){
     g.boss.hp--;hit=true;g.nova=Math.min(100,(g.nova||0)+.6);
     if(g.boss.hp<=0){void Promise.resolve(callbacksRef.current.onLoot?.('space-nexus','boss_kill')).then(item=>{if(item){g.drops.push({id:'loot-boss-'+n,type:'loot',icon:item.icon||'💎',x:g.boss?.x||50,y:g.boss?.y||15});setDrops([...g.drops]);setMessage('DROP DE CHEFÃO! '+item.icon+' '+item.item_name+' · +'+Number(item.score_value||0).toLocaleString('pt-BR')+' pontos na coleção')}}).catch(()=>{});g.score+=300+g.wave*20;g.bossesDefeated++;g.fx.push({id:'fxb'+n,x:g.boss.x,y:g.boss.y,type:'bigboom',ttl:n+100});if(Math.random()<.30){const roll=Math.random();const type=roll<.35?'shield':roll<.68?'rapid':roll<.90?'double':'repair';g.drops.push({id:'boss-drop-'+n,type,x:g.boss.x,y:g.boss.y})}if(Math.random()<.85)g.drops.push({id:'boss-coin-'+n,type:'coin',x:g.boss.x+5,y:g.boss.y});g.boss=null;g.enemyShots=g.enemyShots.filter(s=>s.kind!=='boss');g.phase='boss-cleared';setMessage('CHEFÃO DERROTADO! Recompensa liberada!')}
     else if(g.boss.hp===Math.ceil(g.boss.max*.5))setMessage('FASE 2! O chefão mudou seu padrão de ataque!');
    }
    if(!hit&&shot.y>0)remainingShots.push(shot);
   }
   g.shots=remainingShots;
   const survivors=[];
   for(const foe of g.foes){
    if(foe.hp<=0)continue;
    if(foe.y>=88){g.lives=Math.max(0,g.lives-15);g.combo=0;setHitFx(k=>k+1);setMessage('Invasor atravessou a defesa! -15 de integridade.')}
    else survivors.push(foe);
   }
   g.foes=survivors;
   const remainingDrops=[];
   for(const d of g.drops){
    if(Math.abs(d.x-g.ship.x)<7&&Math.abs(d.y-g.ship.y)<8){
     if(d.type==='coin'){void Promise.resolve(callbacksRef.current.onLoot?.('space-nexus','coin_pickup')).then(result=>{if(result?.coins)setMessage('+'+result.coins+' MOEDAS NEXUS!')}).catch(()=>{});setMessage('MOEDA NEXUS COLETADA!')}else if(d.type==='shield'){g.shield=true;setShieldActive(true);setMessage('ESCUDO COLETADO! O próximo impacto será bloqueado.')}
     else if(d.type==='rapid'){g.rapidUntil=n+750;setMessage('DISPARO RÁPIDO!')}
     else if(d.type==='double'){g.doubleUntil=n+750;setMessage('TIRO DUPLO!')}
     else if(d.type==='repair'){g.lives=Math.min(cfg.hp,g.lives+35);setMessage('REPARO COLETADO! +35 de integridade.')}
    else if(d.type==='bomb'){g.foes.forEach(f=>{g.score+=15;g.killed++;g.fx.push({id:'fxbomb'+n+f.id,x:f.x,y:f.y,type:'boom',ttl:n+50})});g.foes=[];g.enemyShots=g.enemyShots.filter(s=>s.kind==='boss');if(g.boss){g.boss.hp=Math.max(1,g.boss.hp-Math.ceil(g.boss.max*.12))}g.fx.push({id:'fxbombw'+n,x:50,y:50,type:'shockwave',ttl:n+70});setMessage('BOMBA NEXUS! Tela limpa!')}
    }else if(d.y<100)remainingDrops.push(d);
   }
   g.drops=remainingDrops;
   let tookHit=false,dmg=0;
   const enemyRemaining=[];
   for(const shot of g.enemyShots){if(Math.abs(shot.x-g.ship.x)<6&&Math.abs(shot.y-g.ship.y)<7){tookHit=true;dmg=Math.max(dmg,shot.kind==='boss'?24:18)}else if(shot.y<100)enemyRemaining.push(shot)}
   g.enemyShots=enemyRemaining;
   const foeRemaining=[];
   for(const foe of g.foes){if(Math.abs(foe.x-g.ship.x)<7&&Math.abs(foe.y-g.ship.y)<6){tookHit=true;dmg=Math.max(dmg,foe.type==='kamikaze'?40:foe.type==='asteroid'?22:30);g.fx.push({id:'fxr'+n+foe.id,x:foe.x,y:foe.y,type:'boom',ttl:n+50})}else foeRemaining.push(foe)}
   g.foes=foeRemaining;
   if(tookHit&&n<g.invUntil)tookHit=false;
   if(tookHit){g.invUntil=n+150;g.combo=0;setHitFx(k=>k+1);g.fx.push({id:'fxh'+n,x:g.ship.x,y:g.ship.y,type:'boom',ttl:n+50});if(g.shield){g.shield=false;setShieldActive(false);setMessage('Escudo absorveu o impacto!')}else{g.lives=Math.max(0,g.lives-dmg);setMessage('Nave atingida! -'+dmg+' de integridade.')}}
   if(g.lives<=0){g.phase='finished';setScore(g.score);setLives(0);setShots([]);setFoes([...g.foes]);setEnemyShots([...g.enemyShots]);setDrops([...g.drops]);setBoss(null);setFx([]);setCombo(0);finish(false,g);return}
   if(g.phase==='boss-cleared'){
    g.phase='wave';g.wave++;g.spawned=0;g.killed=0;if(g.wave>cfg.waves){g.phase='finished';finish(true,g);return}setWave(g.wave);setMessage('ONDA '+g.wave+' — inimigos mais velozes e resistentes!');
   }else if(!bossWave&&g.spawned>=waveTarget&&g.foes.length===0){
    g.wave++;g.spawned=0;g.killed=0;
    if(g.wave>cfg.waves){g.phase='finished';finish(true,g);return}
    setWave(g.wave);setMessage('ONDA '+g.wave+' — a ameaça está evoluindo!');
   }
   g.fx=g.fx.filter(f=>n<f.ttl);
   {setCombo(g.combo||0);setNova(Math.floor(g.nova||0));setFx([...g.fx]);setBuffs(b=>{const r=n<g.rapidUntil,dd=n<g.doubleUntil;return b.rapid===r&&b.double===dd?b:{rapid:r,double:dd}});setShip(s=>s.x===g.ship.x&&s.y===g.ship.y?s:{...g.ship});setScore(g.score);setLives(g.lives);setShots([...g.shots]);setFoes([...g.foes]);setEnemyShots([...g.enemyShots]);setDrops([...g.drops]);setBoss(g.boss?{...g.boss}:null);setWave(g.wave)}
  }
  };
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);document.removeEventListener('visibilitychange',onVis);keysRef.current={};pausedRef.current=false};
 },[running,mode]);
 return <section className="space-nexus-card">
  {!running&&<div className="space-mode-picker"><b>ESCOLHA O MODO</b><div>{Object.entries(modes).map(([id,m])=><button key={id} type="button" className={mode===id?'active':''} onClick={()=>setMode(id)}><strong>{m.label}</strong><small>{id==='infinite'?'Ondas sem fim · dificuldade crescente':m.waves+' ondas · '+m.hp+' de vida'}</small></button>)}</div></div>}
  <div className="space-nexus-hud"><div className="space-hud-block"><small>SETOR ATUAL</small><span className="space-wave-pill"><i/> ONDA {wave}/{mode==='infinite'?'∞':modes[mode].waves}</span></div><div className="space-score-block"><small>PONTUAÇÃO</small><b>{score.toLocaleString('pt-BR')}</b></div><div className="space-lives-block"><small>INTEGRIDADE</small><span><em className={'space-hp'+(lives<=modes[mode].hp*.3?' low':'')}><i style={{width:Math.max(0,lives/modes[mode].hp*100)+'%'}}/><b>{Math.round(lives)}</b></em></span></div></div>
  <div className="space-nexus-arena" onPointerDown={e=>{if(!running)return;e.currentTarget.setPointerCapture?.(e.pointerId);moveTo(e.clientX,e.clientY,e.currentTarget)}} onPointerMove={e=>{if(!running)return;if(e.pointerType==='touch'||(e.buttons&1))moveTo(e.clientX,e.clientY,e.currentTarget)}}>
   <div className="space-stars"/><div className="space-nebula"/>
   {foes.map(f=><Foe key={f.id} type={f.type} x={f.x} y={f.y} hp={f.hp} maxHp={f.maxHp}/>)}
   {enemyShots.map(b=><Bolt key={b.id} x={b.x} y={b.y} cls={'space-enemy-shot '+(b.kind==='boss'?'boss-shot':'')}/>)}
   {drops.map(d=><div key={d.id} className={'space-drop space-drop-'+d.type} style={{left:d.x+'%',top:d.y+'%'}}><span>{d.type==='loot'?(d.icon||'💎'):d.type==='coin'?'🪙':d.type==='shield'?'S':d.type==='rapid'?'R':d.type==='double'?'×2':d.type==='bomb'?'B':'+'}</span></div>)}
   {shots.map(b=><Bolt key={b.id} x={b.x} y={b.y} cls="space-player-shot"/>)}
   {boss&&<div className={'space-boss boss-'+boss.id+' '+(boss.hp<=boss.max*.5?'phase-two':'')} style={{left:boss.x+'%',top:boss.y+'%'}}><BossArt id={boss.id}/><b>{boss.name}</b><small>{boss.hp<=boss.max*.5?'FASE 2 · FÚRIA MÁXIMA':boss.description}</small><i><em style={{width:(boss.hp/boss.max*100)+'%'}}/></i></div>}
   {fx.map(f=><i key={f.id} className={'space-fx '+f.type} style={{left:f.x+'%',top:f.y+'%'}}/>)}
   <div className={'space-player-ship '+(shieldActive?'shielded':'')} style={{left:ship.x+'%',top:ship.y+'%'}}><ShipArt/></div>
   {hitFx>0&&<i key={'hit'+hitFx} className="space-hit-flash"/>}
   {running&&<div key={'wv'+wave} className="space-wave-banner">{wave%5===0?'ALERTA DE CHEFÃO!':'ONDA '+wave}</div>}
   {running&&(buffs.rapid||buffs.double)&&<div className="space-buffs">{buffs.rapid&&<span>⚡ TIRO RÁPIDO</span>}{buffs.double&&<span>✨ TIRO DUPLO</span>}</div>}
   {running&&paused&&<div className="space-overlay space-pause"><h3>PAUSADO</h3><p>Respire e volte quando quiser.</p><button className="primary" onClick={togglePause}>Continuar <ChevronRight size={17}/></button></div>}
   {running&&combo>=3&&<div className="space-combo"><small>COMBO</small><b>{combo}</b><em>×{(1+Math.min(2,Math.floor(combo/5)*.5)).toFixed(1)}</em></div>}
   {!running&&<div className="space-overlay"><div className="space-overlay-icon"><span className="space-overlay-orbit"/></div><h3>{ended?(victory?'CAMPANHA CONCLUÍDA':'MISSÃO ENCERRADA'):'SPACE NEXUS'}</h3><p>{ended?'Pontuação: '+score+' · Chefões derrotados: '+bossesDefeated+' · Recorde: '+best:message}</p>{ended&&<small className="space-result-medal">{victory?'🏅 Medalha de campeão conquistada!':'Continue treinando para conquistar a medalha.'}</small>}<button className="primary" onClick={start}>{ended?'Jogar novamente':'Iniciar missão'} <ChevronRight size={17}/></button></div>}
  </div>
  <div className="space-nexus-controls"><span>ARRASTE A NAVE (OU SETAS / WASD) · Q NOVA · P PAUSA</span>{running&&<button type="button" className={'space-pause-btn space-nova-btn'+(nova>=100?' ready':'')} disabled={nova<100} onClick={castNova}>✦ NOVA {nova}%</button>}{running&&<button type="button" className="space-pause-btn" onClick={togglePause}>{paused?'▶ CONTINUAR':'❚❚ PAUSAR'}</button>}</div>
  <div className="space-nexus-footer"><span>Recorde: {best}</span><span>Disparo automático</span><span>Escudo: {shieldActive?'ativo':'aguardando coleta'}</span><span>Chefões derrotados: {bossesDefeated}</span></div>
 </section>
}
