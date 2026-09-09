"use client";

import { useState } from "react";
import { parseAmountInput } from "@/lib/amount-input";
import { estimateRublesFromCreeps, formatEstimatedAmount } from "@/lib/currency";
import { projectConfig } from "@/config/project";

export function TopupPanels() {
  const [balanceAmount, setBalanceAmount] = useState("");
  const [steamAmount, setSteamAmount] = useState("");
  const [steamId, setSteamId] = useState("");
  const balanceValue = parseAmountInput(balanceAmount);
  const steamValue = parseAmountInput(steamAmount);
  const invalidBalance = balanceAmount !== "" && (balanceValue === null || balanceValue <= 0 || !Number.isFinite(balanceValue * projectConfig.rublesPerCreep));
  const invalidSteam = steamAmount !== "" && (steamValue === null || steamValue <= 0);
  const equivalent = balanceValue !== null && !invalidBalance ? formatEstimatedAmount(estimateRublesFromCreeps(balanceValue), "RUB", 2) : null;

  return <div className="topup-grid">
    <section className="panel topup-panel" id="balance" aria-labelledby="balance-title">
      <div className="section-kicker"><span className="eyebrow">Баланс сайта</span><span className="index-tag" aria-hidden="true">01</span></div><h2 id="balance-title">Пополнить Creeps</h2><p className="section-description">Внутренняя валюта магазина.<br />1 Creeps = 1,7 ₽.</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="field"><label htmlFor="balance-amount">Сумма в Creeps</label><div className="input-wrap"><input id="balance-amount" inputMode="decimal" value={balanceAmount} onChange={(event) => setBalanceAmount(event.target.value)} aria-invalid={invalidBalance} aria-describedby="balance-equivalent balance-error" placeholder="Введите сумму" /><span className="input-unit">Creeps</span></div><p id="balance-equivalent" className="field-hint" aria-live="polite">{equivalent ? `≈ ${equivalent} · справочно` : "Эквивалент в рублях появится здесь"}</p><p id="balance-error" className="field-error">{invalidBalance ? "Введите корректную сумму больше нуля." : ""}</p></div>
        <div className="form-notice"><span className="notice-dot" aria-hidden="true" /><p>Пополнение временно недоступно</p></div><button className="button-primary" type="submit" disabled>Пополнить баланс <span aria-hidden="true">↗</span></button>
      </form>
    </section>
    <section className="panel topup-panel steam-panel" id="steam" aria-labelledby="steam-title">
      <div className="section-kicker"><span className="eyebrow">Напрямую в Steam</span><span className="index-tag" aria-hidden="true">02</span></div><h2 id="steam-title">Пополнить Steam</h2><p className="section-description">По Steam ID, сразу к оплате.<br />Без внутреннего баланса и корзины.</p>
      <form onSubmit={(event) => event.preventDefault()}><div className="steam-fields">
        <div className="field"><label htmlFor="steam-amount">Сумма в рублях</label><div className="input-wrap"><input id="steam-amount" inputMode="decimal" placeholder="Введите сумму" value={steamAmount} onChange={(event) => setSteamAmount(event.target.value)} aria-invalid={invalidSteam} aria-describedby="steam-amount-error" /><span className="input-unit">₽</span></div><p id="steam-amount-error" className="field-error">{invalidSteam ? "Введите корректную сумму больше нуля." : ""}</p></div>
        <div className="field"><label htmlFor="steam-id">Steam ID</label><input id="steam-id" type="text" placeholder="Введите Steam ID" autoComplete="off" spellCheck={false} value={steamId} onChange={(event) => setSteamId(event.target.value)} aria-describedby="steam-check-hint" /></div>
      </div><p className="field-hint" id="steam-check-hint">Перед оплатой нужно проверить, что аккаунт существует. Сейчас проверка недоступна.</p><div className="form-notice"><span className="notice-dot" aria-hidden="true" /><p>Пополнение временно недоступно</p></div><button className="button-primary" type="submit" disabled>Проверить Steam ID <span aria-hidden="true">↗</span></button></form>
    </section>
  </div>;
}
