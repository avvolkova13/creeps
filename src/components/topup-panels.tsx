"use client";

import { UiIcon } from "@/components/ui-icon";
import { isShowcasePreview } from '@/config/runtime';
import { useState } from 'react';
import { parsePaymentMinor, paymentAmountError, steamTopupQuote, rublesMinorFromCreepsMinor } from '@/lib/money';
import { paymentDestination } from '@/lib/payment-navigation';
import { formatEstimatedAmount } from '@/lib/currency';
import { projectConfig } from '@/config/project';
import { shopRequest, SteamLogin, useShop } from './shop-session';

type SteamProfile = { steamId: string; name: string; profileUrl: string };
export function TopupPanels() {
  const shop = useShop();
  const [balanceAmount, setBalanceAmount] = useState('');
  const [steamAmount, setSteamAmount] = useState('');
  const [steamId, setSteamId] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [steamError, setSteamError] = useState('');
  const [balanceBusy, setBalanceBusy] = useState(false);
  const [steamBusy, setSteamBusy] = useState(false);
  const [loginNeeded, setLoginNeeded] = useState(false);
  const [profile, setProfile] = useState<SteamProfile | null>(null);
  const balanceMinor = parsePaymentMinor(balanceAmount);
  const steamMinor = parsePaymentMinor(steamAmount);
  const invalidBalance = balanceAmount !== '' && balanceMinor === null;
  const invalidSteam = steamAmount !== '' && steamMinor === null;
  const equivalent = balanceMinor !== null ? formatEstimatedAmount(rublesMinorFromCreepsMinor(balanceMinor) / 100, 'RUB', 2) : null;
  const steamQuote = steamMinor !== null ? steamTopupQuote(steamMinor) : null;
  const rubles = (value: number | undefined) => value === undefined ? '— ₽' : formatEstimatedAmount(value / 100, 'RUB', 2);
  async function topupBalance() {
    setBalanceError(''); setLoginNeeded(false);
    if (balanceMinor === null) { setBalanceError(paymentAmountError); return; }
    if (!shop.user && !isShowcasePreview) { setLoginNeeded(true); return; }
    setBalanceBusy(true);
    try { const payment = await shopRequest('/topups/balance', 'POST', { amount: balanceAmount }); window.location.assign(paymentDestination(payment, window.location.origin)); }
    catch (error) { setBalanceError((error as Error).message); }
    finally { setBalanceBusy(false); }
  }
  async function topupSteam() {
    setSteamError('');
    if (steamMinor === null) { setSteamError(paymentAmountError); return; }
    setSteamBusy(true);
    try {
      if (!profile) setProfile(await shopRequest<SteamProfile>('/steam/check', 'POST', { steamId: steamId.trim() }));
      else { const payment = await shopRequest('/topups/steam', 'POST', { steamId: profile.steamId, amount: steamAmount }); window.location.assign(paymentDestination(payment, window.location.origin)); }
    } catch (error) { setSteamError((error as Error).message); }
    finally { setSteamBusy(false); }
  }
  return <div className="topup-grid">
    <section className="panel topup-panel" id="balance" aria-labelledby="balance-title">
      <div className="section-kicker"><span className="eyebrow">Баланс сайта</span><span className="index-tag" aria-hidden="true">01</span></div>
      <h2 id="balance-title">Пополнить Creeps</h2><p className="section-description">Внутренняя валюта магазина.<br />1 Creeps = 1,7 ₽.</p>
      <form onSubmit={event => { event.preventDefault(); void topupBalance(); }}>
        <div className="field"><label htmlFor="balance-amount">Сумма в Creeps</label><div className="input-wrap"><input id="balance-amount" inputMode="decimal" required value={balanceAmount} disabled={balanceBusy} onChange={event => { setBalanceAmount(event.target.value); setBalanceError(''); }} aria-invalid={invalidBalance} aria-describedby="balance-equivalent balance-error" placeholder="Введите сумму" /><span className="input-unit">Creeps</span></div><p id="balance-equivalent" className="field-hint" aria-live="polite">{equivalent ? `≈ ${equivalent} · справочно` : '1 Creeps = 1,7 ₽'}</p><p id="balance-error" className="field-error">{invalidBalance ? paymentAmountError : ''}</p></div>
        {balanceError && <p className="field-error" role="alert">{balanceError}</p>}
        {loginNeeded && !shop.user && <div className="account-empty"><p className="field-hint">Войдите, чтобы пополнить свой баланс.</p><SteamLogin /></div>}
        <button className="button-primary" type="submit" disabled={balanceBusy || shop.loading}>{balanceBusy ? 'Проверяем…' : 'Пополнить баланс'} <UiIcon name="arrow" /></button>
      </form>
    </section>
    <section className="panel topup-panel steam-panel" id="steam" aria-labelledby="steam-title">
      <div className="section-kicker"><span className="eyebrow">Напрямую в Steam</span><span className="index-tag" aria-hidden="true">02</span></div>
      <h2 id="steam-title">Пополнить Steam</h2><p className="section-description">По Steam ID, сразу к оплате.<br />Без внутреннего баланса и корзины.</p>
      <form onSubmit={event => { event.preventDefault(); void topupSteam(); }}><div className="steam-fields">
        <div className="field"><label htmlFor="steam-amount">Сумма в рублях</label><div className="input-wrap"><input id="steam-amount" inputMode="decimal" required placeholder="Введите сумму" value={steamAmount} disabled={steamBusy} onChange={event => { setSteamAmount(event.target.value); setSteamError(''); }} aria-invalid={invalidSteam} aria-describedby="steam-amount-error steam-quote" /><span className="input-unit">₽</span></div><p id="steam-amount-error" className="field-error">{invalidSteam ? paymentAmountError : ''}</p></div>
        <div className="field"><label htmlFor="steam-id">Steam ID</label><input id="steam-id" type="text" inputMode="numeric" required maxLength={17} pattern="[0-9]{17}" title="Steam ID из 17 цифр" placeholder="Введите Steam ID" autoComplete="off" spellCheck={false} value={steamId} disabled={steamBusy} onChange={event => { setSteamId(event.target.value); setProfile(null); setSteamError(''); }} aria-describedby="steam-check-hint" /></div>
      </div>
        <dl className="steam-payment-summary" id="steam-quote" aria-live="polite">
          <div><dt>Зачисление в Steam</dt><dd>{rubles(steamQuote?.amountMinor)}</dd></div>
          <div><dt>Комиссия {projectConfig.steamTopupFeePercent}%</dt><dd>{rubles(steamQuote?.feeMinor)}</dd></div>
          <div className="steam-payment-total"><dt>К оплате</dt><dd>{rubles(steamQuote?.totalMinor)}</dd></div>
        </dl>
        {profile ? <div className="steam-verified" role="status" id="steam-check-hint"><p>Аккаунт найден: {profile.name}</p><a className="text-link" href={profile.profileUrl} target="_blank" rel="noreferrer">Посмотреть профиль Steam</a></div> : <p className="field-hint" id="steam-check-hint">Проверьте аккаунт перед переходом к оплате.</p>}
        {steamError && <p className="field-error" role="alert">{steamError}</p>}
        <button className="button-primary" type="submit" disabled={steamBusy || shop.loading}>{steamBusy ? 'Проверяем…' : profile ? 'Перейти к оплате' : 'Проверить Steam ID'} <UiIcon name="arrow" /></button>
      </form>
    </section>
  </div>;
}
