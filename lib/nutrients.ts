// The fifteen tracked nutrients (flows.md: What's tracked).

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
  | "vitaminC"
  | "vitaminD"
  | "magnesium"
  | "sodium"
  | "saturatedFat"
  | "cholesterol";

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
  vitaminD: { label: "Vitamin D", unit: "mcg" },
  magnesium: { label: "Magnesium", unit: "mg" },
  sodium: { label: "Sodium", unit: "mg" },
  saturatedFat: { label: "Saturated fat", unit: "g" },
  cholesterol: { label: "Cholesterol", unit: "mg" },
};

/**
 * What each nutrient is and why it matters, in a sentence or two. General
 * background from NIH Office of Dietary Supplements fact sheets and the
 * American Heart Association, not advice for one person.
 */
export const WHY: Record<NutrientKey, string> = {
  calories: "Calories are the energy in food. Eating about what your body uses keeps your weight steady; a lot more or a lot less, day after day, makes it drift.",
  protein: "Protein builds and repairs muscle, skin and other tissue, and helps you feel full after a meal.",
  carbs: "Carbohydrates are your body's main fuel, especially for the brain. Whole grains, fruit, beans and vegetables bring fiber and vitamins with them.",
  fat: "Fat gives you energy and helps your body absorb vitamins A, D, E and K. The kind matters: unsaturated fats (olive oil, nuts, fish) are better for your heart than saturated ones.",
  fiber: "Fiber keeps digestion regular, helps you feel full and helps keep cholesterol and blood sugar steady. It comes only from plant foods.",
  potassium: "Potassium helps your muscles and nerves work, and helps balance the effect of salt on blood pressure.",
  calcium: "Calcium builds and maintains bones and teeth, and helps your muscles and nerves work.",
  iron: "Iron carries oxygen in your blood. Too little can leave you tired and short of breath.",
  magnesium: "Magnesium helps your muscles, nerves and heart work, supports strong bones and helps turn food into energy.",
  vitaminA: "Vitamin A supports your eyesight, your immune system and healthy skin.",
  vitaminC: "Vitamin C helps wounds heal, supports your immune system and helps you absorb iron from plant foods.",
  vitaminD: "Vitamin D helps your body absorb calcium for strong bones. Sunlight makes it too, so food is only part of the picture.",
  sodium: "Sodium, mostly from salt, helps balance fluids in your body, but a lot of it over time raises blood pressure.",
  saturatedFat: "Saturated fat, mostly from butter, fatty meat and cheese, raises LDL (“bad”) cholesterol when it makes up a big part of your diet.",
  cholesterol: "Cholesterol is a fat your body makes and also gets from animal foods. For most people the saturated fat that comes with it matters more than the cholesterol itself, so this one is compared with your own usual.",
};

/** How the Profile page groups nutrients. */
export const NUTRIENT_GROUPS: { title: string; keys: NutrientKey[] }[] = [
  { title: "Energy and macros", keys: ["calories", "protein", "carbs", "fat"] },
  { title: "Get enough of", keys: ["fiber", "potassium", "calcium", "iron", "magnesium", "vitaminA", "vitaminC", "vitaminD"] },
  // Less is better: sodium and saturated fat have official limits; cholesterol has
  // none, so it's compared with the person's own usual (lib/usual.ts).
  { title: "Keep under", keys: ["sodium", "saturatedFat", "cholesterol"] },
];
