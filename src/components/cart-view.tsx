"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProductPrice } from './product-view';
import { shopRequest, useShop } from './shop-session';
import { paymentDestination } from '@/lib/payment-navigation';
import { publicAsset } from '@/lib/public-asset';

export function CartView() {
  const shop = useShop();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove(id: string) {
    setBusy(true); setError('');
    try { await shop.remove(id); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function checkout() {
    if (!shop.user) { router.push('/login?next=cart'); return; }
    setBusy(true); setError('');
    try { const payment = await shopRequest('/checkout', 'POST', {}); window.location.assign(paymentDestination(payment, window.location.origin)); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel account-section" id="cart" aria-labelledby="cart-title">
    <div className="section-kicker"><h2 id="cart-title">Ваши товары</h2><span>Товаров: {shop.cart.items.length}</span></div>
    {!shop.cart.items.length ? <div className="account-empty"><p>В корзине пока пусто.</p><Link className="button-secondary" href="/catalog">Выбрать скины</Link></div> : <>
      <ul className="cart-items">{shop.cart.items.map(item => <li key={item.id}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicAsset(item.imageUrl)} alt={item.name} width={120} height={90} />
        <div><Link href={`/catalog/${item.id}`}>{item.name}</Link><p className="field-hint">{item.condition}</p></div>
        <ProductPrice amount={item.priceCreeps} />
        <button className="button-secondary" onClick={() => remove(item.id)} disabled={busy} aria-label={`Удалить ${item.name}`}>Удалить</button>
      </li>)}</ul>
      <div className="cart-summary"><div><span className="eyebrow">Итого</span><ProductPrice amount={shop.cart.totalCreeps} rublesAmount={shop.cart.totalRubles} /></div>
        <button className="button-primary" onClick={checkout} disabled={busy}>{busy ? 'Проверяем…' : 'Оформить заказ'}</button>
      </div>
      <p className="field-hint">Банковская карта · СБП</p>
    </>}
    {error && <p role="alert" className="field-error">{error}</p>}
  </section>;
}
