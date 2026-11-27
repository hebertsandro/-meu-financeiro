// Cálculos de precificação do micro-empreendedor.
const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)&&x>0?x:0};
export const DAS_2026={base:81.05,icms:1,iss:5,minimumWage:1621,annualLimit:81000};
export function priceProduct(i){
 const material=n(i.material),pack=n(i.pack),labor=n(i.hours)*n(i.rate),units=Math.max(1,n(i.units)),fixedUnit=n(i.fixed)/units;
 const variable=material+pack+labor,cost=variable+fixedUnit;
 const fees=n(i.tax)+n(i.card)+n(i.commission),margin=n(i.margin),sum=fees+margin;
 if(sum>=95||cost<=0)return {ok:false,variable,fixedUnit,cost};
 const price=cost/(1-sum/100),minPrice=cost/(1-fees/100);
 const profit=price*margin/100,contribution=price*(1-fees/100)-variable;
 const breakEven=contribution>0&&n(i.fixed)>0?Math.ceil(n(i.fixed)/contribution):0;
 return {ok:true,material,pack,labor,variable,fixedUnit,cost,price,minPrice,profit,feesValue:price*fees/100,breakEven,monthlyProfit:profit*units};
}
export function promoNeeds(price,cost,discount){
 const d=n(discount)/100,p0=n(price)-n(cost),p1=n(price)*(1-d)-n(cost);
 return {before:p0,after:p1,needed:p1>0&&p0>0?p0/p1:null};
}
export function meiLimit(accum,monthsPassed){
 const a=n(accum),m=Math.min(12,Math.max(1,Math.round(n(monthsPassed))||1)),avg=a/m,proj=avg*12;
 const pct=a/DAS_2026.annualLimit*100,left=Math.max(0,DAS_2026.annualLimit-a);
 return {pct,avg,proj,left,projPct:proj/DAS_2026.annualLimit*100,status:a>DAS_2026.annualLimit*1.2?'over20':a>DAS_2026.annualLimit?'over':pct>=80?'near':'ok'};
}
