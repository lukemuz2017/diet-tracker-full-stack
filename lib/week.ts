// The rolling 7-day window (flows.md: How the 7-day window works). Pure
// functions, checked by lib/week.test.ts.

import { addDays } from "./dates.ts";
import { NUTRIENT_KEYS, statusFor, totalsFor } from "./log.ts";
import type { NutrientKey, Nutrients } from "./nutrients.ts";
import type { Entry } from "./storage.ts";
import type { Targets } from "./targets.ts";

export const WINDOW_DAYS = 7;

/**
 * A day counts only once the person marks it complete. "open" has food logged
 * but isn't marked; "missed" has nothing logged.
 */
export type DayState = "complete" | "open" | "missed";

export interface WindowDay {
  date: string;
  state: DayState;
  totals: Nutrients;
  foods: number;
}

export interface WindowSummary {
  start: string;
  end: string;
  days: WindowDay[];
  /** Days that count toward the averages. */
  counted: number;
  logged: number;
  averages: Nutrients;
  /** Per nutrient: counted days with a value, and how many were in range. */
  coverage: Record<NutrientKey, { days: number; inRange: number }>;
}

/**
 * The day the current window ends on: today once it's marked complete,
 * otherwise yesterday, so an unfinished today never shortens the week to 6
 * days.
 */
export function currentWindowEnd(completeDays: string[], today: string): string {
  return completeDays.includes(today) ? today : addDays(today, -1);
}

/** The 7 dates ending on `end`, oldest first. */
export function windowDates(end: string): string[] {
  return Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(end, i - (WINDOW_DAYS - 1)));
}

export function dayState(foods: number, markedComplete: boolean): DayState {
  if (foods === 0) return "missed";
  return markedComplete ? "complete" : "open";
}

export function summarizeWindow(
  data: { entries: Entry[]; completeDays: string[] },
  end: string,
  targets: Targets,
): WindowSummary {
  const dates = windowDates(end);
  const days: WindowDay[] = dates.map((date) => {
    const { totals, foods } = totalsFor(data.entries.filter((entry) => entry.date === date));
    // On a day with food, a nutrient no food listed counts as 0, not as unknown.
    if (foods > 0) for (const key of NUTRIENT_KEYS) totals[key] ??= 0;
    const state = dayState(foods, data.completeDays.includes(date));
    return { date, state, totals, foods };
  });

  const counted = days.filter((day) => day.state === "complete");
  const averages: Nutrients = {};
  const coverage = {} as WindowSummary["coverage"];
  for (const key of NUTRIENT_KEYS) {
    const withValue = counted.filter((day) => day.totals[key] !== undefined);
    const inRange = withValue.filter((day) => statusFor(key, targets[key], day.totals[key]).kind === "in-range").length;
    coverage[key] = { days: withValue.length, inRange };
    if (withValue.length > 0) {
      averages[key] = withValue.reduce((sum, day) => sum + day.totals[key]!, 0) / withValue.length;
    }
  }

  return {
    start: dates[0],
    end,
    days,
    counted: counted.length,
    logged: days.filter((day) => day.foods > 0).length,
    averages,
    coverage,
  };
}

/** One day's 7-day average: the average of the complete days in the 7 days ending on it. */
export interface RollingDay {
  date: string;
  averages: Nutrients;
  /** Complete days it rests on. */
  counted: number;
  /** The targets as of that day. */
  targets: Targets;
}

/**
 * For each of the 7 days ending on `end`, the 7-day average up to that day,
 * using days before the window when needed. The last entry is the window's average.
 */
export function rollingWindow(
  data: { entries: Entry[]; completeDays: string[] },
  end: string,
  targetsFor: (date: string) => Targets,
): RollingDay[] {
  return windowDates(end).map((date) => {
    const targets = targetsFor(date);
    const { averages, counted } = summarizeWindow(data, date, targets);
    return { date, averages, counted, targets };
  });
}
