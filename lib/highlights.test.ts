import assert from "node:assert/strict";
import { test } from "node:test";
import { dayHighlights } from "./highlights.ts";
import type { Targets } from "./targets.ts";

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

test("up to three wins, the harder ones first", () => {
  const { wins, headsUp } = dayHighlights({ calories: 2000, protein: 80, fiber: 30, vitaminC: 120, potassium: 3500, calcium: 1100 }, targets);
  assert.deepEqual(wins, ["High in fiber", "Vitamin C", "Potassium"]);
  assert.equal(headsUp, undefined);
});

test("a day over on calories gets one heads-up", () => {
  const { wins, headsUp } = dayHighlights({ calories: 2600, protein: 80 }, targets);
  assert.deepEqual(wins, ["Protein"]);
  assert.equal(headsUp, "Heads up: calories high");
});

test("going over a minimum is a win, not a heads-up", () => {
  assert.deepEqual(dayHighlights({ fiber: 60 }, targets), { wins: ["High in fiber"], headsUp: undefined });
});

test("a light day with nothing in range has no wins", () => {
  assert.deepEqual(dayHighlights({ calories: 400, protein: 20 }, targets).wins, []);
});
