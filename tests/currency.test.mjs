import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateRublesFromCreeps,
  estimateCreepsFromRubles,
  formatEstimatedAmount,
} from "../src/lib/currency.ts";

test("converts Creeps to rubles at the agreed rate", () => {
  assert.equal(estimateRublesFromCreeps(10), 17);
  assert.equal(estimateRublesFromCreeps(100), 170);
  assert.equal(estimateRublesFromCreeps(0), 0);
});

test("converts rubles back to Creeps", () => {
  assert.equal(estimateCreepsFromRubles(17), 10);
  assert.equal(estimateCreepsFromRubles(170), 100);
  assert.equal(estimateCreepsFromRubles(0), 0);
});

test("keeps the estimate unrounded rather than inventing a settlement rule", () => {
  assert.equal(estimateCreepsFromRubles(1), 1 / 1.7);
  assert.notEqual(estimateCreepsFromRubles(1), 0.59);
  assert.equal(estimateRublesFromCreeps(0.1), 0.17);
});

test("rejects invalid input instead of returning a misleading price", () => {
  for (const convert of [estimateRublesFromCreeps, estimateCreepsFromRubles]) {
    for (const invalid of [-1, NaN, Infinity, -Infinity, "10", null]) {
      assert.throws(() => convert(invalid), RangeError);
    }
  }
});

test("rejects numeric overflow", () => {
  assert.throws(() => estimateRublesFromCreeps(Number.MAX_VALUE), RangeError);
});

test("formats estimates with caller-specified display precision and units", () => {
  assert.equal(formatEstimatedAmount(10, "Creeps", 0), "10\u00a0Creeps");
  assert.equal(formatEstimatedAmount(17, "RUB", 2), "17,00\u00a0₽");
  assert.equal(formatEstimatedAmount(1 / 1.7, "Creeps", 4), "0,5882\u00a0Creeps");
});

test("does not silently select display precision or accept unknown units", () => {
  for (const precision of [undefined, -1, 1.5, Infinity, 101]) {
    assert.throws(() => formatEstimatedAmount(10, "Creeps", precision), RangeError);
  }
  assert.throws(() => formatEstimatedAmount(10, "USD", 2), RangeError);
  assert.throws(() => formatEstimatedAmount(NaN, "RUB", 2), RangeError);
});

test("displays negative zero as an ordinary zero amount", () => {
  assert.equal(formatEstimatedAmount(-0, "Creeps", 0), "0\u00a0Creeps");
  assert.equal(formatEstimatedAmount(-0, "RUB", 2), "0,00\u00a0₽");
});
