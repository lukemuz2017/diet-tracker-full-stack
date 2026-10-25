// Logging logic: entries, daily totals, statuses, recent foods and the
// custom-food form. Pure functions, checked by lib/log.test.ts.

import { NUTRIENTS, type NutrientKey, type Nutrients } from "./nutrients.ts";
import type { Entry } from "./storage.ts";
import type { Target } from "./targets.ts";

export const NUTRIENT_KEYS = Object.keys(NUTRIENTS) as NutrientKey[];

// FDA Daily Values used on food labels (21 CFR 101.9). A serving with 10% or
// more of the DV is a "good source" (21 CFR 101.54), which is what the
// "what it adds" tags mean.
export const DAILY_VALUES: Partial<Record<NutrientKey, number>> = {
  protein: 50,
  fiber: 28,
  potassium: 4700,
  calcium: 1300,
  iron: 18,
  vitaminA: 900,
  vitaminC: 90,
};

const TAG_LABELS: Partial<Record<NutrientKey, string>> = {
  protein: "Protein",
  fiber: "Fiber",
  potassium: "Potassium",
  calcium: "Calcium",
  iron: "Iron",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
};

/** Up to three "good source" tags for one serving, strongest first. */
export function goodSourceTags(nutrients: Nutrients, limit = 3): string[] {
  return (Object.keys(DAILY_VALUES) as NutrientKey[])
    .map((key) => ({ key, share: (nutrients[key] ?? 0) / DAILY_VALUES[key]! }))
    .filter(({ share }) => share >= 0.1)
    .sort((a, b) => b.share - a.share)
    .slice(0, limit)
    .map(({ key }) => TAG_LABELS[key]!);
}

export function scaleNutrients(nutrients: Nutrients, factor: number): Nutrients {
  const scaled: Nutrients = {};
  for (const key of NUTRIENT_KEYS) {
    const value = nutrients[key];
    if (value !== undefined) scaled[key] = value * factor;
  }
  return scaled;
}

/** Changes an entry's servings, keeping its per-serving values. */
export function withServings(entry: Entry, servings: number): Entry {
  return { ...entry, servings, nutrients: scaleNutrients(entry.nutrients, servings / entry.servings) };
}

export interface DayTotals {
  totals: Nutrients;
  /** How many of the day's foods had a value for each nutrient. */
  known: Record<NutrientKey, number>;
  foods: number;
}

export function totalsFor(entries: Entry[]): DayTotals {
  const totals: Nutrients = {};
  const known = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0])) as Record<NutrientKey, number>;
  for (const entry of entries) {
    for (const key of NUTRIENT_KEYS) {
      const value = entry.nutrients[key];
      if (value === undefined) continue;
      totals[key] = (totals[key] ?? 0) + value;
      known[key] += 1;
    }
  }
  return { totals, known, foods: entries.length };
}

/** The value as shown on screen: one decimal below 10, whole numbers above. */
export function roundForDisplay(value: number): number {
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
}

/** 2,340 · 62 · 4.5: one decimal below 10, whole numbers above. */
export function formatValue(value: number): string {
  return roundForDisplay(value).toLocaleString("en-US");
}

export type StatusKind = "to-go" | "in-range" | "over" | "unknown";

/** Where a value stands against a target, in words (design.md: Status chips). */
export function statusFor(key: NutrientKey, target: Target, value: number | undefined): { kind: StatusKind; text: string } {
  const unit = NUTRIENTS[key].unit;
  if (value === undefined) return { kind: "unknown", text: "Not enough data" };
  // Judge the number people see, so a shown "31 g" against "at least 31 g" is in range.
  value = roundForDisplay(value);
  if ((target.kind === "range" || target.kind === "min") && value < target.min!) {
    return { kind: "to-go", text: `${formatValue(target.min! - value)} ${unit} to go` };
  }
  if ((target.kind === "range" || target.kind === "max") && value > target.max!) {
    return { kind: "over", text: `Over by ${formatValue(value - target.max!)} ${unit}` };
  }
  if (target.upper !== undefined && value > target.upper) {
    return { kind: "over", text: "Above safe upper limit" };
  }
  return { kind: "in-range", text: target.kind === "max" ? "Under limit" : "In range" };
}

export interface RecentFood {
  key: string;
  name: string;
  foodId?: string;
  /** Values for one serving. */
  perServing: Nutrients;
  lastServings: number;
}

/** Distinct foods from the newest entries, most recent first. */
export function recentFoods(entries: Entry[], limit = 8): RecentFood[] {
  const seen = new Map<string, RecentFood>();
  const newestFirst = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const entry of newestFirst) {
    const key = entry.foodId ?? `custom:${entry.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      key,
      name: entry.name,
      foodId: entry.foodId,
      perServing: scaleNutrients(entry.nutrients, 1 / entry.servings),
      lastServings: entry.servings,
    });
    if (seen.size === limit) break;
  }
  return [...seen.values()];
}

// Custom-food form.

export interface CustomFoodValues {
  name: string;
  date: string;
  amounts: Record<NutrientKey, string>;
}

export type CustomFoodErrors = Partial<Record<"name" | "date" | NutrientKey, string>>;

export const REQUIRED_NUTRIENTS: NutrientKey[] = ["calories"];
export const MAIN_NUTRIENTS: NutrientKey[] = ["calories", "protein", "carbs", "fat"];
export const MORE_NUTRIENTS = NUTRIENT_KEYS.filter((key) => !MAIN_NUTRIENTS.includes(key));

export function emptyCustomFood(date: string): CustomFoodValues {
  return {
    name: "",
    date,
    amounts: Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, ""])) as Record<NutrientKey, string>,
  };
}

/** `today` is "YYYY-MM-DD"; the food's date can't be after it. */
export function validateCustomFood(values: CustomFoodValues, today: string): { nutrients: Nutrients | null; errors: CustomFoodErrors } {
  const errors: CustomFoodErrors = {};
  const nutrients: Nutrients = {};

  if (!values.name.trim()) errors.name = "Enter a food name, like Turkey sandwich.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) errors.date = "Choose the day you ate this.";
  else if (values.date > today) errors.date = "Choose today or an earlier day.";

  for (const key of NUTRIENT_KEYS) {
    const text = values.amounts[key].trim();
    const { label, unit } = NUTRIENTS[key];
    if (text === "") {
      if (REQUIRED_NUTRIENTS.includes(key)) errors[key] = "Enter the calories as a number, like 120.";
      continue;
    }
    if (!/^\d+(\.\d+)?$/.test(text)) {
      errors[key] = text.startsWith("-")
        ? `Enter 0 or more ${unit}.`
        : `Enter ${label.toLowerCase()} as a number of ${unit}, like ${key === "calories" ? "120" : "5"}.`;
      continue;
    }
    nutrients[key] = Number(text);
  }

  return { nutrients: Object.keys(errors).length ? null : nutrients, errors };
}
