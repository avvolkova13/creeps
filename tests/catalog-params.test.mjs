import test from 'node:test';
import assert from 'node:assert/strict';
import {updateCatalogParam,resetCatalogParams} from '../src/lib/catalog-params.ts';
test('multi-select and Cyrillic survive a URL round trip',()=>{
 let search=updateCatalogParam('view=imported','category',['knife','pistol']);
 search=updateCatalogParam(search,'q','Механо-пушка');
 const params=new URLSearchParams(search);assert.deepEqual(params.getAll('category'),['knife','pistol']);assert.equal(params.get('q'),'Механо-пушка');assert.equal(params.get('view'),'imported');
});
test('reset removes all filters including legacy category, preserving sort and unrelated params',()=>{
 const clean=new URLSearchParams(resetCatalogParams('category=knife&min=10&color=blue&stickers=1&q=AK&sort=price-asc&view=imported'));
 assert.equal(clean.toString(),'sort=price-asc&view=imported');assert.equal(updateCatalogParam('category=knife','category',[]),'');
});
