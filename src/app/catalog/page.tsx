import type { Metadata } from "next";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog-source";
import { CatalogView } from "@/components/catalog-view";
import { CatalogQuery } from "@/components/catalog-query";

export const metadata: Metadata = { title: "Каталог" };

export default async function CatalogPage() {
  const state = await getCatalog();
  return <main id="main-content" className="page-width inner-page"><div className="page-heading panel"><h1>Каталог</h1><p>Скины и цифровые товары</p></div><Suspense fallback={<CatalogView state={state} />}><CatalogQuery state={state} /></Suspense></main>;
}
