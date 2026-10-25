"use client";

import { scaleNutrients, withServings } from "./log.ts";
import type { Meal } from "./meals.ts";
import type { Nutrients } from "./nutrients.ts";
import type { Recipe } from "./recipe.ts";
import { updateData, type Entry } from "./storage.ts";
import { showToast } from "./toast.ts";

// Changes people make while logging, each with an Undo message.

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addFood(
  food: { name: string; foodId?: string; perServing: Nutrients },
  servings: number,
  date: string,
  meal: Meal,
  message: string,
) {
  const entry: Entry = {
    id: newId(),
    date,
    meal,
    name: food.name,
    servings,
    foodId: food.foodId,
    nutrients: scaleNutrients(food.perServing, servings),
    createdAt: new Date().toISOString(),
  };
  updateData((data) => ({ ...data, entries: [...data.entries, entry] }));
  showToast(message, () => removeEntry(entry.id, { silent: true }));
  return entry;
}

/** Adds several foods to one meal at once, with a single Undo for the lot. */
export function addFoods(
  items: { food: { name: string; foodId?: string; perServing: Nutrients }; servings: number }[],
  date: string,
  meal: Meal,
  message: string,
) {
  const createdAt = new Date().toISOString();
  const entries: Entry[] = items.map(({ food, servings }) => ({
    id: newId(),
    date,
    meal,
    name: food.name,
    servings,
    foodId: food.foodId,
    nutrients: scaleNutrients(food.perServing, servings),
    createdAt,
  }));
  updateData((data) => ({ ...data, entries: [...data.entries, ...entries] }));
  showToast(message, () => {
    for (const entry of entries) removeEntry(entry.id, { silent: true });
  });
}

export function removeEntry(id: string, { silent = false } = {}) {
  let removed: Entry | undefined;
  updateData((data) => {
    removed = data.entries.find((entry) => entry.id === id);
    return { ...data, entries: data.entries.filter((entry) => entry.id !== id) };
  });
  if (removed && !silent) {
    const entry = removed;
    showToast(`Removed ${entry.name.toLowerCase()}`, () =>
      updateData((data) => ({ ...data, entries: [...data.entries, entry] })),
    );
  }
}

export function changeServings(id: string, servings: number) {
  updateData((data) => ({
    ...data,
    entries: data.entries.map((entry) => (entry.id === id ? withServings(entry, servings) : entry)),
  }));
}

export function setDayComplete(date: string, complete: boolean) {
  updateData((data) => ({
    ...data,
    completeDays: complete
      ? [...new Set([...data.completeDays, date])]
      : data.completeDays.filter((day) => day !== date),
  }));
}

export function saveRecipe(recipe: Omit<Recipe, "id" | "createdAt">): Recipe {
  const saved: Recipe = { ...recipe, id: newId(), createdAt: new Date().toISOString() };
  updateData((data) => ({ ...data, recipes: [...data.recipes, saved] }));
  return saved;
}

export function deleteRecipe(id: string) {
  let removed: Recipe | undefined;
  updateData((data) => {
    removed = data.recipes.find((recipe) => recipe.id === id);
    return { ...data, recipes: data.recipes.filter((recipe) => recipe.id !== id) };
  });
  if (removed) {
    const recipe = removed;
    showToast(`Deleted ${recipe.name}`, () => updateData((data) => ({ ...data, recipes: [...data.recipes, recipe] })));
  }
}
