import test from "node:test";
import assert from "node:assert/strict";
import { filterProducts } from "../src/lib/catalog.ts";

// Synthetic records only for algorithm tests. Never included in the app's inventory.
const products = [
  { id: "test-a", name: "Тест Альфа", categoryId: "test-category-a", priceCreeps: 10, condition: "test-condition-a" },
  { id: "test-b", name: "Тест Бета", categoryId: "test-category-b", priceCreeps: 20, condition: "test-condition-b" },
  { id: "test-c", name: "Тест Альфа 2", categoryId: "test-category-a", priceCreeps: 30, condition: null },
];
const all = { query: "", categoryId: "", minPrice: null, maxPrice: null, condition: "" };

test("search trims whitespace, ignores case, and preserves source order", () => {
  const before = structuredClone(products);
  assert.deepEqual(filterProducts(products, { ...all, query: "  АЛЬФА  " }).map(p => p.id), ["test-a", "test-c"]);
  assert.deepEqual(products, before);
});

test("category, condition and inclusive price boundaries are combined", () => {
  assert.deepEqual(filterProducts(products, { ...all, categoryId: "test-category-a", minPrice: 10, maxPrice: 10, condition: "test-condition-a" }).map(p => p.id), ["test-a"]);
  assert.deepEqual(filterProducts(products, { ...all, categoryId: "test-category-a", condition: "test-condition-b" }), []);
});

test("unknown category and unmatched search do not fall back to all inventory", () => {
  assert.deepEqual(filterProducts(products, { ...all, categoryId: "unknown" }), []);
  assert.deepEqual(filterProducts(products, { ...all, query: "unmatched" }), []);
  assert.deepEqual(filterProducts([], all), []);
});

test("cleared filters return all supplied inventory and zero is a real price boundary", () => {
  assert.deepEqual(filterProducts(products, all), products);
  assert.deepEqual(filterProducts(products, { ...all, maxPrice: 0 }), []);
});

const detailed = [
  {...products[0], float: 0, attributes: {weapon: "AK-47", rarity: "Тайное", colors: ["red", "orange"], stattrak: true, popularity: 4.2, discountPercent: 30, tradeLocked: false, stickers: ["Cloud9 (Holo)"]}},
  {...products[1], float: 0.5, attributes: {weapon: "P250", rarity: "Тайное", colors: ["blue"], souvenir: true, popularity: 4.8, discountPercent: 20, tradeLocked: true, stickers: []}},
  {...products[2], float: null, attributes: {}},
];

test("multi-select is OR within groups and AND between groups", () => {
  assert.deepEqual(filterProducts(detailed, {...all, categoryIds: ["test-category-a", "test-category-b"], colors: ["red", "blue"], editions: ["stattrak", "souvenir"]}).map(p => p.id), ["test-a", "test-b"]);
  assert.deepEqual(filterProducts(detailed, {...all, weapons: ["AK-47"], rarities: ["Тайное"], maxFloat: 0}).map(p => p.id), ["test-a"]);
  assert.deepEqual(filterProducts(detailed, {...all, weapons: ["AK-47"], colors: ["blue"]}), []);
});

test("unknown float and source trade lock cannot match known values", () => {
  assert.deepEqual(filterProducts(detailed, {...all, minFloat: 0, maxFloat: 1}).map(p => p.id), ["test-a", "test-b"]);
  assert.deepEqual(filterProducts(detailed, {...all, tradeLock: "unlocked"}).map(p => p.id), ["test-a"]);
  assert.deepEqual(filterProducts(detailed, {...all, hasStickers: true, stickerQuery: "  CLOUD9 "}).map(p => p.id), ["test-a"]);
});

import {sortProducts} from "../src/lib/catalog.ts";
test("all sort modes preserve input and put missing values last", () => {
  const before = structuredClone(detailed);
  for (const [mode, ids] of Object.entries({recommended: ["test-a", "test-b", "test-c"], "price-asc": ["test-a", "test-b", "test-c"], "price-desc": ["test-c", "test-b", "test-a"], quality: ["test-a", "test-b", "test-c"], popularity: ["test-b", "test-a", "test-c"], discount: ["test-a", "test-b", "test-c"]})) {
    assert.deepEqual(sortProducts(detailed, mode).map(p => p.id), ids);
  }
  assert.deepEqual(detailed, before);
  assert.deepEqual(sortProducts([detailed[0], {...detailed[0], id:"tie"}], "price-desc").map(p => p.id), ["test-a", "tie"]);
});
