"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import type { Product } from '@/lib/catalog';
import { publicAsset } from '@/lib/public-asset';
import { UiIcon } from './ui-icon';

export function CartNotice({ product, onClose }: { product: Product; onClose: () => void }) {
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [onClose]);

  return <aside className="cart-notice" aria-label="Добавление в корзину">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={publicAsset(product.imageUrl)} alt="" width={64} height={64} />
    <div className="cart-notice-copy" role="status" aria-live="polite" aria-atomic="true">
      <strong><UiIcon name="check" />Товар добавлен в корзину</strong>
      <p>{product.name}</p>
    </div>
    <button className="button-secondary cart-notice-close" type="button" aria-label="Закрыть уведомление" onClick={onClose}><UiIcon name="close" /></button>
    <Link className="button-primary cart-notice-link" href="/cart" onClick={onClose}>Перейти в корзину<UiIcon name="arrow" /></Link>
  </aside>;
}
