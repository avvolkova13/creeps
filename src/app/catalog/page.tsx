import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog-source";
import { CatalogView } from "@/components/catalog-view";
import { CatalogQuery } from "@/components/catalog-query";

export const metadata: Metadata = { title: "Каталог" };

export default async function CatalogPage() {
  const state = await getCatalog();
  return <main id="main-content" className="page-width inner-page"><div className="page-heading panel"><Link href="/" className="breadcrumb">Главная <span aria-hidden="true">/</span></Link><h1>Каталог<span className="heading-period" aria-hidden="true">.</span></h1><p>Скины и цифровые товары</p></div><Suspense fallback={<CatalogView state={state} />}><CatalogQuery state={state} /></Suspense></main>;
}
