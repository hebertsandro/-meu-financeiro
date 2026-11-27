import React,{lazy,Suspense,useCallback,useEffect,useMemo,useState} from 'react';
import {Tag,Wrench,GraduationCap,Save,Trash2,Gauge,ShieldCheck,Percent,PiggyBank,PieChart,ChevronDown} from 'lucide-react';
import {supabase} from './supabase';
import {priceProduct,promoNeeds,meiLimit,DAS_2026} from './mei-calc';
import './nexus-mei.css';
const NexusMeiLearn=lazy(()=>import('./NexusMeiLearn'));

const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const num=v=>Number(String(v??'').replace(',','.'))||0;
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const EMPTY={name:'',material:'',pack:'',hours:'',rate:'',fixed:'',units:'',tax:'',card:'',commission:'',margin:'25'};

function F({label,prefix,suffix,value,onChange,type='decimal',placeholder='0'}){
 return <label className="mei-f"><span>{label}</span><div>{prefix&&<i>{prefix}</i>}<input inputMode={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{suffix&&<i>{suffix}</i>}</div></label>;
}

function PriceTab({userId,onToast}){
 const [f,setF]=useState(()=>({...EMPTY,...store.get('nx-mei-draft:'+userId,{})})),[saved,setSaved]=useState([]),[busy,setBusy]=useState(false),[more,setMore]=useState(false),[list,setList]=useState(false);
 const set=k=>v=>setF(x=>({...x,[k]:v}));
 useEffect(()=>{store.set('nx-mei-draft:'+userId,f)},[f,userId]);
 const r=useMemo(()=>priceProduct(f),[f]);
 const load=useCallback(async()=>{const {data}=await supabase.from('mei_products').select('id,name,price,margin,data,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(60);setSaved(data||[])},[userId]);
 useEffect(()=>{load()},[load]);
 async function save(){
  if(!r.ok){onToast('Preencha os custos para calcular o preço.');return}
  if(!f.name.trim()){onToast('Dê um nome ao produto para salvar.');return}
  setBusy(true);const {error}=await supabase.from('mei_products').insert({user_id:userId,name:f.name.trim().slice(0,80),price:Math.round(r.price*100)/100,margin:num(f.margin),data:f});setBusy(false);
  if(error){onToast(error.message);return}onToast('Produto salvo!');load();
 }
 async function remove(id){const {error}=await supabase.from('mei_products').delete().eq('id',id).eq('user_id',userId);if(!error)setSaved(s=>s.filter(x=>x.id!==id))}
 const parts=r.ok?[[r.material+r.pack,'#7c5cff'],[r.labor,'#2f9bff'],[r.fixedUnit,'#2fd2ff'],[r.feesValue,'#ffb34d'],[r.profit,'#1fcf8a']]:[];
 return <div className="mei-price">
  <section className="mei-card result">
   <small>PREÇO IDEAL DE VENDA</small><b className="price">{r.ok?brl(r.price):'R$ 0,00'}</b>
   {r.ok?<><div className="mei-stack">{parts.map(([v,c],i)=><i key={i} style={{width:(v/r.price*100)+'%',background:c}}/>)}</div>
    <div className="mini"><div><small>Mínimo</small><b>{brl(r.minPrice)}</b></div><div><small>Lucro/un.</small><b className="g">{brl(r.profit)}</b></div><div><small>Equilíbrio</small><b>{r.breakEven?r.breakEven+' un.':'—'}</b></div></div></>
    :<p className="hint">{r.cost>0?'Taxas + margem precisam somar menos de 95%.':'Preencha abaixo e o preço aparece aqui.'}</p>}
  </section>
  <section className="mei-card">
   <div className="grid2"><F label="Material por unidade" prefix="R$" value={f.material} onChange={set('material')}/><F label="Vendas por mês" value={f.units} onChange={set('units')}/>
   <F label="Horas por unidade" suffix="h" value={f.hours} onChange={set('hours')}/><F label="Valor da sua hora" prefix="R$" value={f.rate} onChange={set('rate')}/>
   <F label="Custos fixos do mês" prefix="R$" value={f.fixed} onChange={set('fixed')}/><F label="Margem de lucro" suffix="%" value={f.margin} onChange={set('margin')}/></div>
   <button type="button" className="mei-link" onClick={()=>setF(x=>({...x,fixed:String(Math.round((num(x.fixed)+DAS_2026.base+DAS_2026.icms)*100)/100)}))}>+ somar DAS do MEI ({brl(DAS_2026.base+DAS_2026.icms)})</button>
   <button type="button" className="mei-more" onClick={()=>setMore(m=>!m)} aria-expanded={more}>Impostos e taxas <em>(opcional)</em><ChevronDown size={16} className={more?'up':''}/></button>
   {more&&<div className="grid3"><F label="Imposto" suffix="%" value={f.tax} onChange={set('tax')}/><F label="Cartão" suffix="%" value={f.card} onChange={set('card')}/><F label="Comissão" suffix="%" value={f.commission} onChange={set('commission')}/></div>}
   <div className="mei-savebar"><input className="mei-name" value={f.name} placeholder="Nome do produto" onChange={e=>set('name')(e.target.value)}/><button type="button" disabled={busy} onClick={save}><Save size={16}/> Salvar</button></div>
  </section>
  {saved.length>0&&<section className="mei-card"><button type="button" className="mei-more" onClick={()=>setList(l=>!l)} aria-expanded={list}>Meus produtos <em>({saved.length})</em><ChevronDown size={16} className={list?'up':''}/></button>
   {list&&saved.map(p=><div className="mei-saved" key={p.id}><button type="button" onClick={()=>{setF({...EMPTY,...p.data});onToast('Produto carregado.');window.scrollTo({top:0,behavior:'smooth'})}}><b>{p.name}</b><small>margem {pct(p.margin)}</small></button><strong>{brl(p.price)}</strong><button type="button" className="x" onClick={()=>remove(p.id)} aria-label="Excluir"><Trash2 size={15}/></button></div>)}</section>}
 </div>;
}

function Tools({userId}){
 const k='nx-mei-tools:'+userId,[open,setOpen]=useState('limit'),[t,setT]=useState(()=>({accum:'',months:String(new Date().getMonth()+1),price:'',cost:'',disc:'10',act:'com',rev:'',fixedM:'',mm:'4',save:'',split:[40,25,20,15],...store.get(k,{})}));
 useEffect(()=>{store.set(k,t)},[t,k]);
 const set=x=>v=>setT(o=>({...o,[x]:v}));
 const lim=meiLimit(t.accum,t.months),promo=promoNeeds(t.price,t.cost,t.disc);
 const das=t.act==='com'?DAS_2026.base+DAS_2026.icms:t.act==='serv'?DAS_2026.base+DAS_2026.iss:DAS_2026.base+DAS_2026.icms+DAS_2026.iss;
 const rev=num(t.rev),fx=num(t.fixedM),mm=num(t.mm),sv=num(t.save),sum=t.split.reduce((a,b)=>a+b,0);
 const labels=['Meu salário','Reinvestir','Reserva','Imprevistos'];
 const msg={ok:['ok','Dentro do limite.'],near:['warn','Atenção: mais de 80% do limite.'],over:['bad','Passou de R$ 81.000. Fale com um contador.'],over20:['bad','Mais de 20% acima do limite. Procure um contador urgente.']}[lim.status];
 const tools=[
  ['limit','Limite do MEI',Gauge,pct(lim.pct)+' usado'],['das','Imposto mensal (DAS)',ShieldCheck,brl(das)+'/mês'],['promo','Simulador de promoção',Percent,'veja o impacto do desconto'],['reserve','Reserva do negócio',PiggyBank,fx?brl(fx*mm):'quanto guardar'],['split','Para onde vai o lucro',PieChart,'divida o que sobra']];
 const body={
  limit:<><div className="grid2"><F label="Faturado no ano" prefix="R$" value={t.accum} onChange={set('accum')}/><F label="Meses passados" value={t.months} onChange={set('months')}/></div><div className="meter"><i className={msg[0]} style={{width:Math.min(100,lim.pct)+'%'}}/></div><div className="row"><span>Teto <b>{brl(DAS_2026.annualLimit)}</b></span><span>Ainda cabem <b>{brl(lim.left)}</b></span></div><div className="row"><span>Projeção do ano <b>{brl(lim.proj)}</b></span></div><p className={'msg '+msg[0]}>{msg[1]}</p></>,
  das:<><div className="seg">{[['com','Comércio'],['serv','Serviços'],['both','Os dois']].map(([v,l])=><button type="button" key={v} className={t.act===v?'on':''} onClick={()=>set('act')(v)}>{l}</button>)}</div><div className="mini two"><div><small>Por mês</small><b className="g">{brl(das)}</b></div><div><small>Por ano</small><b>{brl(das*12)}</b></div></div><p className="fine">2026: R$ 81,05 + R$ 1 (ICMS) e/ou R$ 5 (ISS). Vence dia 20.</p></>,
  promo:<><div className="grid3"><F label="Preço" prefix="R$" value={t.price} onChange={set('price')}/><F label="Custo" prefix="R$" value={t.cost} onChange={set('cost')}/><F label="Desconto" suffix="%" value={t.disc} onChange={set('disc')}/></div>{num(t.price)>0&&num(t.cost)>0&&<><div className="mini two"><div><small>Lucro hoje</small><b>{brl(promo.before)}</b></div><div><small>Com desconto</small><b className={promo.after>0?'g':'r'}>{brl(promo.after)}</b></div></div><p className={'msg '+(promo.after<=0?'bad':'warn')}>{promo.after<=0?'Você venderia no prejuízo.':`Precisa vender ${promo.needed.toFixed(1).replace('.',',')}x mais para ganhar o mesmo.`}</p></>}</>,
  reserve:<><div className="grid3"><F label="Fixos/mês" prefix="R$" value={t.fixedM} onChange={set('fixedM')}/><F label="Meses" value={t.mm} onChange={set('mm')}/><F label="Guardo/mês" prefix="R$" value={t.save} onChange={set('save')}/></div>{fx>0&&<div className="mini two"><div><small>Meta</small><b className="g">{brl(fx*mm)}</b></div><div><small>Tempo</small><b>{sv>0?Math.ceil(fx*mm/sv)+' meses':'—'}</b></div></div>}</>,
  split:<><F label="Lucro do mês" prefix="R$" value={t.rev} onChange={set('rev')}/>{t.split.map((v,i)=><div className="split" key={i}><span>{labels[i]}</span><b>{v}%</b><input type="range" min="0" max="100" value={v} onChange={e=>setT(o=>({...o,split:o.split.map((x,j)=>j===i?Number(e.target.value):x)}))}/><em>{brl(rev*v/100)}</em></div>)}<p className={'msg '+(sum===100?'ok':'warn')}>{sum===100?'Tudo distribuído.':`Soma em ${sum}%. Ajuste para 100%.`}</p></>
 };
 return <div className="mei-tools">{tools.map(([id,name,Icon,hint])=><section key={id} className={'mei-card tool'+(open===id?' open':'')}><button type="button" className="head" onClick={()=>setOpen(open===id?null:id)} aria-expanded={open===id}><span className="ic"><Icon size={19}/></span><span className="tx"><b>{name}</b><small>{hint}</small></span><ChevronDown size={18} className={open===id?'up':''}/></button>{open===id&&<div className="body">{body[id]}</div>}</section>)}</div>;
}

export default function NexusMei({session,onToast=()=>{}}){
 const userId=session?.user?.id,[tab,setTab]=useState(()=>{const v=store.get('nx-mei-tab','price');return ['price','tools','learn'].includes(v)?v:'price'});
 useEffect(()=>{store.set('nx-mei-tab',tab)},[tab]);
 if(!userId)return null;
 const tabs=[['price','Preço',Tag],['tools','Ferramentas',Wrench],['learn','Aprender',GraduationCap]];
 return <div className="mei"><div className="mei-tabs" role="tablist">{tabs.map(([id,l,Icon])=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'on':''} onClick={()=>setTab(id)}><Icon size={16}/>{l}</button>)}</div>
  {tab==='price'&&<PriceTab userId={userId} onToast={onToast}/>}{tab==='tools'&&<Tools userId={userId}/>}{tab==='learn'&&<Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando…</div>}><NexusMeiLearn userId={userId}/></Suspense>}
  <p className="mei-disc">Conteúdo educativo e estimativas. Não substitui contador nem recomendação de investimento.</p></div>;
}
