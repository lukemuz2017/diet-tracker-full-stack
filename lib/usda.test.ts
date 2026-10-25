import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanQuery, foodsFromSearch } from "./usda.ts";

// Trimmed from a real response to /foods/search?query=greek yogurt.
const yogurt = {
  fdcId: 170914,
  description: "Yogurt, Greek, Blueberry, CHOBANI",
  dataType: "SR Legacy",
  foodCategory: "Dairy and Egg Products",
  foodNutrients: [
    { nutrientId: 1004, nutrientName: "Total lipid (fat)", unitName: "G", value: 0.24 },
    { nutrientId: 1005, nutrientName: "Carbohydrate, by difference", unitName: "G", value: 12.8 },
    { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 82 },
    { nutrientId: 1010, nutrientName: "Sucrose", unitName: "G", value: 5.05 },
    { nutrientId: 1003, nutrientName: "Protein", unitName: "G", value: 7.23 },
    { nutrientId: 1087, nutrientName: "Calcium, Ca", unitName: "MG", value: 90 },
    { nutrientId: 1106, nutrientName: "Vitamin A, RAE", unitName: "UG", value: 3 },
  ],
};

test("a USDA food keeps its id, name, category and the tracked nutrients", () => {
  const [food] = foodsFromSearch({ totalHits: 1, foods: [yogurt] });
  assert.deepEqual(food, {
    fdcId: 170914,
    name: "Yogurt, Greek, Blueberry, CHOBANI",
    category: "Dairy and Egg Products",
    per100g: { fat: 0.24, carbs: 12.8, calories: 82, protein: 7.23, calcium: 90, vitaminA: 3 },
  });
});

test("nutrients USDA doesn't list stay unknown, not zero", () => {
  const [food] = foodsFromSearch({ foods: [yogurt] });
  assert.equal("fiber" in food.per100g, false);
  assert.equal("vitaminC" in food.per100g, false);
});

test("nothing found is an empty list, not an error", () => {
  assert.deepEqual(foodsFromSearch({ totalHits: 0, currentPage: 1, totalPages: 0, foods: [] }), []);
});

test("energy in kJ is ignored, and Atwater energy fills in for missing kcal", () => {
  const atwater = {
    fdcId: 1,
    description: "Lentils, dry",
    foodNutrients: [
      { nutrientId: 1008, unitName: "kJ", value: 1470 },
      { nutrientId: 2047, unitName: "KCAL", value: 360 },
    ],
  };
  assert.equal(foodsFromSearch({ foods: [atwater] })[0].per100g.calories, 360);
});

test("foods without calories, and repeats, are left out", () => {
  const noEnergy = { fdcId: 2, description: "Water", foodNutrients: [{ nutrientId: 1003, unitName: "G", value: 0 }] };
  assert.deepEqual(foodsFromSearch({ foods: [noEnergy, yogurt, yogurt] }).map((food) => food.fdcId), [170914]);
});

test("a response without a food list is an error (the API is having trouble)", () => {
  assert.throws(() => foodsFromSearch({ error: { code: "OVER_RATE_LIMIT" } }));
});

test("searches are trimmed and kept to a sensible length", () => {
  assert.equal(cleanQuery("  greek   yogurt "), "greek yogurt");
  assert.equal(cleanQuery("a"), null);
  assert.equal(cleanQuery(null), null);
  assert.equal(cleanQuery("x".repeat(61)), null);
});
