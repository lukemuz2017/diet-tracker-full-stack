// The built-in common foods (static data, no API). Values come from USDA
// FoodData Central, per the serving shown; see lib/foods-data.ts.

import { PORTION, type AmountSpec } from "./amounts.ts";
import { FOOD_DATA } from "./foods-data.ts";
import type { Nutrients } from "./nutrients.ts";

export interface Food {
  id: string;
  name: string;
  /** Household serving, e.g. "1 medium". */
  serving: string;
  grams: number;
  /** Values for one serving. */
  nutrients: Nutrients;
  /** USDA FoodData Central id, for checking the numbers. */
  fdcId: number;
}

export type FoodCategory = "Fruit" | "Vegetables" | "Protein foods" | "Dairy" | "Grains" | "Other";

export const CATEGORY_ORDER: FoodCategory[] = ["Fruit", "Vegetables", "Protein foods", "Dairy", "Grains", "Other"];

const CATEGORY_OF: Record<string, FoodCategory> = {
  banana: "Fruit",
  apple: "Fruit",
  orange: "Fruit",
  strawberries: "Fruit",
  blueberries: "Fruit",
  avocado: "Fruit",
  spinach: "Vegetables",
  broccoli: "Vegetables",
  carrots: "Vegetables",
  sweetPotato: "Vegetables",
  potato: "Vegetables",
  tomato: "Vegetables",
  redBellPepper: "Vegetables",
  saladGreens: "Vegetables",
  eggs: "Protein foods",
  egg: "Protein foods",
  chickenBreast: "Protein foods",
  salmon: "Protein foods",
  tuna: "Protein foods",
  tofu: "Protein foods",
  blackBeans: "Protein foods",
  lentils: "Protein foods",
  chickpeas: "Protein foods",
  peanutButter: "Protein foods",
  almonds: "Protein foods",
  groundBeef: "Protein foods",
  greekYogurt: "Dairy",
  milk: "Dairy",
  cheddar: "Dairy",
  cheddarCheese: "Dairy",
  oatmeal: "Grains",
  brownRice: "Grains",
  whiteRice: "Grains",
  wholeWheatBread: "Grains",
  pasta: "Grains",
  quinoa: "Grains",
};

export const FOODS: Food[] = FOOD_DATA;

// Each food in its natural unit (lib/amounts.ts). "base" matches the USDA
// serving the nutrition values are for (see grams in lib/foods-data.ts).
const COUNT = [1, 2, 3, 4];
const COUNT_HALVES = [0.5, 1, 1.5, 2];
const CUPS = [0.25, 0.5, 0.75, 1, 1.5, 2];
const TBSP = [1, 2, 3, 4];
const OZ_MEAT = [2, 3, 4, 6, 8];
const OZ_SMALL = [0.5, 1, 1.5, 2];
const DECK = "3 ounces is about the size of a deck of cards";
const count = (one: string, many: string, choices = COUNT_HALVES, base = 1): AmountSpec => ({ base, one, many, choices });
/** Whole foods counted by the food itself: the picker shows just "1", "2". */
const whole = (one: string, many: string, choices = COUNT_HALVES, base = 1): AmountSpec => ({ ...count(one, many, choices, base), bare: true });
const cups = (base: number, choices = CUPS): AmountSpec => ({ base, one: "cup", many: "cups", choices });
const tbsp = (base: number, choices = TBSP): AmountSpec => ({ base, one: "tbsp", many: "tbsp", choices });
const oz = (base: number, choices: number[], note?: string): AmountSpec => ({ base, one: "ounce", many: "ounces", choices, note });

const AMOUNTS: Record<string, AmountSpec> = {
  banana: whole("banana", "bananas"),
  apple: whole("apple", "apples"),
  orange: whole("orange", "oranges"),
  strawberries: cups(1),
  blueberries: cups(1),
  avocado: whole("avocado", "avocados", [0.25, 0.5, 1], 0.5),
  spinach: cups(0.5),
  broccoli: cups(0.5),
  carrots: whole("carrot", "carrots", [1, 2, 3]),
  sweetPotato: whole("sweet potato", "sweet potatoes"),
  potato: whole("potato", "potatoes"),
  tomato: whole("tomato", "tomatoes"),
  redBellPepper: whole("pepper", "peppers"),
  saladGreens: cups(2, [1, 2, 3, 4]),
  egg: whole("egg", "eggs", COUNT),
  chickenBreast: oz(3, OZ_MEAT, DECK),
  salmon: oz(3, OZ_MEAT, DECK),
  tuna: oz(3, OZ_MEAT, "drained; a 5-ounce can has about 4 ounces of tuna"),
  tofu: cups(0.5),
  blackBeans: cups(0.5),
  lentils: cups(0.5),
  chickpeas: cups(0.5),
  peanutButter: tbsp(2),
  almonds: oz(1, OZ_SMALL, "1 ounce is about 23 almonds"),
  groundBeef: oz(3, OZ_MEAT, DECK),
  greekYogurt: count("container (7 oz)", "containers (7 oz)", COUNT_HALVES),
  milk: cups(1),
  cheddar: oz(1, OZ_SMALL),
  oatmeal: cups(1),
  brownRice: cups(1),
  whiteRice: cups(1),
  wholeWheatBread: count("slice", "slices", COUNT),
  pasta: cups(1),
  quinoa: cups(1),
  oliveOil: tbsp(1, [0.5, 1, 1.5, 2]),
  hummus: tbsp(2),
  orangeJuice: cups(1),
  cheesePizza: count("slice", "slices", COUNT),
  cola: count("can (12 fl oz)", "cans (12 fl oz)", [1, 2]),
  granolaBar: count("bar", "bars", [1, 2, 3]),
  darkChocolate: oz(1, OZ_SMALL),
};

/** Saved recipes are logged by the serving. */
export const RECIPE_SERVINGS: AmountSpec = { base: 1, one: "serving", many: "servings", choices: [0.5, 1, 1.5, 2, 3] };

/** The unit a food is measured in; recipes are servings, custom foods are portions. */
export function amountFor(foodId: string | undefined): AmountSpec {
  if (foodId?.startsWith("recipe:")) return RECIPE_SERVINGS;
  return (foodId && AMOUNTS[foodId]) || PORTION;
}

export function categoryOf(food: Food): FoodCategory {
  return CATEGORY_OF[food.id] ?? "Other";
}

export function findFood(id: string): Food | undefined {
  return FOODS.find((food) => food.id === id);
}

/** One-tap picks for an empty Today, in order of preference. */
export const QUICK_PICK_IDS = ["oatmeal", "banana", "egg", "eggs", "greekYogurt", "blackBeans", "brownRice", "apple", "chickenBreast"];

export function quickPicks(limit = 6): Food[] {
  return QUICK_PICK_IDS.map(findFood).filter((food): food is Food => Boolean(food)).slice(0, limit);
}
