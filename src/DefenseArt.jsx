import React from 'react';
// Arte SVG da Defesa do Cofrinho: torres e naves inimigas.
const PAL={bolt:['#9beaff','#287aa0','#e6fbff'],arc:['#f3b4ff','#8844d6','#fff0ff'],frost:['#c8ffff','#2f8fc8','#f2ffff']};
export function TowerArt({type='bolt',level=1,angle=-90}){
 const [a,b,c]=PAL[type]||PAL.bolt;const id='tw'+type;
 return <svg className="td-tower-art" viewBox="0 0 48 48" aria-hidden="true">
  <defs><radialGradient id={id} cx=".35" cy=".3"><stop stopColor={c}/><stop offset=".45" stopColor={a}/><stop offset="1" stopColor={b}/></radialGradient></defs>
  <circle cx="24" cy="24" r="21" fill="#0d1f33" stroke={a} strokeWidth="1.6" opacity=".95"/>
  <circle cx="24" cy="24" r="17" fill="none" stroke={a} strokeWidth=".8" strokeDasharray="3 3" opacity=".6"/>
  {[0,90,180,270].map(r=><rect key={r} x="21" y="1.5" width="6" height="5" rx="1.5" fill={b} stroke={a} strokeWidth="1" transform={'rotate('+r+' 24 24)'}/>)}
  <g transform={'rotate('+(angle+90)+' 24 24)'}>
   {type==='bolt'&&<><rect x="21.5" y="3" width="5" height="19" rx="2" fill={b} stroke={c} strokeWidth="1.2"/><rect x="19" y="3" width="10" height="5" rx="2" fill={a} stroke={c} strokeWidth="1"/>{level>=2&&<><rect x="15" y="9" width="4" height="12" rx="1.5" fill={b} stroke={c}/><rect x="29" y="9" width="4" height="12" rx="1.5" fill={b} stroke={c}/></>}</>}
   {type==='arc'&&<><path d="M24 2 L30 20 L24 16 L18 20Z" fill={b} stroke={c} strokeWidth="1.2" strokeLinejoin="round"/><circle cx="24" cy="4" r="3" fill={c}/>{level>=2&&<><path d="M14 8 L18 20 M34 8 L30 20" stroke={a} strokeWidth="2.4" strokeLinecap="round"/><circle cx="14" cy="8" r="2" fill={c}/><circle cx="34" cy="8" r="2" fill={c}/></>}</>}
   {type==='frost'&&<><path d="M24 2 L28 14 L24 22 L20 14Z" fill={b} stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>{level>=2&&<path d="M12 8 L20 17 M36 8 L28 17" stroke={a} strokeWidth="2.6" strokeLinecap="round"/>}</>}
  </g>
  <circle cx="24" cy="24" r="8" fill={'url(#'+id+')'} stroke={c} strokeWidth="1.6"/><circle cx="24" cy="24" r="3" fill="#fff" opacity=".9"/>
  {level>=3&&<circle cx="24" cy="24" r="13" fill="none" stroke="#ffd86b" strokeWidth="1.6" strokeDasharray="5 3"/>}
 </svg>;
}
export function EnemyShip({type='scout',boss=false,angle=0}){
 const st={transform:'rotate('+angle+'deg)'};
 if(boss)return <svg className="td-ship-art boss" viewBox="0 0 60 60" style={st} aria-hidden="true"><path d="M30 2 L44 20 L58 30 L44 36 L40 56 L30 48 L20 56 L16 36 L2 30 L16 20Z" fill="#8a2848" stroke="#ffb0c4" strokeWidth="2" strokeLinejoin="round"/><path d="M30 10 L38 28 L30 42 L22 28Z" fill="#2a0c1e" stroke="#ff8aa8" strokeWidth="1.4"/><circle cx="30" cy="28" r="5" fill="#ffd25a" stroke="#fff" strokeWidth="1.4"/></svg>;
 if(type==='brute')return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 2 L42 12 L46 30 L36 44 L12 44 L2 30 L6 12Z" fill="#a5532a" stroke="#ffc08a" strokeWidth="1.8" strokeLinejoin="round"/><rect x="16" y="14" width="16" height="18" rx="4" fill="#3a1a12" stroke="#ffd0a0"/><circle cx="24" cy="24" r="4" fill="#ff7a3a" stroke="#fff"/></svg>;
 return <svg className="td-ship-art" viewBox="0 0 48 48" style={st} aria-hidden="true"><path d="M24 3 L32 20 L44 40 L24 33 L4 40 L16 20Z" fill="#c9405a" stroke="#ffb0bb" strokeWidth="1.8" strokeLinejoin="round"/><path d="M24 12 L28 26 L24 30 L20 26Z" fill="#2a0c18" stroke="#ff9aaa"/><circle cx="24" cy="22" r="2.6" fill="#fff3bf"/></svg>;
}
