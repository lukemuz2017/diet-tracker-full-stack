// Example logs for showing the app: two weeks of ordinary meals made from the
// built-in foods. Sample entries have ids starting "sample-", so they can be
// cleared without touching anything the person logged.

import { addDays } from "./dates.ts";
import { amountFor, findFood } from "./foods.ts";
import { scaleNutrients } from "./log.ts";
import { MEALS } from "./meals.ts";
import type { Entry, SavedData } from "./storage.ts";

export const SAMPLE_PREFIX = "sample-";
export const SAMPLE_DAYS = 15;
/** Roughly what the menus below add up to on a full day. */
const MENU_CALORIES = 2300;

/** [food id, multiple of its base serving]; a day's meals are breakfast, lunch, dinner, snack. */
type Meal = [string, number][];

const BREAKFASTS: Meal[] = [
  [["oatmeal", 1.5], ["blueberries", 1], ["milk", 1], ["peanutButter", 1]],
  [["egg", 3], ["wholeWheatBread", 2], ["avocado", 1], ["orangeJuice", 1]],
  [["greekYogurt", 1.5], ["strawberries", 1], ["granolaBar", 1], ["banana", 1]],
  [["oatmeal", 1.5], ["banana", 1], ["almonds", 1], ["milk", 1]],
];
const LUNCHES: Meal[] = [
  [["chickenBreast", 4 / 3], ["quinoa", 1], ["saladGreens", 1], ["redBellPepper", 1], ["oliveOil", 1]],
  [["tuna", 4 / 3], ["wholeWheatBread", 2], ["apple", 1], ["carrots", 2], ["hummus", 1]],
  [["blackBeans", 2], ["brownRice", 1], ["avocado", 1], ["tomato", 1], ["cheddar", 1]],
  [["lentils", 2], ["wholeWheatBread", 1], ["spinach", 1], ["orange", 1], ["oliveOil", 1]],
];
const DINNERS: Meal[] = [
  [["salmon", 2], ["sweetPotato", 1], ["broccoli", 2], ["oliveOil", 1]],
  [["groundBeef", 4 / 3], ["pasta", 2], ["tomato", 1], ["spinach", 1]],
  [["tofu", 2], ["brownRice", 1.5], ["broccoli", 2], ["redBellPepper", 1], ["oliveOil", 1]],
  [["chickenBreast", 2], ["potato", 1], ["saladGreens", 1], ["oliveOil", 1.5]],
  [["chickpeas", 2], ["whiteRice", 1.5], ["spinach", 1], ["cheddar", 1]],
];
const SNACKS: Meal[] = [
  [["apple", 1], ["peanutButter", 1]],
  [["almonds", 1], ["darkChocolate", 1]],
  [["greekYogurt", 1], ["blueberries", 1]],
  [["hummus", 2], ["carrots", 2]],
];
// Weekends lean on pizza and soda, so fiber runs low.
const WEEKEND_DINNER: Meal = [["cheesePizza", 3], ["cola", 1], ["saladGreens", 1]];
// A busy day where only breakfast got logged, so it's left unmarked.
const LIGHT_DAY_INDEX = 11;
const LIGHT_DAY: Meal = [["greekYogurt", 1], ["banana", 1], ["granolaBar", 1]];

function weekday(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

/** The meals for one day, picked by its position in the two weeks. */
export function sampleMeals(date: string, index: number): Meal[] {
  if (index === LIGHT_DAY_INDEX) return [LIGHT_DAY];
  const weekend = weekday(date) === 0 || weekday(date) === 6;
  return [
    BREAKFASTS[index % BREAKFASTS.length],
    LUNCHES[(index * 3) % LUNCHES.length],
    weekend ? WEEKEND_DINNER : DINNERS[index % DINNERS.length],
    SNACKS[index % SNACKS.length],
  ];
}

/** Portions scaled to the person's calories, kept to amounts people eat. */
function portion(foodId: string, servings: number, scale: number): number {
  const wholeOnly = amountFor(foodId).choices.every(Number.isInteger);
  const step = wholeOnly ? 1 : 0.5;
  return Math.max(step, Math.round((servings * scale) / step) * step);
}

/**
 * Sample entries for the SAMPLE_DAYS days before today (today stays empty for
 * the person to log). Portions are scaled toward `calories` (their
 * maintenance). Days that already have food logged are skipped.
 */
export function sampleEntries(data: SavedData, today: string, calories = MENU_CALORIES): Entry[] {
  const scale = calories / MENU_CALORIES;
  const logged = new Set(data.entries.map((entry) => entry.date));
  const entries: Entry[] = [];
  for (let index = 0; index < SAMPLE_DAYS; index++) {
    const date = addDays(today, index - SAMPLE_DAYS);
    if (logged.has(date)) continue;
    sampleMeals(date, index)
      .flatMap((meal, m) => meal.map(([foodId, servings]) => ({ foodId, servings, meal: MEALS[m].value })))
      .forEach(({ foodId, servings: menuServings, meal }, n) => {
        const servings = portion(foodId, menuServings, scale);
        const food = findFood(foodId);
        if (!food) throw new Error(`Unknown sample food: ${foodId}`);
        entries.push({
          id: `${SAMPLE_PREFIX}${date}-${n}`,
          date,
          meal,
          name: food.name,
          servings,
          foodId,
          nutrients: scaleNutrients(food.nutrients, servings),
          // Keeps the logged order within the day.
          createdAt: `${date}T12:00:${String(n).padStart(2, "0")}.000Z`,
        });
      });
  }
  return entries;
}

export function isSample(entry: Entry): boolean {
  return entry.id.startsWith(SAMPLE_PREFIX);
}

/** Adds the sample meals and marks those days complete (all but the light day). */
export function withSample(data: SavedData, today: string, calories?: number): SavedData {
  const entries = sampleEntries(data, today, calories);
  const light = addDays(today, LIGHT_DAY_INDEX - SAMPLE_DAYS);
  const days = [...new Set(entries.map((entry) => entry.date))].filter((date) => date !== light);
  return {
    ...data,
    entries: [...data.entries, ...entries],
    completeDays: [...new Set([...data.completeDays, ...days])],
  };
}

/** Removes the sample meals, and the complete marks on days left with no food. */
export function withoutSample(data: SavedData): SavedData {
  const entries = data.entries.filter((entry) => !isSample(entry));
  const logged = new Set(entries.map((entry) => entry.date));
  return { ...data, entries, completeDays: data.completeDays.filter((date) => logged.has(date)) };
}
