"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectConfig } from "@/config/project";
import { legalDocuments } from "@/config/legal";
import { SteamLogin, useShop } from "./shop-session";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, cart } = useShop();
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
          {user ? <Link className="button-primary" href="/account">Личный кабинет</Link> : <SteamLogin />}
        </div>
      </header>

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
      <div className="footer-bottom"><p>© 2026 Creeps<span>Steam и названия игр — товарные знаки их правообладателей.</span></p><p className="footer-rate">1 Creeps = 1,7 ₽<span>Рубли у цен — справочно</span></p></div>
    </footer>
  );
}
