import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCart} from '../src/lib/preview-cart.ts';
test('presentation cart ignores unknown and duplicate IDs and uses displayed price rounding',()=>{
 const products=[{id:'a',priceCreeps:1.005},{id:'b',priceCreeps:2.005}];
 const cart=previewCart(products,['a','a','b','missing']);
 assert.equal(cart.items.length,2);assert.equal(cart.totalCreeps,3.02);assert.equal(cart.totalRubles,5.14);
 assert.deepEqual(previewCart(products,[]),{items:[],totalCreeps:0,totalRubles:0});
});
