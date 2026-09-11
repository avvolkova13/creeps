import { productQuote } from './money.ts';

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
  attributes?: ProductAttributes;
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

export type ProductAttributes = Readonly<{
  weapon?: string;
  itemType?: string;
  rarity?: string;
  colors?: readonly string[];
  stattrak?: boolean;
  souvenir?: boolean;
  vanilla?: boolean;
  tradeLocked?: boolean;
  stickers?: readonly string[];
  popularity?: number;
  popularityVotes?: number;
  discountPercent?: number;
  evidenceUrl?: string;
}>;

export type CatalogFilters = Readonly<{
  query: string;
  categoryId: string;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string;
  categoryIds?: readonly string[];
  conditions?: readonly string[];
  weapons?: readonly string[];
  itemTypes?: readonly string[];
  rarities?: readonly string[];
  colors?: readonly string[];
  editions?: readonly string[];
  minFloat?: number | null;
  maxFloat?: number | null;
  tradeLock?: string;
  hasStickers?: boolean;
  stickerQuery?: string;
}>;

const normalize = (value: string) => value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
const matches = (selected: readonly string[] | undefined, value: string | null | undefined) => !selected?.length || (value != null && selected.includes(value));

export function filterProducts(products: readonly Product[], filters: CatalogFilters): Product[] {
  const query = normalize(filters.query);
  const stickerQuery = normalize(filters.stickerQuery ?? "");
  return products.filter((product) => {
    const attributes = product.attributes ?? {};
    return (!query || normalize(product.name + " " + (attributes.weapon ?? "")).includes(query)) &&
      (!filters.categoryId || product.categoryId === filters.categoryId) &&
      matches(filters.categoryIds, product.categoryId) &&
      (filters.minPrice === null || productQuote(product.priceCreeps).creeps >= filters.minPrice) &&
      (filters.maxPrice === null || productQuote(product.priceCreeps).creeps <= filters.maxPrice) &&
      (!filters.condition || product.condition === filters.condition) &&
      matches(filters.conditions, product.condition) &&
      matches(filters.weapons, attributes.weapon) &&
      matches(filters.itemTypes, attributes.itemType) &&
      matches(filters.rarities, attributes.rarity) &&
      (!filters.colors?.length || filters.colors.some(color => attributes.colors?.includes(color))) &&
      (!filters.editions?.length || filters.editions.some(edition =>
        edition === "stattrak" ? attributes.stattrak === true : edition === "souvenir" ? attributes.souvenir === true : edition === "vanilla" && attributes.vanilla === true)) &&
      (filters.minFloat == null || (product.float != null && product.float >= filters.minFloat)) &&
      (filters.maxFloat == null || (product.float != null && product.float <= filters.maxFloat)) &&
      (!filters.tradeLock || (filters.tradeLock === "unlocked" ? attributes.tradeLocked === false : attributes.tradeLocked === true)) &&
      (!filters.hasStickers || Boolean(attributes.stickers?.length)) &&
      (!stickerQuery || Boolean(attributes.stickers?.some(sticker => normalize(sticker).includes(stickerQuery))));
  });
}

export type CatalogSort = "recommended" | "price-asc" | "price-desc" | "quality" | "popularity" | "discount";

export function sortProducts(products: readonly Product[], sort: CatalogSort): Product[] {
  if (sort === "recommended") return [...products];
  const value = (product: Product) => sort === "quality" ? product.float : sort === "popularity" ? product.attributes?.popularity : sort === "discount" ? product.attributes?.discountPercent : product.priceCreeps;
  const descending = sort === "price-desc" || sort === "popularity" || sort === "discount";
  // Stable sort preserves the source order for ties. Unknown values always come last.
  return [...products].sort((a, b) => {
    const left = value(a), right = value(b);
    if (left == null || !Number.isFinite(left)) return right == null || !Number.isFinite(right) ? 0 : 1;
    if (right == null || !Number.isFinite(right)) return -1;
    return descending ? right - left : left - right;
  });
}
