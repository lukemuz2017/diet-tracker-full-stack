import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAmount, multipleFor, quantityFor } from "./amounts.ts";
import { GRAMS_PER_OZ, USDA_WEIGHT, amountFor, rememberPortions, startingMultiple } from "./foods.ts";

// USDA's values are per 100 g, entries store multiples of 100 g, and the
// picker shows ounces (1 oz = 28.3495 g).

test("a weighed USDA food is picked in ounces, starting at 4 oz", () => {
  const start = startingMultiple(undefined);
  assert.equal(quantityFor(USDA_WEIGHT, start), 4);
  assert.equal(formatAmount(USDA_WEIGHT, 4), "4 oz");
  // 4 oz is 113.4 g, i.e. 1.134 times the per-100 g values.
  assert.equal(Math.round(start * 1000) / 1000, 1.134);
});

test("ounces convert to the stored multiple of 100 g and back", () => {
  assert.ok(Math.abs(multipleFor(USDA_WEIGHT, 1) * 100 - GRAMS_PER_OZ) < 1e-9);
  assert.equal(Math.round(multipleFor(USDA_WEIGHT, 8) * 100 * 10) / 10, 226.8);
  assert.equal(quantityFor(USDA_WEIGHT, 1), 3.527); // 100 g
});

test("a household portion is still shown by name, and starts at its weight", () => {
  const portions = [{ label: "1 container (6 oz)", grams: 170 }];
  rememberPortions("usda:ounce-test", portions);
  const spec = amountFor("usda:ounce-test");
  const multiple = startingMultiple(portions);
  assert.equal(multiple, 1.7);
  assert.equal(formatAmount(spec, quantityFor(spec, multiple)), "1 container (6 oz)");
});
