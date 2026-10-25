// USDA FoodData Central search results, turned into the app's foods. Pure:
// the request itself happens on our server (app/api/foods/search/route.ts),
// which keeps the API key secret. Values are per 100 g.

import type { NutrientKey, Nutrients } from "./nutrients.ts";

export interface UsdaFood {
  fdcId: number;
  name: string;
  /** e.g. "Dairy and Egg Products"; not every food has one. */
  category?: string;
  /** Per 100 g. A nutrient USDA doesn't list is left out (unknown, not zero). */
  per100g: Nutrients;
}

/** USDA nutrient ids for the ten tracked nutrients (AGENTS.md decisions log). */
const NUTRIENT_IDS: Record<number, NutrientKey> = {
  1008: "calories",
  1003: "protein",
  1005: "carbs",
  1004: "fat",
  1079: "fiber",
  1092: "potassium",
  1087: "calcium",
  1089: "iron",
  1106: "vitaminA",
  1162: "vitaminC",
};

// Foundation foods often give energy only by the Atwater factors.
const ENERGY_FALLBACKS = [2048, 2047];

/** At most this many foods per search. */
export const USDA_PAGE_SIZE = 8;

/** Generic foods only; branded products crowd out everyday answers. */
export const USDA_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

interface RawNutrient {
  nutrientId?: number;
  unitName?: string;
  value?: number;
}

interface RawFood {
  fdcId?: number;
  description?: string;
  foodCategory?: string;
  foodNutrients?: RawNutrient[];
}

function nutrientsOf(raw: RawNutrient[]): Nutrients {
  const nutrients: Nutrients = {};
  for (const item of raw) {
    if (typeof item.nutrientId !== "number" || typeof item.value !== "number") continue;
    const key = NUTRIENT_IDS[item.nutrientId];
    // Energy also comes in kJ (unit "kJ"); only kcal counts.
    if (key === "calories" && item.unitName?.toUpperCase() !== "KCAL") continue;
    if (key) nutrients[key] = item.value;
  }
  if (nutrients.calories === undefined) {
    for (const id of ENERGY_FALLBACKS) {
      const energy = raw.find((item) => item.nutrientId === id && item.unitName?.toUpperCase() === "KCAL");
      if (typeof energy?.value === "number") {
        nutrients.calories = energy.value;
        break;
      }
    }
  }
  return nutrients;
}

/**
 * The foods in a /foods/search response. Foods without calories are dropped,
 * since calories are required to log anything. An empty search is a normal
 * response with no foods (totalHits: 0), not an error.
 */
export function foodsFromSearch(response: unknown): UsdaFood[] {
  const foods = (response as { foods?: unknown })?.foods;
  if (!Array.isArray(foods)) throw new Error("Unexpected USDA response");
  const seen = new Set<number>();
  const result: UsdaFood[] = [];
  for (const raw of foods as RawFood[]) {
    if (typeof raw?.fdcId !== "number" || typeof raw.description !== "string" || seen.has(raw.fdcId)) continue;
    const per100g = nutrientsOf(Array.isArray(raw.foodNutrients) ? raw.foodNutrients : []);
    if (per100g.calories === undefined) continue;
    seen.add(raw.fdcId);
    result.push({
      fdcId: raw.fdcId,
      name: raw.description.trim(),
      ...(raw.foodCategory ? { category: raw.foodCategory } : {}),
      per100g,
    });
  }
  return result;
}

/** A search the server will send on: trimmed, 2 to 60 characters. */
export function cleanQuery(value: string | null): string | null {
  const query = (value ?? "").trim().replace(/\s+/g, " ");
  return query.length >= 2 && query.length <= 60 ? query : null;
}
