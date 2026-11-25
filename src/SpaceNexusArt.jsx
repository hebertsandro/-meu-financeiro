import React from 'react';
// Arte do Space Nexus: nave do jogador, naves inimigas e chefões (SVG).
export function ShipArt(){return <svg className="space-art-ship" viewBox="0 0 120 144" role="img" aria-label="Caça espacial azul"><defs><linearGradient id="nxsHull" x1="0" x2="1"><stop offset="0" stopColor="#0e2a55"/><stop offset=".3" stopColor="#7fe6ff"/><stop offset=".5" stopColor="#ffffff"/><stop offset=".72" stopColor="#4fb6ec"/><stop offset="1" stopColor="#0b2250"/></linearGradient><linearGradient id="nxsWing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eaffff"/><stop offset=".35" stopColor="#35b8ee"/><stop offset=".75" stopColor="#1a5ea8"/><stop offset="1" stopColor="#0a1c44"/></linearGradient><linearGradient id="nxsGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".3" stopColor="#9ffcff"/><stop offset=".7" stopColor="#1a7fd0"/><stop offset="1" stopColor="#061a42"/></linearGradient><linearGradient id="nxsFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".3" stopColor="#8ffcff"/><stop offset=".7" stopColor="#3a8dff" stopOpacity=".85"/><stop offset="1" stopColor="#3a6cff" stopOpacity="0"/></linearGradient><radialGradient id="nxsAura"><stop offset="0" stopColor="#5ff0ff" stopOpacity=".5"/><stop offset="1" stopColor="#5ff0ff" stopOpacity="0"/></radialGradient></defs><ellipse cx="60" cy="70" rx="54" ry="66" fill="url(#nxsAura)" opacity=".35"/><g className="ship-flame"><path d="M40 104 L34 142 L46 128 L50 106Z" fill="url(#nxsFire)"/><path d="M80 104 L86 142 L74 128 L70 106Z" fill="url(#nxsFire)"/><path d="M52 108 L60 144 L68 108Z" fill="url(#nxsFire)"/></g><path d="M46 62 L8 96 L2 116 L28 110 L50 100Z" fill="url(#nxsWing)" stroke="#c8fbff" strokeWidth="2"/><path d="M74 62 L112 96 L118 116 L92 110 L70 100Z" fill="url(#nxsWing)" stroke="#c8fbff" strokeWidth="2"/><path d="M8 96 L2 116 L14 112Z M112 96 L118 116 L106 112Z" fill="#ffffff" opacity=".7"/><path d="M30 86 L14 104 M90 86 L106 104" stroke="#e2ffff" strokeWidth="1.6" opacity=".7"/><path d="M60 4 L74 30 L82 74 L76 108 L60 118 L44 108 L38 74 L46 30Z" fill="url(#nxsHull)" stroke="#e8ffff" strokeWidth="2.2"/><path d="M60 8 L60 114" stroke="#ffffff" strokeWidth="1.4" opacity=".55"/><rect x="33" y="92" width="14" height="20" rx="5" fill="#123a72" stroke="#7fe8ff" strokeWidth="1.5"/><rect x="73" y="92" width="14" height="20" rx="5" fill="#123a72" stroke="#7fe8ff" strokeWidth="1.5"/><circle cx="40" cy="108" r="4" fill="#ffffff"/><circle cx="80" cy="108" r="4" fill="#ffffff"/><path d="M60 22 Q70 34 68 58 Q60 66 52 58 Q50 34 60 22Z" fill="url(#nxsGlass)" stroke="#dcffff" strokeWidth="1.8"/><path d="M56 30 Q60 26 64 32" stroke="#ffffff" strokeWidth="2" fill="none" opacity=".85"/><circle cx="12" cy="108" r="2.4" fill="#ff4d6d"/><circle cx="108" cy="108" r="2.4" fill="#4dffb0"/></svg>}

const Grad=({id,a,b,c,v})=><linearGradient id={id} x1="0" y1="0" x2={v?0:1} y2={v?1:0}><stop offset="0" stopColor={a}/>{c&&<stop offset=".5" stopColor={c}/>}<stop offset="1" stopColor={b}/></linearGradient>;

// Naves inimigas: cascos largos e robustos, vistos de cima, apontando para baixo.
const SHIPS={
 drone:{c:['#f1dcff','#9a4fe8','#2a0f55','#ff7bd8'],hull:'M50 96 L66 74 L96 70 L94 36 L68 42 L60 10 L50 18 L40 10 L32 42 L6 36 L4 70 L34 74Z',inner:'M50 84 L60 66 L78 60 L76 44 L60 50 L50 30 L40 50 L24 44 L22 60 L40 66Z',gun:[[14,52],[86,52]],eng:[40,60]},
 scout:{c:['#e0feff','#2ec8ea','#0a3a5a','#7dffea'],hull:'M50 98 L70 78 L96 88 L98 46 L72 20 L50 4 L28 20 L2 46 L4 88 L30 78Z',inner:'M50 86 L64 68 L80 70 L82 50 L62 32 L50 18 L38 32 L18 50 L20 70 L36 68Z',gun:[[10,64],[90,64]],eng:[38,62]},
 brute:{c:['#ffe3d4','#e8553a','#4a0f12','#ffd36a'],hull:'M50 96 L80 84 L98 56 L92 14 L66 6 L50 14 L34 6 L8 14 L2 56 L20 84Z',inner:'M50 84 L72 74 L84 54 L80 26 L62 20 L50 28 L38 20 L20 26 L16 54 L28 74Z',gun:[[12,44],[88,44],[24,18],[76,18]],eng:[30,50,70]},
 tank:{c:['#fff3c6','#e0a22a','#4a3410','#9ae8ff'],hull:'M50 98 L82 88 L98 60 L96 30 L74 8 L26 8 L4 30 L2 60 L18 88Z',inner:'M50 88 L74 80 L88 58 L86 34 L68 18 L32 18 L14 34 L12 58 L26 80Z',gun:[[8,48],[92,48]],eng:[32,68]},
 phantom:{c:['#d8caff','#5a46c8','#0c0a22','#9a7bff'],hull:'M50 96 L98 62 L90 28 L66 40 L50 8 L34 40 L10 28 L2 62Z',inner:'M50 84 L82 60 L78 40 L62 48 L50 22 L38 48 L22 40 L18 60Z',gun:[[12,44],[88,44]],eng:[50]},
 splitter:{c:['#fff0c8','#e89a2a','#3a2008','#ffe27a'],hull:'M50 92 L70 98 L96 80 L98 50 L80 24 L58 36 L50 14 L42 36 L20 24 L2 50 L4 80 L30 98Z',inner:'M50 80 L66 84 L82 70 L84 52 L72 40 L56 48 L50 34 L44 48 L28 40 L16 52 L18 70 L34 84Z',gun:[[16,56],[84,56]],eng:[34,66]},
 sniper:{c:['#e6ffe0','#46d86a','#0a3418','#ff4d6d'],hull:'M50 98 L60 80 L96 90 L72 56 L60 36 L54 4 L50 0 L46 4 L40 36 L28 56 L4 90 L40 80Z',inner:'M50 86 L56 72 L70 70 L58 44 L50 12 L42 44 L30 70 L44 72Z',gun:[[50,-6]],eng:[50]},
 shielder:{c:['#d8f0ff','#3a8ae8','#0a1c4a','#7dffea'],hull:'M30 6 L70 6 L94 30 L94 70 L70 94 L30 94 L6 70 L6 30Z',inner:'M32 20 L68 20 L82 34 L82 66 L68 80 L32 80 L18 66 L18 34Z',gun:[],eng:[34,66]},
 mini:{c:['#fff0c8','#f2b84a','#4a2a08','#fff2a0'],hull:'M50 92 L72 70 L90 56 L70 40 L62 10 L50 22 L38 10 L30 40 L10 56 L28 70Z',inner:'M50 80 L64 64 L74 56 L60 46 L50 32 L40 46 L26 56 L36 64Z',gun:[],eng:[50]},
 kamikaze:{c:['#ffd0d6','#e8324a','#3a0a14','#ffd25a'],hull:'M50 100 L66 72 L98 52 L72 44 L66 12 L50 26 L34 12 L28 44 L2 52 L34 72Z',inner:'M50 90 L60 68 L80 54 L62 48 L58 28 L50 38 L42 28 L38 48 L20 54 L40 68Z',gun:[],eng:[50]},
 bomber:{c:['#d8ffe6','#2fb864','#0f3a24','#d6ff7a'],hull:'M50 94 L84 84 L98 54 L92 22 L66 8 L34 8 L8 22 L2 54 L16 84Z',inner:'M50 82 L74 74 L86 54 L82 30 L64 20 L36 20 L18 30 L14 54 L26 74Z',gun:[[8,66],[92,66]],eng:[34,66]}
};
export function EnemyArt({type}){
 const cls='space-art-enemy '+type+'-art',v='0 0 100 100';
 if(type==='ufo')return <svg className={cls} viewBox="0 0 112 86" role="img" aria-label="Disco voador"><defs><Grad id="ufoHull" a="#f2fbff" b="#141c4a" c="#6f93d8"/><radialGradient id="ufoDome" cx=".4" cy=".3"><stop stopColor="#fff"/><stop offset=".35" stopColor="#8ffcff"/><stop offset="1" stopColor="#1a64b8" stopOpacity=".85"/></radialGradient></defs>
  <path d="M34 40 Q34 6 56 6 Q78 6 78 40Z" fill="url(#ufoDome)" stroke="#d8ffff" strokeWidth="2.4"/>
  <ellipse cx="56" cy="30" rx="10" ry="11" fill="#9bff7a" stroke="#d9ffc9" strokeWidth="1.5"/><ellipse cx="52" cy="28" rx="2.6" ry="3.4" fill="#14261a"/><ellipse cx="61" cy="28" rx="2.6" ry="3.4" fill="#14261a"/>
  <ellipse cx="56" cy="52" rx="54" ry="22" fill="url(#ufoHull)" stroke="#e4f3ff" strokeWidth="3"/><ellipse cx="56" cy="46" rx="40" ry="9" fill="#fff" opacity=".22"/>
  {[[16,54,'#ffd166'],[36,62,'#ff6fae'],[56,66,'#7dffea'],[76,62,'#ff6fae'],[96,54,'#ffd166']].map(([x,y,c])=><circle key={x} cx={x} cy={y} r="5.4" fill={c} stroke="#fff" strokeWidth="1.5"/>)}</svg>;
 if(type==='asteroid')return <svg className={cls} viewBox={v} role="img" aria-label="Asteroide"><defs><radialGradient id="enRock" cx=".35" cy=".3"><stop stopColor="#d6c4aa"/><stop offset=".6" stopColor="#7a6350"/><stop offset="1" stopColor="#2a2018"/></radialGradient></defs>
  <path d="M20 18 L48 3 L78 12 L97 42 L88 78 L56 97 L22 88 L4 56Z" fill="url(#enRock)" stroke="#e8d8c0" strokeWidth="2.6" strokeLinejoin="round"/>
  <circle cx="36" cy="38" r="10" fill="#3a2c20" opacity=".7"/><circle cx="66" cy="56" r="12" fill="#3a2c20" opacity=".7"/><circle cx="40" cy="70" r="7" fill="#3a2c20" opacity=".7"/><path d="M24 26 Q40 12 58 12" stroke="#fff" strokeWidth="3.4" fill="none" opacity=".35" strokeLinecap="round"/></svg>;
 const S=SHIPS[type]||SHIPS.drone;const [l,m,d,a]=S.c;const id='eh'+type;
 return <svg className={cls} viewBox={v} role="img" aria-label={'Nave '+type}>
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={l}/><stop offset=".4" stopColor={m}/><stop offset="1" stopColor={d}/></linearGradient><radialGradient id={id+'c'} cx=".4" cy=".3"><stop stopColor="#fff"/><stop offset=".4" stopColor={a}/><stop offset="1" stopColor={m}/></radialGradient></defs>
  <g className="eng">{S.eng.map(x=><ellipse key={x} cx={x} cy="6" rx="8" ry="11" fill={a}/>)}</g>
  <path d={S.hull} fill={'url(#'+id+')'} stroke={l} strokeWidth="3.2" strokeLinejoin="round"/>
  <path d={S.inner} fill={d} opacity=".55" stroke={l} strokeWidth="1.4" strokeLinejoin="round"/>
  <path d="M50 12 V86" stroke={l} strokeWidth="1.6" opacity=".45"/>
  {S.gun.map(([x,y],i)=><g key={i}><rect x={x-4} y={y} width="8" height="22" rx="3" fill={d} stroke={l} strokeWidth="1.6"/><circle cx={x} cy={y+22} r="3.6" fill={a}/></g>)}
  <ellipse cx="50" cy="52" rx="12" ry="15" fill={d} stroke={l} strokeWidth="2.4"/><ellipse cx="50" cy="52" rx="8" ry="11" fill={'url(#'+id+'c)'}/><ellipse cx="47" cy="47" rx="2.6" ry="4" fill="#fff" opacity=".85"/>
 </svg>;
}

const BOSS={
 devourer:{c:['#d6ff9a','#4fb83a','#143a12','#ffe27a'],name:'devourer',
  wing:'M96 40 L40 20 L8 60 L30 84 L70 70 L96 80Z',extra:'M70 70 L44 114 L76 100 L100 86Z',
  hull:'M130 12 Q176 12 190 52 L184 96 Q160 126 130 134 Q100 126 76 96 L70 52 Q84 12 130 12Z'},
 vortex:{c:['#bff0ff','#2f86e0','#0e2a5a','#7dffea'],name:'vortex',
  wing:'M92 56 L30 30 L10 70 L42 96 L94 84Z',extra:'M70 90 L36 128 L86 108Z',
  hull:'M130 18 Q190 20 188 72 Q184 120 130 128 Q76 120 72 72 Q70 20 130 18Z'},
 titan:{c:['#e6d6ff','#7a4ad8','#241050','#ffd86b'],name:'titan',
  wing:'M90 36 L34 28 L16 64 L34 100 L88 96Z',extra:'M44 98 L30 128 L66 118Z',
  hull:'M86 14 L174 14 L196 48 L196 100 L168 130 L92 130 L64 100 L64 48Z'},
 queen:{c:['#ffc9ea','#e0409a','#4a0f3a','#fff0a0'],name:'queen',
  wing:'M98 30 L4 8 L24 64 L6 112 L96 92Z',extra:'M60 96 L36 134 L84 112Z',
  hull:'M130 6 L156 30 L170 78 L152 124 L130 142 L108 124 L90 78 L104 30Z'},
 hydra:{c:['#b6fff0','#1fb59a','#07342d','#ff6fd8'],name:'hydra',
  wing:'M90 36 L30 10 L6 52 L30 90 L84 84Z',extra:'M62 90 L30 130 L80 112Z',
  hull:'M130 10 Q170 10 192 40 L184 100 Q160 130 130 138 Q100 130 76 100 L68 40 Q90 10 130 10Z'},
 eclipse:{c:['#d9e4ff','#6a7cf0','#10133a','#ff5dc8'],name:'eclipse',
  wing:'M96 30 L34 6 L6 46 L40 70 L90 74Z',extra:'M58 80 L30 126 L86 108Z',
  hull:'M130 8 L172 24 L196 70 L172 118 L130 138 L88 118 L64 70 L88 24Z'},
 omega:{c:['#ffd9a6','#f0742a','#4a1608','#7dffea'],name:'omega',
  wing:'M100 22 L60 4 L30 40 L40 70 L84 72Z',extra:'M58 84 L36 118 L84 104Z',
  hull:'M100 10 L160 10 L206 46 L206 98 L160 134 L100 134 L54 98 L54 46Z'}
};
export function BossArt({id='titan'}){
 const B=BOSS[id]||BOSS.titan;const [l,m,d,a]=B.c;
 const wings=<><path d={B.wing} fill={'url(#bw'+id+')'} stroke={l} strokeWidth="3" strokeLinejoin="round"/><path d={B.extra} fill={d} stroke={l} strokeWidth="2.4" strokeLinejoin="round"/></>;
 return <svg className="space-art-boss" viewBox="0 0 260 150" role="img" aria-label={'Chefão '+id}>
  <defs><linearGradient id={'bh'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={l}/><stop offset=".45" stopColor={m}/><stop offset="1" stopColor={d}/></linearGradient><linearGradient id={'bw'+id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m}/><stop offset="1" stopColor={d}/></linearGradient><radialGradient id={'bc'+id}><stop stopColor="#fff"/><stop offset=".35" stopColor={a}/><stop offset="1" stopColor={m} stopOpacity=".2"/></radialGradient></defs>
  <g className="eng">{[96,130,164].map(x=><ellipse key={x} cx={x} cy="8" rx="11" ry="12" fill={a}/>)}</g>
  <g>{wings}</g><g transform="translate(260 0) scale(-1 1)">{wings}</g>
  <path d={B.hull} fill={'url(#bh'+id+')'} stroke={l} strokeWidth="3.4" strokeLinejoin="round"/>
  <path d={B.hull} fill="none" stroke="#fff" strokeWidth="1.2" opacity=".35" transform="translate(130 70) scale(.82) translate(-130 -70)"/>
  {id==='vortex'&&<><circle cx="130" cy="72" r="40" fill="none" stroke={a} strokeWidth="4" strokeDasharray="14 8" opacity=".9"/><circle cx="130" cy="72" r="28" fill="none" stroke={l} strokeWidth="2"/></>}
  {id==='devourer'&&<path d="M96 100 L108 130 L130 112 L152 130 L164 100Z" fill="#0b1f0a" stroke={l} strokeWidth="2.4" strokeLinejoin="round"/>}
  {id==='titan'&&[100,130,160].map(x=><g key={x}><rect x={x-8} y="104" width="16" height="40" rx="6" fill={d} stroke={l} strokeWidth="2.4"/><circle cx={x} cy="146" r="5" fill={a}/></g>)}
  {id==='queen'&&<g fill={a} stroke={l} strokeWidth="2"><path d="M110 24 L118 2 L124 22Z"/><path d="M122 20 L130 -2 L138 20Z"/><path d="M136 22 L142 2 L150 24Z"/></g>}
  {id==='hydra'&&[[92,30],[130,18],[168,30]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="13" fill={d} stroke={l} strokeWidth="2.6"/><circle cx={x} cy={y} r="6" fill={a}/></g>)}
  {id==='eclipse'&&<><circle cx="130" cy="72" r="46" fill="none" stroke={a} strokeWidth="3" opacity=".85"/><path d="M84 72 A46 46 0 0 1 176 72" fill={d} opacity=".6"/></>}
  {id==='omega'&&[[100,8],[160,8],[210,48],[210,98],[160,138],[100,138],[50,98],[50,48]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill={a} stroke={l} strokeWidth="2"/>)}
  <circle cx="130" cy="70" r="24" fill={d} stroke={l} strokeWidth="3.4"/><circle cx="130" cy="70" r="17" fill={'url(#bc'+id+')'}/><circle cx="130" cy="70" r="6" fill="#fff"/>
  <path d="M104 44 Q130 32 156 44" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".5"/>
 </svg>;
}
