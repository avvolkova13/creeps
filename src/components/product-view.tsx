"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category, Product } from "@/lib/catalog";
import { estimateRublesFromCreeps, formatEstimatedAmount } from "@/lib/currency";
import { projectConfig } from "@/config/project";
import { Dialog } from "./dialog";
import { publicAsset } from "@/lib/public-asset";

export function ProductPrice({ amount }: { amount: number }) {
  return <div className="product-price"><strong>{formatEstimatedAmount(amount, "Creeps", 2)}</strong><span>≈ {formatEstimatedAmount(estimateRublesFromCreeps(amount), "RUB", 2)}</span></div>;
}

function ProductSource({ product }: { product: Product }) {
  const source = product.source;
  if (!source) return null;
  const original = new Intl.NumberFormat("ru-RU", { style: "currency", currency: source.currency }).format(source.price);
  const rate = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 }).format(source.rublesPerUnit);
  const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeZone: "UTC" }).format(new Date(source.capturedAt));
  return <details className="product-source"><summary>Источник и расчёт цены · {source.name}</summary><p><a href={source.url} target="_blank" rel="noreferrer">{source.kind === "offer" ? "Предложение" : "Витрина"} {source.name} ↗</a> · {date}</p><p>Цена источника: {original}. Справочный курс: 1 {source.currency} ≈ {rate} ₽, по данным <a href={source.exchangeRateUrl} target="_blank" rel="noreferrer">SkinSwap</a>. 1 Creeps = 1,7 ₽. Цена и наличие могут измениться.</p>{source.descriptionUrl && <p><a href={source.descriptionUrl} target="_blank" rel="noreferrer">Описание скина в источнике ↗</a></p>}</details>;
}

function formatFloat(product: Product) {
  if (product.float === null) return "Не указан";
  return `${product.source?.floatPrecision === "rounded" ? "≈ " : ""}${product.float.toFixed(product.source?.floatPrecision === "rounded" ? 3 : 8)}`;
}

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return <div className="product-image">{failed ? <p className="field-hint">Изображение недоступно</p> : (
    // Vendor image dimensions and host are not yet known; preserve the source colours and aspect ratio.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={publicAsset(product.imageUrl)} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
  )}</div>;
}

export function ProductDetails({ product, category, quick = false }: { product: Product; category: Category | undefined; quick?: boolean }) {
  return <div className="product-details">
    <ProductImage product={product} />
    <div className="product-information">
      <p className="eyebrow">{category?.name ?? "Категория не указана"}</p>
      {quick ? <h2 id="quick-view-title">{product.name}</h2> : <h1>{product.name}</h1>}
      <p className="product-description">{product.description || "Описание не предоставлено."}</p>
      <dl className="specifications"><div><dt>Состояние</dt><dd>{product.condition ?? "Не указано"}</dd></div><div><dt>Float</dt><dd>{formatFloat(product)}</dd></div></dl>
      <ProductPrice amount={product.priceCreeps} />
      <ProductSource product={product} />
      <div className="purchase-area"><button className="button-primary" disabled>Покупка недоступна</button><p className="field-hint">{product.source ? "Справочная карточка из внешней витрины. Покупка и выдача в Creeps пока недоступны." : "Сейчас оформить заказ нельзя. Попробуйте позже."}</p></div>
      <div className="payment-methods"><span className="eyebrow">Способы оплаты</span><p>{projectConfig.paymentMethods.map((method) => method.label).join(" · ")}</p></div>
      {quick && <Link className="text-link" href={`/catalog/${encodeURIComponent(product.id)}`}>Полная карточка товара ↗</Link>}
    </div>
  </div>;
}

export function ProductGrid({ products, categories }: { products: readonly Product[]; categories: readonly Category[] }) {
  const [selected, setSelected] = useState<Product | null>(null);
  return <>
    <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}>
      <Link className="product-image-link" href={`/catalog/${encodeURIComponent(product.id)}`} tabIndex={-1} aria-hidden="true"><ProductImage product={product} /></Link>
      <div className="product-card-body">
        <p className="eyebrow">{categories.find((category) => category.id === product.categoryId)?.name ?? "Категория не указана"}</p>
        <h3><Link href={`/catalog/${encodeURIComponent(product.id)}`}>{product.name}</Link></h3>
        {product.condition && <p className="field-hint">{product.condition}</p>}
        {product.source && <p className="product-origin">{product.source.name} · справочная цена</p>}
        <ProductPrice amount={product.priceCreeps} />
        <button className="button-secondary" onClick={() => setSelected(product)}>Посмотреть товар <span aria-hidden="true">↗</span></button>
      </div>
    </article>)}</div>
    <Dialog open={selected !== null} onClose={() => setSelected(null)} titleId="quick-view-title">{selected && <ProductDetails product={selected} category={categories.find((category) => category.id === selected.categoryId)} quick />}</Dialog>
  </>;
}
