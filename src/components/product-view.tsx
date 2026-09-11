"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category, Product } from "@/lib/catalog";
import { formatEstimatedAmount } from "@/lib/currency";
import { projectConfig } from "@/config/project";
import { publicAsset } from "@/lib/public-asset";
import { ProductCard } from "./product-card";
import { AddToCart } from "./shop-session";
import { productQuote } from "@/lib/money";

export function ProductPrice({ amount, rublesAmount, sign = "" }: { amount: number; rublesAmount?: number; sign?: "" | "+" | "−" }) {
  const quote = productQuote(amount);
  const value = formatEstimatedAmount(quote.creeps, "Creeps", 2).replace(/\s*Creeps$/, "");
  return <div className="product-price"><strong><span className="price-value">{sign}{value}</span>{" "}<span className="price-unit">Creeps</span></strong><span>≈ {sign}{formatEstimatedAmount(rublesAmount ?? quote.rubles, "RUB", 2)}</span></div>;
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

export function ProductDetails({ product, category }: { product: Product; category: Category | undefined }) {
  return <div className="product-details">
    <ProductImage product={product} />
    <div className="product-information">
      <p className="eyebrow">{category?.name ?? "Категория не указана"}</p>
      <h1>{product.name}</h1>
      <p className="product-description">{product.description || "Описание не предоставлено."}</p>
      <dl className="specifications"><div><dt>Состояние</dt><dd>{product.condition ?? "Не указано"}</dd></div>{product.float !== null && <div><dt>Float</dt><dd>{formatFloat(product)}</dd></div>}</dl>
      <ProductPrice amount={product.priceCreeps} />
      <AddToCart productId={product.id} />
      <div className="payment-methods"><span className="eyebrow">Способы оплаты</span><p>{projectConfig.paymentMethods.map((method) => method.label).join(" · ")}</p></div>
    </div>
  </div>;
}

export function ProductGrid({ products, categories }: { products: readonly Product[]; categories: readonly Category[] }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id}>
      <ProductImage product={product} />
      <div className="product-card-body">
        <p className="eyebrow">{categories.find((category) => category.id === product.categoryId)?.name ?? "Категория не указана"}</p>
        <h3><Link className="product-card-link" href={`/catalog/${encodeURIComponent(product.id)}`}>{product.name}</Link></h3>
        {product.condition && <p className="field-hint">{product.condition}</p>}
        <ProductPrice amount={product.priceCreeps} />
        <AddToCart productId={product.id} />
      </div>
    </ProductCard>)}</div>
}
