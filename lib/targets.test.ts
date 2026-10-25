import assert from "node:assert/strict";
import { test } from "node:test";
import type { Profile } from "./profile.ts";
import { computeTargets, energyRequirement, formatTarget, maintenanceCalories } from "./targets.ts";

const TODAY = "2026-10-18";
// Aged 30 and 40 on TODAY.
const man: Profile = { units: "metric", heightCm: 175, weightKg: 70, birthDate: "1996-01-01", sex: "male", activity: "moderate" };
const woman: Profile = { units: "metric", heightCm: 165, weightKg: 60, birthDate: "1986-05-05", sex: "female", activity: "sedentary" };

test("energy follows the National Academies 2023 equations", () => {
  // Men, active: 1004.82 − 10.83×30 + 6.52×175 + 15.91×70
  assert.ok(Math.abs(energyRequirement("male", man, TODAY) - 2934.62) < 0.01);
  // Women, inactive: 584.90 − 7.01×40 + 5.72×165 + 11.71×60
  assert.ok(Math.abs(energyRequirement("female", woman, TODAY) - 1950.9) < 0.01);
  assert.equal(maintenanceCalories(man, TODAY), 2930);
  assert.equal(maintenanceCalories(woman, TODAY), 1950);
});

test("an 18-year-old uses the 14–18 equation plus 20 kcal for growth", () => {
  // Girls, inactive: 55.59 − 22.25×18 + 8.43×165 + 17.07×60 + 20
  const teen = { ...woman, birthDate: "2008-01-01" };
  assert.ok(Math.abs(energyRequirement("female", teen, TODAY) - 2090.24) < 0.01);
});

test("calories are a range of 10% either side", () => {
  assert.deepEqual(computeTargets(man, TODAY).calories, { kind: "range", min: 2640, max: 3220 });
  assert.deepEqual(computeTargets(woman, TODAY).calories, { kind: "range", min: 1760, max: 2150 });
});

test("non-binary centers on the midpoint and spans both equations", () => {
  const nb = { ...man, sex: "nonbinary" as const };
  // Female active 2508.25, male 2934.62, midpoint 2721 → 2720.
  assert.equal(maintenanceCalories(nb, TODAY), 2720);
  assert.deepEqual(computeTargets(nb, TODAY).calories, { kind: "range", min: 2450, max: 2990 });
});

test("age comes from the birth date and updates on the birthday", () => {
  const born = { ...man, birthDate: "1996-10-19" }; // 29 until tomorrow
  assert.ok(Math.abs(energyRequirement("male", born, TODAY) - energyRequirement("male", man, TODAY) - 10.83) < 0.01);
});

test("protein is set per kg of body weight", () => {
  assert.deepEqual(computeTargets(man, TODAY).protein, { kind: "range", min: 56, max: 112 }); // 0.8–1.6 g/kg
  assert.equal(computeTargets({ ...man, activity: "very" }, TODAY).protein.max, 140); // 2.0 g/kg
  assert.equal(computeTargets({ ...man, birthDate: "1960-01-01" }, TODAY).protein.min, 84); // 66, active: 1.2 g/kg
  assert.equal(computeTargets({ ...man, birthDate: "1960-01-01", activity: "sedentary" }, TODAY).protein.min, 70); // 1.0
  assert.equal(computeTargets({ ...woman, birthDate: "2008-01-01" }, TODAY).protein.min, 51); // 18: 0.85 g/kg
});

test("carbs never drop below 130 g", () => {
  const small: Profile = { units: "metric", heightCm: 122, weightKg: 32, birthDate: "1926-01-01", sex: "female", activity: "sedentary" };
  assert.equal(computeTargets(small, TODAY).carbs.min, 130);
  assert.deepEqual(computeTargets(man, TODAY).carbs, { kind: "range", min: 330, max: 476 });
});

test("fat is 20–35% of calories, 25–35% at 18", () => {
  assert.deepEqual(computeTargets(man, TODAY).fat, { kind: "range", min: 65, max: 114 });
  const teen = computeTargets({ ...woman, birthDate: "2008-01-01" }, TODAY);
  assert.equal(teen.fat.min, Math.round((2090 * 0.25) / 9));
});

test("fiber scales with calories", () => {
  const t = computeTargets(man, TODAY);
  assert.deepEqual(t.fiber, { kind: "min", min: 41 }); // 2.93 × 14
});

