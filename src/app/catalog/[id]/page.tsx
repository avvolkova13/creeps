import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog-source";
import { CatalogStatus } from "@/components/catalog-status";
import { ProductDetails } from "@/components/product-view";

export const dynamicParams = false;

export async function generateStaticParams() {
  const state = await getCatalog();
  return state.status === "ready" ? state.products.map(({ id }) => ({ id })) : [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [state, { id }] = await Promise.all([getCatalog(), params]);
  const product = state.status === "ready" ? state.products.find((item) => item.id === id) : undefined;
  return { title: product?.name ?? "Товар", ...(product ? { description: product.description } : {}) };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [state, { id }] = await Promise.all([getCatalog(), params]);
  const product = state.status === "ready" ? state.products.find((item) => item.id === id) : undefined;
  if (state.status === "ready" && !product) notFound();
  return <main id="main-content" className="page-width inner-page">
    {state.status === "ready" && product ? <section className="panel full-product"><ProductDetails product={product} category={state.categories.find((category) => category.id === product.categoryId)} /></section> : <section className="panel"><h1 className="unavailable-product-heading">Карточка товара</h1><CatalogStatus status={state.status === "ready" ? "missing" : state.status} product /></section>}
  </main>;
}
