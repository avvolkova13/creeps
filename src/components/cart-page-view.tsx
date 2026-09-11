"use client";

import { CartView } from './cart-view';
import { useShop } from './shop-session';

export function CartPageView() {
  const shop = useShop();
  return <main id="main-content" className="page-width account-page">
    <h1>Корзина</h1>
    {shop.loading ? <p className="panel" role="status">Загружаем корзину…</p> : shop.error ? <div className="panel account-empty"><p role="alert">{shop.error}</p><button className="button-secondary" onClick={() => void shop.refresh()}>Повторить</button></div> : <CartView />}
  </main>;
}
