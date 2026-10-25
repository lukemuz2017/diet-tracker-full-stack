import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./dates.ts";
import { compareWeeks, macroRange, macroShares, macroTakeaway, topSources } from "./insights.ts";
import type { Profile } from "./profile.ts";
import type { Entry, SavedData } from "./storage.ts";
import { computeTargets } from "./targets.ts";

const END = "2026-10-25";
const man: Profile = { units: "metric", heightCm: 175, weightKg: 70, birthDate: "1996-01-01", sex: "male", activity: "moderate" };

test("macro shares come from grams and 4-4-9 kcal per gram", () => {
  // 100 g protein = 400 kcal, 250 g carbs = 1,000, 66.67 g fat = 600 → 20% / 50% / 30%.
  const shares = macroShares({ protein: 100, carbs: 250, fat: 66.67 })!;
  assert.equal(Math.round(shares.protein), 20);
  assert.equal(Math.round(shares.carbs), 50);
  assert.equal(Math.round(shares.fat), 30);
  assert.equal(macroShares({}), null);
});

test("fat's range starts at 25% for ages 18 and under", () => {
  assert.deepEqual(macroRange("fat", false), [20, 35]);
  assert.deepEqual(macroRange("fat", true), [25, 35]);
});

test("the macro takeaway names what's outside its range, or what's near an edge", () => {
  assert.equal(macroTakeaway({ protein: 22, carbs: 38, fat: 40 }, false), "Carbs are 7 points below their 45–65% range. Fat is also outside its range.");
  assert.equal(macroTakeaway({ protein: 22, carbs: 46, fat: 32 }, false), "All three are in range. Carbs are close to the low end (46% against 45–65%).");
  assert.equal(macroTakeaway({ protein: 20, carbs: 52, fat: 28 }, false), "All three are comfortably inside their ranges.");
});

const entry = (date: string, name: string, nutrients: Entry["nutrients"], id = `${date}-${name}`): Entry => ({
  id,
  date,
  name,
  servings: 1,
  nutrients,
  createdAt: `${date}T12:00:00.000Z`,
});

test("top sources add up each food over the counted days and roll the rest into 'other'", () => {
  const dates = new Set(["2026-10-24", "2026-10-25"]);
  const entries = [
    entry("2026-10-24", "Lentils", { fiber: 15 }),
    entry("2026-10-25", "Lentils", { fiber: 15 }, "b"),
    entry("2026-10-25", "Banana", { fiber: 3 }),
    entry("2026-10-25", "Apple", { fiber: 2 }),
    entry("2026-10-10", "Chia seeds", { fiber: 99 }), // not a counted day
    entry("2026-10-25", "Bread", { calories: 80 }), // doesn't list fiber
  ];
  const { total, items, otherShare } = topSources(entries, dates, "fiber", 2);
  assert.equal(total, 35);
  assert.deepEqual(items.map((item) => [item.name, item.value]), [["Lentils", 30], ["Banana", 3]]);
  assert.equal(Math.round(items[0].share), 86);
  assert.equal(Math.round(otherShare), 6); // the apple
  assert.deepEqual(topSources([], dates, "fiber"), { total: 0, items: [], otherShare: 0 });
});

/** Complete days ending on `end`, each with the same foods. */
function week(end: string, fiber: number, days = 7): Pick<SavedData, "entries" | "completeDays"> {
  const dates = Array.from({ length: days }, (_, i) => addDays(end, -i));
  return {
    entries: dates.map((date) => entry(date, "Beans", { calories: 2500, protein: 100, carbs: 300, fat: 80, fiber })),
    completeDays: dates,
  };
}
const merge = (a: ReturnType<typeof week>, b: ReturnType<typeof week>): SavedData => ({
  version: 1,
  profile: man,
  entries: [...a.entries, ...b.entries],
  completeDays: [...a.completeDays, ...b.completeDays],
  recipes: [],
  savedFoods: [],
});

test("a week-over-week comparison needs 3 complete days in each week", () => {
  const targets = computeTargets(man, END);
  const thin = merge(week(END, 40), week(addDays(END, -7), 30, 2));
  const result = compareWeeks(thin, END, targets);
  assert.equal(result.ready, false);
  assert.deepEqual(result.rows, []);
  assert.equal(result.previous, 2);
});

test("fiber rising toward its minimum is better; changes under 3% are shown as steady", () => {
  const targets = computeTargets(man, END); // fiber: at least 14 g per 1,000 kcal
  const data = merge(week(END, 40), week(addDays(END, -7), 30));
  const result = compareWeeks(data, END, targets);
  assert.equal(result.ready, true);
  const fiber = result.rows.find((row) => row.key === "fiber")!;
  assert.deepEqual([fiber.previous, fiber.current, fiber.delta], [30, 40, 10]);
  assert.equal(fiber.tone, "better");
  // Calories didn't change at all.
  const calories = result.rows.find((row) => row.key === "calories")!;
  assert.deepEqual([calories.delta, calories.tone], [0, "same"]);
  // Falling away from the minimum is worse.
  const down = compareWeeks(merge(week(END, 20), week(addDays(END, -7), 30)), END, targets);
  assert.equal(down.rows.find((row) => row.key === "fiber")!.tone, "worse");
});
