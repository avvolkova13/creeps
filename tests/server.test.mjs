import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore, hash } from '../server/store.mjs';
import { createApi } from '../server/api.mjs';
import { validateTradeUrl, verifySteamAssertion, lookupSteamProfile, validSteamId, STEAM_OPENID } from '../server/steam.mjs';

// Test identities/assertions are only in this test module, never exposed by a runtime endpoint.
const STEAM_ID = '76561198000000000';
const SECOND_ID = '76561198000000001';
const origin = 'http://127.0.0.1:3100';
const products = [{ id: 'test-skin', name: 'Test skin', priceCreeps: 10.25 }];
function assertion(returnTo, nonce = `${new Date().toISOString().slice(0, 19)}Ztest`) {
  return new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0', 'openid.mode': 'id_res', 'openid.op_endpoint': STEAM_OPENID,
    'openid.return_to': returnTo, 'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${STEAM_ID}`, 'openid.response_nonce': nonce,
    'openid.assoc_handle': 'test-association', 'openid.sig': 'test-signature',
    'openid.signed': 'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
  });
}
const accepted = async () => new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n');
async function fixture(t, fetcher = accepted) {
  const store = openStore(':memory:');
  const handle = createApi({ store, origin, products, fetcher });
  const server = createServer(async (req, res) => { if (!await handle(req, res)) { res.writeHead(404); res.end(); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookies = new Map();
  async function request(path, method = 'GET', body, headers = {}) {
    const response = await fetch(`${base}/api${path}`, { method, redirect: 'manual', headers: { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(method === 'GET' ? {} : { Origin: origin, 'X-Creeps-Request': '1', 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const value of response.headers.getSetCookie()) { const [key, ...rest] = value.split(';')[0].split('='); cookies.set(key, rest.join('=')); }
    return response;
  }
  async function login() {
    const start = await request('/auth/steam');
    const returnTo = new URL(start.headers.get('location')).searchParams.get('openid.return_to');
    const url = new URL(returnTo); const params = assertion(returnTo);
    for (const [key, value] of params) url.searchParams.set(key, value);
    const response = await request(url.pathname.slice(4) + url.search);
    return response;
  }
  return { store, request, login, get cookies() { return cookies; }, set cookies(value) { cookies = value; } };
}
test('OpenID rejects mismatched identity, endpoint, return_to, unsigned fields, duplicate keys, stale nonce and invalid signature', async () => {
  const returnTo = `${origin}/api/auth/callback?state=test`;
  for (const [key, value] of [ ['openid.identity', `https://steamcommunity.com/openid/id/${SECOND_ID}`], ['openid.op_endpoint', 'https://attacker.example'], ['openid.return_to', 'https://attacker.example'], ['openid.signed', 'claimed_id'], ['openid.response_nonce', '2020-01-01T00:00:00Zexpired'] ]) {
    const params = assertion(returnTo); params.set(key, value);
    await assert.rejects(() => verifySteamAssertion(params, returnTo, accepted));
  }
  const duplicate = assertion(returnTo); duplicate.append('openid.identity', 'other');
  await assert.rejects(() => verifySteamAssertion(duplicate, returnTo, accepted));
  await assert.rejects(() => verifySteamAssertion(assertion(returnTo), returnTo, async () => new Response('is_valid:false\n')));
  const result = await verifySteamAssertion(assertion(returnTo), returnTo, async (url, options) => {
    assert.equal(url, STEAM_OPENID); assert.equal(options.body.get('openid.mode'), 'check_authentication');
    assert.equal(options.redirect, 'error'); return accepted();
  });
  assert.equal(result.steamId, STEAM_ID);
  const documentedHttpId = assertion(returnTo);
  for (const field of ['openid.claimed_id', 'openid.identity']) documentedHttpId.set(field, `http://steamcommunity.com/openid/id/${STEAM_ID}`);
  assert.equal((await verifySteamAssertion(documentedHttpId, returnTo, accepted)).steamId, STEAM_ID);
});
test('trade URL restricts host, identity, token and duplicate parameters', () => {
  const partner = BigInt(STEAM_ID) - 76561197960265728n;
  const url = `https://steamcommunity.com/tradeoffer/new/?partner=${partner}&token=abcdefgh`;
  assert.equal(validateTradeUrl(url, STEAM_ID), url);
  for (const bad of [url.replace('steamcommunity.com', 'steamcommunity.com.evil.test'), url.replace('https:', 'http:'), url + '&partner=1', url + '#fragment', url.replace('abcdefgh', 'x'), url.replace(String(partner), '1')]) assert.throws(() => validateTradeUrl(bad, STEAM_ID));
  assert.throws(() => validateTradeUrl(url, SECOND_ID));
  assert.equal(validSteamId('123'), false);
});
test('profile verification requires matching Steam response, distinguishes missing profile from connection failure', async () => {
  const profile = await lookupSteamProfile(STEAM_ID, async url => {
    assert.equal(url, `https://steamcommunity.com/profiles/${STEAM_ID}/?xml=1`);
    return new Response(`<profile><steamID64>${STEAM_ID}</steamID64><steamID><![CDATA[Test]]></steamID></profile>`);
  });
  assert.equal(profile.name, 'Test');
  await assert.rejects(() => lookupSteamProfile(STEAM_ID, async () => new Response('<error>The specified profile could not be found.</error>')), e => e.status === 404);
  await assert.rejects(() => lookupSteamProfile(STEAM_ID, async () => new Response('<html>challenge</html>')), e => e.status === 502);
  await assert.rejects(() => lookupSteamProfile('https://example.com', accepted), e => e.status === 400);
});
test('cart uses server prices, deduplicates a skin, persists, and isolates guests', async t => {
  const f = await fixture(t);
  await f.request('/session'); const firstCookies = new Map(f.cookies);
  assert.equal((await f.request('/cart/items', 'POST', { productId: 'test-skin', priceCreeps: 0.01 })).status, 200);
  await f.request('/cart/items', 'POST', { productId: 'test-skin' });
  const cart = await (await f.request('/cart')).json();
  assert.equal(cart.items.length, 1); assert.equal(cart.totalCreeps, 10.25); assert.equal(cart.totalRubles, 17.43);
  f.cookies = new Map(); const second = await (await f.request('/session')).json(); assert.equal(second.cart.items.length, 0);
  f.cookies = firstCookies;
  assert.equal((await (await f.request('/cart')).json()).items.length, 1);
  await f.request('/cart/items', 'DELETE', { productId: 'test-skin' });
  assert.equal((await (await f.request('/cart')).json()).items.length, 0);
});
test('mutations reject foreign/missing origin, oversized bodies and anonymous account writes', async t => {
  const f = await fixture(t); await f.request('/session');
  for (const Origin of ['https://evil.example', 'null', '']) assert.equal((await f.request('/cart/items', 'POST', { productId: 'test-skin' }, { Origin })).status, 403);
  assert.equal((await f.request('/cart/items', 'POST', { productId: 'test-skin' }, { 'X-Creeps-Request': '' })).status, 403);
  assert.equal((await f.request('/cart/items', 'POST', { productId: 'test-skin', text: 'x'.repeat(5000) })).status, 413);
  assert.equal((await f.request('/account/trade-url', 'PUT', { tradeUrl: 'x' })).status, 401);
  assert.equal((await f.request('/checkout', 'POST', {})).status, 401);
});
test('login verifies state/browser, rotates session, merges cart, persists account and logout invalidates the cookie', async t => {
  const f = await fixture(t); await f.request('/session');
  await f.request('/cart/items', 'POST', { productId: 'test-skin' });
  const oldRaw = f.cookies.get('creeps_session');
  assert.equal((await f.request('/auth/callback?state=forged')).headers.get('location'), '/account?auth=failed');
  const login = await f.login(); assert.equal(login.status, 303); assert.equal(login.headers.get('location'), '/account');
  assert.notEqual(f.cookies.get('creeps_session'), oldRaw); assert.equal(f.store.session(oldRaw), null);
  const data = await (await f.request('/session')).json();
  assert.equal(data.user.steamId, STEAM_ID); assert.equal(data.cart.items.length, 1); assert.equal(data.user.balanceCreeps, 0);
  const partner = BigInt(STEAM_ID) - 76561197960265728n;
  const tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${partner}&token=abcdefgh`;
  assert.equal((await f.request('/account/trade-url', 'PUT', { tradeUrl })).status, 200);
  assert.equal((await (await f.request('/session')).json()).user.tradeUrl, tradeUrl);
  const authRaw = f.cookies.get('creeps_session');
  await f.request('/auth/logout', 'POST', {}); assert.equal(f.store.session(authRaw), null);
  assert.equal((await (await f.request('/session')).json()).user, null);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS count FROM operations').get().count, 0);
});
test('callback replay and browser state substitution cannot authenticate', async t => {
  const f = await fixture(t); await f.request('/session');
  const start = await f.request('/auth/steam');
  const returnTo = new URL(start.headers.get('location')).searchParams.get('openid.return_to');
  const url = new URL(returnTo); for (const [key, value] of assertion(returnTo)) url.searchParams.set(key, value);
  const callback = url.pathname.slice(4) + url.search;
  const correctBrowser = f.cookies.get('creeps_login');
  f.cookies.set('creeps_login', 'attacker'); assert.equal((await f.request(callback)).headers.get('location'), '/account?auth=failed');
  f.cookies.set('creeps_login', correctBrowser); assert.equal((await f.request(callback)).headers.get('location'), '/account');
  assert.equal((await f.request(callback)).headers.get('location'), '/account?auth=failed');
});
test('no configured provider means no payment, balance credit or order is fabricated', async t => {
  const f = await fixture(t); await f.request('/session'); await f.login();
  const topup = await f.request('/topups/balance', 'POST', { amount: '100' }); assert.equal(topup.status, 409);
  assert.equal((await topup.json()).code, 'PAYMENT_PROVIDER_REQUIRED');
  for (const amount of ['-1', '0', '1e5', '0.001', 'NaN']) assert.equal((await f.request('/topups/balance', 'POST', { amount })).status, 400);
  const user = (await (await f.request('/session')).json()).user;
  assert.equal(user.balanceCreeps, 0); assert.equal(user.operations.length, 0); assert.equal(user.orders.length, 0);
});
test('store survives restart and expires sessions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'creeps-store-test-')); const path = join(directory, 'test.sqlite');
  try {
    let store = openStore(path); const session = store.login(STEAM_ID); store.add(session, 'test-skin'); store.close();
    store = openStore(path); assert.equal(store.session(session.raw).steam_id, STEAM_ID); assert.deepEqual(store.cart(session), ['test-skin']);
    store.db.prepare('UPDATE sessions SET expires_at=0 WHERE id=?').run(hash(session.raw)); assert.equal(store.session(session.raw), null); store.cleanup(); store.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Steam quote calculates credited amount plus 5% on the server, ignoring supplied totals',async t=>{
 const f=await fixture(t);await f.request('/session');
 const response=await f.request('/topups/steam/quote','POST',{amount:'1000',feeMinor:0,totalMinor:1});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{amountMinor:100000,feeMinor:5000,totalMinor:105000,currency:'RUB'});
 assert.equal((await f.request('/topups/steam/quote','POST',{amount:'1000.123'})).status,400);
});
test('authenticated history pagination reaches old records without duplicates and isolates users',async t=>{
 const f=await fixture(t);await f.login();
 const stamp=Date.now();
 for(let i=0;i<123;i++){
  const id=String(i).padStart(4,'0');
  f.store.db.prepare('INSERT INTO operations VALUES (?,?,?,?,?,?)').run(id,STEAM_ID,i%2?-20:100,i%2?'debit':'credit',stamp,'ref-'+id);
  f.store.db.prepare('INSERT INTO orders VALUES (?,?,?,?,?)').run(id,STEAM_ID,'pending','[]',stamp);
 }
 f.store.login(SECOND_ID);
 f.store.db.prepare('INSERT INTO orders VALUES (?,?,?,?,?)').run('private',SECOND_ID,'pending','[]',stamp);
 for(const kind of ['operations','orders']){
  const seen=[];let cursor=null;
  do{
   const response=await f.request(`/account/history?kind=${kind}${cursor?'&cursor='+encodeURIComponent(JSON.stringify(cursor)):''}`);
   assert.equal(response.status,200);const page=await response.json();seen.push(...page.items.map(item=>item.id));cursor=page.nextCursor;
  }while(cursor);
  assert.equal(seen.length,123);assert.equal(new Set(seen).size,123);assert.ok(!seen.includes('private'));
 }
 const account=(await (await f.request('/session')).json()).user;
 assert.equal(account.operations.length,50);assert.ok(account.operationCursor);
 assert.equal((await f.request('/account/history?kind=orders&cursor=broken')).status,400);
 await f.request('/auth/logout','POST');await f.request('/session');
 assert.equal((await f.request('/account/history?kind=orders')).status,401);
});
