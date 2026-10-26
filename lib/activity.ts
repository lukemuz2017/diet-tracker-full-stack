// The Activity card on Profile: how much the person has used the app, from
// their own entries (sample meals don't count). Pure functions, checked by
// lib/activity.test.ts.

import { SCORED_KEYS, statusFor, totalsFor } from "./log.ts";
import type { Nutrients } from "./nutrients.ts";
import type { Entry } from "./storage.ts";
import type { Targets } from "./targets.ts";

/** A day counts as "on target" when at least this share of its nutrients were in range. */
export const GOOD_DAY_SHARE = 0.8;

/** The share of a day's nutrients (those with a value) that were in range, or null if none has one. */
export function dayInRangeShare(totals: Nutrients, targets: Targets): { inRange: number; known: number; share: number } | null {
  const known = SCORED_KEYS.filter((key) => totals[key] !== undefined);
  if (known.length === 0) return null;
  const inRange = known.filter((key) => statusFor(key, targets[key], totals[key]).kind === "in-range").length;
  return { inRange, known: known.length, share: inRange / known.length };
}

export interface ActivitySummary {
  /** Days with at least one food logged. */
  daysLogged: number;
  /** Foods logged, all days. */
  foods: number;
  /** Days marked complete in which most nutrients were in range. */
  onTargetDays: number;
  /** Days marked complete. */
  completeDays: number;
}

export function activitySummary(data: { entries: Entry[]; completeDays: string[] }, targets: Targets): ActivitySummary {
  const own = data.entries.filter((entry) => !entry.sample);
  const dates = new Set(own.map((entry) => entry.date));
  const complete = data.completeDays.filter((date) => dates.has(date));
  const onTargetDays = complete.filter((date) => {
    const score = dayInRangeShare(totalsFor(own.filter((entry) => entry.date === date)).totals, targets);
    return score !== null && score.share >= GOOD_DAY_SHARE;
  }).length;
  return { daysLogged: dates.size, foods: own.length, onTargetDays, completeDays: complete.length };
}
