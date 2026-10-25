// Recipes: per-serving nutrition added up from ingredients. Pure functions,
// checked by lib/recipe.test.ts.

import { NUTRIENT_KEYS, scaleNutrients } from "./log.ts";
import type { Nutrients } from "./nutrients.ts";

export interface Ingredient {
  name: string;
  foodId?: string;
  /** Multiple of the food's base amount. */
  multiple: number;
  /** Totals for this ingredient. */
  nutrients: Nutrients;
}

export interface Recipe {
  id: string;
  name: string;
  /** How many servings the whole recipe makes. */
  servings: number;
  perServing: Nutrients;
  ingredients?: Ingredient[];
  createdAt: string;
}

/** Per-serving nutrition from a list of ingredients. A nutrient is known only if every ingredient has it. */
export function perServingFromIngredients(ingredients: Ingredient[], servings: number): Nutrients {
  const total: Nutrients = {};
  for (const key of NUTRIENT_KEYS) {
    if (ingredients.length === 0 || ingredients.some((item) => item.nutrients[key] === undefined)) continue;
    total[key] = ingredients.reduce((sum, item) => sum + item.nutrients[key]!, 0);
  }
  return scaleNutrients(total, 1 / servings);
}

export const RECIPE_PREFIX = "recipe:";
