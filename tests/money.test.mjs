import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../src/data/catalog-snapshot.json' with {type:'json'};
import {parsePaymentMinor,productQuote,cartQuote,steamTopupQuote} from '../src/lib/money.ts';

test('payment parsing is exact and rejects unsupported precision on both sides',()=>{
 for(const [input,expected] of [['1000',100000],['1000,25',100025],['0.01',1],[' 12. ',1200]])assert.equal(parsePaymentMinor(input),expected);
 for(const input of ['0','-1','1.005','1e3','10000000','NaN',null,1000])assert.equal(parsePaymentMinor(input),null);
});
test('Steam adds 5% to the amount credited, with half-up kopeck rounding',()=>{
 assert.deepEqual(steamTopupQuote(100000),{amountMinor:100000,feeMinor:5000,totalMinor:105000,currency:'RUB'});
 assert.equal(steamTopupQuote(10).feeMinor,1);
 assert.equal(steamTopupQuote(1).totalMinor,1);
 assert.throws(()=>steamTopupQuote(-1));assert.throws(()=>steamTopupQuote(0));
});
test('a single item and cart quote agree for every imported product',()=>{
 for(const product of snapshot.products){const line=productQuote(product.priceCreeps);assert.deepEqual(cartQuote([product.priceCreeps]),{totalCreeps:line.creeps,totalRubles:line.rubles});}
 const quote=productQuote(251.2235294117647);assert.equal(quote.creeps,251.22);assert.equal(quote.rubles,427.07);
 assert.equal(productQuote(1.005).creeps,1.01);assert.throws(()=>productQuote(-20));
});
test('cart totals add displayed line kopecks, without rerounding the aggregate',()=>{
 const amounts=[0.01,0.01,0.01];assert.deepEqual(cartQuote(amounts),{totalCreeps:0.03,totalRubles:0.06});
});
