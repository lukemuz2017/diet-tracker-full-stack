import assert from "node:assert/strict";
import { test } from "node:test";
import type { Entry } from "./storage.ts";
import type { Targets } from "./targets.ts";
import { currentWindowEnd, runningAverages, summarizeWindow, windowDates } from "./week.ts";

const TODAY = "2026-10-18";
const targets = {
  calories: { kind: "range", min: 1800, max: 2200 },
  protein: { kind: "range", min: 50, max: 100 },
  carbs: { kind: "range", min: 130, max: 300 },
  fat: { kind: "range", min: 40, max: 80 },
  fiber: { kind: "min", min: 28 },
  potassium: { kind: "min", min: 3400 },
  calcium: { kind: "min", min: 1000 },
  iron: { kind: "min", min: 8 },
  vitaminA: { kind: "min", min: 900 },
  vitaminC: { kind: "min", min: 90 },
} as Targets;

let id = 0;
function food(date: string, calories: number, extra: Entry["nutrients"] = {}): Entry {
  return { id: String(id++), date, name: "Food", servings: 1, nutrients: { calories, ...extra }, createdAt: `${date}T12:00:00Z` };
}

test("the window is the 7 days ending on the chosen date", () => {
  assert.deepEqual(windowDates("2026-10-15"), [
    "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
  ]);
});

test("only days marked complete count; unlogged days are gaps", () => {
  const entries = [
    food("2026-10-12", 2000),
    food("2026-10-13", 700),
    food("2026-10-14", 2100),
  ];
  const s = summarizeWindow({ entries, completeDays: ["2026-10-12", "2026-10-14"] }, TODAY, targets);
  const state = (date: string) => s.days.find((day) => day.date === date)!.state;
  assert.equal(state("2026-10-12"), "complete");
  assert.equal(state("2026-10-13"), "open"); // logged, not marked: doesn't count
  assert.equal(state("2026-10-15"), "missed");
  assert.equal(s.counted, 2);
  assert.equal(s.logged, 3);
  assert.equal(s.averages.calories, 2050); // gaps aren't zeros
});

test("a past day isn't counted on its own, however much was logged", () => {
  const s = summarizeWindow({ entries: [food("2026-10-12", 2400)], completeDays: [] }, TODAY, targets);
  assert.equal(s.days.find((day) => day.date === "2026-10-12")!.state, "open");
  assert.equal(s.counted, 0);
});

test("marking today complete counts it", () => {
  const entries = [food(TODAY, 900)];
  assert.equal(summarizeWindow({ entries, completeDays: [] }, TODAY, targets).counted, 0);
  const after = summarizeWindow({ entries, completeDays: [TODAY] }, TODAY, targets);
  assert.equal(after.days.at(-1)!.state, "complete");
  assert.equal(after.counted, 1);
});

test("coverage counts days with a value and days in range", () => {
  const entries = [
    food("2026-10-12", 2000, { fiber: 30 }),
    food("2026-10-13", 2000, { fiber: 10 }),
    food("2026-10-14", 2000),
  ];
  const s = summarizeWindow({ entries, completeDays: ["2026-10-12", "2026-10-13", "2026-10-14"] }, TODAY, targets);
  assert.deepEqual(s.coverage.fiber, { days: 2, inRange: 1 });
  assert.equal(s.averages.fiber, 20);
  assert.deepEqual(s.coverage.calories, { days: 3, inRange: 3 });
});

test("a past window works the same as the current one", () => {
  const entries = [food("2026-10-10", 2000), food("2026-10-16", 2000)];
  const s = summarizeWindow({ entries, completeDays: ["2026-10-10", "2026-10-16"] }, "2026-10-15", targets);
  assert.equal(s.start, "2026-10-09");
  assert.equal(s.counted, 1); // Oct 16 is outside Oct 9–15
});

test("the running average builds up from complete days and ends at the average", () => {
  const entries = [food("2026-10-12", 1800), food("2026-10-13", 900), food("2026-10-14", 2400)];
  const s = summarizeWindow({ entries, completeDays: ["2026-10-12", "2026-10-14"] }, TODAY, targets);
  const running = runningAverages(s, "calories");
  // Window Oct 12–18: Oct 13 is logged but not marked, so it doesn't move the line.
  assert.deepEqual(running, [1800, 1800, 2100, 2100, 2100, 2100, 2100]);
  assert.equal(running.at(-1), s.averages.calories);
});

test("the window ends yesterday until today is marked complete", () => {
  assert.equal(currentWindowEnd([], TODAY), "2026-10-17");
  assert.equal(currentWindowEnd(["2026-10-17"], TODAY), "2026-10-17");
  assert.equal(currentWindowEnd([TODAY], TODAY), TODAY);
});
