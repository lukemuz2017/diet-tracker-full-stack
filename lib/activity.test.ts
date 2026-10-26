import assert from "node:assert/strict";
import { test } from "node:test";
import { activitySummary, dayInRangeShare } from "./activity.ts";
import { SCORED_KEYS } from "./log.ts";
import type { Nutrients } from "./nutrients.ts";
import type { Profile } from "./profile.ts";
import type { Entry } from "./storage.ts";
import { computeTargets } from "./targets.ts";

const TODAY = "2026-10-25";
const man: Profile = { units: "metric", heightCm: 175, weightKg: 70, birthDate: "1996-01-01", sex: "male", activity: "moderate" };
const targets = computeTargets(man, TODAY);

/** A day's totals with every scored nutrient comfortably inside its target. */
function onTargetDay(): Nutrients {
  const totals: Nutrients = {};
  for (const key of SCORED_KEYS) {
    const target = targets[key];
    totals[key] = target.kind === "range" ? (target.min! + target.max!) / 2 : target.kind === "min" ? target.min! * 1.1 : target.max! * 0.5;
  }
  return totals;
}

const entry = (date: string, nutrients: Nutrients, extra: Partial<Entry> = {}): Entry => ({
  id: `${date}-${Math.random()}`,
  date,
  name: "Food",
  servings: 1,
  nutrients,
  createdAt: `${date}T12:00:00.000Z`,
  ...extra,
});

test("a day's in-range share counts only the nutrients that have a value", () => {
  assert.equal(dayInRangeShare({}, targets), null);
  assert.equal(dayInRangeShare(onTargetDay(), targets)!.share, 1);
  const off = dayInRangeShare({ calories: 10 }, targets)!;
  assert.deepEqual([off.inRange, off.known, off.share], [0, 1, 0]);
});

test("activity counts days logged, foods, complete days and on-target days", () => {
  const data = {
    entries: [
      entry("2026-10-20", onTargetDay()), // complete and on target
      entry("2026-10-21", { calories: 10 }), // complete but off target
      entry("2026-10-21", { calories: 10 }),
      entry("2026-10-22", onTargetDay()), // on target but not marked complete
    ],
    completeDays: ["2026-10-20", "2026-10-21"],
  };
  assert.deepEqual(activitySummary(data, targets), { daysLogged: 3, foods: 4, onTargetDays: 1, completeDays: 2 });
});

test("sample meals are not the person's activity", () => {
  const data = {
    entries: [entry("2026-10-20", onTargetDay(), { sample: true }), entry("2026-10-21", onTargetDay())],
    completeDays: ["2026-10-20", "2026-10-21"],
  };
  assert.deepEqual(activitySummary(data, targets), { daysLogged: 1, foods: 1, onTargetDays: 1, completeDays: 1 });
});
