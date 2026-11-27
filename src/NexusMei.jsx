import React,{lazy,Suspense,useCallback,useEffect,useMemo,useState} from 'react';
import {Tag,Wrench,GraduationCap,Save,Trash2,Calculator,Percent,ShieldCheck,PiggyBank,Gauge} from 'lucide-react';
import {supabase} from './supabase';
import {priceProduct,promoNeeds,meiLimit,DAS_2026} from './mei-calc';
import './nexus-mei.css';
const NexusMeiLearn=lazy(()=>import('./NexusMeiLearn'));

const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const EMPTY={name:'',material:'',pack:'',hours:'',rate:'',fixed:'',units:'',tax:'',card:'',commission:'',margin:'25'};

function Field({label,hint,prefix,suffix,value,onChange,type='text',inputMode='decimal',placeholder='0'}){
 return <label className="mei-f"><span>{label}</span><div>{prefix&&<i>{prefix}</i>}<input type={type} inputMode={type==='text'?inputMode:undefined} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{suffix&&<i>{suffix}</i>}</div>{hint&&<small>{hint}</small>}</label>;
}

function PriceTab({userId,onToast}){
 const [f,setF]=useState(()=>({...EMPTY,...store.get('nx-mei-draft:'+userId,{})})),[saved,setSaved]=useState([]),[busy,setBusy]=useState(false);
 const set=k=>v=>setF(x=>({...x,[k]:v}));
 useEffect(()=>{store.set('nx-mei-draft:'+userId,f)},[f,userId]);
 const r=useMemo(()=>priceProduct(f),[f]);
 const load=useCallback(async()=>{const {data}=await supabase.from('mei_products').select('id,name,price,margin,data,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(60);setSaved(data||[])},[userId]);
 useEffect(()=>{load()},[load]);
 async function save(){
  if(!r.ok){onToast('Preencha os custos para calcular o preço.');return}
  if(!f.name.trim()){onToast('Dê um nome ao produto para salvar.');return}
  setBusy(true);const {error}=await supabase.from('mei_products').insert({user_id:userId,name:f.name.trim().slice(0,80),price:Math.round(r.price*100)/100,margin:Number(String(f.margin).replace(',','.'))||0,data:f});setBusy(false);
  if(error){onToast(error.message);return}onToast('Produto salvo!');load();
 }
 async function remove(id){const {error}=await supabase.from('mei_products').delete().eq('id',id).eq('user_id',userId);if(!error)setSaved(s=>s.filter(x=>x.id!==id))}
 const parts=r.ok?[['Material e embalagem',r.material+r.pack,'#7c5cff'],['Seu trabalho',r.labor,'#2f9bff'],['Custo fixo',r.fixedUnit,'#2fd2ff'],['Impostos e taxas',r.feesValue,'#ffb34d'],['Lucro',r.profit,'#1fcf8a']]:[];
 return <div className="mei-price">
  <div className="mei-form">
   <section><h4>1 · Custo do produto <small>por unidade</small></h4><Field label="Nome do produto" value={f.name} onChange={set('name')} type="text" inputMode="text" placeholder="Ex.: Bolo de pote"/><div className="two"><Field label="Material" prefix="R$" value={f.material} onChange={set('material')} hint="Ingredientes, peças, tecido…"/><Field label="Embalagem e outros" prefix="R$" value={f.pack} onChange={set('pack')} hint="Caixa, etiqueta, frete…"/></div></section>
   <section><h4>2 · Seu trabalho</h4><div className="two"><Field label="Horas por unidade" value={f.hours} onChange={set('hours')} suffix="h" hint="Tempo gasto em cada uma"/><Field label="Valor da sua hora" prefix="R$" value={f.rate} onChange={set('rate')} hint="Quanto quer ganhar por hora"/></div></section>
   <section><h4>3 · Custos fixos do mês</h4><div className="two"><Field label="Total de fixos" prefix="R$" value={f.fixed} onChange={set('fixed')} hint="Aluguel, internet, sistema, DAS…"/><Field label="Unidades vendidas/mês" value={f.units} onChange={set('units')} hint="Sua estimativa realista"/></div><button type="button" className="mei-chip" onClick={()=>setF(x=>({...x,fixed:String(Math.round(((Number(String(x.fixed).replace(',','.'))||0)+DAS_2026.base+DAS_2026.icms)*100)/100)}))}>+ Somar DAS do MEI (comércio): {brl(DAS_2026.base+DAS_2026.icms)}</button></section>
   <section><h4>4 · Taxas sobre a venda</h4><div className="three"><Field label="Imposto" suffix="%" value={f.tax} onChange={set('tax')} hint="MEI: 0%"/><Field label="Cartão" suffix="%" value={f.card} onChange={set('card')} hint="Taxa da maquininha"/><Field label="Comissão" suffix="%" value={f.commission} onChange={set('commission')} hint="Plataforma/vendedor"/></div></section>
   <section><h4>5 · Lucro desejado</h4><Field label="Margem de lucro" suffix="%" value={f.margin} onChange={set('margin')} hint="Quanto de cada venda deve sobrar"/></section>
  </div>
  <aside className="mei-result">
   {r.ok?<><small>PREÇO DE VENDA IDEAL</small><b className="big">{brl(r.price)}</b><div className="mei-grid"><div><small>Preço mínimo</small><b>{brl(r.minPrice)}</b><em>lucro zero</em></div><div><small>Lucro por unidade</small><b className="g">{brl(r.profit)}</b></div><div><small>Custo total</small><b>{brl(r.cost)}</b></div><div><small>Lucro no mês</small><b className="g">{brl(r.monthlyProfit)}</b><em>com {f.units||1} un.</em></div></div>
   {r.breakEven>0&&<p className="mei-eq">⚖️ Ponto de equilíbrio: <b>{r.breakEven} unidades/mês</b> para cobrir os custos fixos.</p>}
   <div className="mei-stack" role="img" aria-label="Composição do preço">{parts.map(([n,v,c])=><i key={n} style={{width:(v/r.price*100)+'%',background:c}} title={n}/>)}</div>
   <ul className="mei-legend">{parts.map(([n,v,c])=><li key={n}><i style={{background:c}}/>{n}<b>{brl(v)} · {pct(v/r.price*100)}</b></li>)}</ul>
   <button type="button" className="mei-save" disabled={busy} onClick={save}><Save size={17}/> Salvar produto</button></>
   :<div className="mei-empty"><Calculator size={34}/><b>Preencha os custos</b><p>{r.cost>0?'A soma de taxas e margem precisa ficar abaixo de 95%.':'O preço aparece aqui, ao vivo, conforme você digita.'}</p></div>}
  </aside>
  {saved.length>0&&<section className="mei-saved"><h4>Meus produtos</h4>{saved.map(p=><div key={p.id}><button type="button" onClick={()=>{setF({...EMPTY,...p.data});onToast('Produto carregado na calculadora.');window.scrollTo({top:0,behavior:'smooth'})}}><b>{p.name}</b><small>margem {pct(p.margin)}</small></button><strong>{brl(p.price)}</strong><button type="button" className="x" onClick={()=>remove(p.id)} aria-label="Excluir produto"><Trash2 size={15}/></button></div>)}</section>}
 </div>;
}

function Tools({userId}){
 const k='nx-mei-tools:'+userId,[t,setT]=useState(()=>({accum:'',months:String(new Date().getMonth()+1),price:'',cost:'',disc:'10',act:'com',rev:'',fixedM:'',mm:'4',save:'',split:[40,25,20,15],...store.get(k,{})}));
 useEffect(()=>{store.set(k,t)},[t,k]);
 const set=x=>v=>setT(o=>({...o,[x]:v}));
 const lim=meiLimit(t.accum,t.months),promo=promoNeeds(t.price,t.cost,t.disc);
 const das=t.act==='com'?DAS_2026.base+DAS_2026.icms:t.act==='serv'?DAS_2026.base+DAS_2026.iss:DAS_2026.base+DAS_2026.icms+DAS_2026.iss;
 const rev=Number(String(t.rev).replace(',','.'))||0,fx=Number(String(t.fixedM).replace(',','.'))||0,mm=Number(String(t.mm).replace(',','.'))||0,sv=Number(String(t.save).replace(',','.'))||0;
 const labels=['Pró-labore (seu salário)','Reinvestir no negócio','Reserva do negócio','Imprevistos e impostos'];
 const sum=t.split.reduce((a,b)=>a+b,0);
 const msg={ok:['ok','Dentro do limite. Continue acompanhando todo mês.'],near:['warn','Atenção: você passou de 80% do limite anual.'],over:['bad','Você passou de R$ 81.000. Fale com um contador: até 20% acima há diferença de imposto a pagar.'],over20:['bad','Mais de 20% acima do limite: o desenquadramento do MEI pode valer desde o início do ano. Procure um contador urgente.']}[lim.status];
 return <div className="mei-tools">
  <section className="mei-tool"><h4><Gauge size={18}/> Limite anual do MEI</h4><p>Teto de faturamento: <b>{brl(DAS_2026.annualLimit)}</b> por ano.</p><div className="two"><Field label="Faturado no ano até agora" prefix="R$" value={t.accum} onChange={set('accum')}/><Field label="Meses passados" value={t.months} onChange={set('months')} hint="Contando o mês atual"/></div>
   <div className="mei-meter"><i className={msg[0]} style={{width:Math.min(100,lim.pct)+'%'}}/></div><div className="mei-row"><span>Usado: <b>{pct(lim.pct)}</b></span><span>Ainda cabem: <b>{brl(lim.left)}</b></span></div><div className="mei-row"><span>Média mensal: <b>{brl(lim.avg)}</b></span><span>Projeção do ano: <b>{brl(lim.proj)}</b></span></div><p className={'mei-msg '+msg[0]}>{msg[1]}</p></section>
  <section className="mei-tool"><h4><ShieldCheck size={18}/> Imposto mensal (DAS)</h4><div className="mei-seg2">{[['com','Comércio / indústria'],['serv','Serviços'],['both','Os dois']].map(([v,l])=><button type="button" key={v} className={t.act===v?'on':''} onClick={()=>set('act')(v)}>{l}</button>)}</div><div className="mei-grid"><div><small>Por mês</small><b className="g">{brl(das)}</b></div><div><small>Por ano</small><b>{brl(das*12)}</b></div></div><p className="mei-fine">Base de 2026: R$ 81,05 (5% do salário mínimo) + R$ 1 de ICMS (comércio/indústria) e/ou R$ 5 de ISS (serviços). Vence todo dia 20. Confirme no Portal do Empreendedor.</p></section>
  <section className="mei-tool"><h4><Percent size={18}/> Simulador de promoção</h4><div className="three"><Field label="Preço atual" prefix="R$" value={t.price} onChange={set('price')}/><Field label="Custo total" prefix="R$" value={t.cost} onChange={set('cost')} hint="Veja na aba Preço"/><Field label="Desconto" suffix="%" value={t.disc} onChange={set('disc')}/></div>
   {Number(t.price)>0&&Number(t.cost)>0&&<><div className="mei-grid"><div><small>Lucro hoje</small><b>{brl(promo.before)}</b></div><div><small>Lucro com desconto</small><b className={promo.after>0?'g':'r'}>{brl(promo.after)}</b></div></div><p className={'mei-msg '+(promo.after<=0?'bad':promo.needed>2?'warn':'ok')}>{promo.after<=0?'Com esse desconto você vende no prejuízo.':`Para ganhar o mesmo, precisa vender ${promo.needed.toFixed(1).replace('.',',')}x mais (${pct((promo.needed-1)*100)} a mais de vendas).`}</p></>}</section>
  <section className="mei-tool"><h4><PiggyBank size={18}/> Reserva do negócio</h4><div className="three"><Field label="Custos fixos/mês" prefix="R$" value={t.fixedM} onChange={set('fixedM')} hint="Inclua seu pró-labore"/><Field label="Meses de segurança" value={t.mm} onChange={set('mm')} hint="Ideal: 3 a 6"/><Field label="Guardar por mês" prefix="R$" value={t.save} onChange={set('save')}/></div>{fx>0&&<div className="mei-grid"><div><small>Meta da reserva</small><b className="g">{brl(fx*mm)}</b></div><div><small>Tempo para chegar lá</small><b>{sv>0?Math.ceil(fx*mm/sv)+' meses':'—'}</b></div></div>}</section>
  <section className="mei-tool"><h4><Wrench size={18}/> Para onde vai o lucro</h4><Field label="Lucro do mês" prefix="R$" value={t.rev} onChange={set('rev')} hint="O que sobrou depois de custos e impostos"/>
   {t.split.map((v,i)=><div className="mei-split" key={i}><span>{labels[i]}</span><input type="range" min="0" max="100" value={v} onChange={e=>setT(o=>({...o,split:o.split.map((x,j)=>j===i?Number(e.target.value):x)}))}/><b>{v}%</b><em>{brl(rev*v/100)}</em></div>)}
   <p className={'mei-msg '+(sum===100?'ok':'warn')}>{sum===100?'Divisão completa: cada real tem destino.':`A soma está em ${sum}%. Ajuste até chegar a 100%.`}</p></section>
 </div>;
}

export default function NexusMei({session,onToast=()=>{}}){
 const userId=session?.user?.id,[tab,setTab]=useState(()=>store.get('nx-mei-tab',0)||'price');
 useEffect(()=>{store.set('nx-mei-tab',tab)},[tab]);
 if(!userId)return null;
 const tabs=[['price','Preço',Tag],['tools','Ferramentas',Wrench],['learn','Aprender',GraduationCap]];
 return <div className="mei"><div className="mei-hero"><div><small>NEXUS NEGÓCIOS</small><h2>Seu negócio, com os números na mão</h2><p>Calcule preços, controle o limite do MEI e aprenda com aulas e e-books.</p></div><span>💼</span></div>
  <div className="mei-tabs" role="tablist">{tabs.map(([id,l,Icon])=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'on':''} onClick={()=>setTab(id)}><Icon size={17}/>{l}</button>)}</div>
  {tab==='price'&&<PriceTab userId={userId} onToast={onToast}/>}{tab==='tools'&&<Tools userId={userId}/>}{tab==='learn'&&<Suspense fallback={<div className="social-loading"><span className="spinner"/> Carregando…</div>}><NexusMeiLearn userId={userId}/></Suspense>}
  <p className="mei-disc">Conteúdo educativo e estimativas. Não substitui contador nem recomendação de investimento.</p></div>;
}
