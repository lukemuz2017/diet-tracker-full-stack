import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyCustomFood, goodSourceTags, recentFoods, statusFor, totalsFor, validateCustomFood, withServings } from "./log.ts";
import type { Entry } from "./storage.ts";

const TODAY = "2026-10-18";

function entry(partial: Partial<Entry>): Entry {
  return { id: "x", date: TODAY, name: "Food", servings: 1, nutrients: {}, createdAt: "2026-10-18T08:00:00Z", ...partial };
}

test("tags mark foods with 10% or more of the Daily Value", () => {
  // Banana: fiber 3.1 g (11%), vitamin C 10 mg (11%), potassium 422 mg (9%).
  assert.deepEqual(goodSourceTags({ fiber: 3.1, vitaminC: 10, potassium: 422 }), ["Vitamin C", "Fiber"]);
  assert.deepEqual(goodSourceTags({ protein: 4 }), []);
});

test("changing servings scales an entry and keeps unknowns unknown", () => {
  const eggs = entry({ servings: 1, nutrients: { calories: 72, protein: 6.3 } });
  const two = withServings(eggs, 2);
  assert.equal(two.nutrients.fiber, undefined);
  assert.deepEqual(two.nutrients, { calories: 144, protein: 12.6 });
});

test("daily totals count how many foods had each value", () => {
  const { totals, known, foods } = totalsFor([
    entry({ nutrients: { calories: 100, potassium: 50 } }),
    entry({ nutrients: { calories: 200 } }),
  ]);
  assert.equal(totals.calories, 300);
  assert.equal(totals.potassium, 50);
  assert.equal(known.potassium, 1);
  assert.equal(totals.fiber, undefined);
  assert.equal(foods, 2);
});

test("statuses say where a value stands, and going over a minimum is fine", () => {
  const range = { kind: "range" as const, min: 90, max: 120 };
  assert.deepEqual(statusFor("protein", range, 62), { kind: "to-go", text: "28 g to go" });
  assert.deepEqual(statusFor("protein", range, 100), { kind: "in-range", text: "In range" });
  assert.deepEqual(statusFor("protein", range, 130), { kind: "over", text: "Over by 10 g" });
  assert.deepEqual(statusFor("fiber", { kind: "min", min: 33 }, 50), { kind: "in-range", text: "In range" });
  assert.deepEqual(statusFor("fat", { kind: "max", max: 80 }, 90), { kind: "over", text: "Over by 10 g" });
  assert.deepEqual(statusFor("fat", { kind: "max", max: 80 }, 60), { kind: "in-range", text: "Under limit" });
  assert.equal(statusFor("iron", { kind: "min", min: 8 }, undefined).kind, "unknown");
  assert.deepEqual(statusFor("iron", { kind: "min", min: 8, upper: 45 }, 50), { kind: "over", text: "Above safe upper limit" });
});

test("recent foods are distinct and newest first", () => {
  const list = recentFoods([
    entry({ name: "Banana", foodId: "banana", createdAt: "2026-10-17T08:00:00Z", servings: 1, nutrients: { calories: 105 } }),
    entry({ name: "Toast", createdAt: "2026-10-18T07:00:00Z", servings: 2, nutrients: { calories: 160 } }),
    entry({ name: "Banana", foodId: "banana", createdAt: "2026-10-18T09:00:00Z", servings: 2, nutrients: { calories: 210 } }),
  ]);
  assert.deepEqual(list.map((food) => food.name), ["Banana", "Toast"]);
  assert.equal(list[0].lastServings, 2);
  assert.equal(list[0].perServing.calories, 105);
  assert.equal(list[1].perServing.calories, 80);
});

test("custom foods need a name and calories; other values are optional", () => {
  const empty = validateCustomFood(emptyCustomFood(TODAY), TODAY);
  assert.equal(empty.nutrients, null);
  assert.equal(empty.errors.name, "Enter a food name, like Turkey sandwich.");
  assert.equal(empty.errors.calories, "Enter the calories as a number, like 120.");

  const values = emptyCustomFood(TODAY);
  values.name = "Turkey sandwich";
  values.amounts.calories = "350";
  values.amounts.protein = "24.5";
  const ok = validateCustomFood(values, TODAY);
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.nutrients, { calories: 350, protein: 24.5 });
});

test("custom food errors say what to do", () => {
  const values = emptyCustomFood("2026-10-19");
  values.name = "Soup";
  values.amounts.calories = "about 200";
  values.amounts.potassium = "-5";
  const { errors } = validateCustomFood(values, TODAY);
  assert.equal(errors.date, "Choose today or an earlier day.");
  assert.equal(errors.calories, "Enter calories as a number of kcal, like 120.");
  assert.equal(errors.potassium, "Enter 0 or more mg.");
});

test("status judges the rounded number that's shown", () => {
  // 30.6 g shows as "31 g", so it meets "at least 31 g".
  assert.equal(statusFor("fiber", { kind: "min", min: 31 }, 30.6).kind, "in-range");
  assert.equal(statusFor("fiber", { kind: "min", min: 31 }, 30.4).kind, "to-go");
});
