import React from 'react';
// Arte do Space Nexus: nave do jogador, naves inimigas e chefões (SVG).
export function ShipArt(){return <svg className="space-art-ship" viewBox="0 0 120 144" role="img" aria-label="Caça espacial azul"><defs><linearGradient id="nxsHull" x1="0" x2="1"><stop offset="0" stopColor="#0e2a55"/><stop offset=".3" stopColor="#7fe6ff"/><stop offset=".5" stopColor="#ffffff"/><stop offset=".72" stopColor="#4fb6ec"/><stop offset="1" stopColor="#0b2250"/></linearGradient><linearGradient id="nxsWing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eaffff"/><stop offset=".35" stopColor="#35b8ee"/><stop offset=".75" stopColor="#1a5ea8"/><stop offset="1" stopColor="#0a1c44"/></linearGradient><linearGradient id="nxsGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".3" stopColor="#9ffcff"/><stop offset=".7" stopColor="#1a7fd0"/><stop offset="1" stopColor="#061a42"/></linearGradient><linearGradient id="nxsFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".3" stopColor="#8ffcff"/><stop offset=".7" stopColor="#3a8dff" stopOpacity=".85"/><stop offset="1" stopColor="#3a6cff" stopOpacity="0"/></linearGradient><radialGradient id="nxsAura"><stop offset="0" stopColor="#5ff0ff" stopOpacity=".5"/><stop offset="1" stopColor="#5ff0ff" stopOpacity="0"/></radialGradient></defs><ellipse cx="60" cy="70" rx="54" ry="66" fill="url(#nxsAura)" opacity=".35"/><g className="ship-flame"><path d="M40 104 L34 142 L46 128 L50 106Z" fill="url(#nxsFire)"/><path d="M80 104 L86 142 L74 128 L70 106Z" fill="url(#nxsFire)"/><path d="M52 108 L60 144 L68 108Z" fill="url(#nxsFire)"/></g><path d="M46 62 L8 96 L2 116 L28 110 L50 100Z" fill="url(#nxsWing)" stroke="#c8fbff" strokeWidth="2"/><path d="M74 62 L112 96 L118 116 L92 110 L70 100Z" fill="url(#nxsWing)" stroke="#c8fbff" strokeWidth="2"/><path d="M8 96 L2 116 L14 112Z M112 96 L118 116 L106 112Z" fill="#ffffff" opacity=".7"/><path d="M30 86 L14 104 M90 86 L106 104" stroke="#e2ffff" strokeWidth="1.6" opacity=".7"/><path d="M60 4 L74 30 L82 74 L76 108 L60 118 L44 108 L38 74 L46 30Z" fill="url(#nxsHull)" stroke="#e8ffff" strokeWidth="2.2"/><path d="M60 8 L60 114" stroke="#ffffff" strokeWidth="1.4" opacity=".55"/><rect x="33" y="92" width="14" height="20" rx="5" fill="#123a72" stroke="#7fe8ff" strokeWidth="1.5"/><rect x="73" y="92" width="14" height="20" rx="5" fill="#123a72" stroke="#7fe8ff" strokeWidth="1.5"/><circle cx="40" cy="108" r="4" fill="#ffffff"/><circle cx="80" cy="108" r="4" fill="#ffffff"/><path d="M60 22 Q70 34 68 58 Q60 66 52 58 Q50 34 60 22Z" fill="url(#nxsGlass)" stroke="#dcffff" strokeWidth="1.8"/><path d="M56 30 Q60 26 64 32" stroke="#ffffff" strokeWidth="2" fill="none" opacity=".85"/><circle cx="12" cy="108" r="2.4" fill="#ff4d6d"/><circle cx="108" cy="108" r="2.4" fill="#4dffb0"/></svg>}

const Grad=({id,a,b,c,v})=><linearGradient id={id} x1="0" y1="0" x2={v?0:1} y2={v?1:0}><stop offset="0" stopColor={a}/>{c&&<stop offset=".5" stopColor={c}/>}<stop offset="1" stopColor={b}/></linearGradient>;

export function EnemyArt({type}){
 const cls='space-art-enemy '+type+'-art';
 const v="0 0 100 100";
 if(type==='scout')return <svg className={cls} viewBox={v} role="img" aria-label="Interceptador"><defs><Grad id="enScoutH" a="#06303f" b="#06303f" c="#7ff3ff"/><Grad id="enScoutW" a="#1b8fb0" b="#aef8ff" v/></defs>
  <g className="eng"><ellipse cx="50" cy="10" rx="7" ry="12" fill="#7dffea"/><ellipse cx="50" cy="8" rx="3" ry="8" fill="#fff"/></g>
  <path d="M50 74 L92 30 L96 50 L58 86Z" fill="url(#enScoutW)" stroke="#d8fdff" strokeWidth="1.6" strokeLinejoin="round"/>
  <path d="M50 74 L8 30 L4 50 L42 86Z" fill="url(#enScoutW)" stroke="#d8fdff" strokeWidth="1.6" strokeLinejoin="round"/>
  <path d="M50 99 L59 58 L57 16 L50 4 L43 16 L41 58Z" fill="url(#enScoutH)" stroke="#e6feff" strokeWidth="2" strokeLinejoin="round"/>
  <path d="M50 84 L54 62 L50 48 L46 62Z" fill="#ffb347" stroke="#fff1cf" strokeWidth="1.4"/>
  <path d="M50 20 V58" stroke="#e6feff" strokeWidth="1.4" opacity=".6"/></svg>;
 if(type==='brute')return <svg className={cls} viewBox={v} role="img" aria-label="Canhoneiro"><defs><Grad id="enBruteH" a="#4a0f12" b="#4a0f12" c="#ff8a5c"/><Grad id="enBruteP" a="#ffb48a" b="#8a2418" v/></defs>
  <g className="eng"><ellipse cx="32" cy="12" rx="6" ry="10" fill="#ffd36a"/><ellipse cx="50" cy="12" rx="6" ry="11" fill="#ffd36a"/><ellipse cx="68" cy="12" rx="6" ry="10" fill="#ffd36a"/></g>
  <rect x="9" y="38" width="9" height="46" rx="4" fill="#3a1a1a" stroke="#ffd0b8" strokeWidth="1.6"/><rect x="82" y="38" width="9" height="46" rx="4" fill="#3a1a1a" stroke="#ffd0b8" strokeWidth="1.6"/>
  <circle cx="13.5" cy="86" r="4" fill="#ff5a3c"/><circle cx="86.5" cy="86" r="4" fill="#ff5a3c"/>
  <path d="M50 94 L78 72 L94 38 L84 14 L16 14 L6 38 L22 72Z" fill="url(#enBruteH)" stroke="#ffe0d0" strokeWidth="2.2" strokeLinejoin="round"/>
  <path d="M26 24 L74 24 L82 44 L68 66 L32 66 L18 44Z" fill="url(#enBruteP)" stroke="#ffe8dc" strokeWidth="1.4" strokeLinejoin="round" opacity=".9"/>
  <path d="M38 50 L50 78 L62 50Z" fill="#2a0d10" stroke="#ffb48a" strokeWidth="1.5" strokeLinejoin="round"/>
  <circle cx="50" cy="50" r="7" fill="#ff5a3c" stroke="#fff" strokeWidth="1.6"/><circle cx="50" cy="50" r="3" fill="#fff"/></svg>;
 if(type==='tank')return <svg className={cls} viewBox={v} role="img" aria-label="Cruzador blindado"><defs><Grad id="enTankH" a="#4a3410" b="#4a3410" c="#ffe08a"/><Grad id="enTankP" a="#fff0b8" b="#a87418" v/></defs>
  <g className="eng"><ellipse cx="34" cy="10" rx="6" ry="9" fill="#9ae8ff"/><ellipse cx="66" cy="10" rx="6" ry="9" fill="#9ae8ff"/></g>
  <path d="M50 97 L84 80 L96 46 L80 12 L20 12 L4 46 L16 80Z" fill="url(#enTankH)" stroke="#fff3c4" strokeWidth="2.4" strokeLinejoin="round"/>
  <path d="M50 86 L74 72 L84 46 L72 22 L28 22 L16 46 L26 72Z" fill="url(#enTankP)" stroke="#fff8dc" strokeWidth="1.6" strokeLinejoin="round" opacity=".92"/>
  <circle cx="50" cy="48" r="17" fill="#3a2a0c" stroke="#ffe9a0" strokeWidth="2.4"/><circle cx="50" cy="48" r="9" fill="#ffb02e" stroke="#fff" strokeWidth="1.6"/>
  <rect x="45" y="52" width="10" height="38" rx="4" fill="#2a1c06" stroke="#ffe9a0" strokeWidth="1.8"/>
  <circle cx="20" cy="60" r="5" fill="#7df0ff"/><circle cx="80" cy="60" r="5" fill="#7df0ff"/><circle cx="20" cy="32" r="4" fill="#ffe9a0"/><circle cx="80" cy="32" r="4" fill="#ffe9a0"/></svg>;
 if(type==='phantom')return <svg className={cls} viewBox={v} role="img" aria-label="Caça furtivo"><defs><Grad id="enPhH" a="#0c0a22" b="#0c0a22" c="#4a3aa0"/></defs>
  <g className="eng"><ellipse cx="50" cy="26" rx="6" ry="9" fill="#9a7bff"/></g>
  <path d="M50 96 L97 30 L72 44 L50 22 L28 44 L3 30Z" fill="url(#enPhH)" stroke="#7df0ff" strokeWidth="2.2" strokeLinejoin="round"/>
  <path d="M50 78 L82 38 M50 78 L18 38" stroke="#7df0ff" strokeWidth="1.6" opacity=".7"/>
  <path d="M38 40 L50 54 L62 40 L50 34Z" fill="#7df0ff" opacity=".9"/><ellipse cx="50" cy="44" rx="4" ry="3" fill="#fff"/>
  <path d="M50 96 L50 60" stroke="#9a7bff" strokeWidth="2" opacity=".8"/></svg>;
 if(type==='ufo')return <svg className={cls} viewBox="0 0 112 86" role="img" aria-label="Disco voador"><defs><Grad id="ufoHull" a="#f2fbff" b="#141c4a" c="#6f93d8"/><radialGradient id="ufoDome" cx=".4" cy=".3"><stop stopColor="#fff"/><stop offset=".35" stopColor="#8ffcff"/><stop offset="1" stopColor="#1a64b8" stopOpacity=".85"/></radialGradient><linearGradient id="ufoBeam" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7dffea" stopOpacity=".55"/><stop offset="1" stopColor="#7dffea" stopOpacity="0"/></linearGradient></defs>
  <path d="M40 62 L26 86 L86 86 L72 62Z" fill="url(#ufoBeam)"/><path d="M34 40 Q34 8 56 8 Q78 8 78 40Z" fill="url(#ufoDome)" stroke="#d8ffff" strokeWidth="2"/>
  <ellipse cx="56" cy="30" rx="9" ry="10" fill="#9bff7a" stroke="#d9ffc9" strokeWidth="1.5"/><ellipse cx="52" cy="28" rx="2.4" ry="3.2" fill="#14261a"/><ellipse cx="61" cy="28" rx="2.4" ry="3.2" fill="#14261a"/>
  <ellipse cx="56" cy="50" rx="52" ry="19" fill="url(#ufoHull)" stroke="#e4f3ff" strokeWidth="2.4"/><ellipse cx="56" cy="46" rx="38" ry="8" fill="#fff" opacity=".2"/>
  {[[18,52,'#ffd166'],[37,58,'#ff6fae'],[56,61,'#7dffea'],[75,58,'#ff6fae'],[94,52,'#ffd166']].map(([x,y,c])=><circle key={x} cx={x} cy={y} r="4.6" fill={c} stroke="#fff" strokeWidth="1.4"/>)}</svg>;
 if(type==='kamikaze')return <svg className={cls} viewBox={v} role="img" aria-label="Ceifador kamikaze"><defs><Grad id="enKamH" a="#3a0a14" b="#3a0a14" c="#ff4a5c"/><radialGradient id="enKamC"><stop stopColor="#fff"/><stop offset=".4" stopColor="#ffd25a"/><stop offset="1" stopColor="#ff3a2a"/></radialGradient></defs>
  <g className="eng"><ellipse cx="50" cy="12" rx="9" ry="13" fill="#ff9a3a"/><ellipse cx="50" cy="10" rx="4" ry="8" fill="#fff3b0"/></g>
  <path d="M50 100 L64 62 L92 36 L64 46 L58 14 L50 24 L42 14 L36 46 L8 36 L36 62Z" fill="url(#enKamH)" stroke="#ffd0d6" strokeWidth="2.2" strokeLinejoin="round"/>
  <path d="M50 92 L58 64 L50 44 L42 64Z" fill="#1a0408" stroke="#ff8a96" strokeWidth="1.5" strokeLinejoin="round"/>
  <circle cx="50" cy="56" r="8" fill="url(#enKamC)"/><path d="M26 42 L40 50 M74 42 L60 50" stroke="#ffd0d6" strokeWidth="2.4" strokeLinecap="round"/></svg>;
 if(type==='bomber')return <svg className={cls} viewBox={v} role="img" aria-label="Bombardeiro"><defs><Grad id="enBomH" a="#0f3a24" b="#0f3a24" c="#86f0a8"/></defs>
  <g className="eng"><ellipse cx="34" cy="10" rx="6" ry="9" fill="#d6ff7a"/><ellipse cx="66" cy="10" rx="6" ry="9" fill="#d6ff7a"/></g>
  <path d="M16 26 L2 14 L4 50 L18 52Z" fill="#1a6a3c" stroke="#d8ffe6" strokeWidth="1.8" strokeLinejoin="round"/><path d="M84 26 L98 14 L96 50 L82 52Z" fill="#1a6a3c" stroke="#d8ffe6" strokeWidth="1.8" strokeLinejoin="round"/>
  <path d="M50 94 Q86 78 86 46 L86 22 L68 10 L32 10 L14 22 L14 46 Q14 78 50 94Z" fill="url(#enBomH)" stroke="#e8fff0" strokeWidth="2.2" strokeLinejoin="round"/>
  <rect x="30" y="54" width="40" height="22" rx="6" fill="#0a2616" stroke="#9af0b8" strokeWidth="1.6"/>
  {[40,50,60].map(x=><circle key={x} cx={x} cy="65" r="5" fill="#ff7a3a" stroke="#ffe0c0" strokeWidth="1.2"/>)}
  <path d="M34 22 L66 22 L60 40 L40 40Z" fill="#a8ffd0" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" opacity=".9"/></svg>;
 if(type==='asteroid')return <svg className={cls} viewBox={v} role="img" aria-label="Asteroide"><defs><radialGradient id="enRock" cx=".35" cy=".3"><stop stopColor="#c9b8a0"/><stop offset=".6" stopColor="#6e5a4a"/><stop offset="1" stopColor="#2a2018"/></radialGradient></defs>
  <path d="M22 20 L48 6 L76 16 L92 44 L82 76 L54 94 L24 84 L8 54Z" fill="url(#enRock)" stroke="#e0d0b8" strokeWidth="2" strokeLinejoin="round"/>
  <circle cx="38" cy="38" r="9" fill="#3a2c20" opacity=".7"/><circle cx="64" cy="56" r="11" fill="#3a2c20" opacity=".7"/><circle cx="40" cy="68" r="6" fill="#3a2c20" opacity=".7"/><path d="M26 26 Q40 14 56 14" stroke="#fff" strokeWidth="3" fill="none" opacity=".35" strokeLinecap="round"/></svg>;
 return <svg className={cls+' drone-art'} viewBox={v} role="img" aria-label="Caça zangão"><defs><Grad id="enDroneH" a="#2a0f55" b="#2a0f55" c="#c79bff"/><Grad id="enDroneW" a="#7a3fd6" b="#e2c6ff" v/></defs>
  <g className="eng"><ellipse cx="40" cy="12" rx="5" ry="10" fill="#ff7bd8"/><ellipse cx="60" cy="12" rx="5" ry="10" fill="#ff7bd8"/></g>
  <path d="M50 90 L72 52 L98 24 L96 44 L66 80Z" fill="url(#enDroneW)" stroke="#f1dcff" strokeWidth="1.8" strokeLinejoin="round"/>
  <path d="M50 90 L28 52 L2 24 L4 44 L34 80Z" fill="url(#enDroneW)" stroke="#f1dcff" strokeWidth="1.8" strokeLinejoin="round"/>
  <path d="M50 98 L62 60 L60 20 L50 8 L40 20 L38 60Z" fill="url(#enDroneH)" stroke="#f7ecff" strokeWidth="2" strokeLinejoin="round"/>
  <path d="M50 82 L56 60 L50 46 L44 60Z" fill="#ff5ab8" stroke="#ffd2ee" strokeWidth="1.5"/><circle cx="50" cy="62" r="3" fill="#fff"/>
  <path d="M28 34 V62 M72 34 V62" stroke="#ffe4fb" strokeWidth="3" strokeLinecap="round"/></svg>;
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
  {id==='omega'&&[[100,8],[160,8],[210,48],[210,98],[160,138],[100,138],[50,98],[50,48]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill={a} stroke={l} strokeWidth="2"/>)}
  <circle cx="130" cy="70" r="24" fill={d} stroke={l} strokeWidth="3.4"/><circle cx="130" cy="70" r="17" fill={'url(#bc'+id+')'}/><circle cx="130" cy="70" r="6" fill="#fff"/>
  <path d="M104 44 Q130 32 156 44" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".5"/>
 </svg>;
}
