import assert from "node:assert/strict";
import { test } from "node:test";
import type { Profile } from "./profile.ts";
import { changesBetween, dataFromRows, entryFromRow, entryToRow, hasChanges, profileFromRow, profileToRow } from "./rows.ts";
import type { Entry, SavedData } from "./storage.ts";

const EMPTY: SavedData = { version: 1, profile: null, entries: [], completeDays: [], recipes: [], savedFoods: [] };
const profile: Profile = { units: "us", heightCm: 175.26, weightKg: 70.3, birthDate: "1995-02-19", sex: "female", activity: "light" };
const egg: Entry = {
  id: "0b6f6a52-7a0e-4d2b-9a5f-1d2c3e4f5a6b",
  date: "2026-10-25",
  meal: "breakfast",
  name: "Egg",
  servings: 2,
  foodId: "egg",
  nutrients: { calories: 144, protein: 12.6 },
  createdAt: "2026-10-25T08:00:00.000Z",
};

test("a profile survives the trip to a row and back, with diet notes defaulted", () => {
  const row = profileToRow(profile);
  assert.equal(row.pattern, "everything");
  assert.deepEqual(row.allergies, []);
  assert.deepEqual(profileFromRow(row), { ...profile, allergies: [], pattern: "everything", lifeStage: "none" });
});

test("a broken profile row means setup runs again", () => {
  assert.equal(profileFromRow({ ...profileToRow(profile), sex: "other" as Profile["sex"] }), null);
});

test("entries keep their food: built-in ids get a prefix in the table", () => {
  const row = entryToRow(egg);
  assert.equal(row.source, "builtin:egg");
  assert.equal(row.amount, 2);
  assert.deepEqual(entryFromRow(row), egg);
  assert.equal(entryToRow({ ...egg, foodId: "recipe:abc" }).source, "recipe:abc");
  assert.equal(entryFromRow({ ...row, source: "usda:170914" }).foodId, "usda:170914");
});

test("sample entries are flagged in their own column", () => {
  assert.equal(entryToRow({ ...egg, sample: true }).is_sample, true);
  assert.equal(entryFromRow({ ...entryToRow(egg), is_sample: true }).sample, true);
});

test("nothing changed means nothing to write", () => {
  const data = { ...EMPTY, profile, entries: [egg] };
  assert.equal(hasChanges(changesBetween(data, { ...data })), false);
});

test("only the rows that changed are written", () => {
  const before = { ...EMPTY, profile, entries: [egg], completeDays: ["2026-10-24"] };
  const toast = { ...egg, id: "11111111-1111-4111-8111-111111111111", name: "Toast" };
  const after = { ...before, entries: [{ ...egg, servings: 3 }, toast], completeDays: ["2026-10-25"] };
  const changes = changesBetween(before, after);
  assert.equal(changes.profile, null);
  assert.deepEqual(changes.entries.upsert.map((row) => [row.name, row.amount]), [["Egg", 3], ["Toast", 2]]);
  assert.deepEqual(changes.entries.delete, []);
  assert.deepEqual(changes.days, { add: ["2026-10-25"], remove: ["2026-10-24"] });
});

test("removed entries and a cleared profile are deleted", () => {
  const changes = changesBetween({ ...EMPTY, profile, entries: [egg] }, EMPTY);
  assert.equal(changes.profile, "delete");
  assert.deepEqual(changes.entries.delete, [egg.id]);
});

test("rows from the database become saved data", () => {
  const data = dataFromRows({ profile: profileToRow(profile), entries: [entryToRow(egg)], days: [{ date: "2026-10-25" }], foods: [] });
  assert.equal(data.profile?.sex, "female");
  assert.deepEqual(data.entries, [egg]);
  assert.deepEqual(data.completeDays, ["2026-10-25"]);
});

test("saved USDA foods and recipes share my_foods, and split again on load", () => {
  const yogurt = { id: "22222222-2222-4222-8222-222222222222", fdcId: 170914, name: "Yogurt, Greek", per100g: { calories: 82 }, createdAt: "2026-10-25T09:00:00.000Z" };
  const changes = changesBetween(EMPTY, { ...EMPTY, savedFoods: [yogurt] });
  assert.deepEqual(changes.foods.upsert, [
    { id: yogurt.id, kind: "usda", name: "Yogurt, Greek", fdc_id: 170914, nutrients: { calories: 82 }, servings: null, ingredients: null, created_at: yogurt.createdAt },
  ]);
  const data = dataFromRows({ profile: null, entries: [], days: [], foods: changes.foods.upsert });
  assert.deepEqual(data.savedFoods, [yogurt]);
  assert.deepEqual(data.recipes, []);
});
