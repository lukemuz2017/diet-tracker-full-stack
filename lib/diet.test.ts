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
