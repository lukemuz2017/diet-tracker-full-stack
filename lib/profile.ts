// The person's details from setup, stored in metric at full precision so
// switching units and editing round-trip exactly. Age is worked out from the
// birth date each day, so it stays right over time.

import { ageOn } from "./dates.ts";

export type Units = "us" | "metric";
export type Sex = "female" | "male" | "nonbinary";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type Allergen = "peanuts" | "treeNuts" | "dairy" | "eggs" | "gluten" | "soy" | "fish" | "shellfish" | "sesame";
export type Pattern = "everything" | "vegetarian" | "pescatarian" | "vegan";
export type LifeStage = "none" | "pregnant1" | "pregnant2" | "pregnant3" | "breastfeeding06" | "breastfeeding712";

export interface Profile {
  units: Units;
  heightCm: number;
  weightKg: number;
  /** "YYYY-MM-DD" */
  birthDate: string;
  sex: Sex;
  activity: Activity;
  // Diet notes, added later, so older saves don't have them (see dietOf).
  allergies?: Allergen[];
  pattern?: Pattern;
  /** Only for female and non-binary profiles. */
  lifeStage?: LifeStage;
}

// The nine major US food allergens (FDA), with celiac disease under gluten.
export const ALLERGEN_OPTIONS: { value: Allergen; label: string; contains: string }[] = [
  { value: "peanuts", label: "Peanuts", contains: "peanuts" },
  { value: "treeNuts", label: "Tree nuts", contains: "tree nuts" },
  { value: "dairy", label: "Dairy / lactose", contains: "dairy" },
  { value: "eggs", label: "Eggs", contains: "eggs" },
  { value: "gluten", label: "Gluten (celiac)", contains: "gluten" },
  { value: "soy", label: "Soy", contains: "soy" },
  { value: "fish", label: "Fish", contains: "fish" },
  { value: "shellfish", label: "Shellfish", contains: "shellfish" },
  { value: "sesame", label: "Sesame", contains: "sesame" },
];

export const PATTERN_OPTIONS: { value: Pattern; label: string }[] = [
  { value: "everything", label: "Everything" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegan", label: "Vegan" },
];

export const LIFE_STAGE_OPTIONS: { value: LifeStage; label: string; short: string }[] = [
  { value: "none", label: "No", short: "" },
  { value: "pregnant1", label: "Pregnant, first trimester", short: "Pregnant · 1st trimester" },
  { value: "pregnant2", label: "Pregnant, second trimester", short: "Pregnant · 2nd trimester" },
  { value: "pregnant3", label: "Pregnant, third trimester", short: "Pregnant · 3rd trimester" },
  { value: "breastfeeding06", label: "Breastfeeding, baby 0–6 months", short: "Breastfeeding · 0–6 months" },
  { value: "breastfeeding712", label: "Breastfeeding, baby 7–12 months", short: "Breastfeeding · 7–12 months" },
];

export interface Diet {
  allergies: Allergen[];
  pattern: Pattern;
  lifeStage: LifeStage;
}

/** A profile's diet notes with defaults, ignoring anything unrecognized (and life stage for male profiles). */
export function dietOf(profile: Profile): Diet {
  const allergies = Array.isArray(profile.allergies)
    ? profile.allergies.filter((item) => ALLERGEN_OPTIONS.some((option) => option.value === item))
    : [];
  const pattern = PATTERN_OPTIONS.some((option) => option.value === profile.pattern) ? profile.pattern! : "everything";
  const lifeStage =
    profile.sex !== "male" && LIFE_STAGE_OPTIONS.some((option) => option.value === profile.lifeStage) ? profile.lifeStage! : "none";
  return { allergies, pattern, lifeStage };
}

/** Whether the pregnancy and breastfeeding question applies. */
export function asksLifeStage(sex: Sex | null): boolean {
  return sex === "female" || sex === "nonbinary";
}

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "nonbinary", label: "Non-binary" },
];

// The National Academies' four activity levels (inactive, low active, active,
// very active), described with their example activities for adults.
export const ACTIVITY_OPTIONS: { value: Activity; label: string; description: string }[] = [
  { value: "sedentary", label: "Mostly sitting", description: "Daily routine and light chores, little exercise" },
  { value: "light", label: "Lightly active", description: "About an hour of walking most days, or similar" },
  { value: "moderate", label: "Active", description: "Walking plus regular exercise, like cycling or tennis" },
  { value: "very", label: "Very active", description: "Hard exercise or a physical job most days, like jogging" },
];

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

/** Rounds to at most one decimal and drops a trailing ".0". */
export function trimNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function profileAge(profile: Profile, today: string): number {
  return ageOn(profile.birthDate, today);
}

/** Checks a stored profile has the current shape (older saves lack birthDate). */
export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.heightCm === "number" &&
    typeof p.weightKg === "number" &&
    typeof p.birthDate === "string" &&
    SEX_OPTIONS.some((option) => option.value === p.sex) &&
    ACTIVITY_OPTIONS.some((option) => option.value === p.activity)
  );
}

/** "5 ft 10 in · 160 lb · 34 · male · moderately active" */
/** The profile as labeled facts, in the units the person chose. */
export function profileFacts(profile: Profile, today: string): { label: string; value: string }[] {
  const activity = ACTIVITY_OPTIONS.find((option) => option.value === profile.activity)!;
  const sex = SEX_OPTIONS.find((option) => option.value === profile.sex)!.label;
  const { feet, inches } = cmToFeetInches(profile.heightCm);
  return [
    { label: "Height", value: profile.units === "us" ? `${feet} ft ${inches} in` : `${Math.round(profile.heightCm)} cm` },
    { label: "Weight", value: profile.units === "us" ? `${Math.round(profile.weightKg / KG_PER_LB)} lb` : `${trimNumber(profile.weightKg)} kg` },
    { label: "Age", value: String(profileAge(profile, today)) },
    { label: "Sex", value: sex },
    { label: "Activity", value: activity.label },
  ];
}

export function describeProfile(profile: Profile, today: string): string {
  const activity = ACTIVITY_OPTIONS.find((option) => option.value === profile.activity)!;
  const sex = SEX_OPTIONS.find((option) => option.value === profile.sex)!.label.toLowerCase();
  const body =
    profile.units === "us"
      ? (() => {
          const { feet, inches } = cmToFeetInches(profile.heightCm);
          return `${feet} ft ${inches} in · ${Math.round(profile.weightKg / KG_PER_LB)} lb`;
        })()
      : `${Math.round(profile.heightCm)} cm · ${trimNumber(profile.weightKg)} kg`;
  return `${body} · ${profileAge(profile, today)} · ${sex} · ${activity.label.toLowerCase()}`;
}
