// Adds the newer nutrients (vitamin D, magnesium, sodium and
// cholesterol) to the built-in foods in lib/foods-data.ts, from USDA
// FoodData Central. Each food is looked up by its fdcId; USDA gives values per
// 100 g, which are scaled to the food's serving (its `grams`).
//
// Run it from the project folder with your key from .env.local, so the key
// never has to be typed or pasted:
//
//   node --env-file=.env.local scripts/refresh-foods.mjs
//
// Without USDA_API_KEY it uses USDA's DEMO_KEY, which allows only a few
// requests an hour. A nutrient USDA doesn't list for a food is left out
// (unknown, not zero). Safe to run again: it only fills in these four.
import fs from "node:fs";

const FILE = "lib/foods-data.ts";
const KEY = process.env.USDA_API_KEY || "DEMO_KEY";
// USDA nutrient id → [our key, decimals to keep].
const NEW = {
  1114: ["vitaminD", 1],
  1090: ["magnesium", 0],
  1093: ["sodium", 0],
  1253: ["cholesterol", 0],
};
const ORDER = ["vitaminD", "magnesium", "sodium", "cholesterol"];

const raw = fs.readFileSync(FILE, "utf8");
const crlf = raw.includes("\r\n");
const lines = raw.replace(/\r\n/g, "\n").split("\n");
const rows = lines.map((line, index) => ({ index, match: line.match(/^  (\{"id".*\}),$/) })).filter((row) => row.match);
const foods = rows.map((row) => ({ index: row.index, food: JSON.parse(row.match[1]) }));

const per100g = new Map();
for (let i = 0; i < foods.length; i += 20) {
  const chunk = foods.slice(i, i + 20);
  const response = await fetch("https://api.nal.usda.gov/fdc/v1/foods", {
    method: "POST",
    headers: { "X-Api-Key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ fdcIds: chunk.map((item) => item.food.fdcId), format: "full" }),
  });
  if (!response.ok) {
    console.error(`USDA answered ${response.status}. ${response.status === 429 ? "Rate limited: use your own key (see the top of this file)." : ""}`);
    process.exit(1);
  }
  for (const item of await response.json()) {
    const found = {};
    for (const n of item.foodNutrients ?? []) {
      const spec = NEW[n.nutrient?.id];
      if (spec && typeof n.amount === "number") found[spec[0]] = n.amount;
    }
    per100g.set(item.fdcId, found);
  }
}

const missing = Object.fromEntries(ORDER.map((key) => [key, []]));
for (const { index, food } of foods) {
  const found = per100g.get(food.fdcId) ?? {};
  for (const [, [key, decimals]] of Object.entries(NEW)) {
    if (found[key] === undefined) {
      missing[key].push(food.id);
      continue;
    }
    const scaled = (found[key] * food.grams) / 100;
    food.nutrients[key] = Number(scaled.toFixed(decimals));
  }
  // Keep the original ten first, then the new five in a fixed order.
  const known = Object.fromEntries(Object.entries(food.nutrients).filter(([key]) => !ORDER.includes(key)));
  for (const key of ORDER) if (food.nutrients[key] !== undefined) known[key] = food.nutrients[key];
  food.nutrients = known;
  lines[index] = `  ${JSON.stringify(food)},`;
}

let text = lines.join("\n");
text = text.replace(/^\/\/ Common foods, per serving, from USDA FoodData Central \(SR Legacy, plus\n\/\/ FNDDS for mixed salad greens and cheese pizza\), fetched Oct 18, 2026\./m,
  "// Common foods, per serving, from USDA FoodData Central (SR Legacy, plus\n// FNDDS for mixed salad greens and cheese pizza), fetched Oct 18, 2026; vitamin D,\n// magnesium, sodium and cholesterol added Oct 25, 2026\n// (scripts/refresh-foods.mjs).");
fs.writeFileSync(FILE, crlf ? text.replace(/\n/g, "\r\n") : text);

console.log(`Updated ${foods.length} foods in ${FILE}.`);
for (const key of ORDER) console.log(`${key.padEnd(13)} unknown for ${missing[key].length} of ${foods.length}`);
