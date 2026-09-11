import { getCatalog } from './catalog-source';
import { previewCart } from './preview-cart';

const storageKey = 'creeps-presentation-selection-v1';
let selection: string[] | undefined;
function readSelection() {
  if (selection) return selection;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
    selection = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch { selection = []; }
  return selection;
}
export async function previewRequest(path: string, method: string, body?: unknown) {
  if (path !== '/session' && path !== '/cart/items') {
    throw new Error('Это версия для показа. Вход, проверка Steam и оплата подключаются в рабочем магазине; сейчас операция не выполняется.');
  }
  const catalog = await getCatalog();
  const products = catalog.status === 'ready' ? catalog.products : [];
  let ids = readSelection();
  if (path === '/cart/items') {
    const id = body && typeof body === 'object' && 'productId' in body ? body.productId : undefined;
    if (typeof id !== 'string' || !products.some(product => product.id === id)) throw new Error('Товар не найден.');
    if (method === 'POST') ids = [...new Set([...ids, id])];
    else if (method === 'DELETE') ids = ids.filter(value => value !== id);
    else throw new Error('Действие не поддерживается в просмотре.');
    selection = ids;
    try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* Selection still works in this tab. */ }
  }
  const cart = previewCart(products, ids);
  return path === '/session' ? { user: null, cart } : cart;
}
