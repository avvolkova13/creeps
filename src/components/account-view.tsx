"use client";

import { isShowcasePreview } from '@/config/runtime';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ProductPrice } from './product-view';
import { shopRequest, SteamLogin, useShop, type Account, type HistoryCursor } from './shop-session';
import { paymentDestination } from '@/lib/payment-navigation';
import { publicAsset } from '@/lib/public-asset';

function TradeForm({ account }: { account: Account }) {
  const { refresh } = useShop();
  const [url, setUrl] = useState(account.tradeUrl);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="account-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { await shopRequest('/account/trade-url', 'PUT', { tradeUrl: url }); await refresh(); setMessage('Trade-URL сохранён.'); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }}>
    <label htmlFor="trade-url">Trade-URL для получения скинов</label>
    <input id="trade-url" type="url" value={url} onChange={event => { setUrl(event.target.value); setMessage(''); }} required maxLength={512} placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…" autoComplete="off" spellCheck={false} aria-describedby="trade-hint" />
    <p className="field-hint" id="trade-hint">Ссылка должна принадлежать вашему Steam-аккаунту. <a className="text-link" href="https://steamcommunity.com/my/tradeoffers/privacy" target="_blank" rel="noreferrer">Найти свою ссылку в Steam</a></p>
    <button className="button-primary" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить trade-URL'}</button>
    {message && <p role="status">{message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
  </form>;
}
function CartView() {
  const shop = useShop();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove(id: string) {
    setBusy(true); setError('');
    try { await shop.remove(id); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function checkout() {
    setBusy(true); setError('');
    try { const payment = await shopRequest('/checkout', 'POST', {}); window.location.assign(paymentDestination(payment, window.location.origin)); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel account-section" id="cart" aria-labelledby="cart-title">
    <div className="section-kicker"><h2 id="cart-title">Корзина</h2><span>{shop.cart.items.length} товаров</span></div>
    {!shop.cart.items.length ? <div className="account-empty"><p>В корзине пока пусто.</p><Link className="button-secondary" href="/catalog">Выбрать скины</Link></div> : <>
      <ul className="cart-items">{shop.cart.items.map(item => <li key={item.id}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicAsset(item.imageUrl)} alt={item.name} width={120} height={90} />
        <div><Link href={`/catalog/${item.id}`}>{item.name}</Link><p className="field-hint">{item.condition}</p></div>
        <ProductPrice amount={item.priceCreeps} />
        <button className="button-secondary" onClick={() => remove(item.id)} disabled={busy} aria-label={`Удалить ${item.name}`}>Удалить</button>
      </li>)}</ul>
      <div className="cart-summary"><div><span className="eyebrow">Итого · справочно</span><ProductPrice amount={shop.cart.totalCreeps} rublesAmount={shop.cart.totalRubles} /></div>
        {shop.user || isShowcasePreview ? <button className="button-primary" onClick={checkout} disabled={busy}>{busy ? 'Проверяем…' : 'Оформить заказ'}</button> : <SteamLogin cart />}
      </div>
      <p className="field-hint">Банковская карта · СБП</p>
    </>}
    {error && <p role="alert" className="field-error">{error}</p>}
  </section>;
}
function HistorySection<T extends { id: string }>({ title, kind, initialItems, initialCursor, emptyText, render }: {
  title: string; kind: 'operations' | 'orders'; initialItems: T[]; initialCursor: HistoryCursor | null; emptyText: string; render: (item: T) => ReactNode;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true); setError('');
    try {
      const page = await shopRequest<{ items: T[]; nextCursor: HistoryCursor | null }>(`/account/history?kind=${kind}&cursor=${encodeURIComponent(JSON.stringify(cursor))}`);
      setItems(current => [...current, ...page.items.filter(item => !current.some(existing => existing.id === item.id))]);
      setCursor(page.nextCursor);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel account-section" aria-label={title} aria-busy={busy}><h2>{title}</h2>
    {items.length ? <ul className="history-list">{items.map(item => <li key={item.id}>{render(item)}</li>)}</ul> : <p className="field-hint">{emptyText}</p>}
    {cursor && <button className="button-secondary" type="button" disabled={busy} onClick={loadMore}>{busy ? 'Загружаем…' : 'Показать ещё'}</button>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>;
}
export function AccountView() {
  const shop = useShop();
  const [authMessage, setAuthMessage] = useState('');
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('auth');
    // Read the callback status after hydration; never accept a user identity from the URL.
    if (status) queueMicrotask(() => setAuthMessage(status === 'cancelled' ? 'Вход отменён на стороне Steam. Можно попробовать ещё раз.' : 'Steam не подтвердил вход. Нажмите «Войти через Steam», чтобы повторить.'));
  }, []);
  return <main id="main-content" className="page-width account-page">
    <h1>Личный кабинет</h1>
    {authMessage && <p className="panel" role="status">{authMessage}</p>}
    {shop.loading ? <p className="panel" role="status">Загружаем кабинет…</p> : shop.error ? <div className="panel account-empty"><p role="alert">{shop.error}</p><button className="button-secondary" onClick={() => void shop.refresh()}>Повторить</button></div> : <>
      {isShowcasePreview && <>
        <section className="panel account-section" aria-labelledby="preview-profile"><h2 id="preview-profile">Мой Steam</h2><p className="field-hint">Предпросмотр кабинета. Вход через Steam не выполнялся.</p><p>Steam ID: —</p><label htmlFor="preview-trade">Trade-URL для получения скинов</label><input id="preview-trade" type="url" placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…" readOnly aria-describedby="preview-trade-hint" /><p className="field-hint" id="preview-trade-hint">Редактирование доступно после входа в рабочем магазине.</p></section>
        <section className="panel account-section"><h2>Баланс Creeps</h2><ProductPrice amount={0} /><Link className="button-primary" href="/#balance">Пополнить баланс</Link></section>
      </>}
      {shop.user ? <>
        <section className="panel account-section" aria-labelledby="profile-title">
          <div className="section-kicker"><h2 id="profile-title">Мой Steam</h2><button className="button-secondary" onClick={async () => { setLogoutError(''); try { await shop.logout(); } catch (error) { setLogoutError((error as Error).message); } }}>Выйти</button></div>
          <p className="account-steam-id">Steam ID: <a href={`https://steamcommunity.com/profiles/${shop.user.steamId}`} target="_blank" rel="noreferrer">{shop.user.steamId}</a></p>
          {logoutError && <p role="alert">{logoutError}</p>}
          <TradeForm account={shop.user} key={shop.user.steamId} />
        </section>
        <section className="panel account-section" aria-labelledby="account-balance"><h2 id="account-balance">Баланс Creeps</h2><ProductPrice amount={shop.user.balanceCreeps} /><Link className="button-primary" href="/#balance">Пополнить баланс</Link></section>
      </> : isShowcasePreview ? null : <section className="panel account-empty"><p>Войдите через Steam, чтобы сохранить trade-URL и открыть баланс и историю покупок.</p><SteamLogin /></section>}
      <CartView />
      {isShowcasePreview && <div className="account-history"><section className="panel account-section"><h2>История операций</h2><p className="field-hint">Операций пока нет.</p></section><section className="panel account-section"><h2>История покупок</h2><p className="field-hint">Покупок пока нет.</p></section></div>}
      {shop.user && <div className="account-history">
        <HistorySection key={`operations:${shop.user.steamId}:${shop.user.operations[0]?.id ?? ''}`} title="История операций" kind="operations" initialItems={shop.user.operations} initialCursor={shop.user.operationCursor} emptyText="Операций пока нет." render={operation => <><span>{operation.kind === 'credit' ? 'Пополнение' : 'Списание'} · {new Date(operation.createdAt).toLocaleDateString('ru-RU')}</span><ProductPrice amount={Math.abs(operation.amountCreeps)} sign={operation.kind === 'debit' ? '−' : '+'} /></>} />
        <HistorySection key={`orders:${shop.user.steamId}:${shop.user.orders[0]?.id ?? ''}`} title="История покупок" kind="orders" initialItems={shop.user.orders} initialCursor={shop.user.orderCursor} emptyText="Покупок пока нет." render={order => <><p>Заказ {order.id} · {({ pending: 'В ожидании', delivered: 'Выдано', cancelled: 'Отменён' } as Record<string, string>)[order.status] ?? order.status}</p>{order.items.map(item => <div key={item.id}><p>{item.name}</p><ProductPrice amount={item.priceCreeps} /></div>)}</>} />
      </div>}
    </>}
  </main>;
}
