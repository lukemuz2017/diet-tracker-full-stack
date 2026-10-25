import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry } from "./storage.ts";
import { summarize } from "./suggestions.ts";
import type { Targets } from "./targets.ts";
import type { WindowSummary } from "./week.ts";

const targets = {
  calories: { kind: "range", min: 1800, max: 2200 },
  protein: { kind: "range", min: 50, max: 100 },
  carbs: { kind: "range", min: 130, max: 300 },
  fat: { kind: "range", min: 40, max: 80 },
  fiber: { kind: "min", min: 28 },
  potassium: { kind: "min", min: 3400 },
  calcium: { kind: "min", min: 1000, upper: 2500 },
  iron: { kind: "min", min: 8 },
  vitaminA: { kind: "min", min: 900 },
  vitaminC: { kind: "min", min: 90 },
} as Targets;

const balanced = { calories: 2000, protein: 80, carbs: 250, fat: 60, fiber: 30, potassium: 3500, calcium: 1100, iron: 10, vitaminA: 950, vitaminC: 100 };

/** A window with these averages; `inRangeDays` sets how many of 3 days a nutrient was in range (default 2). */
function window(averages: WindowSummary["averages"], counted = 3, inRangeDays: Record<string, number> = {}): WindowSummary {
  const coverage = Object.fromEntries(Object.keys(averages).map((key) => [key, { days: 3, inRange: inRangeDays[key] ?? 2 }]));
  return {
    days: [{ date: "2026-10-18", state: "complete" }],
    counted,
    averages,
    coverage,
  } as unknown as WindowSummary;
}

const pizza: Entry = { id: "p", date: "2026-10-18", name: "Cheese pizza", servings: 3, nutrients: { protein: 90 }, createdAt: "2026-10-18T19:00:00Z" };
const soup: Entry = { id: "s", date: "2026-10-18", name: "Soup", servings: 1, nutrients: { protein: 20 }, createdAt: "2026-10-18T12:00:00Z" };

test("no complete days yet: a waiting message and no tiles", () => {
  const result = summarize(window({}, 0), targets, []);
  assert.equal(result.verdict, "waiting");
  assert.deepEqual(result.tiles, []);
});

test("three tiles: going well, could improve, bigger picture", () => {
  const result = summarize(window({ ...balanced, carbs: 100 }), targets, []);
  assert.equal(result.verdict, "mostly");
  assert.deepEqual(result.tiles.map((tile) => tile.kind), ["good", "improve", "big"]);
});

test("going well is the on-track nutrient in range on the most days, harder wins first", () => {
  assert.equal(summarize(window(balanced), targets, []).tiles[0].title, "Fiber is on track");
  assert.equal(summarize(window(balanced, 3, { calcium: 3 }), targets, []).tiles[0].title, "Calcium is on track");
});

test("could improve is the nutrient furthest off, with a food-group suggestion", () => {
  const result = summarize(window({ ...balanced, potassium: 1700, fiber: 25 }), targets, []);
  const improve = result.tiles.find((tile) => tile.kind === "improve")!;
  assert.equal(improve.title, "Potassium is low");
  assert.ok(improve.tip.includes("**potatoes**"));
});

test("a high nutrient names its biggest source", () => {
  const result = summarize(window({ ...balanced, protein: 130 }), targets, [soup, pizza]);
  const improve = result.tiles.find((tile) => tile.kind === "improve")!;
  assert.equal(improve.title, "Protein is high");
  assert.ok(improve.tip.startsWith("Mostly from **cheese pizza**."));
});

test("the bigger picture follows the week's pattern", () => {
  const big = (averages: WindowSummary["averages"]) => summarize(window({ ...balanced, ...averages }), targets, []).tiles.at(-1)!.title;
  assert.equal(big({ fiber: 15, vitaminC: 40, potassium: 2000 }), "Fill up on produce");
  assert.equal(big({ calories: 1500, carbs: 110 }), "Fuller days");
  assert.equal(big({}), "Keep it varied");
});

test("the bigger picture doesn't just repeat the could-improve tile", () => {
  const result = summarize(window({ ...balanced, protein: 130 }), targets, []);
  assert.equal(result.tiles[1].title, "Protein is high");
  assert.equal(result.tiles[2].title, "Keep it varied");
});

test("going over a minimum is fine; above a safe upper limit is high", () => {
  assert.equal(summarize(window({ ...balanced, fiber: 60 }), targets, []).verdict, "balanced");
  assert.equal(summarize(window({ ...balanced, calcium: 3000 }), targets, []).tiles[1]?.title, "Calcium is high");
});

test("going well prefers a food win over calories being on track", () => {
  const result = summarize(window(balanced, 3, { calories: 3 }), targets, [pizza]);
  assert.equal(result.tiles[0].title, "Fiber is on track");
  const onlyCalories = summarize(window({ calories: 2000, fiber: 10 }), targets, [pizza]);
  assert.equal(onlyCalories.tiles[0].title, "Calories are on track");
  assert.equal(onlyCalories.tiles[0].tip, "Keep it up.");
});

test("suggested foods respect allergies and eating pattern", () => {
  const improveTip = (diet: Parameters<typeof summarize>[3]) => summarize(window({ ...balanced, protein: 30 }), targets, [], diet).tiles[1].tip;
  // Everyone: the first three examples.
  assert.ok(improveTip({ allergies: [], pattern: "everything" }).includes("**beans**, **eggs** or **fish**"));
  const vegan = improveTip({ allergies: [], pattern: "vegan" });
  assert.ok(!/eggs|fish|chicken/.test(vegan));
  assert.ok(vegan.includes("**beans**") && vegan.includes("**tofu**"));
  const veganSoyFree = improveTip({ allergies: ["soy"], pattern: "vegan" });
  assert.ok(!veganSoyFree.includes("tofu"));
  const calcium = summarize(window({ ...balanced, calcium: 500 }), targets, [], { allergies: ["dairy"], pattern: "everything" }).tiles[1].tip;
  assert.ok(!["**yogurt**", "**milk**", "**cheese**"].some((word) => calcium.includes(word)));
  assert.ok(calcium.includes("**fortified soy milk**"));
});

test("with no examples left, the suggestion falls back to plain words", () => {
  const tip = summarize(window({ ...balanced, calories: 1500, carbs: 140, fat: 60, protein: 80 }), targets, [], {
    allergies: ["treeNuts", "dairy", "sesame"],
    pattern: "everything",
  }).tiles[1].tip;
  assert.equal(tip, "Consider slightly bigger portions or an extra snack, like **bananas**, this week.");
});

test("suggestions wait for 3 complete days", () => {
  const one = summarize(window({ ...balanced, carbs: 100 }, 1), targets, []);
  assert.deepEqual([one.verdict, one.tiles.length, one.daysToGo], ["early", 0, 2]);
  const two = summarize(window({ ...balanced, carbs: 100 }, 2), targets, []);
  assert.equal(two.daysToGo, 1);
  const three = summarize(window({ ...balanced, carbs: 100 }, 3), targets, []);
  assert.deepEqual([three.verdict, three.tiles.length, three.daysToGo], ["mostly", 3, 0]);
});
