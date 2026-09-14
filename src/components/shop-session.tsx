"use client";

import { UiIcon } from "@/components/ui-icon";
import Link from 'next/link';
import { isShowcasePreview } from '@/config/runtime';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/catalog';
import { publicAsset } from '@/lib/public-asset';
import { createTaskQueue } from '@/lib/async-queue';
import { CartNotice } from './cart-notice';

export type HistoryCursor = { createdAt: number; id: string };
export type Account = {
  operationCursor: HistoryCursor | null; orderCursor: HistoryCursor | null;
  steamId: string; tradeUrl: string; balanceCreeps: number;
  operations: { id: string; amountCreeps: number; kind: string; createdAt: number }[];
  orders: { id: string; status: string; items: { id: string; name: string; priceCreeps: number }[]; createdAt: number }[];
};
export type Cart = { items: Product[]; totalCreeps: number; totalRubles: number };
type Session = { user: Account | null; cart: Cart };
export class RequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}
export async function shopRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (isShowcasePreview) {
    const { previewRequest } = await import('@/lib/preview-session');
    return await previewRequest(path, method, body) as T;
  }
  let response: Response;
  try {
    response = await fetch(publicAsset(`/api${path}`), {
      method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Creeps-Request': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new RequestError('Не удалось связаться с сервером. Проверьте соединение и повторите действие.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new RequestError('Не удалось открыть серверный сервис. Обновите страницу и повторите действие.');
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error ?? 'Не удалось выполнить действие.', data.code);
  return data as T;
}
const ShopContext = createContext<{
  user: Account | null; cart: Cart; loading: boolean; error: string;
  refresh: () => Promise<void>; add: (id: string) => Promise<void>; remove: (id: string) => Promise<void>; logout: () => Promise<void>;
} | null>(null);
const emptyCart: Cart = { items: [], totalCreeps: 0, totalRubles: 0 };
export function ShopSession({ children }: { children: ReactNode }) {
  const queue = useRef(createTaskQueue());
  const [data, setData] = useState<Session>({ user: null, cart: emptyCart });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedProduct, setAddedProduct] = useState<Product | null>(null);
  const closeNotice = useCallback(() => setAddedProduct(null), []);
  const refresh = useCallback(() => queue.current.run(async () => {
    try { setData(await shopRequest<Session>('/session')); setError(''); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }), []);
  useEffect(() => {
    let active = true;
    queue.current.run(() => shopRequest<Session>('/session')).then(session => {
      if (active) { setData(session); setError(''); }
    }).catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const add = (id: string) => queue.current.run(async () => {
    setAddedProduct(null);
    const cart = await shopRequest<Cart>('/cart/items', 'POST', { productId: id });
    setData(current => ({ ...current, cart }));
    setAddedProduct(cart.items.find(item => item.id === id) ?? null);
  });
  const remove = (id: string) => queue.current.run(async () => {
    const cart = await shopRequest<Cart>('/cart/items', 'DELETE', { productId: id });
    setData(current => ({ ...current, cart }));
    setAddedProduct(current => current?.id === id ? null : current);
  });
  const logout = () => queue.current.run(async () => {
    await shopRequest('/auth/logout', 'POST', {});
    setAddedProduct(null);
    setData({ user: null, cart: emptyCart });
    setData(await shopRequest<Session>('/session'));
  });
  return <ShopContext.Provider value={{ ...data, loading, error, refresh, add, remove, logout }}>{children}{addedProduct && <CartNotice product={addedProduct} onClose={closeNotice} />}</ShopContext.Provider>;
}
export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('ShopSession is required');
  return context;
}
export function SteamLogin({ cart = false }: { cart?: boolean }) {
  return <Link className="button-primary" href={cart ? '/login?next=cart' : '/login'}>Войти через Steam <UiIcon name="arrow" /></Link>;
}
export function AddToCart({ productId, tone = "primary" }: { productId: string; tone?: "primary" | "secondary" }) {
  const shop = useShop();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const item = shop.cart.items.find(item => item.id === productId);
  async function add() {
    setBusy(true); setError('');
    try {
      await shop.add(productId);
      requestAnimationFrame(() => removeButton.current?.focus({ preventScroll: true }));
    }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try {
      await shop.remove(productId);
      requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true }));
    }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="purchase-area">
    {item ? <div className="cart-selection">
      <span className="cart-selected" role="status"><UiIcon name="check" /> В корзине</span>
      <button ref={removeButton} className="button-secondary cart-remove" type="button" disabled={busy || shop.loading} onClick={remove} aria-label={`Удалить из корзины: ${item.name}`} title="Удалить из корзины" aria-busy={busy}>
        <UiIcon name="trash" />
      </button>
    </div> : <button ref={addButton} className={`button-${tone}`} type="button" disabled={busy || shop.loading} onClick={add}>{busy ? 'Добавляем…' : 'В корзину'}</button>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
