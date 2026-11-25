import React,{useEffect,useState} from 'react';
import {ChevronRight,Zap,Trophy} from 'lucide-react';

export default function FinanceFlapGame({onReward,onMatch,onLoot}){
 const modes=[{id:'normal',name:'Normal',speed:2,desc:'Um desafio equilibrado'},{id:'medium',name:'Médio',speed:3,desc:'Exige reflexos e precisão'},{id:'hard',name:'Difícil',speed:4,desc:'Para quem domina o voo'},{id:'infinite',name:'Infinito',speed:2,desc:'Sobreviva: velocidade e pressão aumentam sem parar'}];
 const [mode,setMode]=useState(null),[bestScore,setBestScore]=useState(()=>Number(window.localStorage.getItem('mf_flap_best')||0));
 const [infiniteBest,setInfiniteBest]=useState(()=>Number(window.localStorage.getItem('mf_flap_best_infinite')||0));
 const canvasRef=React.useRef(null),stateRef=React.useRef({pigY:190,velocity:0,obstacles:[],items:[],frame:0,score:0,rewarded:false,spawnTimer:0,shield:0,shieldFlash:0,slow:0,xpEarned:0,passedObstacles:0});
 const [status,setStatus]=useState('choose'),[score,setScore]=useState(0);
 function begin(){const s=stateRef.current;s.pigY=190;s.velocity=0;s.obstacles=[{x:360,gapY:145,passed:false}];s.items=[];s.shield=0;s.shieldFlash=0;s.slow=0;s.magnet=0;s.x2=0;s.parts=[];s.pops=[];s.meteors=[];s.lasers=[];s.ghost=0;s.combo=0;s.cp=10;s.cpT=900;s.cpMax=900;s.sprint=0;s.stage=0;s.banner=0;s.frame=0;s.spawnTimer=0;s.score=0;s.rewarded=false;s.xpEarned=0;s.passedObstacles=0;setScore(0);setStatus('playing')}
 function flap(){if(status==='ready'||status==='over'||status==='won'){begin();return}if(status==='playing')stateRef.current.velocity=-6.2}
 function backToModes(){setStatus('choose');setMode(null)}
 const flapRef=React.useRef(null);flapRef.current=flap;
 useEffect(()=>{if(!mode)return;const h=e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))return;if(e.code==='Space'||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){e.preventDefault();if(!e.repeat)flapRef.current?.()}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[mode]);
 useEffect(()=>{if(status!=='playing'||!mode)return;const canvas=canvasRef.current,ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});if(!ctx)return;let raf,lastFrame=0;const W=320,H=420;
 const roundRect=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
 const drawPig=(y,velocity,frame)=>{
  ctx.save();ctx.translate(67,y);ctx.rotate(Math.max(-.38,Math.min(.62,velocity*.045)));
  // asas pequenas do mascote
  const wingBeat=Math.sin(frame*.24)*3;
  ctx.fillStyle='#f4a9c5';ctx.strokeStyle='#b95785';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-15,5+wingBeat,10,6,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  // orelhas
  ctx.fillStyle='#f49abb';ctx.strokeStyle='#b95785';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-9,-12,6,10,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(8,-13,6,10,.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  // corpo de porquinho-cofrinho
  const body=ctx.createRadialGradient(-5,-8,2,0,0,23);body.addColorStop(0,'#ffd9e7');body.addColorStop(.58,'#f58fb5');body.addColorStop(1,'#c94f83');
  ctx.fillStyle=body;ctx.strokeStyle='#a83f70';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,20,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  // pezinho
  ctx.fillStyle='#d95f91';ctx.beginPath();ctx.ellipse(-8,14,5,4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(8,14,5,4,0,0,Math.PI*2);ctx.fill();
  // focinho em destaque
  const snout=ctx.createLinearGradient(10,-2,24,10);snout.addColorStop(0,'#ffc2d7');snout.addColorStop(1,'#ed79a4');ctx.fillStyle=snout;ctx.strokeStyle='#b95785';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(17,3,8,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#9e426d';ctx.beginPath();ctx.ellipse(15,3,1.5,2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(20,3,1.5,2,0,0,Math.PI*2);ctx.fill();
  // olho expressivo e brilho
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(7,-6,4.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29304f';ctx.beginPath();ctx.arc(8,-6,2.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(8.7,-7,0.8,0,Math.PI*2);ctx.fill();
  // bochecha
  ctx.fillStyle='#ffb1ca';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(10,5,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // fenda da moeda no topo
  ctx.strokeStyle='#8c3d69';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,-16);ctx.lineTo(5,-16);ctx.stroke();
  // medalhinha de moeda
  ctx.fillStyle='#ffd66f';ctx.strokeStyle='#a9792c';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(-13,-14,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#8a6427';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.fillText('$',-13,-12);
  ctx.restore();
 };
 const loop=(timestamp)=>{if(!lastFrame)lastFrame=timestamp;const elapsed=timestamp-lastFrame;if(elapsed<1000/60-3){raf=requestAnimationFrame(loop);return}lastFrame=timestamp-(elapsed%(1000/60));const s=stateRef.current;s.frame++;s.velocity+=.34;s.pigY+=s.velocity;
  const multiplier=mode.id==='infinite'?Math.min(10,2+s.score*.08):mode.speed*(1+Math.min(.45,s.score*.005));const speed=2.8*multiplier;const spawnEvery=Math.max(30,Math.round(150/multiplier));
  s.spawnTimer++;if(s.spawnTimer>=spawnEvery){s.spawnTimer=0;const gapY=105+Math.random()*150;const bar=s.score>=12&&Math.random()<(mode.id==='normal'?.2:.3);const gapSize=Math.round(Math.max(mode.id==='hard'||mode.id==='infinite'?72:84,(mode.id==='hard'?124:mode.id==='medium'?132:136)-Math.floor(s.score/6)*3)+(bar?26:0));s.obstacles.push({x:W+10,gapY,base:gapY,gapSize,bar,bph:Math.random()*6,barY:gapY,passed:false,ph:Math.random()*6,amp:s.score>=8&&Math.random()<(mode.id==='hard'||mode.id==='infinite'?.45:.3)?Math.min(34,10+s.score*.6):0});if(Math.random()<.22){for(let k=0;k<3;k++)s.items.push({x:W+92+k*22,y:gapY-Math.sin(k*1.5)*18,type:'coin',taken:false,pulse:k})}const itemRoll=Math.random();if(itemRoll<.20){s.items.push({x:W+34,y:gapY,type:'coin',taken:false,pulse:Math.random()*6})}else if(itemRoll<.23){s.items.push({x:W+34,y:gapY,type:'shield',taken:false,pulse:Math.random()*6})}else if(itemRoll<.26){s.items.push({x:W+34,y:gapY,type:'slow',taken:false,pulse:Math.random()*6})}else if(itemRoll<.285){s.items.push({x:W+34,y:gapY,type:'magnet',taken:false,pulse:Math.random()*6})}else if(itemRoll<.31){s.items.push({x:W+34,y:gapY,type:'x2',taken:false,pulse:Math.random()*6})}else if(itemRoll<.335){s.items.push({x:W+34,y:gapY,type:'ghost',taken:false,pulse:Math.random()*6})}if(Math.random()<.12){s.items.push({x:W+52,y:gapY+(Math.random()-.5)*48,type:'loot',taken:false,pulse:Math.random()*6})}}
  const currentSpeed=s.slow>0?speed*.62:speed;if(s.slow>0)s.slow--;if(s.magnet>0)s.magnet--;if(s.x2>0)s.x2--;if(s.ghost>0)s.ghost--;if(s.score>=15&&s.frame%Math.max(240,420-s.stage*30)===0)s.lasers.push({y:70+Math.random()*280,t:110});s.lasers.forEach(z=>{z.t--});s.lasers=s.lasers.filter(z=>z.t>0);s.meteors.forEach(m=>{m.x-=m.vx*(s.slow>0?.62:1)});s.meteors=s.meteors.filter(m=>m.x>-20);if(s.stage>=1&&s.frame%Math.max(110,210-s.stage*20)===0)s.meteors.push({x:W+70,y:60+Math.random()*290,vx:speed*1.3,r:9});s.obstacles.forEach(o=>{o.x-=currentSpeed;if(o.amp)o.gapY=Math.max(95,Math.min(H-95,o.base+Math.sin(s.frame*.04+o.ph)*o.amp));if(!o.passed&&o.x+48<67){o.passed=true;s.score+=s.x2>0?2:1;if(Math.abs(s.pigY-o.gapY)<14){s.combo++;const cb=1+Math.min(3,Math.floor(s.combo/3));s.score+=cb;s.pops.push({x:67,y:s.pigY-24,t:'PERFEITO +'+cb,l:40})}else s.combo=0;s.passedObstacles=(s.passedObstacles||0)+1;if(s.passedObstacles%5===0&&s.xpEarned<(mode.id==='infinite'?60:35)){const earned=onReward(1,'piggy-run-direct');s.xpEarned+=Number(earned)||0;}setScore(s.score)}});s.obstacles=s.obstacles.filter(o=>o.x>-55);s.items.forEach(item=>{item.x-=currentSpeed;item.pulse+=.12;if(s.magnet>0&&(item.type==='coin'||item.type==='loot')){item.x+=(67-item.x)*.09;item.y+=(s.pigY-item.y)*.09}if(!item.taken&&Math.hypot(item.x-67,item.y-s.pigY)<32){item.taken=true;for(let k=0;k<8;k++)s.parts.push({x:item.x,y:item.y,vx:Math.cos(k*.8)*2.2,vy:Math.sin(k*.8)*2.2,l:24,c:item.type==='coin'?'#ffd76a':'#8beaff'});if(item.type==='coin'){s.score+=s.x2>0?6:3;setScore(s.score)}else if(item.type==='magnet')s.magnet=480;else if(item.type==='x2')s.x2=600;else if(item.type==='ghost')s.ghost=300;else if(item.type==='shield'){s.shield=1;s.shieldFlash=0;}else if(item.type==='slow')s.slow=240;else if(item.type==='loot'){void Promise.resolve(onLoot?.('piggy-run','piggy_pickup')).catch(()=>{})}}});s.items=s.items.filter(item=>item.x>-30&&!item.taken);
  let hit=s.pigY<13||s.pigY>H-25;s.obstacles.forEach(o=>{const overlap=67+16>o.x&&67-16<o.x+48;const halfGap=(o.gapSize||136)/2;if(overlap&&(s.pigY-14<o.gapY-halfGap||s.pigY+14>o.gapY+halfGap))hit=true});s.meteors=s.meteors.filter(m=>{const h=Math.hypot(m.x-67,m.y-s.pigY)<m.r+12;if(h)hit=true;return !h});s.obstacles.forEach(o=>{if(o.bar){o.barY=o.gapY+Math.sin(s.frame*.07+o.bph)*((o.gapSize||136)/2-17);if(67+16>o.x&&67-16<o.x+48&&Math.abs(s.pigY-o.barY)<21)hit=true}});s.lasers.forEach(z=>{if(z.t<=30&&Math.abs(s.pigY-z.y)<16)hit=true});if(s.ghost>0&&s.pigY>=13&&s.pigY<=H-25)hit=false;if(s.cpT>0){s.cpT--;if(s.cpT===0)s.sprint=0}if(s.score>=s.cp){if(s.cpT>0){s.sprint++;const bn=2+Math.min(6,s.sprint)+Math.ceil(5*s.cpT/s.cpMax);s.score+=bn;s.pops.push({x:W/2,y:96,t:'RÁPIDO! +'+bn,l:70})}s.cp=Math.floor(s.score/10)*10+10;s.cpMax=s.cpT=Math.round(spawnEvery*9);setScore(s.score)}if(s.shieldFlash>0)s.shieldFlash--;if(hit&&s.shield>0){s.shield=0;s.shieldFlash=24;hit=false;s.velocity=-5;}
  const themes=[['#15234a','#101b39','#091327'],['#2a1346','#1d1030','#0e0820'],['#0f3a3a','#0b2a30','#06151c'],['#4a2412','#331a10','#1a0c08']];const stageNow=Math.floor(s.score/25);if(stageNow>s.stage){s.stage=stageNow;s.banner=110}const th=themes[stageNow%4];const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,th[0]);bg.addColorStop(.55,th[1]);bg.addColorStop(1,th[2]);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // céu em camadas, estrelas cintilantes e partículas de profundidade
  const glow=ctx.createRadialGradient(245,82,8,245,82,190);glow.addColorStop(0,'#6256a855');glow.addColorStop(1,'#6256a800');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  for(let i=0;i<26;i++){const x=(i*47+s.frame*(speed*.09*(i%2?1:.45)))%W,y=(i*73)%H;const twinkle=.55+Math.sin(s.frame*.07+i)*.35;ctx.globalAlpha=twinkle;ctx.fillStyle=i%3===0?'#d6caff':'#9deaff';ctx.beginPath();ctx.arc(x,y,i%5===0?1.8:1,0,Math.PI*2);ctx.fill();if(i%8===0){ctx.strokeStyle='#d6caff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke()}}ctx.globalAlpha=1;
  ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#8e9eff';for(let i=0;i<4;i++){const x=(i*105-s.frame*.25+W*2)%W;ctx.beginPath();ctx.ellipse(x,75+i*87,34,9,0,0,Math.PI*2);ctx.fill()}ctx.restore();
  // cofres dourados com moldura, rebites e placas ornamentais — versão corrigida
  s.obstacles.forEach(o=>{
    const drawVault=(x,y,h,top)=>{
      if(h<=0)return;
      ctx.save();
      
      const g=ctx.createLinearGradient(x,0,x+48,0);
      g.addColorStop(0,'#684326');g.addColorStop(.18,'#b87935');g.addColorStop(.38,'#f4cf79');g.addColorStop(.62,'#d99b45');g.addColorStop(.84,'#f6d98c');g.addColorStop(1,'#684326');
      ctx.fillStyle=g;roundRect(x,y,48,h,7);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle='#ffe7ad';ctx.lineWidth=1.6;ctx.stroke();
      ctx.strokeStyle='#8d5b2c';ctx.lineWidth=1;roundRect(x+5,y+5,38,Math.max(0,h-10),4);if(h>12)ctx.stroke();
      ctx.fillStyle='#8b5b2e';
      for(let yy=y+13;yy<y+h-7;yy+=30){ctx.beginPath();ctx.arc(x+7,yy,1.7,0,Math.PI*2);ctx.arc(x+41,yy,1.7,0,Math.PI*2);ctx.fill()}
      if(h>36){
        ctx.fillStyle='#9b672e';ctx.globalAlpha=.72;
        for(let yy=y+23;yy<y+h-12;yy+=38){ctx.beginPath();ctx.arc(x+24,yy,7,0,Math.PI*2);ctx.fill()}
        ctx.globalAlpha=1;ctx.fillStyle='#ffdf87';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('✦',x+24,Math.min(y+h-8,y+27));
      }
      ctx.fillStyle='#ffdf87';roundRect(x-4,top?y+h-14:y,56,14,4);ctx.fill();
      ctx.strokeStyle='#a87332';ctx.stroke();ctx.fillStyle='#fff0bd';ctx.fillRect(x+5,top?y+h-11:y+3,2,5);
      ctx.restore();
    };
    const halfGap=(o.gapSize||136)/2;drawVault(o.x,0,o.gapY-halfGap,true);
    drawVault(o.x,o.gapY+halfGap,H-o.gapY-halfGap,false);
  });
  // Itens especiais flutuando entre os cofres
  s.items.forEach(item=>{const bob=Math.sin(item.pulse)*4;ctx.save();ctx.fillStyle=item.type==='coin'?'#f6c957':item.type==='shield'?'#39bde9':item.type==='loot'?'#f6d84b':item.type==='magnet'?'#ff8f6b':item.type==='x2'?'#6bff9a':item.type==='ghost'?'#d6e4ff':'#9a78ed';ctx.beginPath();ctx.arc(item.x,item.y+bob,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff4';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#18213b';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.type==='coin'?'+':item.type==='shield'?'S':item.type==='loot'?'◆':item.type==='magnet'?'U':item.type==='x2'?'×2':item.type==='ghost'?'F':'↘',item.x,item.y+bob);ctx.restore()});
  // rastro de brilho do porquinho
  s.obstacles.forEach(o=>{if(!o.bar)return;ctx.save();ctx.fillStyle='#ff5d7a';ctx.shadowColor='#ff5d7a';ctx.shadowBlur=10;roundRect(o.x-4,o.barY-6,56,12,5);ctx.fill();ctx.fillStyle='#ffd0da';ctx.fillRect(o.x+4,o.barY-2,40,3);ctx.restore()});s.lasers.forEach(z=>{ctx.save();if(z.t>30){ctx.globalAlpha=.35+.25*Math.sin(s.frame*.5);ctx.strokeStyle='#ff5d7a';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,z.y);ctx.lineTo(W,z.y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#ff5d7a';ctx.font='bold 16px sans-serif';ctx.textAlign='left';ctx.fillText('!',6,z.y+5)}else{ctx.fillStyle='#ffe3ea';ctx.shadowColor='#ff3f75';ctx.shadowBlur=18;ctx.fillRect(0,z.y-6,W,12);ctx.fillStyle='#fff';ctx.fillRect(0,z.y-2,W,4)}ctx.restore()});s.meteors.forEach(m=>{ctx.globalAlpha=.3;ctx.fillStyle='#ff8a3a';ctx.fillRect(m.x+m.r,m.y-3,36,6);ctx.globalAlpha=1;ctx.fillStyle='#ff7a2a';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.28);ctx.fill();ctx.fillStyle='#ffd9a0';ctx.beginPath();ctx.arc(m.x-2,m.y-2,m.r*.45,0,6.28);ctx.fill();if(m.x>W-4){ctx.fillStyle='#ff4a5c';ctx.font='bold 16px sans-serif';ctx.textAlign='right';ctx.fillText('!',W-6,m.y+5)}});s.pops.forEach(q=>{q.y-=.6;q.l--;ctx.globalAlpha=Math.max(0,q.l/40);ctx.fillStyle='#ffe08a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(q.t,q.x,q.y)});ctx.globalAlpha=1;s.pops=s.pops.filter(q=>q.l>0);s.parts.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.l--;ctx.globalAlpha=Math.max(0,q.l/24);ctx.fillStyle=q.c;ctx.fillRect(q.x,q.y,3,3)});ctx.globalAlpha=1;s.parts=s.parts.filter(q=>q.l>0);ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#ff9fc6';ctx.beginPath();ctx.ellipse(38,s.pigY+5,12,4,-.15,0,Math.PI*2);ctx.fill();ctx.restore();ctx.globalAlpha=s.ghost>0?.5:1;drawPig(s.pigY,s.velocity,s.frame);ctx.globalAlpha=1;
  if(s.shield>0||s.shieldFlash>0){ctx.save();ctx.globalAlpha=s.shield>0?1:s.shieldFlash/24;ctx.fillStyle='#55dfff';ctx.globalAlpha*=.13;ctx.beginPath();ctx.arc(67,s.pigY,31,0,Math.PI*2);ctx.fill();ctx.globalAlpha=s.shield>0?1:s.shieldFlash/24;ctx.strokeStyle='#8beaff';ctx.lineWidth=s.shield>0?3.5:4;ctx.shadowColor='#58d9ff';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(67,s.pigY,29,0,Math.PI*2);ctx.stroke();ctx.restore()}if(s.shield>0){ctx.save();ctx.fillStyle='#8beaff';ctx.font='bold 9px sans-serif';ctx.textAlign='right';ctx.shadowColor='#58d9ff';ctx.shadowBlur=8;ctx.fillText('ESCUDO ATIVO',W-10,18);ctx.restore()}if(s.slow>0){ctx.fillStyle='#c8b5ff';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('TEMPO LENTO',10,18)}if(s.magnet>0){ctx.fillStyle='#ffb08f';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('ÍMÃ ATIVO',10,30)}if(s.ghost>0){ctx.fillStyle='#d6e4ff';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('FANTASMA',10,54)}if(s.x2>0){ctx.fillStyle='#8dffb0';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('PONTOS x2',10,42)}if(s.banner>0){s.banner--;ctx.save();ctx.globalAlpha=Math.min(1,s.banner/30);ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.shadowColor='#8beaff';ctx.shadowBlur=14;ctx.fillText('FASE '+(s.stage+1),W/2,120);ctx.restore()}ctx.fillStyle='#fff';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(String(s.score),W/2,39);ctx.fillStyle='#c5b8ff';ctx.font='bold 9px sans-serif';ctx.fillText(mode.id==='infinite'?'MODO INFINITO · x'+multiplier.toFixed(1):mode.name.toUpperCase()+' · x'+multiplier.toFixed(1),W/2,56);ctx.fillStyle='#ffffff22';ctx.fillRect(W/2-60,64,120,5);ctx.fillStyle=s.cpT>s.cpMax*.3?'#8beaff':'#ff8f6b';ctx.fillRect(W/2-60,64,120*Math.max(0,s.cpT)/s.cpMax,5);ctx.fillStyle='#c5b8ff';ctx.font='bold 9px sans-serif';ctx.fillText('SPRINT até '+s.cp+(s.sprint>0?' · sequência x'+s.sprint:''),W/2,82);
  if(mode.id!=='infinite'&&s.score>=100){s.rewarded=true;setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});void onMatch?.({gameKey:'piggy-run',score:s.score,xpEarned:Number(s.xpEarned)||0,mode:mode.id,won:true});setStatus('won');return}
  if(hit){setBestScore(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best',String(value));return value});if(mode.id==='infinite')setInfiniteBest(old=>{const value=Math.max(old,s.score);window.localStorage.setItem('mf_flap_best_infinite',String(value));return value});if(!s.rewarded){s.rewarded=true;void onMatch?.({gameKey:'piggy-run',score:s.score,xpEarned:Number(s.xpEarned)||0,mode:mode.id,won:false})}setStatus('over');return}
  raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[status,mode]);
 return <div className="flap-game">
 {status==='choose'?<div className="flap-mode-select"><div className="flap-mode-heading"><b>ESCOLHA SEU MODO</b><span>Supere os obstáculos e escolha entre partidas rápidas ou sobrevivência infinita</span></div><div className="flap-mode-grid">{modes.map(item=><button key={item.id} className={'flap-mode-card mode-'+item.id} onClick={()=>{setMode(item);setStatus('ready')}}><span className="flap-mode-icon">{item.id==='infinite'?'∞':item.id==='easy'?'🪽':item.id==='normal'?'⚡':item.id==='medium'?'🎯':'🔥'}</span><strong>{item.name}</strong><small>{item.id==='infinite'?'Recorde: '+infiniteBest+' pontos':'Velocidade: '+item.speed+'x'}</small><em>{item.desc}</em>{item.id!=='infinite'&&<span className="flap-mode-reward">🏆 Complete 100 pontos</span>}</button>)}</div></div>:<>
 <div className="flap-mode-top"><button className="text-button" onClick={backToModes}>← Modos</button><b>{mode?.name} {mode?.id==='infinite'?'∞':'· '+mode?.speed+'x'}</b><span>{mode?.id==='infinite'?'Recorde: '+infiniteBest:'Meta: 100 pontos'}</span></div>
 <div className="flap-game-stage"><canvas ref={canvasRef} width="320" height="420" onPointerDown={flap} aria-label="Asas da Fortuna: toque para fazer o porquinho-cofrinho voar."/>
 {status!=='playing'&&<div className="flap-overlay"><b>{status==='ready'?'Prepare o voo!':status==='won'?'COFRINHO LENDÁRIO! 🏆':'Ops! O porquinho bateu!'}</b><span>{status==='ready'?'Toque (ou Espaço) para começar e mantenha o porquinho no ar.':status==='won'?'Você alcançou 100 pontos e completou o desafio!':'Pontuação: '+score+' · Toque para tentar novamente.'}</span>{status==='won'?<button className="primary" onClick={backToModes}>Escolher outro modo <ChevronRight size={16}/></button>:<button className="primary" onClick={begin}>{status==='ready'?'Começar voo':'Tentar novamente'} <ChevronRight size={16}/></button>}</div>}
 </div>
 <div className="flap-game-info"><span><Zap size={15}/> centro = PERFEITO · chegue rápido ao sprint · lasers e barras</span><b>{score}{mode?.id==='infinite'?' pontos':' / 100'}</b></div>
 <div className="flap-progress-track"><i style={{width:(mode?.id==='infinite'?Math.min(100,score):Math.min(100,score))+'%'}}/></div>
 <div className="flap-best-score"><Trophy size={14}/> {mode?.id==='infinite'?'Recorde infinito: '+infiniteBest:'Melhor pontuação: '+bestScore}</div>
 </>}
 </div>
}

