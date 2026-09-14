"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import snapshot from '@/data/catalog-snapshot.json';
import { accountPresentation, validatePresentationTradeUrl } from '@/lib/account-presentation';
import { publicAsset } from '@/lib/public-asset';
import { ProductPrice } from './product-view';

const sample = accountPresentation(snapshot.products);
const tradeStorageKey = 'creeps-presentation-trade-url';
const closedStorageKey = 'creeps-presentation-account-closed';

export function AccountPresentation() {
  const [closed, setClosed] = useState(false);
  const [tradeUrl, setTradeUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const savedTradeUrl = sessionStorage.getItem(tradeStorageKey);
        setTradeUrl(!savedTradeUrl || savedTradeUrl.includes('token=EXAMPLE0') ? sample.tradeUrl : savedTradeUrl);
        setClosed(sessionStorage.getItem(closedStorageKey) === '1');
      } catch { /* Editable fields still work without browser storage. */ }
    });
    return () => { active = false; };
  }, []);

  function toggleAccount(value: boolean) {
    setClosed(value);
    try { sessionStorage.setItem(closedStorageKey, value ? '1' : '0'); } catch { /* Current view remains usable. */ }
  }

  return <main id="main-content" className="page-width account-page">
    <h1>Личный кабинет</h1>
    {closed ? <section className="panel account-empty"><h2>Вы вышли из кабинета</h2><p>Товары сохранены в корзине.</p><button className="button-primary" onClick={() => toggleAccount(false)}>Вернуться в кабинет</button></section> : <>
      <div className="account-overview">
        <section className="panel account-section" aria-labelledby="presentation-profile">
          <div className="section-kicker"><h2 id="presentation-profile">Мой Steam</h2><button className="button-secondary" onClick={() => toggleAccount(true)}>Выйти</button></div>
          <div><p className="eyebrow">Steam ID пользователя</p><p className="account-steam-id">{sample.steamId}</p></div>
          <form className="account-form" onSubmit={event => {
            event.preventDefault(); setMessage(''); setError('');
            if (!validatePresentationTradeUrl(tradeUrl.trim())) { setError('Введите ссылку Steam вида https://steamcommunity.com/tradeoffer/new/?partner=…&token=…'); return; }
            try { sessionStorage.setItem(tradeStorageKey, tradeUrl.trim()); setMessage('Trade-URL сохранён.'); }
            catch { setError('Не удалось сохранить ссылку. Разрешите сохранение данных в браузере и попробуйте ещё раз.'); }
          }}>
            <label htmlFor="presentation-trade">Trade-URL для получения скинов</label>
            <input id="presentation-trade" type="url" required maxLength={512} value={tradeUrl} onChange={event => { setTradeUrl(event.target.value); setMessage(''); setError(''); }} aria-invalid={Boolean(error)} aria-describedby="presentation-trade-hint presentation-trade-error" />
            <p className="field-hint" id="presentation-trade-hint">По этой ссылке вы получите купленные скины.</p>
            <button className="button-secondary">Сохранить trade-URL</button>
            {message && <p className="field-hint" role="status">{message}</p>}<p id="presentation-trade-error" className="field-error" role={error ? 'alert' : undefined}>{error}</p>
          </form>
        </section>
        <section className="panel account-section account-balance-card" aria-labelledby="presentation-balance"><h2 id="presentation-balance">Баланс Creeps</h2><ProductPrice amount={sample.balanceCreeps} /><Link className="button-primary" href="/#balance">Пополнить баланс</Link></section>
      </div>
      <div className="account-history">
        <section className="panel account-section" aria-labelledby="presentation-operations"><h2 id="presentation-operations">История операций</h2><ul className="history-list">{sample.operations.map(operation => <li key={operation.id}>
          <div className="account-record-heading"><strong>{operation.label}</strong><span className="field-hint">{operation.date}</span></div><p className="field-hint">{operation.detail}</p><ProductPrice amount={Math.abs(operation.amountMinor) / 100} sign={operation.amountMinor < 0 ? '−' : '+'} />
        </li>)}</ul></section>
        <section className="panel account-section" aria-labelledby="presentation-orders"><h2 id="presentation-orders">История покупок</h2><ul className="history-list">{sample.orders.map(order => <li key={order.id}>
          <div className="account-record-heading"><strong>Заказ {order.id}</strong><span className={`order-status order-status-${order.status}`}>{order.status === 'pending' ? 'В ожидании' : 'Выдано'}</span></div><p className="field-hint">{order.date}</p>
          {order.items.map(item => <div className="account-order-item" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicAsset(item.imageUrl)} alt={item.name} width={88} height={70} loading="lazy" /><div><Link href={`/catalog/${item.id}`}>{item.name}</Link><p className="field-hint">{item.condition}</p><ProductPrice amount={item.priceCreeps} /></div>
          </div>)}
        </li>)}</ul></section>
      </div>
    </>}
  </main>;
}
