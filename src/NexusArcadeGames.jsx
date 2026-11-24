import React,{useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {TowerArt,EnemyShip} from './DefenseArt.jsx';
import {Shield,Heart,Timer,Coins,ArrowLeft,ArrowRight,Zap,RefreshCw,Trophy,Swords,Footprints} from 'lucide-react';

const CONFIG={
 'extra-dungeon':{title:'Dungeon Rush',icon:'🗡️',tag:'AVENTURA · MASMORRA',desc:'Explore corredores, enfrente criaturas e encontre a saída.',mode:'dungeon'},
 'extra-gems':{title:'Gem Match',icon:'💎',tag:'PUZZLE · COMBINAÇÃO',desc:'Faça combinações, provoque cascatas e aumente seus combos.',mode:'gems'},
 'extra-race':{title:'Corrida do Dinheiro',icon:'🏃',tag:'ENDLESS RUNNER · CORRIDA',desc:'Corra pela cidade, pule, deslize e troque de pista para sobreviver.',mode:'race'},
 'extra-defense':{title:'Defesa do Cofrinho',icon:'🛡️',tag:'DEFESA · PRECISÃO',desc:'Construa torres, evolua suas defesas e proteja o núcleo em 3 fases (setores) cada vez mais difíceis.',mode:'defense'}
};
const PALETTE=['#48d9ff','#a78bfa','#ff6fae','#ffd166','#65e6a7',' #ff875d'];
const cleanPalette=PALETTE.map(x=>x.trim());
const TIPS={
 dungeon:['⚔️ Golpe: ataque o guardião e ganhe energia','🛡️ Defesa antes do golpe dele (a cada 4s) anula o dano','✨ Arcano gasta 35 MP e causa 2 de dano','🏹 Arqueiro e Chefe mostram a pista do ataque: mude de pista (ESQ/DIR)','🛡️ Ogro tem armadura: o Arcano a ignora · 👻 Fantasma some: use Arcano','💚 Cura (H) gasta 45 MP · Defesa certa faz contra-ataque (parry) · 4º golpe seguido é crítico','⏳ Cada andar tem tempo: a fome tira 1 vida · Chefe nos andares 5 e 10','⌨️ A/D mover · Espaço golpe · K defesa · L arcano · H cura · Shift esquiva'],
 gems:['💎 Troque duas gemas vizinhas para formar 3 ou mais iguais','🔥 Cascatas e combos multiplicam os pontos','💣 Combine 4+ para criar uma gema-bomba (explode 3×3)','🪨 Pedras surgem a cada 4 jogadas: quebre combinando ao lado delas','❄️ Gelo (nível 2+) se espalha pelo tabuleiro: quebre-o para ganhar +1s','⏱️ Cada combinação e cascata dá tempo extra; bata a meta para subir de nível'],
 race:['🟨 Barreiras amarelas: PULE (↑ ou Espaço)','🟪 Carrinhos roxos: DESLIZE (↓ ou S)','🟥 Muros duplos: troque de pista · 🛢️ óleo faz derrapar: pule','🪙 Moedas dão pontos · ⚡ impulso · 🛡️ escudo · 🧲 ímã puxa moedas','🔥 Desvios seguidos sobem o combo (até x5) · a velocidade aumenta com o tempo'],
 defense:['➕ Toque nos pontos + para construir torres','🔧 Toque numa torre e use EVOLUIR para fortalecê-la','❄️ Use Pulso Nova e Campo Crio nos momentos críticos','🛩️ Voadores ignoram o caminho: use a torre RAIL · 🛡️ blindados resistem a tiros comuns · 💚 regeneradores curam se não forem atacados','⏩ Botão de velocidade 2× acelera as ondas (8 por setor)']
};
const readBest=k=>{try{return Number(window.localStorage.getItem('mf_best_'+k)||0)}catch{return 0}};
const saveBest=(k,v)=>{try{window.localStorage.setItem('mf_best_'+k,String(v))}catch{}};
const randomBoard=()=>makeBoard();
const TD_STAGES=[
 {name:'SETOR ALFA',goal:36,path:[[8,12],[8,34],[31,34],[31,76],[57,76],[57,22],[81,22],[81,86]],slots:[[18,17],[18,48],[42,20],[43,57],[69,44],[68,88],[91,52],[43,91],[8,62]]},
 {name:'SETOR BETA',goal:48,path:[[8,88],[8,60],[35,60],[35,16],[62,16],[62,70],[81,70],[81,86]],slots:[[20,74],[22,46],[20,24],[48,38],[48,6],[73,34],[72,52],[91,50],[56,88],[91,78]]},
 {name:'SETOR ÔMEGA',goal:60,path:[[8,8],[60,8],[60,34],[12,34],[12,60],[70,60],[70,86],[81,86]],slots:[[30,20],[78,20],[36,46],[78,46],[40,72],[90,70],[26,90],[56,76],[24,22]]}
];
const GEM_TIME=80,GEM_TIME_MAX=120;const gemGoalFor=l=>l*500+(l*(l-1)/2)*200;
const FLOORS=10;
const FOES={guardian:{n:'Guardião',every:4},archer:{n:'Espectro Arqueiro',every:3,aim:1},ogre:{n:'Ogro Blindado',every:5,dmg:2},wraith:{n:'Fantasma Instável',every:4},boss:{n:'Senhor da Masmorra',every:3,aim:2}};
const floorKind=f=>{if(f%5===0)return 'boss';const p=['guardian'];if(f>=2)p.push('archer');if(f>=3)p.push('ogre');if(f>=4)p.push('wraith');return p[Math.floor(Math.random()*p.length)]};
const floorTime=f=>f%5===0?55:Math.max(26,42-f*2);
const RACE_TIME=60;
const raceSpawn=el=>{const L=Math.floor(Math.random()*3),r=Math.random(),mk=(lane,type,y=-12)=>({id:Math.random(),lane,y,type});
 if(r<.2)return [mk(L,'coin'),mk(L,'coin',-24),mk(L,'coin',-36)];
 if(r<.25)return [mk(L,'boost')];if(r<.3)return [mk(L,'shield')];if(r<.35)return [mk(L,'magnet')];
 if(el>=10&&r<.5)return [0,1,2].filter(x=>x!==L).map(x=>mk(x,'wall'));
 if(el>=6&&r<.6)return [mk(L,'oil')];
 return [mk(L,r<.8?'barrier':'cart')]};
const TD_TOWER={bolt:{cost:40,range:17,dps:.32},arc:{cost:65,range:27,dps:.46},frost:{cost:55,range:20,dps:.12},rail:{cost:85,range:38,dps:.5}};
const TD_SPD={boss:.6,brute:.7,flyer:1.15,armored:.8,regen:.9},TD_HP={scout:1,flyer:.7,brute:2.2,armored:2,regen:1.6},TD_GAIN={boss:60,brute:20,armored:22,regen:20,flyer:14,scout:12};
const tdMul=(et,tt)=>et==='flyer'?(tt==='rail'?2.2:.6):et==='armored'?(tt==='rail'?1.6:tt==='arc'?.9:.4):1;
const tdPickType=(w,st)=>{const p=['scout','scout'];if(w>=2)p.push('flyer');if(w>=3)p.push('brute');if(w>=4)p.push('armored');if(w>=5||(st>=1&&w>=3))p.push('regen');return p[Math.floor(Math.random()*p.length)]};
const gemBase=v=>v==null||v>=20?-1:v%10;
const gemColor=v=>v===22?'#8fe3ff':v>=20?'#8895a7':cleanPalette[v%10];
const findMatches=board=>{
 const found=new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const i=r*8+c,v=gemBase(board[i]);if(v<0)continue;
  if(c<6&&gemBase(board[i+1])===v&&gemBase(board[i+2])===v){let k=c;while(k<8&&gemBase(board[r*8+k])===v)found.add(r*8+k++);}
  if(r<6&&gemBase(board[i+8])===v&&gemBase(board[i+16])===v){let k=r;while(k<8&&gemBase(board[k*8+c])===v)found.add(k++*8+c);}
 }
 return found;
};
const addStones=(b,n)=>{const a=[...b];let k=0,g=0;while(k<n&&g<300){g++;const i=Math.floor(Math.random()*64);if(a[i]!=null&&a[i]<10){a[i]=21;k++}}return a};
const addIce=(b,n)=>{const a=[...b];let k=0,g=0;while(k<n&&g<300){g++;const i=Math.floor(Math.random()*64);if(a[i]!=null&&a[i]<10){a[i]=22;k++}}return a};
const spreadIce=b=>{const ice=[];b.forEach((v,i)=>{if(v===22)ice.push(i)});if(!ice.length||ice.length>=9)return b;const a=[...b],i=ice[Math.floor(Math.random()*ice.length)],nb=[i-8,i+8,i-1,i+1].filter(n=>n>=0&&n<64&&adjacency(i,n)&&a[n]!=null&&a[n]<10);if(nb.length)a[nb[Math.floor(Math.random()*nb.length)]]=22;return a};
const adjacency=(a,b)=>Math.abs(a-b)===8||(Math.abs(a-b)===1&&Math.floor(a/8)===Math.floor(b/8));
function hasMove(board){for(let i=0;i<64;i++){for(const j of [i+1,i+8]){if(j>63||(j===i+1&&Math.floor(i/8)!==Math.floor(j/8))||board[i]>=20||board[j]>=20)continue;const b=[...board];[b[i],b[j]]=[b[j],b[i]];if(findMatches(b).size)return true}}return false}
function makeBoard(){for(let t=0;t<60;t++){const b=[];for(let i=0;i<64;i++){const r=Math.floor(i/8),c=i%8;let v,guard=0;do{v=Math.floor(Math.random()*5);guard++}while(guard<20&&((c>=2&&b[i-1]===v&&b[i-2]===v)||(r>=2&&b[i-8]===v&&b[i-16]===v)));b.push(v)}if(!findMatches(b).size&&hasMove(b))return b}return Array.from({length:64},(_,i)=>(i+Math.floor(i/8))%5)}
const STYLE=`
.nax-td{height:clamp(390px,62vw,550px);border-radius:22px;background:radial-gradient(ellipse at 50% 45%,#214657,#0b1929 72%);box-shadow:inset 0 0 80px #020a14,0 18px 50px #0008}
.nax-td:before{background-image:linear-gradient(#a2e9ff0a 1px,transparent 1px),linear-gradient(90deg,#a2e9ff0a 1px,transparent 1px);background-size:28px 28px}
.td-atmosphere{position:absolute;inset:0;background:radial-gradient(ellipse at 15% 20%,#36b8b833,transparent 35%),radial-gradient(ellipse at 80% 78%,#8b58e633,transparent 34%);animation:td-atmo 7s ease-in-out infinite alternate;pointer-events:none}
.nax-td-pathline{stroke:#0a1724;stroke-width:21;filter:drop-shadow(0 4px 8px #000)}.nax-td-pathedge{stroke:#a5c2d0;stroke-width:1;stroke-dasharray:2 2;opacity:.55}
.nax-td-slot{width:34px;height:34px;border-radius:50%;border:1px dashed #80e8d8;background:#0b3037dd;color:#aaffed;box-shadow:0 0 18px #4fffd044;font-size:21px}
.nax-td-tower{width:45px;height:45px;border-radius:14px;background:linear-gradient(145deg,#45657a,#172b42);border:1px solid #9ed9ee;box-shadow:0 7px 18px #000b,inset 0 1px #fff8}
.nax-td-tower i{width:21px;height:21px;display:block;border-radius:7px 7px 12px 12px;background:linear-gradient(145deg,#9beaff,#287aa0);border:2px solid #c6f5ff;box-shadow:0 0 13px #55dfff}
.nax-td-tower.arc i{background:linear-gradient(145deg,#f3b4ff,#8844d6);box-shadow:0 0 16px #bd69ff}.nax-td-tower.frost i{background:linear-gradient(145deg,#c8ffff,#43a9d8);box-shadow:0 0 16px #66eaff}
.nax-td-tower b{position:absolute;right:-5px;top:-6px;border-radius:20px;background:#f3c76a;color:#20202a;font-size:9px;padding:2px 5px}
.nax-td-enemy{width:23px;height:23px;border-radius:8px;background:linear-gradient(145deg,#f06b76,#742d54);border:2px solid #ffb0a5;box-shadow:0 0 18px #ff557788;display:grid;place-items:center}
.nax-td-enemy i{width:7px;height:7px;border-radius:50%;background:#fff3bf;box-shadow:0 0 8px #fff}.nax-td-enemy b{position:absolute;bottom:-7px;width:28px;height:4px;background:#251322;border:1px solid #ff9aaa;border-radius:9px;overflow:hidden}.nax-td-enemy b em{display:block;height:100%;background:linear-gradient(90deg,#ff486b,#ffbd75);border-radius:9px;transition:width .1s linear}
.nax-td-enemy.brute{width:31px;height:31px;border-radius:11px;background:linear-gradient(145deg,#f2a45b,#923d35)}.nax-td-enemy.boss{width:43px;height:43px;border-radius:13px;background:linear-gradient(145deg,#ffbd72,#9c315a);box-shadow:0 0 28px #ff5577}
.nax-td-base{left:87%;top:86%;font-size:9px;gap:5px;color:#aeeeff;filter:none}.nax-td-base i{width:49px;height:49px;border-radius:16px;background:linear-gradient(145deg,#396b8d,#172b4c);border:2px solid #a4edff;box-shadow:0 0 28px #57dfff99,inset 0 0 18px #7ceaff55;position:relative}.nax-td-base i:after{content:'';position:absolute;width:18px;height:18px;left:13px;top:13px;transform:rotate(45deg);background:linear-gradient(145deg,#fff,#55dfff 55%,#3975d7);box-shadow:0 0 20px #71edff;animation:td-core 1.8s ease-in-out infinite}.nax-td-base strong{font-size:8px;letter-spacing:1.5px}
.td-abilities{display:grid;grid-template-columns:1fr 1fr;gap:9px}.td-abilities button{min-height:57px;border:1px solid #9c83ff66;border-radius:13px;background:linear-gradient(120deg,#352d69,#182d48);color:#fff;font-size:11px;font-weight:900;padding:9px}.td-abilities button:disabled{opacity:.45}.td-abilities small{display:block;color:#b8c5df;font-size:8px;letter-spacing:1px;margin-top:4px}
.nax-td-shop{grid-template-columns:repeat(4,1fr)}.nax-td-shop button{min-height:78px;background:linear-gradient(155deg,#1b4054,#111e34);border-color:#5e9bb1;font-size:9px}.nax-td-shop button.active{border-color:#d3c2ff;box-shadow:0 0 0 2px #9d83ff55,0 0 22px #9d83ff33}.nax-td-shop button i{display:block;width:20px;height:20px;margin:auto auto 5px;border-radius:7px;background:linear-gradient(145deg,#b1f1ff,#2785ad);box-shadow:0 0 12px #57dfff}.nax-td-shop button:nth-child(2) i{background:linear-gradient(145deg,#f0b6ff,#8844d6)}.nax-td-shop button:nth-child(3) i{background:linear-gradient(145deg,#d6ffff,#3bafd5)}.nax-td-shop button small{font-size:8px}
.td-freeze-label{position:absolute;top:12px;left:50%;transform:translateX(-50%);padding:7px 12px;border:1px solid #a3f3ff;border-radius:30px;background:#16475ccc;color:#d8fbff;font-size:9px;letter-spacing:1px;font-weight:900}
@keyframes td-atmo{to{transform:scale(1.08);opacity:.65}}@keyframes td-core{50%{transform:rotate(225deg) scale(1.15)}}
@media(max-width:560px){.nax-td-shop{grid-template-columns:repeat(2,1fr)}.nax-td{height:410px}.nax-td-tower{width:38px;height:38px}}

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
.nax-td{position:relative;height:420px;overflow:hidden;border:1px solid #5c9bce66;border-radius:18px;background:radial-gradient(ellipse at 50% 15%,#1b4962,#10283a 52%,#0b1727);isolation:isolate}
.nax-td:before{content:'';position:absolute;inset:0;background-image:linear-gradient(#8edcff0d 1px,transparent 1px),linear-gradient(90deg,#8edcff0d 1px,transparent 1px);background-size:34px 34px;pointer-events:none}
.nax-td-path{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.nax-td-pathline{fill:none;stroke:#263e4d;stroke-width:15;stroke-linecap:round;stroke-linejoin:round}
.nax-td-pathedge{fill:none;stroke:#b3d6c8;stroke-width:2;stroke-dasharray:5 7;opacity:.5}
.nax-td-tower,.nax-td-slot{position:absolute;z-index:3;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:22px}
.nax-td-tower{border:1px solid #8ceaff99;background:linear-gradient(145deg,#315b78,#172e46);box-shadow:0 0 17px #38cfff44;color:white}
.nax-td-tower.selected{outline:3px solid #ffe08a;box-shadow:0 0 22px #ffe08a99}
.nax-td-slot{width:36px;height:36px;border:1px dashed #9ad7c877;background:#173e3b88;color:#b9f9df}
.nax-td-enemy{position:absolute;z-index:5;transform:translate(-50%,-50%);font-size:25px;filter:drop-shadow(0 3px 4px #000);transition:left .22s linear,top .22s linear}
.nax-td-enemy.boss{font-size:35px;filter:drop-shadow(0 0 12px #ff4b75)}
.nax-td-base{position:absolute;z-index:4;left:87%;top:86%;transform:translate(-50%,-50%);display:grid;justify-items:center;font-size:38px;filter:drop-shadow(0 0 15px #ffc75d)}
.nax-td-base small{font-size:8px;letter-spacing:1px;color:#ffe4a4;font-weight:900}
.nax-td-hud{display:flex;justify-content:space-between;gap:7px;flex-wrap:wrap}.nax-td-hud span{padding:7px 9px;border:1px solid #79c7df44;border-radius:9px;background:#122c40;color:#d8f3ff;font-size:10px;font-weight:800}
.nax-td-shop{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.nax-td-shop button{display:grid;justify-items:center;gap:3px;min-height:70px;padding:8px 4px;border:1px solid #78c9df55;border-radius:12px;background:linear-gradient(145deg,#214761,#142b40);color:#fff;font-size:10px;font-weight:900}.nax-td-shop button:disabled{opacity:.4}.nax-td-shop button b{font-size:19px}.nax-td-shop button small{color:#a7c6d9;font-size:9px}
@media(max-width:560px){.nax-td{height:370px}.nax-td-tower{width:34px;height:34px;font-size:18px}.nax-td-slot{width:30px;height:30px}.nax-td-enemy{font-size:21px}}
.nax-td-shot line{stroke:#9ff5ff;stroke-width:1.2;stroke-linecap:round;stroke-dasharray:3 2;filter:drop-shadow(0 0 2px #72eaff);animation:td-shot .22s ease-out forwards}.nax-td-shot circle{fill:#fff;filter:drop-shadow(0 0 4px #8ff)}.nax-td-shot.arc line{stroke:#d9a8ff;filter:drop-shadow(0 0 3px #b56cff)}.nax-td-shot.frost line{stroke:#a6f5ff;stroke-dasharray:1 1}@keyframes td-shot{from{opacity:1;stroke-width:2.4}to{opacity:0;stroke-width:.2}}.nax-td-legend{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;color:#a9c8db;font-size:9px}.nax-td-legend span{display:flex;align-items:center;gap:6px}.nax-td-legend i{width:12px;height:12px;border-radius:50%;background:#69dfff33;border:1px solid #8ceaff;box-shadow:0 0 9px #69dfff66}
@keyframes nax-float{to{transform:translateY(-7px)}}@keyframes nax-flicker{to{filter:drop-shadow(0 0 23px #ffdd8a);transform:scale(1.08)}}@keyframes nax-foe-bob{to{transform:translate(-50%,-57%) rotate(3deg)}}@keyframes nax-hero-breathe{to{transform:translateX(-50%) translateY(-4px)}}@keyframes nax-hit{50%{filter:brightness(3);transform:translate(-50%,-50%) scale(1.3)}}@keyframes nax-road-move{to{background-position-y:65px}}@keyframes nax-run-bob{to{margin-bottom:5px}}@keyframes nax-gem-in{from{transform:scale(.4);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes nax-gem-pop{to{transform:scale(0);opacity:0;filter:brightness(3)}}@media(max-width:560px){.nax-arena{min-height:350px}.nax-race-stage{height:390px}.nax-gem-wrap{grid-template-columns:1fr}.nax-gem-side{grid-template-columns:repeat(3,1fr);order:2}.nax-gem-board{gap:4px;padding:6px}.nax-gem-board button{border-radius:7px}.nax-dungeon-actions{gap:5px}.nax-dungeon-actions button{font-size:9px;padding:5px}.nax-race-controls{grid-template-columns:repeat(4,1fr);gap:5px}.nax-race-controls button{font-size:9px;padding:4px}}
@media(prefers-reduced-motion:reduce){.nax-game *{animation:none!important;transition:none!important}}

/* Arcade gameplay polish */
.nax-dungeon-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
.nax-dungeon-actions button{min-height:55px;flex-wrap:wrap;font-size:9px}
.nax-dungeon-actions small{font-size:8px;color:#a9dfff}
.nax-dungeon-mana{display:flex;align-items:center;gap:12px;color:#9fb9dc;font-size:9px;letter-spacing:1px}
.nax-dungeon-mana i{height:7px;flex:1;border-radius:10px;background:#17263c;overflow:hidden}.nax-dungeon-mana b{display:block;height:100%;border-radius:10px;background:linear-gradient(90deg,#438bff,#b58aff);box-shadow:0 0 12px #8c83ff}
.nax-dungeon-foe,.nax-dungeon-hero{width:62px;height:86px;font-size:0;left:50%;bottom:10%;top:auto;transform:translateX(-50%);border-radius:28px 28px 16px 16px;background:linear-gradient(100deg,#122d48,#2779a0 48%,#12233c);border:2px solid #83eaff;box-shadow:0 0 28px #39d9ff66;animation:arcade-idle 1.1s ease-in-out infinite alternate}
.nax-dungeon-foe{top:37%;bottom:auto;width:75px;height:92px;background:linear-gradient(100deg,#351a38,#a83c64 50%,#321b37);border-color:#ff8ba5;box-shadow:0 0 32px #ff4f8877}
.nax-dungeon-foe i,.nax-dungeon-hero i{position:absolute;left:17px;top:20px;width:9px;height:9px;border-radius:50%;background:#fff4b0;box-shadow:18px 0 #fff4b0,0 0 12px #ffdc8b}
.nax-dungeon-foe b,.nax-dungeon-hero b{position:absolute;left:14px;top:43px;width:34px;height:18px;border-radius:5px 5px 16px 16px;background:linear-gradient(90deg,#191321,#ff7999,#191321)}.nax-dungeon-hero b{background:linear-gradient(90deg,#102b43,#d3efff,#102b43)}.nax-dungeon-hero em,.nax-dungeon-foe em{position:absolute;left:25px;bottom:-17px;width:12px;height:26px;background:linear-gradient(#c8e9ff,#334c70);border-radius:4px}
.nax-dungeon-hero.guard{box-shadow:0 0 0 8px #69eaff44,0 0 35px #69eaff}
.nax-race-stage{background:linear-gradient(#193b61 0%,#5e9db4 38%,#182b40 39%,#090f1c 100%)}
.nax-road{background:linear-gradient(90deg,transparent 0 7%,#26394c 7% 93%,transparent 93%),linear-gradient(180deg,#36475b,#101827);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);left:0;right:0}
.nax-road-stripes{background:repeating-linear-gradient(180deg,transparent 0 36px,#d9efff88 37px 42px,transparent 43px 76px);clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);animation:arcade-road .35s linear infinite}
.nax-run-player{width:34px;height:67px;font-size:0;border-radius:15px 15px 8px 8px;background:linear-gradient(90deg,#183a62,#5bd5ed 50%,#153b65);border:2px solid #b8f5ff;box-shadow:0 0 22px #4adfff88;animation:arcade-run .22s infinite alternate}
.nax-run-player i{position:absolute;left:8px;top:8px;width:14px;height:14px;border-radius:50%;background:#f2c9a4;border:2px solid #fff}
.nax-run-player b{position:absolute;left:5px;bottom:-9px;width:8px;height:17px;border-radius:5px;background:#dcefff;box-shadow:15px 0 #dcefff}
.nax-run-player em{position:absolute;left:-7px;top:25px;width:12px;height:23px;border-radius:8px;background:#2479ad}
.nax-run-player.jump{transform:translate(-50%,-34px) rotate(-8deg)}.nax-run-player.slide{height:32px;transform:translateX(-50%) skewX(-17deg)}
.nax-run-player.boosted{box-shadow:0 0 10px #fff,0 0 35px #55eaff}.nax-run-player.shielded:after{content:'';position:absolute;inset:-12px;border:2px solid #83f6ff;border-radius:50%;box-shadow:0 0 20px #64eaff88}
.nax-run-obstacle{font-size:0;width:29px;height:32px;border-radius:7px;background:linear-gradient(145deg,#f3b36c,#9d4e35);border:2px solid #ffd59c;box-shadow:0 5px 14px #0009}
.nax-run-obstacle:after{content:'';position:absolute;inset:5px;border:2px solid #ffe4b5;border-radius:3px}
.nax-runner-powerups{display:flex;justify-content:space-between;gap:8px;color:#9db6d8;font-size:8px;letter-spacing:1px}
.nax-gem-board button{transition:transform .18s,filter .18s,opacity .18s;will-change:transform}
.nax-gem-board button.matched{animation:arcade-gem-pop .34s ease-in forwards;filter:brightness(2.2)}
.nax-gem-board button.selected{animation:arcade-gem-selected .7s ease-in-out infinite alternate}
.nax-gem-board button:active{transform:scale(.86)}
.nax-td{position:relative;isolation:isolate}.nax-td-path{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.nax-td-slot,.nax-td-tower,.nax-td-enemy,.nax-td-base{position:absolute;transform:translate(-50%,-50%);z-index:2}
.nax-td-tower{display:grid;place-items:center}.nax-td-tower.selected{outline:3px solid #fff;outline-offset:4px}
.nax-td-enemy{z-index:3;animation:arcade-enemy .45s ease-in-out infinite alternate}
.nax-td-base{display:grid;justify-items:center}
@keyframes arcade-idle{to{translate:0 -5px}}@keyframes arcade-road{to{background-position:0 76px}}@keyframes arcade-run{to{translate:0 -3px}}@keyframes arcade-gem-pop{to{transform:scale(.15) rotate(160deg);opacity:0}}@keyframes arcade-gem-selected{to{filter:brightness(1.5);transform:scale(1.07)}}@keyframes arcade-enemy{to{translate:-50% -3px}}
@media(max-width:560px){.nax-dungeon-actions{grid-template-columns:repeat(2,1fr)}.nax-runner-powerups{font-size:7px}.nax-gem-board{gap:4px;padding:7px}}

/* Final interaction feedback */
.nax-dungeon-message{z-index:5;top:24%;padding:8px 14px;border:1px solid #9b8bdb88;border-radius:20px;background:#080d1ddd;color:#f1edff;font-weight:800;box-shadow:0 5px 20px #0008}
.nax-corridor-floor{animation:arcade-floor-flow .9s linear infinite}
.nax-floor-lines{animation:arcade-floor-flow .7s linear infinite}
.nax-torch{font-size:0;width:10px;height:27px;border-radius:5px;background:linear-gradient(#ffd99a,#a34c28);box-shadow:0 0 20px 7px #ff9c4388;animation:arcade-flame .3s infinite alternate}
.nax-torch:after{content:'';position:absolute;left:1px;top:-13px;width:8px;height:15px;border-radius:70% 20% 70% 30%;background:linear-gradient(#fff4bd,#ff9b38 65%,transparent)}
.nax-gem-board button.matched{animation:arcade-gem-pop .34s ease-in forwards}
.nax-gem-board button i{transition:transform .2s}
.nax-td-pathline{stroke-linecap:round;stroke-linejoin:round}
.nax-td-enemy{transition:left .09s linear,top .09s linear}
.nax-td-tower{transition:filter .2s,transform .2s}
.nax-td-tower.selected{filter:brightness(1.4);transform:translate(-50%,-50%) scale(1.12)}
.nax-td-slot:active{transform:translate(-50%,-50%) scale(.88)}
@keyframes arcade-floor-flow{to{background-position:0 38px}}@keyframes arcade-flame{to{filter:brightness(1.5);box-shadow:0 0 27px 11px #ff9c4388}}

.nax-run-obstacle.type-coin{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff2a5,#ffb52f 48%,#9a5a10);border:2px solid #fff0a2;box-shadow:0 0 18px #ffc34e}
.nax-run-obstacle.type-coin:after{inset:3px;border:1px solid #fff5c8;border-radius:50%}
.nax-run-obstacle.type-boost{width:26px;height:27px;background:linear-gradient(145deg,#a7ffed,#16a6a1);border-color:#b7fff2;clip-path:polygon(55% 0,100% 0,68% 42%,94% 42%,25% 100%,40% 57%,8% 57%)}
.nax-run-obstacle.type-shield{width:27px;height:29px;background:linear-gradient(145deg,#d3faff,#3184c7);border-radius:7px 7px 13px 13px;clip-path:polygon(50% 0,100% 18%,88% 72%,50% 100%,12% 72%,0 18%)}
.nax-run-obstacle.type-shield:after,.nax-run-obstacle.type-boost:after{display:none}
.nax-game .nax-dungeon-foe.foe-archer{width:52px;background:linear-gradient(100deg,#123a2a,#3fbf8a 50%,#123a2a);border-color:#9fffd2;box-shadow:0 0 30px #3fe0a077}
.nax-game .nax-dungeon-foe.foe-ogre{width:96px;height:112px;border-radius:20px;background:linear-gradient(100deg,#3a2412,#c0762f 50%,#3a2412);border-color:#ffc58a;box-shadow:0 0 30px #ff9a4477}
.nax-game .nax-dungeon-foe.foe-wraith{border-radius:40px 40px 6px 6px;background:linear-gradient(100deg,#2a2160,#8a7dff 50%,#2a2160);border-color:#d4ccff;box-shadow:0 0 30px #8a7dff88;transition:opacity .25s}
.nax-game .nax-dungeon-foe.foe-wraith.phased{opacity:.28}
.nax-game .nax-dungeon-foe.foe-boss{width:112px;height:130px;background:linear-gradient(100deg,#400b1c,#e0244f 50%,#400b1c);border-color:#ffb0c0;box-shadow:0 0 50px #ff2255aa}
.nax-dng-warn{position:absolute;bottom:8%;width:60px;height:92px;transform:translateX(-50%);border:2px dashed #ff5577;border-radius:14px;background:#ff557722;pointer-events:none}
.nax-dng-info{position:absolute;left:0;right:0;bottom:2px;text-align:center;font-size:10px;font-weight:800;color:#e4ecff;text-shadow:0 1px 4px #000}
.nax-game .nax-gem-board button.ice{background:radial-gradient(circle at 35% 30%,#e8fbff,#7fd0f0 60%,#2b6f9a)!important;border:2px solid #d4f6ff;box-shadow:inset 0 -4px 8px #0a4a7a88,0 0 10px #8fe3ff88}
.nax-game .nax-gem-board button.ice::after{content:"❄";color:#fff}
.nax-game .nax-run-obstacle.type-wall{width:34px;height:46px;background:linear-gradient(145deg,#ff7a8a,#7a1f3a);border-color:#ffc0c8}
.nax-game .nax-run-obstacle.type-oil{width:38px;height:18px;border-radius:50%;background:radial-gradient(#0d0d1c,#4a3478);border-color:#9a8dff}.nax-game .nax-run-obstacle.type-oil:after{display:none}
.nax-game .nax-run-obstacle.type-magnet{width:26px;height:26px;border-radius:50%;background:linear-gradient(145deg,#ffb3ff,#a02ae0);border-color:#fff;box-shadow:0 0 16px #d46bff}.nax-game .nax-run-obstacle.type-magnet:after{display:none}
.nax-game .nax-td-enemy.flyer{width:26px;height:26px}.nax-game .nax-td-enemy.armored{width:38px;height:38px}.nax-game .nax-td-enemy.regen{width:32px;height:32px}
`;
export default function NexusArcadeGames({gameKey,onReward=()=>{},onMatch=()=>{},onLoot=()=>{},skills=[]}){
 const [ownedSkills,setOwnedSkills]=useState(skills);
 useEffect(()=>{let live=true;(async()=>{try{const {data:u}=await supabase.auth.getUser();const id=u?.user?.id;if(!id)return;const {data}=await supabase.from('nexus_player_progress').select('unlocked_skills').eq('user_id',id).maybeSingle();if(live&&data?.unlocked_skills)setOwnedSkills(data.unlocked_skills)}catch{}})();return()=>{live=false}},[gameKey]);
 const has=k=>ownedSkills.includes(k);
 const cfg=CONFIG[gameKey],extraHeart=has('extra-heart'),coinBoost=has('coin-boost');
 const coreMax=12+(has('iron-core')?4:0),scoreMult=1+(has('score-plus')?.08:0)+(has('legend')?.2:0),scoreMultRef=useRef(1);scoreMultRef.current=scoreMult;
 const [started,setStarted]=useState(false),[finished,setFinished]=useState(false),[score,setScore]=useState(0),[elapsed,setElapsed]=useState(0),[result,setResult]=useState('');
 const [hearts,setHearts]=useState(extraHeart?4:3);
 const [room,setRoom]=useState(1),[enemyHp,setEnemyHp]=useState(3),[enemyMax,setEnemyMax]=useState(3),[guard,setGuard]=useState(false),[dungeonMsg,setDungeonMsg]=useState('Um guardião bloqueia a passagem!'),[heroLane,setHeroLane]=useState(0),[mana,setMana]=useState(100),[dungeonPowerCd,setDungeonPowerCd]=useState(0),[foeKind,setFoeKind]=useState('guardian'),[foeArmor,setFoeArmor]=useState(0),[foeTarget,setFoeTarget]=useState(null),[dTime,setDTime]=useState(40),[streak,setStreak]=useState(0),[healCd,setHealCd]=useState(0);const lastTele=useRef(0);
 const [lane,setLane]=useState(1),[obstacles,setObstacles]=useState([]),[move,setMove]=useState('run'),[distance,setDistance]=useState(0),[runnerBoost,setRunnerBoost]=useState(0),[runnerShield,setRunnerShield]=useState(0),[raceCombo,setRaceCombo]=useState(0),[runnerMagnet,setRunnerMagnet]=useState(0);const magnetRef=useRef(0),laneRef=useRef(1);
 const [gems,setGems]=useState(randomBoard),[selected,setSelected]=useState(null),[combo,setCombo]=useState(0),[moves,setMoves]=useState(0),[gemTime,setGemTime]=useState(GEM_TIME),[gemLevel,setGemLevel]=useState(1),[gemBanner,setGemBanner]=useState(''),[matched,setMatched]=useState([]),[anim,setAnim]=useState(null),[shake,setShake]=useState(false),[pop,setPop]=useState(null);const dragRef=useRef(null),gemMoves=useRef(0),stoneDue=useRef(false),gemLevelRef=useRef(1);
 const [targets,setTargets]=useState([]);
 const [tdTowers,setTdTowers]=useState([]),[tdEnemies,setTdEnemies]=useState([]),[tdShots,setTdShots]=useState([]),[tdCash,setTdCash]=useState(120),[tdBase,setTdBase]=useState(12),[tdWave,setTdWave]=useState(1),[tdKills,setTdKills]=useState(0),[tdSelected,setTdSelected]=useState(null);
 const tdSpawn=useRef(0),tdId=useRef(1);
 const [best,setBest]=useState(()=>readBest(gameKey)),[record,setRecord]=useState(false);
 const bestRef=useRef(best),busyRef=useRef(false),timers=useRef([]),boostRef=useRef(0),actionRef=useRef(null),roomRef=useRef(1);
 const later=(fn,ms)=>{const id=window.setTimeout(fn,ms);timers.current.push(id)};
 useEffect(()=>{bestRef.current=best},[best]);
 useEffect(()=>{const b=readBest(gameKey);setBest(b);bestRef.current=b},[gameKey]);
 useEffect(()=>()=>timers.current.forEach(window.clearTimeout),[]);
 useEffect(()=>{roomRef.current=room},[room]);
 useEffect(()=>{boostRef.current=runnerBoost},[runnerBoost]);useEffect(()=>{magnetRef.current=runnerMagnet},[runnerMagnet]);laneRef.current=lane;
 const [tdAbilityCd,setTdAbilityCd]=useState(0),[tdFreeze,setTdFreeze]=useState(0),[tdTowerType,setTdTowerType]=useState('bolt'),[tdAbility,setTdAbility]=useState(''),[tdStage,setTdStage]=useState(0),[tdBanner,setTdBanner]=useState(''),[tdSpeed,setTdSpeed]=useState(1);const tdBoss=useRef(0);
 const tdPath=TD_STAGES[tdStage].path,tdSlots=TD_STAGES[tdStage].slots,tdGoal=TD_STAGES[tdStage].goal;
 const tdPos=(e)=>{if(e.type==='flyer'){const a=tdPath[0],b=tdPath[tdPath.length-1],f=Math.min(1,e.p/(tdPath.length-1));return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f}}return tdPoint(e.p)};
 const tdPoint=p=>{const seg=Math.min(tdPath.length-2,Math.floor(p)),t=p-seg,a=tdPath[seg],b=tdPath[seg+1];return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t}};
 const touchStart=useRef(null),lastSpawn=useRef(0),gameRef=useRef(null),scoreRef=useRef(score),elapsedRef=useRef(elapsed),lastDungeonAttack=useRef(0);
 useEffect(()=>{scoreRef.current=score},[score]);
 useEffect(()=>{elapsedRef.current=elapsed},[elapsed]);
 const finish=useCallback((rawScore,won,mode)=>{
  if(gameRef.current?.done)return; if(gameRef.current)gameRef.current.done=true;
  const finalScore=Math.max(0,Math.round((Number(rawScore)||0)*scoreMultRef.current));const isRecord=finalScore>bestRef.current&&finalScore>0;if(isRecord){bestRef.current=finalScore;saveBest(gameKey,finalScore);setBest(finalScore)}setRecord(isRecord);setFinished(true);setStarted(false);setScore(finalScore);setResult(won?'MISSÃO CONCLUÍDA':'FIM DE JOGO');
  const xp=Math.min(100,Math.max(0,Math.floor(finalScore*.25)));
  onReward(finalScore,gameKey);onMatch({gameKey,score:finalScore,xpEarned:xp,mode,won:!!won&&finalScore>=10,durationSeconds:elapsedRef.current});
  if(finalScore>=25)void onLoot(gameKey,'coin_pickup');
 },[gameKey,onMatch,onReward,onLoot]);
 const start=()=>{
  timers.current.forEach(window.clearTimeout);timers.current=[];busyRef.current=false;boostRef.current=0;setRecord(false);gameRef.current={done:false};setStarted(true);setFinished(false);setScore(0);setElapsed(0);setHearts(extraHeart?4:3);setResult('');
  lastDungeonAttack.current=0;setRoom(1);roomRef.current=1;setEnemyHp(3);setEnemyMax(3);setGuard(false);setDungeonMsg('Um guardião bloqueia a passagem!');setHeroLane(0);setMana(100);setDungeonPowerCd(0);setFoeKind('guardian');setFoeArmor(0);setFoeTarget(null);setDTime(floorTime(1));setStreak(0);setHealCd(0);lastTele.current=0;
  setLane(1);setObstacles([]);setMove('run');setDistance(0);setRunnerBoost(0);setRunnerShield(0);setRunnerMagnet(0);setRaceCombo(0);magnetRef.current=0;lastSpawn.current=0;
  setGems(addStones(randomBoard(),5));gemMoves.current=0;stoneDue.current=false;setSelected(null);setCombo(0);setMoves(0);setGemTime(GEM_TIME+(has('gem-moves')?8:0));setGemLevel(1);gemLevelRef.current=1;setGemBanner('');setMatched([]);setTargets([]);setTdTowers([]);setTdEnemies([]);setTdShots([]);setTdCash(120+(has('start-cash')?60:0));setTdBase(coreMax);setTdWave(1);setTdKills(0);setTdStage(0);setTdBanner('');setTdSelected(null);setTdAbilityCd(0);setTdFreeze(0);setTdTowerType('bolt');setTdAbility('');setTdSpeed(1);tdBoss.current=0;tdSpawn.current=0;tdId.current=1;
 };
 useEffect(()=>{if(!started||cfg?.mode!=='gems')return;const id=window.setInterval(()=>setGemTime(v=>Math.max(0,v-.25)),250);return()=>window.clearInterval(id)},[started,cfg?.mode]);
 useEffect(()=>{if(started&&cfg?.mode==='gems'&&gemTime<=0)finish(scoreRef.current,gemLevelRef.current>1,'gem-match-tempo')},[gemTime,started,cfg?.mode,finish]);
 const loseLife=(n=1)=>{
  setHearts(v=>{if(v<=n){finish(scoreRef.current,false,cfg.mode);return 0}return v-n});
 };
 useEffect(()=>{
  if(!started||!['race','dungeon','defense'].includes(cfg.mode))return;
  const timer=window.setInterval(()=>{
   if(cfg.mode==='defense')tdSpawn.current++;
   setElapsed(v=>v+(cfg.mode==='race'?(lastSpawn.current%4===0?1:0):cfg.mode==='defense'?(tdSpawn.current%10===9?1:0):1));
   if(cfg.mode==='dungeon'){setHealCd(v=>Math.max(0,v-1));setDTime(v=>v-1);setDungeonPowerCd(v=>Math.max(0,v-1));setMana(v=>Math.min(100,v+3))}
   if(cfg.mode==='defense'&&tdSpawn.current%10===0){setTdAbilityCd(v=>Math.max(0,v-1));setTdFreeze(v=>Math.max(0,v-1))}
   if(cfg.mode==='race'){
    setDistance(v=>v+1);
    const el=elapsedRef.current,spd=4.1+Math.min(3.3,el*.055),tick=lastSpawn.current,gap=Math.max(4,7-Math.floor(el/12)),mag=magnetRef.current>0,ln=laneRef.current;
    setObstacles(old=>{
     const next=old.map(o=>({...o,y:o.y+spd,lane:mag&&o.type==='coin'&&o.y>20?ln:o.lane})).filter(o=>o.y<112);
     if(tick%gap===0)next.push(...raceSpawn(el));
     return next;
    });
    lastSpawn.current++;
    if(tick%2===0)setScore(v=>v+(boostRef.current>0?2:1));setRunnerBoost(b=>Math.max(0,b-1));setRunnerMagnet(b=>Math.max(0,b-1));
   }
   if(cfg.mode==='defense'){
    const sp=tdSpawn.current;
    setTdEnemies(old=>{
     const firing=[];
     const slowed=e=>{const q=tdPos(e);return tdTowers.some(t=>t.type==='frost'&&Math.hypot(q.x-t.x,q.y-t.y)<=TD_TOWER.frost.range)};
     let next=old.map(e=>{
      const q=tdPos(e);let damage=0;
      tdTowers.forEach(t=>{const T=TD_TOWER[t.type];if(Math.hypot(q.x-t.x,q.y-t.y)<=T.range){damage+=T.dps*t.level*tdMul(e.type,t.type);if(sp%3===0)firing.push({id:t.id+'-'+e.id+'-'+sp,x1:t.x,y1:t.y,x2:q.x,y2:q.y,type:t.type})}});
      const regen=e.type==='regen'&&damage===0?e.max*.0025:0;
      const spd=(.035+tdWave*.002+tdStage*.002)*(e.boss?.6:TD_SPD[e.type]||1)*(slowed(e)?.6:1);
      return {...e,p:e.p+(tdFreeze>0?0:spd),hp:Math.min(e.max,e.hp-damage+regen)};
     });
     setTdShots(firing);
     const escaped=next.filter(e=>e.p>=tdPath.length-1);if(escaped.length){const leak=escaped.reduce((a,e)=>a+(e.boss?4:e.type==='armored'||e.type==='brute'?2:1),0);setTdBase(v=>{const n=Math.max(0,v-leak);if(n===0)finish(scoreRef.current,false,'tower-defense-base');return n})}
     const dead=next.filter(e=>e.hp<=0&&e.p<tdPath.length-1);const killed=dead.length;const gain=dead.reduce((a,e)=>a+(e.boss?60:(TD_GAIN[e.type]||12)),0);if(killed>0){setTdKills(v=>v+killed);setTdCash(v=>v+gain);setScore(v=>v+gain)}
     next=next.filter(e=>e.p<tdPath.length-1&&e.hp>0);
     if(sp%Math.max(10,Math.round(24-tdWave*1.2-tdStage))===0&&tdKills<tdGoal){
      let boss=false;if(tdWave>=4&&!(tdBoss.current&1)){tdBoss.current|=1;boss=true}else if(tdWave>=8&&!(tdBoss.current&2)){tdBoss.current|=2;boss=true}
      const type=boss?'scout':tdPickType(tdWave,tdStage),max=(1.8+tdWave*.3)*(1+tdStage*.5)*(boss?6:TD_HP[type]);
      next.push({id:tdId.current++,p:0,hp:max,max,boss,type});
     }
     return next;
    });if(sp%150===0){setTdWave(v=>Math.min(8,v+1));setTdCash(v=>v+10+tdStage*5)}
   }
  },cfg.mode==='race'?250:cfg.mode==='defense'?(tdSpeed===2?50:100):1000);
  return()=>window.clearInterval(timer); },[started,cfg.mode,tdTowers,tdWave,tdKills,tdFreeze,tdSpeed,tdStage]); useEffect(()=>{
  if(!started||cfg.mode!=='dungeon'||elapsed===0||enemyHp<=0||lastDungeonAttack.current===elapsed)return;
  const K=FOES[foeKind]||FOES.guardian,every=foeKind==='boss'&&enemyHp<=enemyMax/2?2:K.every;
  if(K.aim&&elapsed%every===every-1&&lastTele.current!==elapsed){lastTele.current=elapsed;const t=Math.floor(Math.random()*3)-1,nm=t<0?'ESQUERDA':t>0?'DIREITA':'CENTRAL';setFoeTarget(t);setDungeonMsg(K.aim===2?'⚠ Só a pista '+nm+' é segura!':'⚠ Flecha mirando a pista '+nm+'!')}
  if(elapsed%every!==0)return;
  lastDungeonAttack.current=elapsed;
  let hit=true;if(K.aim===1)hit=foeTarget===heroLane;else if(K.aim===2)hit=foeTarget!==heroLane;
  setFoeTarget(null);
  if(!hit){setDungeonMsg('Você desviou do ataque!');setScore(v=>v+6);return}
  if(guard){setGuard(false);setDungeonMsg('PARRY! Bloqueio e contra-ataque.');setScore(v=>v+10);damageFoe(1,true);return}
  setStreak(0);setDungeonMsg(K.n+' acertou você!');loseLife(K.dmg||1);
 },[elapsed,started,cfg.mode,guard]);
 useEffect(()=>{if(started&&cfg.mode==='dungeon'&&dTime<=0){setDTime(14);setDungeonMsg('A fome te enfraquece! −1 vida');loseLife(1)}},[dTime,started,cfg.mode]);
 useEffect(()=>{
  if(!started||cfg.mode!=='race')return;
  const collision=obstacles.find(o=>o.lane===lane&&o.y>72&&o.y<105);
  if(!collision)return;
  setObstacles(old=>old.filter(o=>o.id!==collision.id));
  const mult=1+Math.min(4,Math.floor(raceCombo/5));
  if(collision.type==='coin'){setScore(v=>v+10*mult*(coinBoost?2:1));void onLoot(gameKey,'coin_pickup')}
  else if(collision.type==='boost'){setRunnerBoost(24);setScore(v=>v+15)}
  else if(collision.type==='shield'){setRunnerShield(1);setScore(v=>v+15)}
  else if(collision.type==='magnet'){setRunnerMagnet(28);setScore(v=>v+15)}
  else if(collision.type==='oil'){if(move==='jump'){setScore(v=>v+5);setRaceCombo(c=>c+1)}else{setRaceCombo(0);setLane(v=>v===1?(Math.random()<.5?0:2):1)}}
  else if((collision.type==='barrier'&&move==='jump')||(collision.type==='cart'&&move==='slide')){setScore(v=>v+5*mult);setRaceCombo(c=>c+1)}
  else if(runnerBoost>0){setScore(v=>v+5)}
  else if(runnerShield>0){setRunnerShield(0);setScore(v=>v+8);setRaceCombo(0)}else{setRaceCombo(0);loseLife()}
 },[obstacles,lane,started,cfg.mode,move,runnerShield,runnerBoost]);
 useEffect(()=>{if(started&&cfg.mode==='race'&&elapsed>=RACE_TIME)finish(score,true,'runner-60s')},[elapsed,started,cfg.mode,score,finish]);
 useEffect(()=>{if(!started||cfg.mode!=='defense'||tdKills<tdGoal)return;if(tdStage<TD_STAGES.length-1){const nx=tdStage+1;setTdStage(nx);setTdKills(0);setTdTowers([]);setTdEnemies([]);setTdShots([]);setTdWave(1);tdBoss.current=0;setTdSelected(null);setTdCash(v=>v+130);setScore(v=>v+150);tdSpawn.current=0;setTdBanner('FASE '+(nx+1)+' · '+TD_STAGES[nx].name);later(()=>setTdBanner(''),2600)}else finish(score+100,true,'tower-defense-3-setores')},[tdKills,started,cfg.mode,score,finish,tdGoal,tdStage]);
 useEffect(()=>{if(!started||cfg.mode!=='race')return;const t=window.setTimeout(()=>setMove('run'),650);return()=>window.clearTimeout(t)},[move,started,cfg.mode]);
 const maxHearts=extraHeart?4:3;
 const clearRoom=()=>{
  const f=roomRef.current;setDungeonMsg(f%5===0?'CHEFE DERROTADO!':'Criatura derrotada! Escada liberada.');setScore(v=>v+20+f*6+Math.max(0,dTime));
  later(()=>{
   if(f>=FLOORS){finish(scoreRef.current+100,true,'dungeon-10-andares');return}
   const nf=f+1,kind=floorKind(nf),boss=kind==='boss',hp=boss?12+nf:2+Math.floor(Math.random()*2)+Math.floor(nf/2)+(kind==='ogre'?2:0);
   setFoeKind(kind);setEnemyHp(hp);setEnemyMax(hp);setFoeArmor(kind==='ogre'?2+Math.floor(nf/4):boss?3:0);setFoeTarget(null);setDTime(floorTime(nf));
   setMana(v=>Math.min(100,v+20));setDungeonMsg((boss?'CHEFE: ':'Andar '+nf+': ')+FOES[kind].n+' apareceu!');setRoom(nf);roomRef.current=nf;
  },450);
 };
 const damageFoe=(n,pierce)=>{
  if(foeKind==='wraith'&&elapsed%4>=2&&!pierce){setDungeonMsg('O golpe atravessou o fantasma! Use o ARCANO ou espere.');return}
  if(foeArmor>0&&!pierce){const a=Math.max(0,foeArmor-n);setFoeArmor(a);setDungeonMsg(a?'Armadura rachou! ('+a+') · o Arcano a ignora':'Armadura quebrada!');return}
  const hp=Math.max(0,enemyHp-n);setEnemyHp(hp);if(hp<=0)clearRoom();else setDungeonMsg('Acertou! Restam '+hp+' de vida.');
 };
 const dungeonAction=action=>{
  if(!started||enemyHp<=0)return;
  if(action==='guard'){setGuard(true);setDungeonMsg('GUARDA · bloqueio preparado (parry contra-ataca)');return}
  if(action==='power'){if(mana<35||dungeonPowerCd>0)return;setMana(v=>v-35);setDungeonPowerCd(has('quick-cd')?4:5);setScore(v=>v+18);damageFoe(2,true);return}
  if(action==='heal'){if(mana<45||healCd>0||hearts>=maxHearts)return;setMana(v=>v-45);setHealCd(10);setHearts(v=>Math.min(maxHearts,v+1));setDungeonMsg('CURA · +1 vida');return}
  if(action==='left'||action==='right'){setHeroLane(v=>Math.max(-1,Math.min(1,v+(action==='left'?-1:1))));setDungeonMsg('Você reposicionou o personagem.');return}
  if(action==='attack'){
   if(guard){setGuard(false);setDungeonMsg('Você baixou a guarda.');return}
   const st=streak+1,crit=st%4===0;setStreak(st);setScore(v=>v+(crit?16:8));setMana(v=>Math.min(100,v+5));damageFoe(crit?2:1,false);return
  }
  if(action==='dodge'){setGuard(false);setHeroLane(v=>v===0?1:-v);setDungeonMsg('ESQUIVA · reposicionamento rápido!');setScore(v=>v+5);setMana(v=>Math.min(100,v+8))}
 };
 actionRef.current=dungeonAction;
 const runChain=(board,chain,total,movesLeft)=>{
  if(gameRef.current?.done)return;
  const hits=findMatches(board);
  const orig=[...hits];
  if(!hits.size){
   const settled0=hasMove(board)?board:addStones(makeBoard(),board.filter(v=>v>=20).length);
   let settled=settled0;if(stoneDue.current){stoneDue.current=false;settled=addStones(settled0,1);if(gemLevelRef.current>=2)settled=spreadIce(settled);setPop({i:-1,pts:0,chain:0})}
   setGems(settled);setMatched([]);busyRef.current=false;
   if(total>=gemGoalFor(gemLevelRef.current)){const L=gemLevelRef.current+1;gemLevelRef.current=L;setGemLevel(L);setGemTime(v=>Math.min(GEM_TIME_MAX,v+10));setGemBanner('NÍVEL '+L+' · +10s');later(()=>setGemBanner(''),1800);const nb=addIce(addStones(settled,1+L),Math.min(L,6));if(hasMove(nb))setGems(nb)}
   return;
  }
  orig.forEach(i=>{if(board[i]>=10&&board[i]<20){const r=Math.floor(i/8),c=i%8;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<8&&cc>=0&&cc<8&&board[rr*8+cc]<20)hits.add(rr*8+cc)}}});
  const stoneHit=new Set();hits.forEach(i=>[i-8,i+8,i-1,i+1].forEach(n=>{if(n<0||n>63)return;if(Math.abs(n-i)===1&&Math.floor(n/8)!==Math.floor(i/8))return;if(board[n]>=20)stoneHit.add(n)}));
  const keep=orig.length>=4?orig.find(i=>board[i]<10):undefined;
  setMatched([...hits]);setCombo(chain);if(chain>=3){setShake(true);later(()=>setShake(false),420)}
  const pts=Math.round((hits.size*10+[...stoneHit].filter(n=>board[n]===20||board[n]===22).length*30+(hits.size>=5?60:hits.size===4?25:0))*(coinBoost?2:1)*(1+(chain-1)*.5));
  const t=total+pts,sec=Math.min(6,.5+(hits.size>=4?1:0)+(chain>1?Math.min(3,(chain-1)*.5):0)+[...stoneHit].filter(n=>board[n]===22).length);setGemTime(v=>Math.min(GEM_TIME_MAX,v+sec));setScore(t);setPop({i:[...hits][0],pts,chain,sec});later(()=>setPop(null),700);
  later(()=>{
   const b=[...board];hits.forEach(i=>b[i]=null);stoneHit.forEach(n=>{b[n]=b[n]===21?20:null});if(keep!==undefined)b[keep]=board[keep]+10;
   for(let c=0;c<8;c++){let write=7;for(let r=7;r>=0;r--){const val=b[r*8+c];if(val!==null){b[write*8+c]=val;if(write!==r)b[r*8+c]=null;write--}}for(let r=write;r>=0;r--)b[r*8+c]=Math.floor(Math.random()*5)}
   setGems(b);setMatched([]);
   later(()=>runChain(b,chain+1,t,movesLeft),240);
  },330);
 };
 const trySwap=(a,b)=>{
  if(!started||busyRef.current||!adjacency(a,b)||gems[a]>=20||gems[b]>=20)return;
  busyRef.current=true;setSelected(null);
  const next=[...gems];[next[a],next[b]]=[next[b],next[a]];
  const ok=findMatches(next).size>0;
  setAnim({a,b,bad:!ok});
  later(()=>{setAnim(null);if(!ok){busyRef.current=false;return}setMoves(v=>v+1);gemMoves.current++;if(gemMoves.current%(gemLevelRef.current>=3?3:4)===0)stoneDue.current=true;setGems(next);setCombo(0);runChain(next,1,scoreRef.current,moves-1)},ok?190:380);
 };
 const swapGem=index=>{
  if(!started||busyRef.current||gems[index]>=20)return;
  if(selected===null){setSelected(index);return}
  if(selected===index){setSelected(null);return}
  if(!adjacency(selected,index)){setSelected(index);return}
  trySwap(selected,index);
 };
 const gemDrag=(i,e)=>{
  const d=dragRef.current;if(!d||d.done||d.i!==i)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.max(Math.abs(dx),Math.abs(dy))<16)return;
  d.done=true;const col=i%8,row=Math.floor(i/8);let t=null;
  if(Math.abs(dx)>Math.abs(dy))t=dx>0?(col<7?i+1:null):(col>0?i-1:null);else t=dy>0?(row<7?i+8:null):(row>0?i-8:null);
  if(t!==null)trySwap(i,t);
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
 useEffect(()=>{
  if(!started||cfg.mode!=='dungeon')return;
  const handler=e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))return;const k=e.key;let a=null;
   if(['ArrowLeft','a','A'].includes(k))a='left';else if(['ArrowRight','d','D'].includes(k))a='right';else if([' ','j','J','Enter'].includes(k))a='attack';else if(['k','K','ArrowUp','w','W'].includes(k))a='guard';else if(['l','L'].includes(k))a='power';else if(['h','H'].includes(k))a='heal';else if(['Shift','ArrowDown','s','S'].includes(k))a='dodge';
   if(a){e.preventDefault();actionRef.current?.(a)}};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[started,cfg.mode]);
 const tapTarget=id=>{setTargets(old=>old.filter(t=>t.id!==id));setScore(v=>v+10)};
 const tdPlace=(x,y,type=tdTowerType)=>{if(!started)return;const old=tdTowers.find(t=>Math.hypot(t.x-x,t.y-y)<4);if(old){setTdSelected(old.id);return}const cost=Math.round(TD_TOWER[type].cost*(has('tower-discount')?.85:1));if(tdCash<cost)return;setTdTowers(v=>[...v,{id:tdId.current++,x,y,level:1,type}]);setTdCash(v=>v-cost);setTdSelected(null)};
 const tdCast=kind=>{if(!started||tdAbilityCd>0||!tdEnemies.length)return;if(kind==='nova'){setTdEnemies(v=>v.map(e=>({...e,hp:e.hp-2.4})));setScore(v=>v+25)}else{setTdFreeze(4)}setTdAbility(kind);setTdAbilityCd(has('quick-cd')?8:12)};
 const tdAim=t=>{const range=TD_TOWER[t.type].range;let best=null,bd=1e9;tdEnemies.forEach(e=>{const q=tdPos(e),d=Math.hypot(q.x-t.x,q.y-t.y);if(d<=range&&d<bd){bd=d;best=q}});return best?Math.atan2(best.y-t.y,best.x-t.x)*180/Math.PI:-90};
 const tdHeading=e=>{const a=tdPos(e),b=tdPos({...e,p:Math.min(tdPath.length-1,e.p+.05)});return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90};
 const tdSell=()=>{const t=tdTowers.find(x=>x.id===tdSelected);if(!t)return;const base=TD_TOWER[t.type].cost,spent=base+(t.level===2?45:t.level===3?135:0);setTdTowers(v=>v.filter(x=>x.id!==t.id));setTdCash(v=>v+Math.round(spent*(has('sell-bonus')?.85:.6)));setTdSelected(null)};
 const tdUpgrade=()=>{const t=tdTowers.find(x=>x.id===tdSelected);if(!t||t.level>=3||tdCash<45*t.level)return;setTdTowers(v=>v.map(x=>x.id===tdSelected?{...x,level:x.level+1}:x));setTdCash(v=>v-45*t.level)};
 if(!cfg)return null;
 return <section className="nax-game">
  <style>{STYLE}</style>
  <header className="nax-game-head"><div><span>{cfg.tag}</span><h3>{cfg.icon} {cfg.title}</h3><p>{cfg.desc}</p></div><div className="nax-score"><small>PONTUAÇÃO</small><b>{Math.floor(score).toLocaleString('pt-BR')}</b></div></header>
  <div className="nax-hud"><span><Heart size={15}/> {cfg.mode==='defense'?'Núcleo '+tdBase+'/'+coreMax:cfg.mode==='gems'?'Nível '+gemLevel+' · meta '+gemGoalFor(gemLevel):hearts+' vidas'}</span><span><Timer size={15}/> {cfg.mode==='race'?Math.max(0,RACE_TIME-elapsed)+'s':cfg.mode==='defense'?'Onda '+tdWave+'/8':cfg.mode==='dungeon'?'Andar '+room+'/'+FLOORS+' · '+Math.max(0,dTime)+'s':Math.ceil(gemTime)+'s'}</span><span><Coins size={15}/> {coinBoost?'Bônus de moedas ativo':'Recompensas por desempenho'}</span><span><Trophy size={15}/> Recorde {best.toLocaleString('pt-BR')}</span></div>
  {!started&&!finished&&<div className="nax-start"><div className="nax-start-orb">{cfg.icon}</div><h4>Preparado para jogar?</h4><p>{cfg.mode==='dungeon'?'Desça 10 andares contra o tempo. Enfrente arqueiros, ogros blindados, fantasmas e dois chefes.':cfg.mode==='gems'?'Troque gemas vizinhas. Faça combinações de 3 ou mais e provoque cascatas contra o cronômetro: cada combinação rende tempo e cada nível traz gelo e pedras novas.':cfg.mode==='race'?'Desvie nas três pistas, pule barreiras e deslize por baixo dos obstáculos. Sobreviva por 60 segundos: a velocidade só aumenta.':'Construa torres nos pontos +, evolua as defesas e use habilidades. Resista a 8 ondas em 3 setores, com voadores, blindados e regeneradores.'}</p><ul className="nax-tips">{(TIPS[cfg.mode]||[]).map(t=><li key={t}>{t}</li>)}</ul><button onClick={start}>COMEÇAR JOGO <Zap size={16}/></button></div>}
  {started&&cfg.mode==='dungeon'&&<><div className="nax-arena"><div className="nax-dungeon-scene"><div className="nax-corridor-wall left"/><div className="nax-corridor-wall right"/><div className="nax-corridor-floor"/><div className="nax-floor-lines"/><span className="nax-torch l"/><span className="nax-torch r"/><div className="nax-dungeon-top">MASMORRA NEXUS · ANDAR {room}/{FLOORS}</div><div className="nax-dungeon-message">{dungeonMsg}</div><div className={'nax-dungeon-foe foe-'+foeKind+(foeKind==='wraith'&&elapsed%4>=2?' phased ':' ')+(enemyHp<=0?'hit':'')}><i/><b/><em/></div>{foeTarget!==null&&<div className="nax-dng-warn" style={{left:'calc(50% + '+foeTarget*64+'px)'}}/>}<div className="nax-dng-info">{FOES[foeKind].n}{foeArmor>0?' · armadura '+foeArmor:''} · ⏳ {Math.max(0,dTime)}s · sequência {streak}</div><div className={'nax-dungeon-hero '+(guard?'guard':'')} style={{left:'calc(50% + '+(heroLane*64)+'px)'}}><i/><b/><em/></div><div style={{position:'absolute',top:'55%',left:'50%',transform:'translateX(-50%)',width:'110px',height:'5px',borderRadius:'9px',background:'#1a142b',border:'1px solid #ffffff33'}}><i style={{display:'block',width:Math.min(100,Math.max(0,enemyHp/enemyMax*100))+'%',height:'100%',background:'linear-gradient(90deg,#ff4f78,#ffc36a)',borderRadius:'9px'}}/></div></div></div><div className="nax-dungeon-actions"><button onClick={()=>dungeonAction('left')}><ArrowLeft size={16}/> ESQ.</button><button onClick={()=>dungeonAction('attack')}><Swords size={16}/> GOLPE</button><button onClick={()=>dungeonAction('power')} disabled={mana<35||dungeonPowerCd>0}><Zap size={16}/> ARCANO <small>{dungeonPowerCd?dungeonPowerCd+'s':mana+' MP'}</small></button><button onClick={()=>dungeonAction('guard')}><Shield size={16}/> DEFESA</button><button onClick={()=>dungeonAction('dodge')}><Footprints size={16}/> ESQUIVA</button><button onClick={()=>dungeonAction('right')}><ArrowRight size={16}/> DIR.</button><button onClick={()=>dungeonAction('heal')} disabled={mana<45||healCd>0||hearts>=maxHearts}><Heart size={16}/> CURA <small>{healCd?healCd+'s':'45 MP'}</small></button></div><div className="nax-dungeon-mana"><span>ENERGIA ARCANA</span><i><b style={{width:mana+'%'}}/></i></div></>}
  {started&&cfg.mode==='race'&&<><div className="nax-race-stage" onTouchStart={e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}} onTouchEnd={e=>{if(!touchStart.current)return;const dx=e.changedTouches[0].clientX-touchStart.current.x,dy=e.changedTouches[0].clientY-touchStart.current.y;if(Math.abs(dx)>25)raceKey(dx>0?'right':'left');else if(Math.abs(dy)>20)raceKey(dy<0?'jump':'slide');touchStart.current=null}}><div className="nax-sun"/><div className="nax-city"/><div className="nax-road"/><div className="nax-road-stripes"/>{obstacles.map(o=><span key={o.id} className={'nax-run-obstacle type-'+o.type} style={{left:(25+o.lane*25)+'%',top:o.y+'%'}}>{o.type==='coin'?'':o.type==='boost'?'':o.type==='shield'?'':''}</span>)}<span className={'nax-run-player '+move+(runnerBoost?' boosted':'')+(runnerShield?' shielded':'')} style={{left:(25+lane*25)+'%'}}><i/><b/><em/></span><div style={{position:'absolute',top:10,left:12,color:'#fff',fontSize:10,fontWeight:900,textShadow:'0 2px 8px #000'}}>DISTÂNCIA {distance*12} M · COMBO x{1+Math.min(4,Math.floor(raceCombo/5))} · {Math.round((4.1+Math.min(3.3,elapsed*.055))*25)} KM/H</div></div><div className="nax-race-controls"><button onClick={()=>raceKey('left')}><ArrowLeft/> ESQ.</button><button className="action" onClick={()=>raceKey('jump')}>PULAR</button><button className="action" onClick={()=>raceKey('slide')}>DESLIZAR</button><button onClick={()=>raceKey('right')}>DIR. <ArrowRight/></button></div><div className="nax-runner-powerups"><span>IMPULSO {runnerBoost?'ATIVO':'—'}</span><span>ESCUDO {runnerShield?'ATIVO':'—'}</span><span>ÍMÃ {runnerMagnet?'ATIVO':'—'}</span></div><div className="nax-gem-help">Barreiras amarelas: PULE · Carrinhos roxos: DESLIZE · Muros vermelhos: TROQUE DE PISTA · Óleo: PULE. No celular, deslize pela tela; no teclado, use setas ou WASD.</div></>}
  {started&&cfg.mode==='gems'&&<><div className="nax-combo">{gemBanner||(combo>1?'COMBO x'+combo:'ENCONTRE COMBINAÇÕES DE 3+')}</div><div className="nax-gem-wrap"><div className="nax-gem-side"><div className="nax-gem-stat"><small>TEMPO</small><b>{Math.ceil(gemTime)}s</b></div><div className="nax-gem-stat"><small>COMBO</small><b>x{combo||1}</b></div><div className="nax-gem-stat"><small>META N{gemLevel}</small><b>{gemGoalFor(gemLevel)}</b></div></div><div className={'nax-gem-board'+(shake?' shake':'')}>{gems.map((gem,i)=>{const o=anim&&anim.a===i?anim.b:anim&&anim.b===i?anim.a:null;return <button key={i} onPointerDown={e=>{dragRef.current={i,x:e.clientX,y:e.clientY,done:false};e.currentTarget.setPointerCapture?.(e.pointerId)}} onPointerMove={e=>gemDrag(i,e)} onClick={()=>{if(dragRef.current?.done){dragRef.current=null;return}dragRef.current=null;swapGem(i)}} className={(gem>=20?(gem===22?'stone ice ':gem===20?'stone cracked ':'stone '):gem>=10?'bomb ':'')+(selected===i?'selected ':'')+(matched.includes(i)?'matched ':'')+(o!==null?(anim.bad?'bad':'swap'):'')} style={o!==null?{'--gem':gemColor(gem),'--sx':(o%8)-(i%8),'--sy':Math.floor(o/8)-Math.floor(i/8)}:{'--gem':gemColor(gem)}} aria-label={'Gema '+(i+1)}>{pop&&pop.i===i&&<em className="gem-pop" key={pop.pts+'-'+pop.chain}>+{pop.pts}{pop.chain>1?' ×'+pop.chain:''}{pop.sec?' ⏱+'+pop.sec.toFixed(1)+'s':''}</em>}</button>})}</div><div className="nax-gem-side"><div className="nax-gem-stat"><small>PONTOS</small><b>{Math.floor(score)}</b></div><div className="nax-gem-stat"><small>BLOCOS</small><b>{gems.filter(v=>v>=20).length}</b></div></div></div><div className="nax-gem-help">Arraste uma gema para o lado (ou toque nela e numa vizinha) para trocar. Combine 4+ para criar uma bomba 💣 e quebre as pedras combinando ao lado delas.</div></>}
  {started&&cfg.mode==='defense'&&<><div className="nax-td-hud"><span>WAVE {tdWave}/8</span><span>◈ {tdCash} CRÉDITOS</span><span>BASE {tdBase}/{coreMax}</span><span>FASE {tdStage+1}/3</span><span>ELIMINAÇÕES {tdKills}/{tdGoal}</span></div><div className="nax-td"><div className="td-atmosphere"/><svg className="nax-td-path" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline className="nax-td-pathline" points={tdPath.map(p=>p.join(',')).join(' ')}/><polyline className="nax-td-pathedge" points={tdPath.map(p=>p.join(',')).join(' ')}/>{tdTowers.map(t=><circle key={'range-'+t.id} cx={t.x} cy={t.y} r={TD_TOWER[t.type].range} fill={t.type==='arc'?'#c58cff':t.type==='frost'?'#71eaff':'#69dfff'} fillOpacity={tdSelected===t.id?'.22':'.09'} stroke={t.type==='arc'?'#d9a8ff':t.type==='frost'?'#8cf2ff':'#8ceaff'} strokeOpacity={tdSelected===t.id?'.9':'.42'} strokeWidth={tdSelected===t.id?'.8':'.35'} strokeDasharray={tdSelected===t.id?'2 1':'1 2'}/>)}{tdShots.map(s=><g key={s.id} className={'nax-td-shot '+s.type}><line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}/><circle cx={s.x2} cy={s.y2} r="1.5"/></g>)}</svg>{tdSlots.map(([x,y],i)=><button key={i} className="nax-td-slot" style={{left:x+'%',top:y+'%'}} onClick={()=>tdPlace(x,y)} aria-label="Construir torre">+</button>)}{tdTowers.map(t=><button key={t.id} className={'nax-td-tower '+t.type+(tdSelected===t.id?' selected':'')} style={{left:t.x+'%',top:t.y+'%'}} onClick={()=>setTdSelected(t.id)} aria-label={'Torre nível '+t.level}><TowerArt type={t.type} level={t.level} angle={tdAim(t)}/><b>{t.level}</b></button>)}{tdEnemies.map(e=>{const p=tdPos(e);return <span key={e.id} className={'nax-td-enemy '+(e.boss?'boss ':'')+(e.type||'')} style={{left:p.x+'%',top:p.y+'%'}}><EnemyShip type={e.type} boss={e.boss} angle={tdHeading(e)}/><b><em style={{width:Math.max(0,Math.min(100,e.hp/(e.max||1.8+tdWave*.25)*100))+'%'}}/></b></span>})}<div className="nax-td-base"><i/><strong>NEXUS CORE</strong><b className="td-core-hp"><em style={{width:(tdBase/coreMax*100)+'%'}}/></b></div>{tdFreeze>0&&<label className="td-freeze-label">CAMPO CRIOGÊNICO ATIVO</label>}{tdBanner&&<label className="td-freeze-label td-stage-banner">{tdBanner}</label>}</div><div className="nax-td-legend"><span><i/> Alcance das torres</span><span>Toque numa torre para destacar sua área</span></div><div className="td-abilities"><button disabled={tdAbilityCd>0||!tdEnemies.length} onClick={()=>tdCast('nova')}>PULSO NOVA <small>{tdAbilityCd?tdAbilityCd+'s':'DANO EM ÁREA'}</small></button><button disabled={tdAbilityCd>0||!tdEnemies.length} onClick={()=>tdCast('freeze')}>CAMPO CRIO <small>{tdAbilityCd?tdAbilityCd+'s':'CONGELA INIMIGOS'}</small></button><button style={{gridColumn:'1 / -1'}} onClick={()=>setTdSpeed(v=>v===1?2:1)}>VELOCIDADE {tdSpeed}× <small>{tdSpeed===1?'TOQUE PARA ACELERAR':'TOQUE PARA VOLTAR AO NORMAL'}</small></button></div><div className="nax-td-shop"><button className={tdTowerType==='bolt'?'active':''} onClick={()=>setTdTowerType('bolt')}><TowerArt type="bolt"/>CANHÃO<small>40 · equilibrado</small></button><button className={tdTowerType==='arc'?'active':''} onClick={()=>setTdTowerType('arc')}><TowerArt type="arc"/>ARCANO<small>65 · alto dano</small></button><button className={tdTowerType==='frost'?'active':''} onClick={()=>setTdTowerType('frost')}><TowerArt type="frost"/>CRIO<small>55 · controle</small></button><button className={tdTowerType==='rail'?'active':''} onClick={()=>setTdTowerType('rail')}><TowerArt type="rail"/>RAIL<small>85 · anti-voador</small></button><button onClick={tdUpgrade} disabled={!tdSelected||tdCash<45||tdTowers.find(t=>t.id===tdSelected)?.level>=3}>EVOLUIR<small>{tdSelected?'45+ créditos':'selecione torre'}</small></button><button onClick={tdSell} disabled={!tdSelected}>VENDER<small>{tdSelected?(has('sell-bonus')?'85% do valor':'60% do valor'):'selecione torre'}</small></button></div></>}
  {finished&&<div className="nax-result"><Trophy size={30}/><span>{result}</span><b>{score.toLocaleString('pt-BR')} PTS</b>{record&&<em className="nax-record">NOVO RECORDE!</em>}<p>{result==='MISSÃO CONCLUÍDA'?'Boa! Sua evolução foi registrada.':'Cada tentativa ensina um caminho novo. Tente novamente!'}</p><button onClick={start}><RefreshCw size={15}/> JOGAR NOVAMENTE</button></div>}
  <footer className="nax-game-foot"><Shield size={14}/> {extraHeart?'Proteção extra equipada · ':''}Desafios justos, sem compras obrigatórias. XP sujeito às regras do Arcade.</footer>
 </section>;
}