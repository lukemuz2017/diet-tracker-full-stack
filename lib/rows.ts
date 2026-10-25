// Translates between the app's saved data (lib/storage.ts) and the Supabase
// tables (AGENTS.md, "Data model"), and works out which rows a change touched.
// Pure, so it can be tested without a database. user_id is never written:
// the database fills it in from the signed-in Clerk token.

import { mealAt } from "./meals.ts";
import type { Nutrients } from "./nutrients.ts";
import { isProfile, type Profile } from "./profile.ts";
import type { Ingredient, Recipe } from "./recipe.ts";
import type { Entry, SavedData, SavedFood } from "./storage.ts";
import type { Portion } from "./usda.ts";

export interface ProfileRow {
  units: Profile["units"];
  height_cm: number;
  weight_kg: number;
  birth_date: string;
  sex: Profile["sex"];
  activity: Profile["activity"];
  allergies: NonNullable<Profile["allergies"]>;
  pattern: NonNullable<Profile["pattern"]>;
  life_stage: NonNullable<Profile["lifeStage"]>;
}

export interface EntryRow {
  id: string;
  date: string;
  meal: NonNullable<Entry["meal"]>;
  name: string;
  amount: number;
  source: string | null;
  nutrients: Nutrients;
  is_sample: boolean;
  created_at: string;
}

// Recipes and saved USDA foods share the my_foods table. Both shapes list
// every column, so one upsert can carry a mix of the two.
export interface RecipeRow {
  id: string;
  kind: "recipe";
  name: string;
  fdc_id: null;
  nutrients: Nutrients;
  portions: null;
  servings: number;
  ingredients: Ingredient[] | null;
  created_at: string;
}

export interface SavedFoodRow {
  id: string;
  kind: "usda";
  name: string;
  fdc_id: number;
  /** Per 100 g. */
  nutrients: Nutrients;
  portions: Portion[] | null;
  servings: null;
  ingredients: null;
  created_at: string;
}

export type MyFoodRow = RecipeRow | SavedFoodRow;

export function profileToRow(profile: Profile): ProfileRow {
  return {
    units: profile.units,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    birth_date: profile.birthDate,
    sex: profile.sex,
    activity: profile.activity,
    allergies: profile.allergies ?? [],
    pattern: profile.pattern ?? "everything",
    life_stage: profile.lifeStage ?? "none",
  };
}

export function profileFromRow(row: ProfileRow): Profile | null {
  const profile: Profile = {
    units: row.units,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    birthDate: row.birth_date,
    sex: row.sex,
    activity: row.activity,
    allergies: row.allergies,
    pattern: row.pattern,
    lifeStage: row.life_stage,
  };
  return isProfile(profile) ? profile : null;
}

// Entry.foodId is a built-in food id ("egg") or a prefixed id ("recipe:…",
// "usda:…"); the table's source column always carries the prefix.
export function sourceOf(foodId: string | undefined): string | null {
  if (!foodId) return null;
  return foodId.includes(":") ? foodId : `builtin:${foodId}`;
}

export function foodIdOf(source: string | null): string | undefined {
  if (!source) return undefined;
  return source.startsWith("builtin:") ? source.slice("builtin:".length) : source;
}

export function entryToRow(entry: Entry): EntryRow {
  return {
    id: entry.id,
    date: entry.date,
    meal: entry.meal ?? mealAt(new Date(entry.createdAt)),
    name: entry.name,
    amount: entry.servings,
    source: sourceOf(entry.foodId),
    nutrients: entry.nutrients,
    is_sample: entry.sample ?? false,
    created_at: entry.createdAt,
  };
}

export function entryFromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    meal: row.meal,
    name: row.name,
    servings: Number(row.amount),
    foodId: foodIdOf(row.source),
    nutrients: row.nutrients ?? {},
    ...(row.is_sample ? { sample: true } : {}),
    createdAt: row.created_at,
  };
}

