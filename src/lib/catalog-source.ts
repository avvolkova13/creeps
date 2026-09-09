import type { CatalogState } from "./catalog";
import snapshot from "../data/catalog-snapshot.json";

/** Public-page snapshot approved by the user. Never confirms stock or fulfilment in Creeps. */
export async function getCatalog(): Promise<CatalogState> {
  return { status: "ready", products: snapshot.products, categories: snapshot.categories };
}
