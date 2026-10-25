import assert from "node:assert/strict";
import { test } from "node:test";
import { perServingFromIngredients } from "./recipe.ts";

test("ingredients add up and divide by servings", () => {
  const per = perServingFromIngredients(
    [
      { name: "Rice", multiple: 2, nutrients: { calories: 496, protein: 11 } },
      { name: "Beans", multiple: 2, nutrients: { calories: 228, protein: 15.2, fiber: 15 } },
    ],
    4,
  );
  assert.equal(per.calories, 181);
  assert.equal(per.protein, 6.55);
  assert.equal(per.fiber, undefined); // rice has no fiber value here, so it's unknown
});
