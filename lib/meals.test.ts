import assert from "node:assert/strict";
import { test } from "node:test";
import { byMeal, mealAt, mealOf } from "./meals.ts";
import type { Entry } from "./storage.ts";

const at = (hour: number, minute = 0) => new Date(2026, 9, 19, hour, minute);

test("the default meal follows the time of day", () => {
  assert.equal(mealAt(at(7, 30)), "breakfast");
  assert.equal(mealAt(at(12)), "lunch");
  assert.equal(mealAt(at(16)), "snack");
  assert.equal(mealAt(at(19)), "dinner");
  assert.equal(mealAt(at(23)), "snack");
});

const entry = (id: string, createdAt: string, meal?: Entry["meal"]): Entry => ({
  id, date: "2026-10-19", name: id, servings: 1, nutrients: { calories: 100 }, createdAt, meal,
});

test("entries saved before meals existed are placed by when they were logged", () => {
  assert.equal(mealOf(entry("old", new Date(2026, 9, 19, 8).toISOString())), "breakfast");
  assert.equal(mealOf(entry("new", new Date(2026, 9, 19, 8).toISOString(), "dinner")), "dinner");
});

test("a day groups into the four meals in order, empty ones included", () => {
  const groups = byMeal([
    entry("pizza", "2026-10-19T02:00:00Z", "dinner"),
    entry("oats", "2026-10-19T01:00:00Z", "breakfast"),
    entry("salad", "2026-10-19T03:00:00Z", "dinner"),
  ]);
  assert.deepEqual(groups.map((group) => group.meal), ["breakfast", "lunch", "dinner", "snack"]);
  assert.deepEqual(groups[2].entries.map((e) => e.id), ["pizza", "salad"]);
  assert.equal(groups[1].entries.length, 0);
});
