// A day's highlights in the day panel: up to three nutrients it got in range
// (the harder wins first) and at most one heads-up for something over.

import { statusFor } from "./log.ts";
import { NUTRIENTS, type NutrientKey, type Nutrients } from "./nutrients.ts";
import type { Targets } from "./targets.ts";

export const MAX_WINS = 3;

/** Fiber, vitamins and minerals are the harder wins, so they're named first. */
const WIN_ORDER: NutrientKey[] = ["fiber", "vitaminC", "potassium", "calcium", "iron", "vitaminA", "protein"];
/** What's worth a heads-up when it's over, most common first. */
const HEADS_UP_ORDER: NutrientKey[] = ["calories", "fat", "carbs", "protein", "calcium", "iron", "vitaminC"];

export interface Highlights {
  wins: string[];
  headsUp?: string;
}

export function dayHighlights(totals: Nutrients, targets: Targets): Highlights {
  const wins = WIN_ORDER.filter((key) => totals[key] !== undefined && statusFor(key, targets[key], totals[key]).kind === "in-range")
    .slice(0, MAX_WINS)
    .map((key) => (key === "fiber" ? "High in fiber" : NUTRIENTS[key].label));
  const over = HEADS_UP_ORDER.find((key) => totals[key] !== undefined && statusFor(key, targets[key], totals[key]).kind === "over");
  const headsUp = over === undefined ? undefined : `Heads up: ${NUTRIENTS[over].label.toLowerCase()} high`;
  return { wins, headsUp };
}
