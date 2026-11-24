import React from 'react';
// Arte SVG da Defesa do Cofrinho: torres e naves inimigas.
const PAL={bolt:['#7fe3ff','#1f6f96','#e6fbff','#0a2a40'],arc:['#d79bff','#6a2fc0','#fff0ff','#2a0f4a'],frost:['#a6f4ff','#2b86c4','#f2ffff','#0a2e4a'],rail:['#ffd27f','#a8541a','#fff4dc','#33180a']};
export function TowerArt({type='bolt',level=1,angle=-90}){
 const [a,b,c,d]=PAL[type]||PAL.bolt;const id='tw'+type;
 const hex='M24 2 L43 13 L43 35 L24 46 L5 35 L5 13Z';
 return <svg className="td-tower-art" viewBox="0 0 48 48" aria-hidden="true">
  <defs><radialGradient id={id} cx=".35" cy=".3"><stop stopColor={c}/><stop offset=".4" stopColor={a}/><stop offset="1" stopColor={b}/></radialGradient><linearGradient id={id+'p'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3a5670"/><stop offset="1" stopColor={d}/></linearGradient></defs>
  <path d={hex} fill={'url(#'+id+'p)'} stroke={a} strokeWidth="2"/>
  <path d={hex} fill="none" stroke={c} strokeWidth=".8" opacity=".5" transform="translate(24 24) scale(.78) translate(-24 -24)"/>
  {[[24,5],[41,15],[41,33],[24,43],[7,33],[7,15]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.7" fill={a}/>)}
  {level>=2&&<path d={hex} fill="none" stroke="#ffd86b" strokeWidth="1.6" strokeDasharray="4 3" transform="translate(24 24) scale(1.05) translate(-24 -24)"/>}
  <g transform={'rotate('+(angle+90)+' 24 24)'}>
   {type==='bolt'&&<><rect x="16" y="9" width="6" height="19" rx="2.4" fill={b} stroke={c} strokeWidth="1.2"/><rect x="26" y="9" width="6" height="19" rx="2.4" fill={b} stroke={c} strokeWidth="1.2"/><rect x="15" y="6" width="8" height="5" rx="2" fill={a} stroke={c}/><rect x="25" y="6" width="8" height="5" rx="2" fill={a} stroke={c}/><circle cx="19" cy="5" r="2" fill="#fff"/><circle cx="29" cy="5" r="2" fill="#fff"/>{level>=3&&<rect x="21" y="3" width="6" height="22" rx="2.4" fill={a} stroke={c}/>}</>}
   {type==='arc'&&<><path d="M24 4 L33 25 L24 29 L15 25Z" fill={b} stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><path d="M11 14 L16 25 M37 14 L32 25" stroke={a} strokeWidth="3" strokeLinecap="round"/><circle cx="11" cy="13" r="3" fill={c} stroke={a}/><circle cx="37" cy="13" r="3" fill={c} stroke={a}/><circle cx="24" cy="6" r="4" fill={c} stroke={a} strokeWidth="1.4"/>{level>=3&&<path d="M24 6 L20 -1 M24 6 L28 -1" stroke="#ffd86b" strokeWidth="2" strokeLinecap="round"/>}</>}
   {type==='rail'&&<><rect x="21" y="-1" width="6" height="27" rx="2" fill={b} stroke={c} strokeWidth="1.2"/><rect x="18" y="8" width="12" height="4" rx="1.5" fill={a} stroke={c}/><rect x="18" y="16" width="12" height="4" rx="1.5" fill={a} stroke={c}/><circle cx="24" cy="0" r="2" fill="#fff"/></>}
   {type==='frost'&&<><path d="M24 3 L31 20 L28 30 L20 30 L17 20Z" fill={b} stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><path d="M24 7 L27 19 L24 26 L21 19Z" fill={c} opacity=".85"/><path d="M12 12 L19 22 M36 12 L29 22" stroke={a} strokeWidth="3.4" strokeLinecap="round"/><path d="M12 8 L12 16 M8 12 L16 12" stroke={c} strokeWidth="1.2"/></>}
  </g>
  <circle cx="24" cy="25" r="9" fill={d} stroke={a} strokeWidth="1.8"/><circle cx="24" cy="25" r="6" fill={'url(#'+id+')'}/><circle cx="22" cy="23" r="2" fill="#fff" opacity=".9"/>
 </svg>;
}
export function EnemyShip({type='scout',boss=false,angle=0}){
 const st={transform:'rotate('+angle+'deg)'};
 if(boss)return <svg className="td-ship-art boss" viewBox="0 0 60 60" style={st} aria-hidden="true"><path d="M30 2 L44 20 L58 30 L44 36 L40 56 L30 48 L20 56 L16 36 L2 30 L16 20Z" fill="#8a2848" stroke="#ffb0c4" strokeWidth="2" strokeLinejoin="round"/><path d="M30 10 L38 28 L30 42 L22 28Z" fill="#2a0c1e" stroke="#ff8aa8" strokeWidth="1.4"/><circle cx="30" cy="28" r="5" fill="#ffd25a" stroke="#fff" strokeWidth="1.4"/></svg>;
 if(type==='flyer')return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 4 L30 22 L46 30 L30 32 L24 44 L18 32 L2 30 L18 22Z" fill="#3a7ad8" stroke="#a8d0ff" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="24" cy="22" r="4" fill="#e6f4ff" stroke="#fff"/></svg>;
 if(type==='armored')return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M16 2 L32 2 L46 16 L46 32 L32 46 L16 46 L2 32 L2 16Z" fill="#5c6b80" stroke="#cfe0f5" strokeWidth="2.2" strokeLinejoin="round"/><path d="M14 12 H34 V36 H14Z" fill="#26303f" stroke="#9fb4d0" strokeWidth="1.4"/><path d="M14 24 H34" stroke="#9fb4d0" strokeWidth="2"/><circle cx="24" cy="24" r="3.5" fill="#ffcf5a" stroke="#fff"/></svg>;
 if(type==='regen')return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 3 C40 8 46 22 40 36 C34 46 14 46 8 36 C2 22 8 8 24 3Z" fill="#2f9e6a" stroke="#a6ffd0" strokeWidth="1.8"/><path d="M24 14 V34 M14 24 H34" stroke="#eafff3" strokeWidth="4" strokeLinecap="round"/></svg>;
 if(type==='brute')return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 2 L42 12 L46 30 L36 44 L12 44 L2 30 L6 12Z" fill="#a5532a" stroke="#ffc08a" strokeWidth="1.8" strokeLinejoin="round"/><rect x="16" y="14" width="16" height="18" rx="4" fill="#3a1a12" stroke="#ffd0a0"/><circle cx="24" cy="24" r="4" fill="#ff7a3a" stroke="#fff"/></svg>;
 return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 3 L32 20 L44 40 L24 33 L4 40 L16 20Z" fill="#c9405a" stroke="#ffb0bb" strokeWidth="1.8" strokeLinejoin="round"/><path d="M24 12 L28 26 L24 30 L20 26Z" fill="#2a0c18" stroke="#ff9aaa"/><circle cx="24" cy="22" r="2.6" fill="#fff3bf"/></svg>;
}
