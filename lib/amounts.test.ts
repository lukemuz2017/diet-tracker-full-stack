import assert from "node:assert/strict";
import { test } from "node:test";
import { PORTION, choicesWith, formatAmount, formatChoice, formatQuantity, multipleFor, quantityFor, type AmountSpec } from "./amounts.ts";

const eggs: AmountSpec = { base: 1, one: "egg", many: "eggs", choices: [1, 2, 3, 4] };
const beans: AmountSpec = { base: 0.5, one: "cup", many: "cups", choices: [0.25, 0.5, 0.75, 1, 1.5, 2] };
const avocado: AmountSpec = { base: 0.5, one: "avocado", many: "avocados", choices: [0.25, 0.5, 1] };

test("quantities use common fractions", () => {
  assert.equal(formatQuantity(0.5), "½");
  assert.equal(formatQuantity(1.5), "1½");
  assert.equal(formatQuantity(0.75), "¾");
  assert.equal(formatQuantity(3), "3");
});

test("amounts read naturally, plural only above one", () => {
  assert.equal(formatAmount(eggs, 1), "1 egg");
  assert.equal(formatAmount(eggs, 2), "2 eggs");
  assert.equal(formatAmount(beans, 0.5), "½ cup");
  assert.equal(formatAmount(beans, 1.5), "1½ cups");
  assert.equal(formatAmount(avocado, 0.5), "½ avocado");
  assert.equal(formatAmount(PORTION, 2), "2 portions");
});

test("entries store a multiple of the base amount", () => {
  // ½ cup is the base for beans, so 1 cup is twice the nutrition.
  assert.equal(multipleFor(beans, 1), 2);
  assert.equal(quantityFor(beans, 2), 1);
  assert.equal(quantityFor(avocado, 2), 1);
});

test("the picker keeps an amount that isn't a standard choice", () => {
  assert.deepEqual(choicesWith(eggs, 2), [1, 2, 3, 4]);
  assert.deepEqual(choicesWith(eggs, 6), [1, 2, 3, 4, 6]);
});

test("whole foods show just the number in the picker", () => {
  const banana: AmountSpec = { base: 1, one: "banana", many: "bananas", choices: [0.5, 1, 2], bare: true };
  assert.equal(formatChoice(banana, 2), "2");
  assert.equal(formatChoice(banana, 0.5), "½");
  assert.equal(formatAmount(banana, 2), "2 bananas"); // messages still name the unit
  assert.equal(formatChoice(beans, 0.5), "½ cup");
});
