"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { projectConfig } from "@/config/project";
import { legalDocuments } from "@/config/legal";
import { isShowcasePreview } from "@/config/runtime";
import { useShop } from "./shop-session";
import { Dialog } from "./dialog";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, cart, loading, presentationSignedIn, logout } = useShop();
  const signedIn = Boolean(user) || (isShowcasePreview && presentationSignedIn);
  const [busy, setBusy] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  async function signOut() {
    if (busy) return;
    setBusy(true); setLogoutError('');
    try { await logout(); setLogoutOpen(false); } catch (error) { setLogoutError((error as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
      <a className="skip-link" href="#main-content">К содержимому</a>
      <header className="site-header page-width">
        <Link className="site-name" href="/" aria-label={`${projectConfig.siteName} — главная`}><span>{projectConfig.siteName}</span></Link>
        <nav className="main-nav" aria-label="Основная навигация">
          <Link href="/catalog" aria-current={pathname.startsWith("/catalog") ? "page" : undefined}>Каталог</Link>
          <Link href="/#balance">Баланс сайта</Link>
          <Link href="/#steam">Пополнить Steam</Link>
        </nav>
        <div className="header-actions">
          <Link className="button-secondary cart-button" href="/cart"><span aria-live="polite" aria-atomic="true">Корзина{cart.items.length > 0 ? ` · ${cart.items.length}` : ""}</span></Link>
          {loading ? <button className="button-secondary" disabled aria-label="Загрузка профиля">…</button> : signedIn ? <>
            <Link className="button-secondary" href="/account" aria-label="Личный кабинет" aria-current={pathname === "/account" ? "page" : undefined}><span className="account-nav-full">Личный кабинет</span><span className="account-nav-short">Кабинет</span></Link>
            <button className="button-secondary" type="button" disabled={busy} onClick={() => { setLogoutError(''); setLogoutOpen(true); }}>Выйти</button>
          </> : <Link className="button-secondary" href="/login">Войти</Link>}
        </div>
      </header>
      <Dialog open={logoutOpen} onClose={() => { if (!busy) setLogoutOpen(false); }} titleId="logout-confirm-title" className="logout-dialog" dismissible={!busy}>
        <h2 id="logout-confirm-title">Вы действительно хотите выйти?</h2>
        <p>Для доступа к личному кабинету потребуется войти снова.</p>
        {logoutError && <p className="field-error" role="alert">{logoutError}</p>}
        <div className="logout-dialog-actions">
          <button className="button-secondary" type="button" data-dialog-initial-focus disabled={busy} onClick={() => setLogoutOpen(false)}>Остаться</button>
          <button className="button-primary" type="button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Выходим…' : 'Выйти'}</button>
        </div>
      </Dialog>

    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer page-width">
      <div className="footer-main">
        <div><Link className="site-name" href="/"><span>Creeps</span></Link><p className="eyebrow">Поддержка</p><a className="support-link" href={`mailto:${projectConfig.supportEmail}`}>{projectConfig.supportEmail}</a></div>
        <nav aria-label="Навигация в подвале"><span className="eyebrow">Магазин</span><Link href="/catalog">Каталог</Link><Link href="/cart">Корзина</Link><Link href="/#faq">Вопросы и ответы</Link></nav>
        <nav aria-label="Юридические документы"><span className="eyebrow">Документы</span>{Object.entries(legalDocuments).map(([id, doc]) => <Link key={id} href={`/legal/${id}`}>{doc.title}</Link>)}</nav>
      </div>
      <div className="footer-bottom"><p>© 2026 Creeps<span>Steam и названия игр — товарные знаки их правообладателей.</span></p><p className="footer-rate">Цены в рублях рассчитаны по курсу 1 Creeps = 1,7 ₽</p></div>
    </footer>
  );
}
