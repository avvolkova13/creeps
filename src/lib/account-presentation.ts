import type { Product } from './catalog';
import { productQuote } from './money.ts';

/** Explicit presentation fixtures; never used as an authenticated account or ledger. */
export function accountPresentation(products: readonly Product[]) {
  const items = [...products].sort((a, b) => a.priceCreeps - b.priceCreeps).slice(0, 3);
  const total = (values: readonly Product[]) => values.reduce((sum, item) => sum + productQuote(item.priceCreeps).creepsMinor, 0);
  const orders = [
    { id: '1024', status: 'pending' as const, date: '14.09.2026', items: items.slice(2), totalMinor: total(items.slice(2)) },
    { id: '1023', status: 'delivered' as const, date: '13.09.2026', items: items.slice(0, 2), totalMinor: total(items.slice(0, 2)) },
  ];
  const creditMinor = total(items) + 250000;
  return {
    steamId: '76561198012345678',
    tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=52079950&token=R7kP2mXq',
    balanceCreeps: 2500,
    orders,
    operations: [
      ...orders.map(order => ({ id: order.id, label: 'Списание', detail: `Заказ ${order.id}`, date: order.date, amountMinor: -order.totalMinor })),
      { id: '1022', label: 'Пополнение', detail: 'Банковская карта', date: '13.09.2026', amountMinor: creditMinor },
    ],
    cartIds: items.slice(0, 2).map(item => item.id),
  };
}

/** Format validation only: does not verify ownership or contact Steam. */
export function validatePresentationTradeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'steamcommunity.com' && !url.port &&
      !url.username && !url.password && url.pathname === '/tradeoffer/new/' && !url.hash &&
      /^\d+$/.test(url.searchParams.get('partner') ?? '') && /^[\w-]{8}$/.test(url.searchParams.get('token') ?? '');
  } catch { return false; }
}
