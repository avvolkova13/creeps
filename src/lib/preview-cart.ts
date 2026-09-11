import type { Product } from './catalog';
import { cartQuote } from './money.ts';

/** Selection for a presentation only: no account, stock reservation or purchase. */
export function previewCart(products: readonly Product[], ids: readonly string[]) {
  const selected = new Set(ids);
  const items = products.filter(product => selected.has(product.id));
  return { items, ...cartQuote(items.map(item => item.priceCreeps)) };
}
