import type { Product } from "@/lib/catalog";

export function CatalogSourceNote({ products }: { products: readonly Product[] }) {
  const source = products.find((product) => product.source)?.source;
  if (!source) return null;
  const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(source.capturedAt));
  return <p className="catalog-source-note">Данные <a href="https://skinswap.com/ru" target="_blank" rel="noreferrer">SkinSwap</a> и <a href="https://skinbaron.de/ru" target="_blank" rel="noreferrer">SkinBaron</a> · {date}. Цены справочные. Покупка в Creeps пока недоступна.</p>;
}