export function recipeToRow(recipe: Recipe): RecipeRow {
  return {
    id: recipe.id,
    kind: "recipe",
    name: recipe.name,
    fdc_id: null,
    nutrients: recipe.perServing,
    portions: null,
    servings: recipe.servings,
    ingredients: recipe.ingredients ?? null,
    created_at: recipe.createdAt,
  };
}

export function recipeFromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    servings: Number(row.servings ?? 1),
    perServing: row.nutrients ?? {},
    ...(row.ingredients ? { ingredients: row.ingredients } : {}),
    createdAt: row.created_at,
  };
}

export function savedFoodToRow(food: SavedFood): SavedFoodRow {
  return {
    id: food.id,
    kind: "usda",
    name: food.name,
    fdc_id: food.fdcId,
    nutrients: food.per100g,
    portions: food.portions?.length ? food.portions : null,
    servings: null,
    ingredients: null,
    created_at: food.createdAt,
  };
}

export function savedFoodFromRow(row: SavedFoodRow): SavedFood {
  return {
    id: row.id,
    fdcId: Number(row.fdc_id),
    name: row.name,
    per100g: row.nutrients ?? {},
    ...(row.portions?.length ? { portions: row.portions } : {}),
    createdAt: row.created_at,
  };
}

/** Everything one person has saved, from their rows (RLS returns only theirs). */
export function dataFromRows(rows: {
  profile: ProfileRow | null;
  entries: EntryRow[];
  days: { date: string }[];
  foods: MyFoodRow[];
}): SavedData {
  return {
    version: 1,
    profile: rows.profile ? profileFromRow(rows.profile) : null,
    entries: rows.entries.map(entryFromRow),
    completeDays: rows.days.map((day) => day.date),
    recipes: rows.foods.filter((row): row is RecipeRow => row.kind === "recipe").map(recipeFromRow),
    savedFoods: rows.foods.filter((row): row is SavedFoodRow => row.kind === "usda").map(savedFoodFromRow),
  };
}

export interface Changes {
  /** The new profile to save, "delete" to remove it, or null if unchanged. */
  profile: ProfileRow | "delete" | null;
  entries: { upsert: EntryRow[]; delete: string[] };
  days: { add: string[]; remove: string[] };
  /** Recipes and saved USDA foods (both in my_foods). */
  foods: { upsert: MyFoodRow[]; delete: string[] };
}

// Saved data is never edited in place: a changed entry or recipe is a new
// object, so comparing by identity finds exactly what changed.
function diffById<T extends { id: string }>(before: T[], after: T[]) {
  const old = new Map(before.map((item) => [item.id, item]));
  const ids = new Set(after.map((item) => item.id));
  return {
    upsert: after.filter((item) => old.get(item.id) !== item),
    delete: before.filter((item) => !ids.has(item.id)).map((item) => item.id),
  };
}

/** The rows to write so the database matches `after`. */
export function changesBetween(before: SavedData, after: SavedData): Changes {
  const entries = diffById(before.entries, after.entries);
  const recipes = diffById(before.recipes, after.recipes);
  const saved = diffById(before.savedFoods, after.savedFoods);
  const oldDays = new Set(before.completeDays);
  const newDays = new Set(after.completeDays);
  return {
    profile:
      before.profile === after.profile ? null : after.profile ? profileToRow(after.profile) : "delete",
    entries: { upsert: entries.upsert.map(entryToRow), delete: entries.delete },
    days: {
      add: [...newDays].filter((date) => !oldDays.has(date)),
      remove: [...oldDays].filter((date) => !newDays.has(date)),
    },
    foods: {
      upsert: [...recipes.upsert.map(recipeToRow), ...saved.upsert.map(savedFoodToRow)],
      delete: [...recipes.delete, ...saved.delete],
    },
  };
}

export function hasChanges(changes: Changes): boolean {
  return (
    changes.profile !== null ||
    changes.entries.upsert.length + changes.entries.delete.length > 0 ||
    changes.days.add.length + changes.days.remove.length > 0 ||
    changes.foods.upsert.length + changes.foods.delete.length > 0
  );
}
