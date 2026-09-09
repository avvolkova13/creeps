import assert from "node:assert/strict";
import test from "node:test";
import { parseAmountInput } from "../src/lib/amount-input.ts";

test("parses non-negative decimal amounts with either separator", () => {
  assert.equal(parseAmountInput("0"), 0);
  assert.equal(parseAmountInput(" 10 "), 10);
  assert.equal(parseAmountInput("1.7"), 1.7);
  assert.equal(parseAmountInput("1,7"), 1.7);
  assert.equal(parseAmountInput(".5"), 0.5);
  assert.equal(parseAmountInput(",5"), 0.5);
});

test("returns null for empty and unfinished separator-only input", () => {
  for (const value of ["", "   ", ".", ",", " . "]) {
    assert.equal(parseAmountInput(value), null);
  }
});

test("rejects signs, exponents, mixed separators, and unrelated characters", () => {
  for (const value of [
    "-1",
    "+1",
    "1e3",
    "1.2,3",
    "1,2.3",
    "1 000",
    "NaN",
    "Infinity",
    "10 RUB",
  ]) {
    assert.equal(parseAmountInput(value), null, value);
  }
});

test("rejects values that overflow JavaScript numbers", () => {
  assert.equal(parseAmountInput("9".repeat(400)), null);
  assert.equal(parseAmountInput(`1${"0".repeat(400)}.0`), null);
});
