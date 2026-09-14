import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../src/data/catalog-snapshot.json' with { type: 'json' };
import { accountPresentation, validatePresentationTradeUrl } from '../src/lib/account-presentation.ts';

test('presentation account uses existing products and reconciles balance, debits and orders', () => {
  const sample = accountPresentation(snapshot.products);
  assert.deepEqual(sample.orders.map(order => order.status), ['pending', 'delivered']);
  for (const order of sample.orders) for (const item of order.items) {
    assert.ok(snapshot.products.some(product => product.id === item.id));
  }
  const net = sample.operations.reduce((sum, operation) => sum + operation.amountMinor, 0);
  assert.equal(sample.balanceCreeps * 100, net);
  const debits = -sample.operations.filter(operation => operation.amountMinor < 0).reduce((sum, operation) => sum + operation.amountMinor, 0);
  assert.equal(debits, sample.orders.reduce((sum, order) => sum + order.totalMinor, 0));
  assert.equal(validatePresentationTradeUrl(sample.tradeUrl), true);
  assert.equal(BigInt(sample.steamId) - 76561197960265728n, BigInt(new URL(sample.tradeUrl).searchParams.get('partner')));
});

test('local trade URL editing only accepts the Steam trade-offer URL shape', () => {
  assert.equal(validatePresentationTradeUrl('https://steamcommunity.com/tradeoffer/new/?partner=123456&token=Abcd1234'), true);
  for (const url of ['x', 'https://example.com/tradeoffer/new/?partner=123&token=Abcd1234', 'javascript:alert(1)', 'https://steamcommunity.com/profiles/123', 'https://user:pass@steamcommunity.com/tradeoffer/new/?partner=123&token=Abcd1234']) {
    assert.equal(validatePresentationTradeUrl(url), false);
  }
});
