import assert from "node:assert/strict";
import { test } from "node:test";
import { warningsFor } from "./diet.ts";

test("foods are flagged for allergies and eating patterns", () => {
  assert.deepEqual(warningsFor("cheesePizza", { allergies: ["dairy", "gluten"], pattern: "everything" }), ["Contains dairy", "Contains gluten"]);
  assert.deepEqual(warningsFor("chickenBreast", { allergies: [], pattern: "vegetarian" }), ["Not vegetarian"]);
  assert.deepEqual(warningsFor("salmon", { allergies: [], pattern: "pescatarian" }), []);
  assert.deepEqual(warningsFor("egg", { allergies: [], pattern: "vegan" }), ["Not vegan"]);
});

test("foods that fit, and custom foods, have no warnings", () => {
  assert.deepEqual(warningsFor("banana", { allergies: ["peanuts"], pattern: "vegan" }), []);
  assert.deepEqual(warningsFor(undefined, { allergies: ["dairy"], pattern: "vegan" }), []);
});

test("keto flags grains, legumes, starchy and sugary foods; paleo flags grains, legumes, dairy and processed foods", () => {
  const keto = { allergies: [], pattern: "keto" } as const;
  assert.deepEqual(warningsFor("brownRice", keto), ["Not keto"]);
  assert.deepEqual(warningsFor("potato", keto), ["Not keto"]);
  assert.deepEqual(warningsFor("banana", keto), ["Not keto"]);
  assert.deepEqual(warningsFor("blackBeans", keto), ["Not keto"]);
  // Meat, fish, eggs, dairy and avocado fit keto.
  for (const id of ["chickenBreast", "salmon", "egg", "cheddar", "avocado", "oliveOil"]) assert.deepEqual(warningsFor(id, keto), [], id);

  const paleo = { allergies: [], pattern: "paleo" } as const;
  assert.deepEqual(warningsFor("greekYogurt", paleo), ["Not paleo"]);
  assert.deepEqual(warningsFor("lentils", paleo), ["Not paleo"]);
  assert.deepEqual(warningsFor("granolaBar", paleo), ["Not paleo"]);
  assert.deepEqual(warningsFor("peanutButter", paleo), ["Not paleo"]);
  // Fruit, sweet potatoes and meat fit paleo.
  for (const id of ["banana", "sweetPotato", "chickenBreast", "egg", "almonds"]) assert.deepEqual(warningsFor(id, paleo), [], id);
});
