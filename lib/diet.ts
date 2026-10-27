// What each built-in food contains, for the diet notes on the profile:
// allergens (FDA's nine major allergens, gluten for celiac disease) and
// meat, fish, grains, legumes and so on for eating patterns. Only definite ingredients are tagged;
// custom foods and recipes have no tags, so they never show a warning.

import { ALLERGEN_OPTIONS, type Allergen, type Diet, type Pattern } from "./profile.ts";

/** What a food is, for eating patterns: meat, grain, legume, starchy vegetable, sugary food, processed food. */
export type Tag = Allergen | "meat" | "grain" | "legume" | "starchy" | "sugary" | "processed";

const FOOD_TAGS: Record<string, Tag[]> = {
  banana: ["sugary"],
  apple: ["sugary"],
  orange: ["sugary"],
  sweetPotato: ["starchy"],
  potato: ["starchy"],
  peanutButter: ["peanuts", "legume"],
  almonds: ["treeNuts"],
  milk: ["dairy"],
  cheddar: ["dairy"],
  greekYogurt: ["dairy"],
  cheesePizza: ["dairy", "gluten", "grain", "processed"],
  egg: ["eggs"],
  wholeWheatBread: ["gluten", "grain"],
  pasta: ["gluten", "grain"],
  oatmeal: ["grain"],
  brownRice: ["grain"],
  whiteRice: ["grain"],
  quinoa: ["grain"],
  tofu: ["soy", "legume"],
  blackBeans: ["legume"],
  lentils: ["legume"],
  chickpeas: ["legume"],
  salmon: ["fish"],
  tuna: ["fish"],
  hummus: ["sesame", "legume"],
  chickenBreast: ["meat"],
  groundBeef: ["meat"],
  orangeJuice: ["sugary"],
  cola: ["sugary", "processed"],
  granolaBar: ["grain", "sugary", "processed"],
};

/** What each eating pattern leaves out. */
export const PATTERN_EXCLUDES: Record<Pattern, Tag[]> = {
  everything: [],
  vegetarian: ["meat", "fish", "shellfish"],
  pescatarian: ["meat"],
  vegan: ["meat", "fish", "shellfish", "dairy", "eggs"],
  // Keto: very low carb, so no grains, legumes, starchy vegetables or sugary foods.
  keto: ["grain", "legume", "starchy", "sugary"],
  // Paleo: no grains, legumes, dairy or processed foods.
  paleo: ["grain", "legume", "dairy", "processed"],
};

/** Whether a set of tags clashes with the person's allergies or eating pattern. */
export function clashes(tags: readonly Tag[], diet: Pick<Diet, "allergies" | "pattern">): boolean {
  return tags.some((tag) => (diet.allergies as Tag[]).includes(tag) || PATTERN_EXCLUDES[diet.pattern].includes(tag));
}

/** Warnings for one food, e.g. ["Contains dairy", "Not vegan"]. Empty when it fits. */
export function warningsFor(foodId: string | undefined, diet: Pick<Diet, "allergies" | "pattern">): string[] {
  const tags = foodId ? (FOOD_TAGS[foodId] ?? []) : [];
  const allergens = tags.filter((tag): tag is Allergen => diet.allergies.includes(tag as Allergen));
  const warnings = allergens.map((tag) => `Contains ${ALLERGEN_OPTIONS.find((option) => option.value === tag)!.contains}`);
  if (tags.some((tag) => PATTERN_EXCLUDES[diet.pattern].includes(tag))) warnings.push(`Not ${diet.pattern}`);
  return warnings;
}
