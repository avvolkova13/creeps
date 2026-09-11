import Link from "next/link";
import { getCatalog } from "@/lib/catalog-source";
import { CurrencyConverter } from "@/components/currency-converter";
import { TopupPanels } from "@/components/topup-panels";
import { CatalogStatus } from "@/components/catalog-status";
import { ProductGrid } from "@/components/product-view";
import { SkinHero } from "@/components/skin-hero";
import { projectConfig } from "@/config/project";

const questions = [
  ["Что такое Creeps и какой у них курс?", "Creeps — название магазина и его внутренней валюты. 1 Creeps равен 1,7 рубля. Рядом с ценами в Creeps указан справочный эквивалент в рублях. Калькулятор вверху страницы считает в обе стороны."],
  ["Как работает прямое пополнение Steam?", "Укажите сумму зачисления в рублях и Steam ID. Комиссия — 5%: при пополнении на 1000 ₽ к оплате 1050 ₽. Перед оплатой сервис должен проверить, существует ли аккаунт. Затем — сразу оплата, без корзины и без использования баланса Creeps."],
  ["Как войти в личный кабинет?", "Нажмите «Войти через Steam» в верхней части страницы и подтвердите вход на сайте Steam. После подтверждения откроется личный кабинет Creeps."],
  ["Куда я получу купленный скин?", "Скины выдаются на ваш trade-URL. Указать или изменить его можно в личном кабинете после входа через Steam."],
];

export default async function Home() {
  const catalog = await getCatalog();
  return <main id="main-content" className="page-width home-page">
    <SkinHero />
    <div className="hero-converter"><CurrencyConverter /></div>
    <section className="panel categories-section" aria-labelledby="categories-title"><div className="section-kicker"><h2 id="categories-title">Категории</h2><span className="eyebrow">Навигация по товарам</span></div>
      {catalog.status === "ready" && catalog.categories.length > 0 ? <div className="category-list">{catalog.categories.map((category) => <Link key={category.id} href={`/catalog?category=${encodeURIComponent(category.id)}`}><strong>{category.name} <span aria-hidden="true">↗</span></strong><span>{category.description}</span></Link>)}</div> : <p className="field-hint category-unavailable">{catalog.status === "ready" ? "Категории пока не добавлены." : "Список категорий временно недоступен. Он появится вместе с ассортиментом."}</p>}
    </section>
    <section className="showcase" aria-labelledby="showcase-title"><div className="section-heading panel"><div><span className="eyebrow">Витрина</span><h2 id="showcase-title">Товары</h2></div><Link href="/catalog" className="text-link text-link-with-icon"><span className="text-link-label">Весь каталог</span><span aria-hidden="true">↗</span></Link></div>
      {catalog.status === "ready" && catalog.products.length > 0 ? <ProductGrid products={catalog.products.slice(0, 12)} categories={catalog.categories} /> : <div className="panel showcase-unavailable"><CatalogStatus status={catalog.status === "ready" ? "empty" : catalog.status} /></div>}
    </section>
    <TopupPanels />
    <section className="panel capabilities-section" aria-labelledby="capabilities-title">
      <h2 id="capabilities-title">Возможности Creeps</h2>
      <ul className="capabilities-list">
        <li><span className="capability-index" aria-hidden="true">01</span><h3>Цена в двух валютах</h3><p>Стоимость в Creeps и эквивалент в рублях рядом. Курс: 1 Creeps = {projectConfig.rublesPerCreep.toLocaleString("ru-RU")} ₽.</p></li>
        <li><span className="capability-index" aria-hidden="true">02</span><h3>Подбор по параметрам</h3><p>Ищите скины по названию, категории, цене и состоянию.</p></li>
        <li><span className="capability-index" aria-hidden="true">03</span><h3>Характеристики перед выбором</h3><p>Изображение, описание, состояние и доступный float — в карточке товара.</p></li>
      </ul>
    </section>
    <section className="panel faq-section" id="faq" aria-labelledby="faq-title"><div className="faq-heading"><span className="eyebrow">FAQ</span><h2 id="faq-title">Вопросы{" "}<br />и ответы</h2></div><div className="faq-items">{questions.map(([question, answer], index) => <details key={question}><summary><span className="faq-index" aria-hidden="true">0{index + 1}</span><span>{question}</span><span className="faq-toggle" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  </main>;
}
