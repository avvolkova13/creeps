"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { projectConfig } from "@/config/project";
import { Dialog } from "./dialog";

export function SiteHeader() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<"steam" | "cart" | null>(null);
  return (
    <>
      <a className="skip-link" href="#main-content">К содержимому</a>
      <header className="site-header page-width">
        <Link className="site-name" href="/" aria-label={`${projectConfig.siteName} — главная`}>Скины и цифровые товары<span>{projectConfig.siteName}<span className="name-dot" aria-hidden="true">.</span></span></Link>
        <nav className="main-nav" aria-label="Основная навигация">
          <Link href="/catalog" aria-current={pathname.startsWith("/catalog") ? "page" : undefined}>Каталог</Link>
          <Link href="/#balance">Баланс сайта</Link>
          <Link href="/#steam">Пополнить Steam</Link>
        </nav>
        <div className="header-actions">
          <button className="button-secondary cart-button" onClick={() => setNotice("cart")} type="button">Корзина</button>
          <button className="button-primary" onClick={() => setNotice("steam")} type="button">Войти через Steam <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <Dialog open={notice !== null} onClose={() => setNotice(null)} titleId="service-notice-title">
        <p className="eyebrow">{notice === "cart" ? "Корзина" : "Авторизация"}</p>
        <h2 id="service-notice-title">{notice === "cart" ? "Корзина пока недоступна" : "Вход временно недоступен"}</h2>
        <p>{notice === "cart" ? "Здесь будет состав вашего заказа. Покупки пока недоступны." : "Вход в личный кабинет будет доступен через Steam. Попробуйте позже."}</p>
        <a className="text-link" href={`mailto:${projectConfig.supportEmail}`}>Связаться с поддержкой ↗</a>
      </Dialog>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer page-width">
      <div><span className="eyebrow">Поддержка</span><a className="support-link" href={`mailto:${projectConfig.supportEmail}`}>{projectConfig.supportEmail} <span aria-hidden="true">↗</span></a></div>
      <nav aria-label="Навигация в подвале"><Link href="/catalog">Каталог</Link><Link href="/#faq">Вопросы и ответы</Link></nav>
      <p className="footer-rate">1 Creeps = 1,7 ₽<span>Рубли у цен — справочно</span></p>
    </footer>
  );
}
