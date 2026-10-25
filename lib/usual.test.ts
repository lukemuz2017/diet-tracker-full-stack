import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./dates.ts";
import type { Entry } from "./storage.ts";
import { computeTargets } from "./targets.ts";
import { usualBefore, withUsual } from "./usual.ts";
import type { Profile } from "./profile.ts";

const END = "2026-10-25"; // the window is Oct 19–25; the usual comes from the 21 days before
const man: Profile = { units: "metric", heightCm: 175, weightKg: 70, birthDate: "1996-01-01", sex: "male", activity: "moderate" };

const meal = (date: string, cholesterol: number | undefined): Entry => ({
  id: `${date}-${cholesterol}`,
  date,
  name: "Eggs",
  servings: 1,
  nutrients: cholesterol === undefined ? { calories: 100 } : { calories: 100, cholesterol },
  createdAt: `${date}T08:00:00.000Z`,
});

/** `count` complete days just before the window, each with `value` mg. */
function history(count: number, value: number) {
  const dates = Array.from({ length: count }, (_, i) => addDays("2026-10-18", -i));
  return { entries: dates.map((date) => meal(date, value)), completeDays: dates };
}

test("with under a week of complete history there is no usual yet", () => {
  assert.equal(usualBefore(history(6, 300), END, "cholesterol"), undefined);
  assert.deepEqual(withUsual(computeTargets(man, END), history(6, 300), END).cholesterol, { kind: "usual" });
});

test("the usual is the average of complete days before the window", () => {
  assert.equal(usualBefore(history(7, 300), END, "cholesterol"), 300);
  const target = withUsual(computeTargets(man, END), history(10, 250), END).cholesterol;
  assert.deepEqual(target, { kind: "usual", usual: 250, max: 300 });
});

test("days in the window, days not marked complete and days without a value don't count", () => {
  const base = history(7, 300);
  // A day inside the window (Oct 20) is ignored, and so is a huge day that isn't marked complete.
  const entries = [...base.entries, meal("2026-10-20", 5000), meal("2026-10-10", 9000)];
  const completeDays = [...base.completeDays, "2026-10-20"].filter((date) => date !== "2026-10-10");
  assert.equal(usualBefore({ entries, completeDays }, END, "cholesterol"), 300);
  // A complete day whose foods don't list cholesterol is left out, not counted as zero.
  const withGap = history(8, 300);
  withGap.entries[0] = meal("2026-10-18", undefined);
  assert.equal(usualBefore(withGap, END, "cholesterol"), 300);
});

test("only the 3 weeks before the window count", () => {
  // 7 complete days, all older than 21 days before the window start (Oct 19): no usual.
  const old = Array.from({ length: 7 }, (_, i) => addDays("2026-09-20", -i));
  assert.equal(usualBefore({ entries: old.map((date) => meal(date, 300)), completeDays: old }, END, "cholesterol"), undefined);
});
