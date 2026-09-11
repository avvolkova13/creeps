import type { Metadata } from 'next';
import { CartPageView } from '@/components/cart-page-view';

export const metadata: Metadata = { title: 'Корзина' };
export default function CartPage() { return <CartPageView />; }
