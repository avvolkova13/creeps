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
