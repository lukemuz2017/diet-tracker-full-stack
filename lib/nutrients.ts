// The ten tracked nutrients (flows.md: What's tracked).

export type NutrientKey =
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "fiber"
  | "potassium"
  | "calcium"
  | "iron"
  | "vitaminA"
  | "vitaminC";

export type NutrientUnit = "kcal" | "g" | "mg" | "mcg";

/** Nutrient amounts. A missing key means unknown, not zero. */
export type Nutrients = Partial<Record<NutrientKey, number>>;

export const NUTRIENTS: Record<NutrientKey, { label: string; unit: NutrientUnit }> = {
  calories: { label: "Calories", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbs", unit: "g" },
  fat: { label: "Fat", unit: "g" },
  fiber: { label: "Fiber", unit: "g" },
  potassium: { label: "Potassium", unit: "mg" },
  calcium: { label: "Calcium", unit: "mg" },
  iron: { label: "Iron", unit: "mg" },
  vitaminA: { label: "Vitamin A", unit: "mcg" },
  vitaminC: { label: "Vitamin C", unit: "mg" },
};

/** How the Profile page groups nutrients. */
export const NUTRIENT_GROUPS: { title: string; keys: NutrientKey[] }[] = [
  { title: "Energy and macros", keys: ["calories", "protein", "carbs", "fat"] },
  { title: "Get enough of", keys: ["fiber", "potassium", "calcium", "iron", "vitaminA", "vitaminC"] },
];
