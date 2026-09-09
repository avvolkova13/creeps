import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import snapshot from "../src/data/catalog-snapshot.json" with { type: "json" };
import { projectConfig } from "../src/config/project.ts";
import { filterProducts } from "../src/lib/catalog.ts";

test("imported records retain distinct sources, valid categories and verifiable local images", () => {
  assert.equal(new Set(snapshot.products.map(p => p.id)).size, snapshot.products.length);
  assert.deepEqual([...new Set(snapshot.products.map(p => p.source.name))].sort(), ["SkinBaron", "SkinSwap"]);
  const categories = new Set(snapshot.categories.map(c => c.id));
  for (const p of snapshot.products) {
    assert.ok(categories.has(p.categoryId), p.id);
    assert.ok(p.name && p.description && p.condition, p.id);
    assert.ok(p.float === null || (p.float >= 0 && p.float <= 1), p.id);
    assert.ok(Number.isFinite(Date.parse(p.source.capturedAt)), p.id);
    assert.ok(["skinswap.com", "skinbaron.de"].includes(new URL(p.source.url).hostname), p.id);
    assert.match(p.imageUrl, /^\/catalog\/[a-f0-9]+\.(webp|png|jpg)$/);
    const image = readFileSync(new URL(`../public${p.imageUrl}`, import.meta.url));
    assert.ok(image.length > 100, p.id);
    assert.ok(image.subarray(8, 12).toString() === "WEBP" || image.subarray(1, 4).toString() === "PNG" || image[0] === 0xff, p.id);
  }
});

test("prices use the source offer price and stated foreign exchange, not crossed-out Steam prices", () => {
  for (const p of snapshot.products) {
    assert.ok(p.source.price > 0 && p.source.rublesPerUnit > 0);
    const expectedRubles = p.source.price * p.source.rublesPerUnit;
    assert.ok(Math.abs(p.priceCreeps * projectConfig.rublesPerCreep - expectedRubles) < 0.000001, p.id);
    assert.equal(p.source.rublesPerUnit, p.source.currency === "USD" ? snapshot.exchangeRates.usdRub : snapshot.exchangeRates.eurRub);
  }
});

test("real snapshot supports combined name, category, wear and price filters", () => {
  const p = snapshot.products.find(p => p.source.name === "SkinSwap");
  const result = filterProducts(snapshot.products, { query: p.name, categoryId: p.categoryId, condition: p.condition, minPrice: p.priceCreeps, maxPrice: p.priceCreeps });
  assert.ok(result.some(item => item.id === p.id));
  assert.ok(result.every(item => item.name.includes(p.name) && item.categoryId === p.categoryId && item.condition === p.condition && item.priceCreeps === p.priceCreeps));
});
