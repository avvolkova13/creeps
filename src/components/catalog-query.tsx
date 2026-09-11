"use client";

import { useSearchParams } from "next/navigation";
import type { CatalogState } from "@/lib/catalog";
import { CatalogView } from "./catalog-view";

export function CatalogQuery({ state }: { state: CatalogState }) {
  const params = useSearchParams();
  return <CatalogView state={state} initialSearch={params.toString()} />;
}
