// Meals a day's foods are sorted into. Entries saved before meals existed
// have none, so they're placed by the time they were logged.

import type { Entry } from "./storage.ts";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export function isMeal(value: unknown): value is Meal {
  return MEALS.some((meal) => meal.value === value);
}

/** The meal someone is most likely logging at this time of day. */
export function mealAt(time: Date): Meal {
  const hour = time.getHours() + time.getMinutes() / 60;
  if (hour >= 4 && hour < 10.5) return "breakfast";
  if (hour >= 10.5 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 21.5) return "dinner";
  return "snack";
}

export function mealOf(entry: Entry): Meal {
  return isMeal(entry.meal) ? entry.meal : mealAt(new Date(entry.createdAt));
}

/** A day's entries by meal, in meal order, each in the order they were logged. */
export function byMeal(entries: Entry[]): { meal: Meal; label: string; entries: Entry[] }[] {
  const ordered = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return MEALS.map(({ value, label }) => ({
    meal: value,
    label,
    entries: ordered.filter((entry) => mealOf(entry) === value),
  }));
}
