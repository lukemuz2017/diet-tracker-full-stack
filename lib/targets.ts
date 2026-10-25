// Daily targets for maintaining weight. Every rule and number comes from
// research/nutrition-targets.md, which cites its sources. Pure functions,
// checked by lib/targets.test.ts.

import { NUTRIENTS, type NutrientKey } from "./nutrients.ts";
import { ACTIVITY_OPTIONS, dietOf, profileAge, type Activity, type LifeStage, type Profile } from "./profile.ts";

export type TargetKind = "range" | "min" | "max";

export interface Target {
  kind: TargetKind;
  /** Lower bound for "range" and "min". */
  min?: number;
  /** Upper bound for "range" and "max". */
  max?: number;
  /** Tolerable Upper Intake Level, for "min" targets that have one. */
  upper?: number;
}

export type Targets = Record<NutrientKey, Target>;

// Dietary Reference Intake life-stage groups. An 18-year-old falls in 14–18.
type AgeBand = "14-18" | "19-30" | "31-50" | "51-70" | "71+";

export function ageBand(age: number): AgeBand {
  if (age <= 18) return "14-18";
  if (age <= 30) return "19-30";
  if (age <= 50) return "31-50";
  if (age <= 70) return "51-70";
  return "71+";
}

// National Academies 2023 estimated energy requirement (EER) equations:
// constant + a × age + h × height (cm) + w × weight (kg). The four activity
// levels are the report's inactive, low active, active and very active.
type Coefficients = [constant: number, age: number, height: number, weight: number];
type EquationSet = Record<"male" | "female", Record<Activity, Coefficients>>;

const ADULT_EER: EquationSet = {
  male: {
    sedentary: [753.07, -10.83, 6.5, 14.1],
    light: [581.47, -10.83, 8.3, 14.94],
    moderate: [1004.82, -10.83, 6.52, 15.91],
    very: [-517.88, -10.83, 15.61, 19.11],
  },
  female: {
    sedentary: [584.9, -7.01, 5.72, 11.71],
    light: [575.77, -7.01, 6.6, 12.14],
    moderate: [710.25, -7.01, 6.54, 12.34],
    very: [511.83, -7.01, 9.07, 12.56],
  },
};

// Ages 14 to 18, plus 20 kcal/day for growth.
const TEEN_EER: EquationSet = {
  male: {
    sedentary: [-447.51, 3.68, 13.01, 13.15],
    light: [19.12, 3.68, 8.62, 20.28],
    moderate: [-388.19, 3.68, 12.66, 20.46],
    very: [-671.75, 3.68, 15.38, 23.25],
  },
  female: {
    sedentary: [55.59, -22.25, 8.43, 17.07],
    light: [-297.54, -22.25, 12.77, 14.73],
    moderate: [-189.55, -22.25, 11.74, 18.34],
    very: [-709.59, -22.25, 18.22, 14.25],
  },
};
const TEEN_GROWTH_KCAL = 20;

// Pregnancy, second and third trimesters, any age (National Academies 2023,
// as published by Health Canada): the equation adds 9.16 kcal per week of
// gestation and a constant set by BMI before pregnancy. The first trimester
// uses the non-pregnant equation.
const PREGNANCY_EER: Record<Activity, Coefficients> = {
  sedentary: [1131.2, -2.04, 0.34, 12.15],
  light: [693.35, -2.04, 5.73, 10.2],
  moderate: [-223.84, -2.04, 13.23, 8.15],
  very: [-779.72, -2.04, 18.45, 8.73],
};
const KCAL_PER_GESTATION_WEEK = 9.16;
/** The middle week of each trimester (second: weeks 14–27, third: 28–40), since setup asks for the trimester. */
const TRIMESTER_WEEK: Partial<Record<LifeStage, number>> = { pregnant2: 20, pregnant3: 34 };

/** The pregnancy equation's BMI constant. Current BMI stands in for pre-pregnancy BMI. */
function pregnancyBmiKcal(profile: Profile): number {
  const bmi = profile.weightKg / (profile.heightCm / 100) ** 2;
  if (bmi < 18.5) return 300;
  if (bmi < 25) return 200;
  if (bmi < 30) return 150;
  return -50;
}

