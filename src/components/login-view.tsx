"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isShowcasePreview } from '@/config/runtime';
import { publicAsset } from '@/lib/public-asset';
import { useShop } from './shop-session';

export function LoginView() {
  const shop = useShop();
  const router = useRouter();
  const [destination, setDestination] = useState<'cart' | 'account' | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    queueMicrotask(() => setDestination(next === 'cart' ? 'cart' : 'account'));
  }, []);
  useEffect(() => {
    if (shop.user && destination) router.replace(destination === 'cart' ? '/cart' : '/account');
  }, [shop.user, destination, router]);
  return <main id="main-content" className="page-width inner-page">
    <section className="panel account-section">
      <h1>Вход через Steam</h1>
      <p>{destination === 'cart' ? 'Войдите через Steam, чтобы продолжить оформление заказа. Товары сохранятся в корзине.' : 'Войдите через Steam, чтобы открыть свой профиль, баланс и историю покупок.'}</p>
      {isShowcasePreview ? <button className="button-primary" onClick={() => setError('Не удалось начать вход. Обратитесь в поддержку: support@shop-skin.com.')}>Продолжить через Steam</button> : <a className="button-primary" href={publicAsset(`/api/auth/steam${destination === 'cart' ? '?next=cart' : ''}`)}>Продолжить через Steam</a>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {destination === 'cart' && <p><Link className="text-link" href="/cart">Вернуться в корзину</Link></p>}
    </section>
  </main>;
}