test("vitamins and minerals use the DRI for sex and age, with upper limits", () => {
  const t = computeTargets(woman, TODAY);
  assert.deepEqual(t.iron, { kind: "min", min: 18, upper: 45 });
  assert.deepEqual(t.calcium, { kind: "min", min: 1000, upper: 2500 });
  assert.deepEqual(t.potassium, { kind: "min", min: 2600 });
  assert.deepEqual(t.vitaminA, { kind: "min", min: 700 });
  assert.deepEqual(t.vitaminC, { kind: "min", min: 75, upper: 2000 });

  const older = computeTargets({ ...woman, birthDate: "1971-01-01" }, TODAY); // 55
  assert.equal(older.iron.min, 8);
  assert.deepEqual(older.calcium, { kind: "min", min: 1200, upper: 2000 });
  assert.equal(computeTargets({ ...man, birthDate: "1955-01-01" }, TODAY).calcium.min, 1200); // 71
});

test("an 18-year-old gets the 14–18 values", () => {
  const teen = computeTargets({ ...woman, birthDate: "2008-01-01" }, TODAY);
  assert.equal(teen.iron.min, 15);
  assert.deepEqual(teen.calcium, { kind: "min", min: 1300, upper: 3000 });
  assert.equal(teen.potassium.min, 2300);
  assert.equal(teen.vitaminC.min, 65);
});

test("non-binary gets the higher of the female and male values", () => {
  const t = computeTargets({ ...man, sex: "nonbinary" }, TODAY);
  assert.equal(t.iron.min, 18);
  assert.equal(t.potassium.min, 3400);
  assert.equal(t.vitaminA.min, 900);
  assert.equal(t.vitaminC.min, 90);
});

test("targets read naturally", () => {
  const t = computeTargets(man, TODAY);
  assert.equal(formatTarget("calories", t.calories), "2,640–3,220 kcal");
  assert.equal(formatTarget("fiber", t.fiber), "at least 41 g");
});

test("pregnancy uses the 2023 pregnancy equation from the second trimester", () => {
  // Inactive: 1131.20 − 2.04×40 + 0.34×165 + 12.15×60 + 9.16×20 weeks + 200 (BMI 22) = 2217.9
  assert.equal(maintenanceCalories({ ...woman, lifeStage: "pregnant1" }, TODAY), 1950);
  assert.equal(maintenanceCalories({ ...woman, lifeStage: "pregnant2" }, TODAY), 2220);
  // Third trimester: 14 more weeks × 9.16 = 2346.1
  assert.equal(maintenanceCalories({ ...woman, lifeStage: "pregnant3" }, TODAY), 2350);
});

test("breastfeeding adds 540 − 140 kcal (0–6 months) or 380 (7–12 months)", () => {
  assert.equal(maintenanceCalories({ ...woman, lifeStage: "breastfeeding06" }, TODAY), 2350); // 1950.9 + 400
  assert.equal(maintenanceCalories({ ...woman, lifeStage: "breastfeeding712" }, TODAY), 2330); // 1950.9 + 380
});

test("pregnancy and breastfeeding raise protein, iron and vitamins", () => {
  const pregnant = computeTargets({ ...woman, lifeStage: "pregnant2" }, TODAY);
  assert.equal(pregnant.protein.min, 66); // 1.1 g/kg × 60
  assert.deepEqual([pregnant.iron.min, pregnant.vitaminA.min, pregnant.vitaminC.min, pregnant.potassium.min], [27, 770, 85, 2900]);
  const nursing = computeTargets({ ...woman, lifeStage: "breastfeeding06" }, TODAY);
  assert.equal(nursing.protein.min, 78); // 1.3 g/kg × 60
  assert.deepEqual([nursing.iron.min, nursing.vitaminA.min, nursing.vitaminC.min, nursing.potassium.min], [9, 1300, 120, 2800]);
});

test("a non-binary pregnancy uses the female equations and pregnancy values", () => {
  const nb = { ...woman, sex: "nonbinary" as const, lifeStage: "pregnant2" as const };
  assert.equal(maintenanceCalories(nb, TODAY), 2220);
  assert.equal(computeTargets(nb, TODAY).iron.min, 27);
});

test("a life stage saved on a male profile is ignored", () => {
  assert.equal(maintenanceCalories({ ...man, lifeStage: "pregnant2" }, TODAY), maintenanceCalories(man, TODAY));
});