/** Breastfeeding adds milk energy: 540 kcal less 140 drawn from body stores at 0–6 months, 380 at 7–12. */
const LACTATION_KCAL: Partial<Record<LifeStage, number>> = { breastfeeding06: 540 - 140, breastfeeding712: 380 };

const isPregnant = (stage: LifeStage) => stage.startsWith("pregnant");
const isBreastfeeding = (stage: LifeStage) => stage.startsWith("breastfeeding");

/** Estimated energy requirement for one sex's equation, in kcal/day. */
export function energyRequirement(sex: "male" | "female", profile: Profile, today: string): number {
  const age = profileAge(profile, today);
  const teen = age <= 18;
  const [constant, a, h, w] = (teen ? TEEN_EER : ADULT_EER)[sex][profile.activity];
  return constant + a * age + h * profile.heightCm + w * profile.weightKg + (teen ? TEEN_GROWTH_KCAL : 0);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Energy for pregnancy or breastfeeding, which always uses the female equations. */
function lifeStageEnergy(profile: Profile, today: string, stage: LifeStage): number {
  const age = profileAge(profile, today);
  const week = TRIMESTER_WEEK[stage];
  if (week !== undefined) {
    const [constant, a, h, w] = PREGNANCY_EER[profile.activity];
    return constant + a * age + h * profile.heightCm + w * profile.weightKg + KCAL_PER_GESTATION_WEEK * week + pregnancyBmiKcal(profile);
  }
  const base = energyRequirement("female", profile, today);
  const extra = LACTATION_KCAL[stage];
  // The breastfeeding equations for ages under 19 leave out the growth allowance.
  return extra === undefined ? base : base - (age <= 18 ? TEEN_GROWTH_KCAL : 0) + extra;
}

/**
 * Estimated calories to maintain current weight, rounded to 10 kcal.
 * Non-binary uses the midpoint of the female and male equations; pregnancy
 * and breastfeeding use the female ones.
 */
export function maintenanceCalories(profile: Profile, today: string): number {
  const { lifeStage } = dietOf(profile);
  if (lifeStage !== "none") return roundTo(lifeStageEnergy(profile, today, lifeStage), 10);
  if (profile.sex !== "nonbinary") return roundTo(energyRequirement(profile.sex, profile, today), 10);
  return roundTo((energyRequirement("female", profile, today) + energyRequirement("male", profile, today)) / 2, 10);
}

type ByBand = Record<AgeBand, number>;
const band = (teen: number, young: number, mid: number, older: number, oldest: number): ByBand => ({
  "14-18": teen,
  "19-30": young,
  "31-50": mid,
  "51-70": older,
  "71+": oldest,
});

// RDA, or AI where there is no RDA (potassium), per day.
const MICRONUTRIENTS: Record<"potassium" | "calcium" | "iron" | "vitaminA" | "vitaminC", { male: ByBand; female: ByBand }> = {
  potassium: { male: band(3000, 3400, 3400, 3400, 3400), female: band(2300, 2600, 2600, 2600, 2600) },
  calcium: { male: band(1300, 1000, 1000, 1000, 1200), female: band(1300, 1000, 1000, 1200, 1200) },
  iron: { male: band(11, 8, 8, 8, 8), female: band(15, 18, 18, 8, 8) },
  vitaminA: { male: band(900, 900, 900, 900, 900), female: band(700, 700, 700, 700, 700) },
  vitaminC: { male: band(75, 90, 90, 90, 90), female: band(65, 75, 75, 75, 75) },
};

// Tolerable Upper Intake Levels (food plus supplements). Vitamin A's applies
// only to preformed vitamin A, which the food data doesn't separate, so it
// isn't flagged.
const UPPER_LIMITS: Partial<Record<NutrientKey, ByBand>> = {
  calcium: band(3000, 2500, 2500, 2000, 2000),
  iron: band(45, 45, 45, 45, 45),
  vitaminC: band(1800, 2000, 2000, 2000, 2000),
};

// Pregnancy and breastfeeding RDAs (AI for potassium) as [ages 14–18, 19 and over].
const LIFE_STAGE_MICRONUTRIENTS: Record<"pregnant" | "breastfeeding", Record<keyof typeof MICRONUTRIENTS, [number, number]>> = {
  pregnant: { potassium: [2600, 2900], calcium: [1300, 1000], iron: [27, 27], vitaminA: [750, 770], vitaminC: [80, 85] },
  breastfeeding: { potassium: [2500, 2800], calcium: [1300, 1000], iron: [10, 9], vitaminA: [1200, 1300], vitaminC: [115, 120] },
};

/**
 * A micronutrient target. Non-binary takes the higher of the two, so needs
 * are covered; pregnancy and breastfeeding have their own values.
 */
function micronutrient(key: keyof typeof MICRONUTRIENTS, profile: Profile, age: number): Target {
  const values = MICRONUTRIENTS[key];
  const group = ageBand(age);
  const { lifeStage } = dietOf(profile);
  const stage = isPregnant(lifeStage) ? "pregnant" : isBreastfeeding(lifeStage) ? "breastfeeding" : null;
  const min = stage
    ? LIFE_STAGE_MICRONUTRIENTS[stage][key][age <= 18 ? 0 : 1]
    : profile.sex === "male"
      ? values.male[group]
      : profile.sex === "female"
        ? values.female[group]
        : Math.max(values.male[group], values.female[group]);
  const upper = UPPER_LIMITS[key]?.[group];
  return upper ? { kind: "min", min, upper } : { kind: "min", min };
}

/**
 * Protein in grams per kg of body weight: RDA floor (higher after 65, in
 * pregnancy and while breastfeeding), DGA/ACSM ceiling.
 */
export function proteinPerKg(profile: Profile, age: number): { min: number; max: number } {
  const active = profile.activity === "moderate" || profile.activity === "very";
  const { lifeStage } = dietOf(profile);
  const usual = age <= 18 ? 0.85 : age >= 65 ? (active ? 1.2 : 1.0) : 0.8;
  const min = isPregnant(lifeStage) ? Math.max(usual, 1.1) : isBreastfeeding(lifeStage) ? Math.max(usual, 1.3) : usual;
  const max = profile.activity === "very" ? 2.0 : 1.6;
  return { min, max };
}

export function computeTargets(profile: Profile, today: string): Targets {
  const kcal = maintenanceCalories(profile, today);
  const age = profileAge(profile, today);
  const teen = age <= 18;
  const perKg = proteinPerKg(profile, age);
  const proteinMin = Math.round(perKg.min * profile.weightKg);
  // Never above the AMDR ceiling: 35% of calories (30% at 14–18).
  const proteinMax = Math.max(
    proteinMin,
    Math.round(Math.min(perKg.max * profile.weightKg, (kcal * (teen ? 0.3 : 0.35)) / 4)),
  );

  let calories: Target = { kind: "range", min: roundTo(kcal * 0.9, 10), max: roundTo(kcal * 1.1, 10) };
  if (profile.sex === "nonbinary" && dietOf(profile).lifeStage === "none") {
    // A range spanning the female and male estimates, at least 10% either side.
    const female = energyRequirement("female", profile, today);
    const male = energyRequirement("male", profile, today);
    calories = {
      kind: "range",
      min: roundTo(Math.min(female, male, kcal * 0.9), 10),
      max: roundTo(Math.max(female, male, kcal * 1.1), 10),
    };
  }

  return {
    calories,
    protein: { kind: "range", min: proteinMin, max: proteinMax },
    carbs: { kind: "range", min: Math.max(Math.round((kcal * 0.45) / 4), 130), max: Math.round((kcal * 0.65) / 4) },
    fat: { kind: "range", min: Math.round((kcal * (teen ? 0.25 : 0.2)) / 9), max: Math.round((kcal * 0.35) / 9) },
    fiber: { kind: "min", min: Math.round((kcal / 1000) * 14) },
    potassium: micronutrient("potassium", profile, age),
    calcium: micronutrient("calcium", profile, age),
    iron: micronutrient("iron", profile, age),
    vitaminA: micronutrient("vitaminA", profile, age),
    vitaminC: micronutrient("vitaminC", profile, age),
  };
}

export function formatAmount(value: number): string {
  return value.toLocaleString("en-US");
}

/** "2,110–2,580 kcal", "at least 33 g", "under 2,300 mg" */
export function formatTarget(key: NutrientKey, target: Target): string {
  const unit = NUTRIENTS[key].unit;
  if (target.kind === "range") return `${formatAmount(target.min!)}–${formatAmount(target.max!)} ${unit}`;
  if (target.kind === "min") return `at least ${formatAmount(target.min!)} ${unit}`;
  return `under ${formatAmount(target.max!)} ${unit}`;
}

function groupName(profile: Profile, age: number): string {
  const { lifeStage } = dietOf(profile);
  if (lifeStage !== "none") {
    const who = isPregnant(lifeStage) ? "pregnancy" : "breastfeeding";
    return `${who}, ages ${age <= 18 ? "14–18" : "19 and over"}`;
  }
  const who = profile.sex === "male" ? "men" : profile.sex === "female" ? "women" : "adults";
  const group = ageBand(age);
  return group === "14-18" ? `${who} 18 and under` : group === "71+" ? `${who} 71 and over` : `${who} ${group}`;
}

/** The ⓘ explanation for one range, using the person's own numbers. */
export function explainTarget(key: NutrientKey, profile: Profile, targets: Targets, today: string): string {
  const kcal = maintenanceCalories(profile, today);
  const age = profileAge(profile, today);
  const activity = ACTIVITY_OPTIONS.find((option) => option.value === profile.activity)!.label.toLowerCase();
  const kcalText = `${formatAmount(kcal)} kcal`;
  const target = targets[key];
  const unit = NUTRIENTS[key].unit;

  switch (key) {
    case "calories": {
      const { lifeStage } = dietOf(profile);
      if (lifeStage === "pregnant1") {
        return `Your estimate is ${kcalText}. In the first trimester the National Academies’ 2023 equations use the usual female equation (${activity}), as needs barely change yet. The range allows about 10% either side.`;
      }
      if (isPregnant(lifeStage)) {
        return `Your estimate is ${kcalText}, from the National Academies’ 2023 pregnancy equation (${activity}), taken at the middle of your trimester and adjusted for your BMI. Your doctor or midwife may suggest a different amount based on your weight gain.`;
      }
      if (isBreastfeeding(lifeStage)) {
        const extra = LACTATION_KCAL[lifeStage]!;
        return `Your estimate is ${kcalText}: the usual female equation (${activity}) plus ${extra} kcal for making milk, per the National Academies’ 2023 equations. The range allows about 10% either side.`;
      }
      const who = profile.sex === "nonbinary" ? "the female and male equations, averaged" : `the ${profile.sex} equation`;
      return `Your maintenance estimate is ${kcalText}, from the National Academies’ 2023 energy equations (${who}, ${activity}, using your age, height and weight). These estimates are usually within about 10%, so the range allows for that. The real test is that your weight stays steady.`;
    }
    case "protein": {
      const perKg = proteinPerKg(profile, age);
      const { lifeStage } = dietOf(profile);
      const older = isPregnant(lifeStage)
        ? ", the RDA in pregnancy"
        : isBreastfeeding(lifeStage)
          ? ", the RDA while breastfeeding"
          : age >= 65
            ? ", the higher amount suggested for adults over 65"
            : "";
      return `At least ${perKg.min} g per kg of body weight (${target.min} g for you)${older}, up to ${perKg.max} g per kg (${target.max} g). The 2025–2030 Dietary Guidelines suggest aiming for 1.2–1.6 g per kg.`;
    }
    case "carbs":
      return `45–65% of your ${kcalText}, at 4 kcal per gram, and at least 130 g, the daily minimum the brain needs.`;
    case "fat":
      return `${age <= 18 ? "25" : "20"}–35% of your ${kcalText}, at 9 kcal per gram.`;
    case "fiber":
      return `14 g for every 1,000 kcal you eat (the National Academies’ Adequate Intake), so ${target.min} g at ${kcalText}.`;
    default: {
      const basis = key === "potassium" ? "Adequate Intake" : "Recommended Dietary Allowance";
      const nonbinary =
        profile.sex === "nonbinary" && dietOf(profile).lifeStage === "none"
          ? ", using the higher of the female and male values so your needs are covered"
          : "";
      const upper = target.upper
        ? ` More than ${formatAmount(target.upper)} ${unit} a day, usually from supplements, is above the safe upper limit.`
        : "";
      const kidney = key === "potassium" ? " If you have kidney disease, ask your doctor, as this may not apply." : "";
      return `The ${basis} for ${groupName(profile, age)}${nonbinary}.${upper}${kidney}`;
    }
  }
}
