import Link from "next/link";
import { getCatalog } from "@/lib/catalog-source";
import { CurrencyConverter } from "@/components/currency-converter";
import { TopupPanels } from "@/components/topup-panels";
import { CatalogStatus } from "@/components/catalog-status";
import { ProductGrid } from "@/components/product-view";
import { SkinHero } from "@/components/skin-hero";
import { CatalogSourceNote } from "@/components/catalog-source-note";

const questions = [
  ["Что такое Creeps и какой у них курс?", "Creeps — название магазина и его внутренней валюты. 1 Creeps равен 1,7 рубля. Рядом с ценами в Creeps указан справочный эквивалент в рублях. Калькулятор вверху страницы считает в обе стороны."],
  ["Как работает прямое пополнение Steam?", "Укажите сумму в рублях и Steam ID. Перед оплатой сервис должен проверить, существует ли аккаунт. Затем — сразу оплата, без корзины и без использования баланса Creeps. Сейчас пополнение недоступно."],
  ["Как войти в личный кабинет?", "Вход предусмотрен через Steam. Кнопка находится в верхней части страницы. Сейчас авторизация недоступна."],
  ["Куда я получу купленный скин?", "Скины выдаются на ваш trade-URL. Указать или изменить его можно будет в личном кабинете. Сейчас покупки недоступны."],
];

export default async function Home() {
  const catalog = await getCatalog();
  return <main id="main-content" className="page-width home-page">
    <SkinHero />
    <div className="hero-converter"><CurrencyConverter /></div>
    <section className="panel categories-section" aria-labelledby="categories-title"><div className="section-kicker"><h2 id="categories-title">Категории</h2><span className="eyebrow">Навигация по товарам</span></div>
      {catalog.status === "ready" && catalog.categories.length > 0 ? <div className="category-list">{catalog.categories.map((category) => <Link key={category.id} href={`/catalog?category=${encodeURIComponent(category.id)}`}><strong>{category.name} <span aria-hidden="true">↗</span></strong><span>{category.description}</span></Link>)}</div> : <p className="field-hint category-unavailable">{catalog.status === "ready" ? "Категории пока не добавлены." : "Список категорий временно недоступен. Он появится вместе с ассортиментом."}</p>}
    </section>
    <section className="showcase" aria-labelledby="showcase-title"><div className="section-heading panel"><div><span className="eyebrow">Витрина</span><h2 id="showcase-title">Товары</h2></div><Link href="/catalog" className="text-link">Весь каталог <span aria-hidden="true">↗</span></Link></div>
      {catalog.status === "ready" && catalog.products.length > 0 ? <><div className="panel catalog-provenance"><CatalogSourceNote products={catalog.products} /></div><ProductGrid products={catalog.products.slice(0, 12)} categories={catalog.categories} /></> : <div className="panel showcase-unavailable"><CatalogStatus status={catalog.status === "ready" ? "empty" : catalog.status} /></div>}
    </section>
    <TopupPanels />
    <section className="panel faq-section" id="faq" aria-labelledby="faq-title"><div className="faq-heading"><span className="eyebrow">FAQ</span><h2 id="faq-title">Вопросы{" "}<br />и ответы</h2></div><div className="faq-items">{questions.map(([question, answer], index) => <details key={question}><summary><span className="faq-index" aria-hidden="true">0{index + 1}</span><span>{question}</span><span className="faq-toggle" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  </main>;
}
