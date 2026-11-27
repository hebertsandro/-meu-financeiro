import test from 'node:test';import assert from 'node:assert/strict';
import {priceProduct,promoNeeds,meiLimit} from './mei-calc.js';
test('preço cobre custo, taxas e margem',()=>{
 const r=priceProduct({material:10,pack:2,hours:1,rate:10,fixed:600,units:100,tax:6,card:3,commission:0,margin:20});
 assert.equal(r.ok,true);assert.equal(Math.round(r.cost*100)/100,28);
 const after=r.price-r.cost-r.price*0.09;assert.ok(Math.abs(after-r.profit)<1e-9);
 assert.ok(r.price>r.minPrice&&r.minPrice>r.cost);
});
test('margem impossível é recusada',()=>assert.equal(priceProduct({material:5,tax:50,margin:50}).ok,false));
test('promoção exige mais vendas',()=>{const r=promoNeeds(100,60,20);assert.equal(r.after,20);assert.equal(r.needed,2)});
test('limite MEI',()=>{assert.equal(meiLimit(40500,6).status,'ok');assert.equal(meiLimit(70000,8).status,'near');assert.equal(meiLimit(90000,9).status,'over');assert.equal(meiLimit(100000,10).status,'over20')});
