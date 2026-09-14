import type { Metadata } from 'next';
import { AccountView } from '@/components/account-view';
import { AccountPresentation } from '@/components/account-presentation';
import { isShowcasePreview } from '@/config/runtime';
export const metadata: Metadata = { title: 'Личный кабинет' };
export default function AccountPage() { return isShowcasePreview ? <AccountPresentation /> : <AccountView />; }
