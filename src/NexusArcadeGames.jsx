import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Shield,Heart,Timer,Coins,ArrowLeft,ArrowRight,Zap,RefreshCw,Trophy,Swords,Footprints} from 'lucide-react';

const CONFIG={
 'extra-dungeon':{title:'Dungeon Rush',icon:'⚔️',tag:'AVENTURA · MASMORRA',desc:'Explore corredores, enfrente criaturas e encontre a saída.',mode:'dungeon'},
 'extra-gems':{title:'Gem Match',icon:'💎',tag:'PUZZLE · COMBINAÇÃO',desc:'Faça combinações, provoque cascatas e aumente seus combos.',mode:'gems'},
 'extra-race':{title:'Corrida do Dinheiro',icon:'🏁',tag:'ENDLESS RUNNER · CORRIDA',desc:'Corra pela cidade, pule, deslize e troque de pista para sobreviver.',mode:'race'},
 'extra-defense':{title:'Defesa do Cofrinho',icon:'🏰',tag:'DEFESA · PRECISÃO',desc:'Proteja seu cofrinho tocando nos invasores antes que cheguem.',mode:'defense'}
};
const PALETTE=['#48d9ff','#a78bfa','#ff6fae','#ffd166','#65e6a7',' #ff875d'];
const cleanPalette=PALETTE.map(x=>x.trim());
const randomBoard=()=>Array.from({length:64},()=>Math.floor(Math.random()*5));
const findMatches=board=>{
 const found=new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const i=r*8+c,v=board[i];if(v==null)continue;
  if(c<6&&board[i+1]===v&&board[i+2]===v){let k=c;while(k<8&&board[r*8+k]===v)found.add(r*8+k++);}
  if(r<6&&board[i+8]===v&&board[i+16]===v){let k=r;while(k<8&&board[k*8+c]===v)found.add(k++*8+c);}
 }
 return found;
};
const adjacency=(a,b)=>Math.abs(a-b)===8||(Math.abs(a-b)===1&&Math.floor(a/8)===Math.floor(b/8));
const STYLE=`
.nax-game{--cyan:#63e9ff;--violet:#9d83ff;position:relative;display:grid;gap:15px;padding:clamp(12px,3vw,22px);overflow:hidden;color:#f3f6ff;border:1px solid #8195ff35;border-radius:25px;background:radial-gradient(ellipse at 12% 0%,#3e5aff27,transparent 38%),radial-gradient(ellipse at 95% 65%,#8d3dff1c,transparent 35%),linear-gradient(150deg,#101a31,#080d19 70%,#111329);box-shadow:0 20px 55px #02061199,inset 0 1px #ffffff13}
.nax-game *{box-sizing:border-box}.nax-game-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:13px;border-bottom:1px solid #9baaff20}.nax-game-head>div:first-child>span{font-size:9px;font-weight:900;letter-spacing:1.6px;color:#bcb1ff}.nax-game-head h3{margin:5px 0;font-size:clamp(20px,4vw,27px);letter-spacing:-.7px}.nax-game-head p{margin:0;color:#9eacc6;font-size:12px;line-height:1.5}.nax-score{min-width:84px;padding:9px 12px;text-align:right;border:1px solid #9a86ff55;border-radius:13px;background:#8e7bff19}.nax-score small{display:block;color:#b6a9ff;font-size:8px;letter-spacing:1px}.nax-score b{font-size:23px;font-variant-numeric:tabular-nums}
.nax-hud{display:flex;flex-wrap:wrap;gap:7px}.nax-hud span{display:flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid #819acb28;border-radius:10px;background:#17243a;color:#d4def1;font-size:10px}.nax-hud svg{color:#91a9ff}
.nax-start,.nax-result{min-height:245px;display:grid;align-content:center;justify-items:center;text-align:center;padding:25px 16px;border:1px solid #8e87ff55;border-radius:19px;background:radial-gradient(ellipse at 50% 0%,#6554c43b,transparent 60%),#101a2c}.nax-start-orb{display:grid;place-items:center;width:78px;height:78px;border-radius:25px;background:linear-gradient(145deg,#8c6aff,#167dba);font-size:40px;box-shadow:0 0 40px #7e67ff77;animation:nax-float 2.8s ease-in-out infinite}.nax-start h4{margin:14px 0 3px;font-size:19px}.nax-start p,.nax-result p{max-width:440px;color:#aab7cd;font-size:12px;line-height:1.7}.nax-start button,.nax-result button{display:flex;align-items:center;gap:8px;margin-top:9px;padding:13px 21px;border:1px solid #ffffff55;border-radius:12px;background:linear-gradient(110deg,#795fff,#298acb);color:#fff;font-size:10px;font-weight:950;letter-spacing:1px;box-shadow:0 8px 24px #4964d955}
.nax-game-foot{display:flex;align-items:center;gap:7px;padding-top:10px;border-top:1px solid #8293b522;color:#71819b;font-size:9px}
.nax-arena{position:relative;min-height:390px;overflow:hidden;border:1px solid #8197c94d;border-radius:19px;background:#080f20;isolation:isolate;touch-action:pan-y}
.nax-dungeon-scene{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 40%,#7251a7 0,#282448 28%,#101a2b 70%)}
.nax-dungeon-scene:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#090e1c 0 9%,transparent 9% 91%,#090e1c 91%),repeating-linear-gradient(0deg,transparent 0 44px,#a38bd322 45px),linear-gradient(180deg,#11182a,#29213f 55%,#080d18)}
.nax-corridor-wall{position:absolute;top:0;bottom:0;width:34%;background:linear-gradient(90deg,#090f1e,#4a3c65 45%,#171b32);border:2px solid #9e8bd044;box-shadow:inset 0 0 35px #000b}.nax-corridor-wall.left{left:0;clip-path:polygon(0 0,100% 18%,100% 82%,0 100%)}.nax-corridor-wall.right{right:0;clip-path:polygon(0 18%,100% 0,100% 100%,0 82%)}.nax-corridor-floor{position:absolute;left:12%;right:12%;bottom:-3%;height:55%;background:linear-gradient(180deg,#403451,#171a2a 75%);clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);border-top:2px solid #b49aff55}.nax-floor-lines{position:absolute;left:50%;bottom:0;width:2px;height:56%;background:linear-gradient(transparent,#b9a1ff99);transform-origin:bottom;box-shadow:0 0 20px #b49aff}.nax-torch{position:absolute;top:24%;font-size:26px;filter:drop-shadow(0 0 16px #ffad53);animation:nax-flicker .25s infinite alternate}.nax-torch.l{left:17%}.nax-torch.r{right:17%}.nax-dungeon-top{position:absolute;top:13px;left:0;right:0;text-align:center;color:#d5c8ff;font-size:10px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 10px #000}.nax-dungeon-foe{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%);font-size:clamp(48px,10vw,76px);filter:drop-shadow(0 0 18px #ff557b);animation:nax-foe-bob .8s infinite alternate}.nax-dungeon-foe.hit{animation:nax-hit .25s}.nax-dungeon-hero{position:absolute;z-index:3;left:50%;bottom:8%;transform:translateX(-50%);font-size:clamp(54px,11vw,78px);filter:drop-shadow(0 0 17px #61dfff);animation:nax-hero-breathe 1.2s infinite alternate}.nax-dungeon-hero.guard{filter:drop-shadow(0 0 24px #4aeaff)}.nax-dungeon-message{position:absolute;z-index:4;left:50%;top:27%;transform:translateX(-50%);padding:7px 12px;border:1px solid #ffffff33;border-radius:99px;background:#090d20cc;color:#fff;font-size:10px;white-space:nowrap}.nax-dungeon-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.nax-dungeon-actions button,.nax-race-controls button{min-height:46px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #788dff66;border-radius:12px;background:linear-gradient(145deg,#25335b,#141d36);color:white;font-size:10px;font-weight:900}
.nax-race-stage{position:relative;height:430px;overflow:hidden;border:1px solid #75dfff55;border-radius:19px;background:linear-gradient(#132a50,#3976a0 48%,#17243d 49%,#090e1c);perspective:600px;touch-action:none}.nax-sun{position:absolute;top:8%;left:50%;width:95px;height:95px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,#fff3bd,#ffb95a88 55%,transparent 72%);filter:blur(2px)}.nax-city{position:absolute;left:0;right:0;top:24%;height:32%;background:linear-gradient(90deg,#14233c 0 8%,transparent 8% 13%,#1c3150 13% 23%,transparent 23% 30%,#162942 30% 41%,transparent 41% 50%,#203a5a 50% 60%,transparent 60% 68%,#152841 68% 81%,transparent 81% 88%,#1c3150 88%);clip-path:polygon(0 45%,5% 45%,5% 10%,14% 10%,14% 35%,23% 35%,23% 0,31% 0,31% 40%,41% 40%,41% 18%,51% 18%,51% 44%,62% 44%,62% 5%,72% 5%,72% 38%,82% 38%,82% 13%,92% 13%,92% 43%,100% 43%,100% 100%,0 100%)}.nax-road{position:absolute;left:12%;right:12%;top:36%;bottom:-8%;transform:rotateX(22deg);transform-origin:top;background:linear-gradient(90deg,#252d3d,#353d4c 50%,#252d3d);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);box-shadow:0 0 45px #050812}.nax-road:before,.nax-road:after{content:"";position:absolute;top:0;bottom:0;width:4px;background:repeating-linear-gradient(180deg,#e7e7e7 0 35px,transparent 35px 70px);opacity:.7}.nax-road:before{left:37%}.nax-road:after{right:37%}.nax-road-stripes{position:absolute;left:50%;top:38%;bottom:0;width:4px;background:repeating-linear-gradient(180deg,#ffeaa4 0 30px,transparent 30px 65px);animation:nax-road-move .35s linear infinite}.nax-run-obstacle{position:absolute;z-index:3;transform:translate(-50%,-50%);font-size:clamp(24px,6vw,38px);filter:drop-shadow(0 5px 5px #0009)}.nax-run-player{position:absolute;z-index:4;bottom:8%;font-size:clamp(44px,10vw,64px);transform:translateX(-50%);filter:drop-shadow(0 7px 5px #0009);transition:left .13s,transform .12s;animation:nax-run-bob .22s infinite alternate}.nax-run-player.jump{transform:translate(-50%,-65%) scale(1.1)}.nax-run-player.slide{transform:translateX(-50%) scaleY(.58) scaleX(1.12);transform-origin:bottom}.nax-race-controls{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.nax-race-controls button{min-height:43px;font-size:10px}.nax-race-controls button.action{background:linear-gradient(145deg,#365b82,#182b47);border-color:#6deaff77}
.nax-gem-wrap{display:grid;grid-template-columns:1fr minmax(0,390px) 1fr;gap:10px;align-items:center}.nax-gem-side{display:grid;gap:10px}.nax-gem-stat{padding:12px 8px;text-align:center;border:1px solid #8d83ff44;border-radius:13px;background:#171e38}.nax-gem-stat small{display:block;color:#a99fff;font-size:8px;letter-spacing:1px}.nax-gem-stat b{font-size:20px}.nax-gem-board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:5px;padding:9px;border:1px solid #8c8cff55;border-radius:17px;background:linear-gradient(145deg,#121b33,#080f20);box-shadow:0 14px 35px #0008}.nax-gem-board button{position:relative;aspect-ratio:1;min-width:0;border:1px solid #ffffff26;border-radius:10px;background:radial-gradient(circle at 35% 25%,#ffffff44,transparent 35%),linear-gradient(145deg,color-mix(in srgb,var(--gem),white 20%),var(--gem) 55%,color-mix(in srgb,var(--gem),black 35%));box-shadow:inset 0 2px 4px #ffffff44,inset 0 -5px 9px #0005,0 4px 8px #0007;transition:transform .16s,filter .16s;animation:nax-gem-in .22s both}.nax-gem-board button:before{content:"";position:absolute;inset:18%;border:1px solid #ffffff66;border-radius:40% 12% 40% 12%;transform:rotate(45deg)}.nax-gem-board button.selected{transform:scale(.82);outline:3px solid white;filter:brightness(1.35);z-index:2}.nax-gem-board button.matched{animation:nax-gem-pop .34s ease-out forwards}.nax-gem-board button:active{transform:scale(.86)}.nax-gem-help{text-align:center;color:#9eacc6;font-size:10px}.nax-combo{min-height:20px;text-align:center;color:#ffe28b;font-weight:950;font-size:13px;letter-spacing:2px;text-shadow:0 0 15px #ffb84d}
.nax-defense{min-height:310px;display:grid;align-content:space-between;padding:18px;border:1px solid #8c7aff55;border-radius:18px;background:radial-gradient(ellipse at 50% 100%,#50366c,#10192c 65%)}.nax-castle{display:grid;justify-items:center;font-size:64px;filter:drop-shadow(0 0 16px #a88cff)}.nax-castle small{font-size:9px;color:#d5c8ff;letter-spacing:1px}.nax-enemies{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;min-height:90px;align-items:center}.nax-enemies button{justify-self:center;width:54px;height:54px;border:1px solid #a68aff;border-radius:15px;background:#372d5d;font-size:26px;animation:nax-float .8s infinite alternate}
@keyframes nax-float{to{transform:translateY(-7px)}}@keyframes nax-flicker{to{filter:drop-shadow(0 0 23px #ffdd8a);transform:scale(1.08)}}@keyframes nax-foe-bob{to{transform:translate(-50%,-57%) rotate(3deg)}}@keyframes nax-hero-breathe{to{transform:translateX(-50%) translateY(-4px)}}@keyframes nax-hit{50%{filter:brightness(3);transform:translate(-50%,-50%) scale(1.3)}}@keyframes nax-road-move{to{background-position-y:65px}}@keyframes nax-run-bob{to{margin-bottom:5px}}@keyframes nax-gem-in{from{transform:scale(.4);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes nax-gem-pop{to{transform:scale(0);opacity:0;filter:brightness(3)}}@media(max-width:560px){.nax-arena{min-height:350px}.nax-race-stage{height:390px}.nax-gem-wrap{grid-template-columns:1fr}.nax-gem-side{grid-template-columns:repeat(3,1fr);order:2}.nax-gem-board{gap:4px;padding:6px}.nax-gem-board button{border-radius:7px}.nax-dungeon-actions{gap:5px}.nax-dungeon-actions button{font-size:9px;padding:5px}.nax-race-controls{grid-template-columns:repeat(4,1fr);gap:5px}.nax-race-controls button{font-size:9px;padding:4px}}
@media(prefers-reduced-motion:reduce){.nax-game *{animation:none!important;transition:none!important}}
`;
export default function NexusArcadeGames({gameKey,onReward=()=>{},onMatch=()=>{},onLoot=()=>{},skills=[]}){
 const cfg=CONFIG[gameKey],extraHeart=skills.includes('extra-heart'),coinBoost=skills.includes('coin-boost');
 const [started,setStarted]=useState(false),[finished,setFinished]=useState(false),[score,setScore]=useState(0),[elapsed,setElapsed]=useState(0),[result,setResult]=useState('');
 const [hearts,setHearts]=useState(extraHeart?4:3);
 const [room,setRoom]=useState(1),[enemyHp,setEnemyHp]=useState(3),[guard,setGuard]=useState(false),[dungeonMsg,setDungeonMsg]=useState('Um guardião bloqueia a passagem!');
 const [lane,setLane]=useState(1),[obstacles,setObstacles]=useState([]),[move,setMove]=useState('run'),[distance,setDistance]=useState(0);
 const [gems,setGems]=useState(randomBoard),[selected,setSelected]=useState(null),[combo,setCombo]=useState(0),[moves,setMoves]=useState(24),[matched,setMatched]=useState([]);
 const [targets,setTargets]=useState([]);
 const touchStart=useRef(null),lastSpawn=useRef(0),gameRef=useRef(null),scoreRef=useRef(score),elapsedRef=useRef(elapsed);
 useEffect(()=>{scoreRef.current=score},[score]);
 useEffect(()=>{elapsedRef.current=elapsed},[elapsed]);
 const finish=useCallback((finalScore,won,mode)=>{
  if(gameRef.current?.done)return; if(gameRef.current)gameRef.current.done=true;
  setFinished(true);setStarted(false);setScore(finalScore);setResult(won?'MISSÃO CONCLUÍDA':'FIM DE JOGO');
  const xp=Math.min(100,Math.max(0,Math.floor(finalScore*.25)));
  onReward(finalScore,gameKey);onMatch({gameKey,score:finalScore,xpEarned:xp,mode,won:!!won&&finalScore>=10,durationSeconds:elapsedRef.current});
  if(finalScore>=25)void onLoot(gameKey,'coin_pickup');
 },[gameKey,onMatch,onReward,onLoot]);
 const start=()=>{
  gameRef.current={done:false};setStarted(true);setFinished(false);setScore(0);setElapsed(0);setHearts(extraHeart?4:3);setResult('');
  setRoom(1);setEnemyHp(3);setGuard(false);setDungeonMsg('Um guardião bloqueia a passagem!');
  setLane(1);setObstacles([]);setMove('run');setDistance(0);lastSpawn.current=0;
  setGems(randomBoard());setSelected(null);setCombo(0);setMoves(24);setMatched([]);setTargets([]);
 };
 const loseLife=()=>{
  setHearts(v=>{if(v<=1){finish(scoreRef.current,false,cfg.mode);return 0}return v-1});
 };
 useEffect(()=>{
  if(!started||!['race','dungeon','defense'].includes(cfg.mode))return;
  const timer=window.setInterval(()=>{
   setElapsed(v=>v+1);
   if(cfg.mode==='race'){
    setDistance(v=>v+1);
    setObstacles(old=>{
     const next=old.map(o=>({...o,y:o.y+7})).filter(o=>o.y<112);
     if(Math.random()<.48)next.push({id:Math.random(),lane:Math.floor(Math.random()*3),y:-8,type:Math.random()<.26?'coin':Math.random()<.55?'barrier':'cart'});
     return next;
    });
    lastSpawn.current++;
    setScore(v=>v+1);
   }
   if(cfg.mode==='defense')setTargets(old=>{
    const next=old.map(t=>({...t,life:t.life-1})).filter(t=>t.life>0);
    if(old.some(t=>t.life<=1))loseLife();
    if(Math.random()<.68)next.push({id:Math.random(),life:5+Math.floor(Math.random()*4),lane:Math.floor(Math.random()*3)});
    return next;
   });
  },cfg.mode==='race'?480:1000);
  return()=>window.clearInterval(timer);
 },[started,cfg.mode]);
 useEffect(()=>{
  if(!started||cfg.mode!=='race')return;
  const collision=obstacles.find(o=>o.lane===lane&&o.y>72&&o.y<105);
  if(!collision)return;
  setObstacles(old=>old.filter(o=>o.id!==collision.id));
  if(collision.type==='coin'){setScore(v=>v+10*(coinBoost?2:1));void onLoot(gameKey,'coin_pickup')}
  else if(move==='jump'||move==='slide'){setScore(v=>v+5)}
  else loseLife();
 },[obstacles,lane,started,cfg.mode,move]);
 useEffect(()=>{if(started&&cfg.mode==='race'&&elapsed>=45)finish(score,true,'runner-45s')},[elapsed,started,cfg.mode,score,finish]);
 useEffect(()=>{if(started&&cfg.mode==='defense'&&elapsed>=30)finish(score,true,'defesa-30s')},[elapsed,started,cfg.mode,score,finish]);
 useEffect(()=>{if(!started||cfg.mode!=='race')return;const t=window.setTimeout(()=>setMove('run'),650);return()=>window.clearTimeout(t)},[move,started,cfg.mode]);
 const dungeonAction=action=>{
  if(!started)return;
  if(action==='guard'){setGuard(true);setDungeonMsg('Você ergueu o escudo!');return}
  if(action==='attack'){
   if(enemyHp<=0)return;
   if(guard){setGuard(false);setDungeonMsg('O ataque foi bloqueado!');return}
   const hp=enemyHp-1;setEnemyHp(hp);setScore(v=>v+8);
   if(hp<=0){setDungeonMsg('Guardião derrotado! Corredor liberado.');setTimeout(()=>{
    setRoom(v=>{if(v>=6){finish(score+48,true,'dungeon-7-salas');return v}setEnemyHp(2+Math.floor(Math.random()*3));setDungeonMsg('Uma nova criatura apareceu!');return v+1});
   },450)}else setDungeonMsg('Acertou! Mais '+hp+' golpes para vencer.');
  }
  if(action==='dodge'){setGuard(false);setDungeonMsg('Você desviou para o lado!');setScore(v=>v+3)}
 };
 const swapGem=index=>{
  if(!started||moves<=0||matched.length)return;
  if(selected===null){setSelected(index);return}
  if(selected===index){setSelected(null);return}
  if(!adjacency(selected,index)){setSelected(index);return}
  const next=[...gems];[next[selected],next[index]]=[next[index],next[selected]];
  const hits=findMatches(next);setSelected(null);
  if(!hits.size){setGems(gems);return}
  setMoves(v=>v-1);setMatched([...hits]);setCombo(v=>v+1);
  const points=hits.size*10*(coinBoost?2:1),nextScore=score+points;setScore(nextScore);
  if(nextScore>=600){window.setTimeout(()=>finish(nextScore,true,'gem-match-600'),360);return}
  window.setTimeout(()=>{
   const board=[...next];hits.forEach(i=>board[i]=null);
   for(let c=0;c<8;c++){let write=7;for(let r=7;r>=0;r--){const val=board[r*8+c];if(val!==null){board[write*8+c]=val;if(write!==r)board[r*8+c]=null;write--}}for(let r=write;r>=0;r--)board[r*8+c]=Math.floor(Math.random()*5)}
   setGems(board);setMatched([]);
   if(moves<=1){finish(nextScore,false,'gem-match-moves');return}
   const cascade=findMatches(board);
   if(cascade.size){setMatched([...cascade]);setScore(v=>v+cascade.size*15);window.setTimeout(()=>{const b=[...board];cascade.forEach(i=>b[i]=Math.floor(Math.random()*5));setGems(b);setMatched([])},300)}
  },320);
 };
 const raceKey=key=>{
  if(!started||cfg.mode!=='race')return;
  if(key==='left')setLane(v=>Math.max(0,v-1));
  if(key==='right')setLane(v=>Math.min(2,v+1));
  if(key==='jump'||key==='slide')setMove(key);
 };
 useEffect(()=>{
  if(!started||cfg.mode!=='race')return;
  const handler=e=>{if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();raceKey('left')}if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();raceKey('right')}if(['ArrowUp',' ','w','W'].includes(e.key)){e.preventDefault();raceKey('jump')}if(['ArrowDown','s','S'].includes(e.key)){e.preventDefault();raceKey('slide')}};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[started,cfg.mode]);
 const tapTarget=id=>{setTargets(old=>old.filter(t=>t.id!==id));setScore(v=>v+10)};
 if(!cfg)return null;
 return <section className="nax-game">
  <style>{STYLE}</style>
  <header className="nax-game-head"><div><span>{cfg.tag}</span><h3>{cfg.icon} {cfg.title}</h3><p>{cfg.desc}</p></div><div className="nax-score"><small>PONTUAÇÃO</small><b>{score.toLocaleString('pt-BR')}</b></div></header>
  <div className="nax-hud"><span><Heart size={15}/> {hearts} vidas</span><span><Timer size={15}/> {cfg.mode==='race'?Math.max(0,45-elapsed)+'s':cfg.mode==='defense'?Math.max(0,30-elapsed)+'s':cfg.mode==='dungeon'?'Sala '+room+'/7':moves+' jogadas'}</span><span><Coins size={15}/> {coinBoost?'Bônus de moedas ativo':'Recompensas por desempenho'}</span></div>
  {!started&&!finished&&<div className="nax-start"><div className="nax-start-orb">{cfg.icon}</div><h4>Preparado para jogar?</h4><p>{cfg.mode==='dungeon'?'Explore sete salas. Ataque o guardião, defenda-se e desvie dos golpes para avançar.':cfg.mode==='gems'?'Troque gemas vizinhas. Faça combinações de 3 ou mais e provoque cascatas em 24 jogadas.':cfg.mode==='race'?'Desvie nas três pistas, pule barreiras e deslize por baixo dos obstáculos. Sobreviva por 45 segundos.':'Toque nos invasores antes que alcancem o cofrinho. Aguente 30 segundos.'}</p><button onClick={start}>COMEÇAR JOGO <Zap size={16}/></button></div>}
  {started&&cfg.mode==='dungeon'&&<><div className="nax-arena"><div className="nax-dungeon-scene"><div className="nax-corridor-wall left"/><div className="nax-corridor-wall right"/><div className="nax-corridor-floor"/><div className="nax-floor-lines"/><span className="nax-torch l">🔥</span><span className="nax-torch r">🔥</span><div className="nax-dungeon-top">MASMORRA NEXUS · SALA {room}/7</div><div className="nax-dungeon-message">{dungeonMsg}</div><div className={'nax-dungeon-foe '+(enemyHp<=0?'hit':'')}>👹</div><div className={'nax-dungeon-hero '+(guard?'guard':'')}>🧙</div><div style={{position:'absolute',top:'55%',left:'50%',transform:'translateX(-50%)',width:'110px',height:'5px',borderRadius:'9px',background:'#1a142b',border:'1px solid #ffffff33'}}><i style={{display:'block',width:Math.max(0,enemyHp/4*100)+'%',height:'100%',background:'linear-gradient(90deg,#ff4f78,#ffc36a)',borderRadius:'9px'}}/></div></div></div><div className="nax-dungeon-actions"><button onClick={()=>dungeonAction('attack')}><Swords size={16}/> ATACAR</button><button onClick={()=>dungeonAction('guard')}><Shield size={16}/> DEFENDER</button><button onClick={()=>dungeonAction('dodge')}><Footprints size={16}/> DESVIAR</button></div></>}
  {started&&cfg.mode==='race'&&<><div className="nax-race-stage" onTouchStart={e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{if(!touchStart.current)return;const dx=e.changedTouches[0].clientX-touchStart.current.x,dy=e.changedTouches[0].clientY-touchStart.current.y;if(Math.abs(dx)>25)raceKey(dx>0?'right':'left');else if(Math.abs(dy)>20)raceKey(dy<0?'jump':'slide');touchStart.current=null}}><div className="nax-sun"/><div className="nax-city"/><div className="nax-road"/><div className="nax-road-stripes"/>{obstacles.map(o=><span key={o.id} className="nax-run-obstacle" style={{left:(25+o.lane*25)+'%',top:o.y+'%'}}>{o.type==='coin'?'🪙':o.type==='barrier'?'🚧':'🚕'}</span>)}<span className={'nax-run-player '+move} style={{left:(25+lane*25)+'%'}}>🏃</span><div style={{position:'absolute',top:10,left:12,color:'#fff',fontSize:10,fontWeight:900,textShadow:'0 2px 8px #000'}}>DISTÂNCIA {distance*12} M</div></div><div className="nax-race-controls"><button onClick={()=>raceKey('left')}><ArrowLeft/> ESQ.</button><button className="action" onClick={()=>raceKey('jump')}>PULAR</button><button className="action" onClick={()=>raceKey('slide')}>DESLIZAR</button><button onClick={()=>raceKey('right')}>DIR. <ArrowRight/></button></div><div className="nax-gem-help">No celular: deslize para os lados, para cima (pular) ou para baixo (deslizar). No teclado: setas ou WASD.</div></>}
  {started&&cfg.mode==='gems'&&<><div className="nax-combo">{combo>1?'COMBO x'+combo:'ENCONTRE COMBINAÇÕES DE 3+'}</div><div className="nax-gem-wrap"><div className="nax-gem-side"><div className="nax-gem-stat"><small>JOGADAS</small><b>{moves}</b></div><div className="nax-gem-stat"><small>COMBO</small><b>x{combo||1}</b></div><div className="nax-gem-stat"><small>META</small><b>600</b></div></div><div className="nax-gem-board">{gems.map((gem,i)=><button key={i} onClick={()=>swapGem(i)} className={(selected===i?'selected ':'')+(matched.includes(i)?'matched':'')} style={{'--gem':cleanPalette[gem]}} aria-label={'Gema '+(i+1)}/>)}</div><div className="nax-gem-side"><div className="nax-gem-stat"><small>PONTOS</small><b>{score}</b></div><div className="nax-gem-stat"><small>PEÇAS</small><b>64</b></div></div></div><div className="nax-gem-help">Toque em uma gema e depois em uma vizinha para trocar. Combinações maiores valem mais!</div></>}
  {started&&cfg.mode==='defense'&&<div className="nax-defense"><div className="nax-castle">🏰<small>COFRINHO PROTEGIDO</small></div><div className="nax-enemies">{targets.map(t=><button key={t.id} onClick={()=>tapTarget(t.id)} style={{gridColumn:t.lane+1}} title="Toque para defender">👾</button>)}</div><p style={{textAlign:'center',color:'#aab5c9',fontSize:11}}>Toque nos invasores para eliminá-los!</p></div>}
  {finished&&<div className="nax-result"><Trophy size={30}/><span>{result}</span><b>{score.toLocaleString('pt-BR')} PTS</b><p>{result==='MISSÃO CONCLUÍDA'?'Boa! Sua evolução foi registrada.':'Cada tentativa ensina um caminho novo. Tente novamente!'}</p><button onClick={start}><RefreshCw size={15}/> JOGAR NOVAMENTE</button></div>}
  <footer className="nax-game-foot"><Shield size={14}/> {extraHeart?'Proteção extra equipada · ':''}Desafios justos, sem compras obrigatórias. XP sujeito às regras do Arcade.</footer>
 </section>;
}
