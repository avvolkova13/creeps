import { getCatalog } from './catalog-source';
import { previewCart } from './preview-cart';
import { accountPresentation } from './account-presentation';

const storageKey = 'creeps-presentation-selection-v1';
let selection: string[] | undefined;
let selectionSaved = false;
function readSelection() {
  if (selection) return selection;
  try {
    const raw = sessionStorage.getItem(storageKey);
    selectionSaved = raw !== null;
    const saved: unknown = JSON.parse(raw ?? '[]');
    selection = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch { selection = []; }
  return selection;
}
export async function previewRequest(path: string, method: string, body?: unknown) {
  if (path !== '/session' && path !== '/cart/items' && path !== '/presentation/cart') {
    if (path === '/steam/check') throw new Error('Не удалось проверить Steam ID. Обратитесь в поддержку: support@shop-skin.com.');
    if (path === '/checkout') throw new Error('Заказ не оформлен. Обратитесь в поддержку: support@shop-skin.com.');
    throw new Error('Платёж не создан. Обратитесь в поддержку: support@shop-skin.com.');
  }
  const catalog = await getCatalog();
  const products = catalog.status === 'ready' ? catalog.products : [];
  let ids = readSelection();
  if (path === '/presentation/cart' && method === 'POST' && !selectionSaved && !ids.length) {
    ids = accountPresentation(products).cartIds;
    selection = ids;
    selectionSaved = true;
    try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* Keep the example in this tab's memory. */ }
  }
  if (path === '/cart/items') {
    const id = body && typeof body === 'object' && 'productId' in body ? body.productId : undefined;
    if (typeof id !== 'string' || !products.some(product => product.id === id)) throw new Error('Товар не найден.');
    if (method === 'POST') ids = [...new Set([...ids, id])];
    else if (method === 'DELETE') ids = ids.filter(value => value !== id);
    else throw new Error('Не удалось выполнить действие.');
    selection = ids;
    selectionSaved = true;
    try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* Selection still works in this tab. */ }
  }
  const cart = previewCart(products, ids);
  return path === '/session' ? { user: null, cart } : cart;
}
