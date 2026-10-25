import assert from "node:assert/strict";
import { test } from "node:test";
import { isSample, sampleEntries, withSample, withoutSample } from "./sample.ts";
import type { Entry, SavedData } from "./storage.ts";

const TODAY = "2026-10-19";
const EMPTY: SavedData = { version: 1, profile: null, entries: [], completeDays: [], recipes: [] };
const mine: Entry = { id: "mine", date: "2026-10-10", name: "Toast", servings: 1, nutrients: { calories: 80 }, createdAt: "2026-10-10T08:00:00Z" };

test("sample data covers the two weeks before today, not today", () => {
  const dates = new Set(sampleEntries(EMPTY, TODAY).map((entry) => entry.date));
  assert.equal(dates.size, 15);
  assert.ok(dates.has("2026-10-04"));
  assert.ok(dates.has("2026-10-18"));
  assert.ok(!dates.has(TODAY));
});

test("days the person already logged are left alone", () => {
  const data = withSample({ ...EMPTY, entries: [mine] }, TODAY);
  assert.deepEqual(data.entries.filter((entry) => entry.date === "2026-10-10"), [mine]);
});

test("clearing sample data keeps the person's own entries", () => {
  const data = withoutSample(withSample({ ...EMPTY, entries: [mine] }, TODAY));
  assert.deepEqual(data.entries, [mine]);
});

test("sample days are marked complete, except the half-logged one", () => {
  const data = withSample(EMPTY, TODAY);
  assert.equal(data.completeDays.length, 14);
  assert.ok(!data.completeDays.includes("2026-10-15"));
  assert.deepEqual(withoutSample(data).completeDays, []);
});

test("every sample entry is marked and has calories", () => {
  for (const entry of sampleEntries(EMPTY, TODAY)) {
    assert.ok(isSample(entry));
    assert.ok((entry.nutrients.calories ?? 0) > 0);
  }
});

test("portions scale toward the person's calories and stay realistic", () => {
  const day = (calories: number) =>
    sampleEntries(EMPTY, TODAY, calories)
      .filter((entry) => entry.date === "2026-10-05")
      .reduce((sum, entry) => sum + (entry.nutrients.calories ?? 0), 0);
  assert.ok(day(3000) > day(2300));
  assert.ok(day(1800) < day(2300));
  for (const entry of sampleEntries(EMPTY, TODAY, 3000)) {
    assert.equal(entry.servings % 0.5, 0);
    if (entry.foodId === "egg") assert.ok(Number.isInteger(entry.servings));
  }
});
