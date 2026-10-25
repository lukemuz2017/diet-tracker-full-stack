// A person's "usual" for a nutrient with no official limit (cholesterol): the
// average of their complete days in the 3 weeks before the 7-day window.
// Their window is then flagged when it runs more than 20% above it. Pure
// functions, checked by lib/usual.test.ts.

import { addDays } from "./dates.ts";
import { totalsFor } from "./log.ts";
import type { NutrientKey } from "./nutrients.ts";
import type { SavedData } from "./storage.ts";
import { USUAL_LOOKBACK_DAYS, USUAL_MARGIN, USUAL_MIN_DAYS, type Targets } from "./targets.ts";
import { WINDOW_DAYS } from "./week.ts";

/**
 * The person's usual daily amount of `key` before the window ending on `end`,
 * or undefined with fewer than USUAL_MIN_DAYS complete days that have a value.
 * Days that aren't marked complete, aren't logged or don't list the nutrient
 * are left out, never counted as zero.
 */
export function usualBefore(data: Pick<SavedData, "entries" | "completeDays">, end: string, key: NutrientKey): number | undefined {
  const windowStart = addDays(end, -(WINDOW_DAYS - 1));
  const values: number[] = [];
  for (let back = 1; back <= USUAL_LOOKBACK_DAYS; back++) {
    const date = addDays(windowStart, -back);
    if (!data.completeDays.includes(date)) continue;
    const { totals } = totalsFor(data.entries.filter((entry) => entry.date === date));
    if (totals[key] !== undefined) values.push(totals[key]!);
  }
  return values.length >= USUAL_MIN_DAYS ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

/** The targets with cholesterol's "usual" filled in for the window ending on `end`. */
export function withUsual(targets: Targets, data: Pick<SavedData, "entries" | "completeDays">, end: string): Targets {
  const usual = usualBefore(data, end, "cholesterol");
  if (usual === undefined) return targets;
  return { ...targets, cholesterol: { kind: "usual", usual, max: usual * (1 + USUAL_MARGIN) } };
}
