"use client";

import { useSearchParams } from "next/navigation";
import type { CatalogState } from "@/lib/catalog";
import { CatalogView } from "./catalog-view";

export function CatalogQuery({ state }: { state: CatalogState }) {
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  return <CatalogView key={category} state={state} initialCategory={category} />;
}
