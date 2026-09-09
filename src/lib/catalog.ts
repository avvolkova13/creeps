/** Internal display model. A provider adapter must validate and map its own contract. */
export type Category = Readonly<{ id: string; name: string; description: string }>;

export type Product = Readonly<{
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  priceCreeps: number;
  condition: string | null;
  float: number | null;
  source?: Readonly<{
    name: string;
    url: string;
    imageUrl: string;
    capturedAt: string;
    price: number;
    currency: string;
    rublesPerUnit: number;
    exchangeRateUrl: string;
    kind: string;
    floatPrecision: string;
    descriptionUrl?: string;
  }>;
}>;

export type CatalogState =
  | { status: "ready"; products: readonly Product[]; categories: readonly Category[] }
  | { status: "unavailable" | "error" | "loading" };

export type CatalogFilters = Readonly<{
  query: string;
  categoryId: string;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string;
}>;

export function filterProducts(products: readonly Product[], filters: CatalogFilters): Product[] {
  const query = filters.query.trim().toLocaleLowerCase("ru-RU");
  return products.filter((product) =>
    (!query || product.name.toLocaleLowerCase("ru-RU").includes(query)) &&
    (!filters.categoryId || product.categoryId === filters.categoryId) &&
    (filters.minPrice === null || product.priceCreeps >= filters.minPrice) &&
    (filters.maxPrice === null || product.priceCreeps <= filters.maxPrice) &&
    (!filters.condition || product.condition === filters.condition),
  );
}
