// What History says about a week beyond the numbers: where the macros sit in
// their ranges, which foods a nutrient came from, and how this week compares
// with last week. Pure functions, checked by lib/insights.test.ts.

import { addDays } from "./dates.ts";
import { NUTRIENT_KEYS } from "./log.ts";
import type { NutrientKey, Nutrients } from "./nutrients.ts";
import type { Entry, SavedData } from "./storage.ts";
import type { Target, Targets } from "./targets.ts";
import { WINDOW_DAYS, summarizeWindow } from "./week.ts";

// ── Macros ───────────────────────────────────────────────────────────────

export type MacroKey = "protein" | "carbs" | "fat";

export const MACROS: { key: MacroKey; label: string; kcalPerGram: number }[] = [
  { key: "protein", label: "Protein", kcalPerGram: 4 },
  { key: "carbs", label: "Carbs", kcalPerGram: 4 },
  { key: "fat", label: "Fat", kcalPerGram: 9 },
];

/** Healthy share of calories (AMDR), in percent. Fat starts at 25% for ages 18 and under. */
export function macroRange(key: MacroKey, teen: boolean): [low: number, high: number] {
  if (key === "protein") return [10, 35];
  if (key === "carbs") return [45, 65];
  return teen ? [25, 35] : [20, 35];
}

/** The share of calories from each macro, in percent, or null if nothing is known. */
export function macroShares(averages: Nutrients): Record<MacroKey, number> | null {
  const kcal = MACROS.map((macro) => (averages[macro.key] ?? 0) * macro.kcalPerGram);
  const total = kcal.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  const [protein, carbs, fat] = kcal.map((value) => (value / total) * 100);
  return { protein, carbs, fat };
}

/** How close to an edge still counts as "near" it, in percentage points. */
const NEAR_EDGE = 3;

const verb = (key: MacroKey) => (key === "carbs" ? "are" : "is");

/** One plain sentence on where the macros stand. */
export function macroTakeaway(shares: Record<MacroKey, number>, teen: boolean): string {
  const rows = MACROS.map((macro) => {
    const [low, high] = macroRange(macro.key, teen);
    const share = Math.round(shares[macro.key]);
    return { ...macro, low, high, share, below: low - share, above: share - high };
  });
  const out = rows
    .filter((row) => row.below > 0 || row.above > 0)
    .sort((a, b) => Math.max(b.below, b.above) - Math.max(a.below, a.above));
  if (out.length > 0) {
    const worst = out[0];
    const points = Math.max(worst.below, worst.above);
    const side = worst.below > 0 ? "below" : "above";
    const rest = out.length > 1 ? ` ${out[1].label} ${verb(out[1].key)} also outside ${out[1].key === "carbs" ? "their" : "its"} range.` : "";
    return `${worst.label} ${verb(worst.key)} ${points} ${points === 1 ? "point" : "points"} ${side} ${worst.key === "carbs" ? "their" : "its"} ${worst.low}–${worst.high}% range.${rest}`;
  }
  const near = rows
    .map((row) => ({ row, edge: Math.min(row.share - row.low, row.high - row.share) }))
    .filter(({ edge }) => edge <= NEAR_EDGE)
    .sort((a, b) => a.edge - b.edge);
  if (near.length > 0) {
    const { row } = near[0];
    const end = row.share - row.low <= row.high - row.share ? "low" : "high";
    return `All three are in range. ${row.label} ${verb(row.key)} close to the ${end} end (${row.share}% against ${row.low}–${row.high}%).`;
  }
  return "All three are comfortably inside their ranges.";
}

// ── Where a nutrient came from ───────────────────────────────────────────

export interface Source {
  name: string;
  /** Total over the counted days, in the nutrient's unit. */
  value: number;
  /** Share of everything logged for the nutrient, 0–100. */
  share: number;
}

/**
 * The foods that gave the most of `key` on the given days, biggest first. The
 * rest is rolled into `otherShare`. Foods that don't list the nutrient are skipped.
 */
export function topSources(
  entries: Entry[],
  dates: Set<string>,
  key: NutrientKey,
  limit = 6,
): { total: number; items: Source[]; otherShare: number } {
  const byFood = new Map<string, number>();
  for (const entry of entries) {
    const value = entry.nutrients[key];
    if (!dates.has(entry.date) || !value) continue;
    byFood.set(entry.name, (byFood.get(entry.name) ?? 0) + value);
  }
  const total = [...byFood.values()].reduce((sum, value) => sum + value, 0);
  if (total === 0) return { total: 0, items: [], otherShare: 0 };
  const sorted = [...byFood].sort((a, b) => b[1] - a[1]);
  const items = sorted.slice(0, limit).map(([name, value]) => ({ name, value, share: (value / total) * 100 }));
  const shown = items.reduce((sum, item) => sum + item.share, 0);
  return { total, items, otherShare: Math.max(0, 100 - shown) };
}

// ── This week vs. last week ──────────────────────────────────────────────

export type Tone = "better" | "worse" | "same";

export interface ComparisonRow {
  key: NutrientKey;
  current: number;
  previous: number;
  /** 0 when the change is too small to matter. */
  delta: number;
  /** Change as a share of last week's, in percent (0 if last week was 0 or the change is steady). */
  percent: number;
  /** Whether the change moved toward the target, away from it, or didn't matter. */
  tone: Tone;
}

export interface WeekComparison {
  /** Both weeks need COMPARE_MIN_DAYS complete days to compare. */
  ready: boolean;
  current: number;
  previous: number;
  rows: ComparisonRow[];
}

export const COMPARE_MIN_DAYS = 3;
/** Changes smaller than this share of last week's are shown as steady. */
const STEADY = 3;

/** How far a value is from where it should be: 0 inside the target. */
function gap(target: Target, value: number): number {
  switch (target.kind) {
    case "range":
      return value < target.min! ? target.min! - value : value > target.max! ? value - target.max! : 0;
    case "min":
      return value < target.min! ? target.min! - value : target.upper !== undefined && value > target.upper ? value - target.upper : 0;
    case "max":
      return Math.max(0, value - target.max!);
    case "usual":
      // With no usual yet, less is better.
      return target.max !== undefined ? Math.max(0, value - target.max) : value;
  }
}

/** The 7 days ending on `end` against the 7 before them. */
export function compareWeeks(data: SavedData, end: string, targets: Targets): WeekComparison {
  const current = summarizeWindow(data, end, targets);
  const previous = summarizeWindow(data, addDays(end, -WINDOW_DAYS), targets);
  const ready = current.counted >= COMPARE_MIN_DAYS && previous.counted >= COMPARE_MIN_DAYS;
  const rows: ComparisonRow[] = [];
  if (ready) {
    for (const key of NUTRIENT_KEYS) {
      const now = current.averages[key];
      const before = previous.averages[key];
      if (now === undefined || before === undefined) continue;
      const delta = now - before;
      const percent = before === 0 ? 0 : (delta / before) * 100;
      const steady = before === 0 ? delta === 0 : Math.abs(percent) < STEADY;
      const nowGap = gap(targets[key], now);
      const beforeGap = gap(targets[key], before);
      const tone: Tone = steady || nowGap === beforeGap ? "same" : nowGap < beforeGap ? "better" : "worse";
      rows.push({ key, current: now, previous: before, delta: steady ? 0 : delta, percent: steady ? 0 : percent, tone });
    }
  }
  return { ready, current: current.counted, previous: previous.counted, rows };
}
