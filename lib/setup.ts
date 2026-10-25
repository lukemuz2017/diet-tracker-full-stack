// Validation for the setup form. Messages sit next to the field and say what
// to do next (AGENTS.md: Forms). Checked by lib/setup.test.ts.

import { ageOn, isRealDate } from "./dates.ts";
import {
  CM_PER_INCH,
  KG_PER_LB,
  asksLifeStage,
  cmToFeetInches,
  dietOf,
  trimNumber,
  type Activity,
  type Allergen,
  type LifeStage,
  type Pattern,
  type Profile,
  type Sex,
  type Units,
} from "./profile.ts";

/** What the person typed, kept as strings so an error never changes it. */
export interface SetupValues {
  units: Units;
  heightFt: string;
  heightIn: string;
  heightCm: string;
  weight: string;
  /** Typed as month/day/year, e.g. "02/19/1995" (or picked from the calendar). */
  birthDate: string;
  sex: Sex | null;
  activity: Activity | null;
  // Diet notes: optional, so they have defaults and no errors.
  allergies: Allergen[];
  pattern: Pattern;
  lifeStage: LifeStage;
}

export type SetupField = "height" | "weight" | "birthDate" | "sex" | "activity";
export type SetupErrors = Partial<Record<SetupField, string>>;

export const LIMITS = {
  heightCm: { min: 122, max: 229 },
  heightIn: { min: 48, max: 90 },
  weightKg: { min: 32, max: 318 },
  weightLb: { min: 70, max: 700 },
  age: { min: 18, max: 100 },
};

export const EMPTY_SETUP: SetupValues = {
  units: "us",
  heightFt: "",
  heightIn: "",
  heightCm: "",
  weight: "",
  birthDate: "",
  sex: null,
  activity: null,
  allergies: [],
  pattern: "everything",
  lifeStage: "none",
};

const DATE_EXAMPLE = "like 02/19/1995";

/**
 * Formats what's typed in the date of birth box. Digits alone get their
 * slashes filled in (02191995 → 02/19/1995), since a phone's number pad has
 * no "/"; text with a one-digit month or day ("2/19/1995") is kept as typed.
 */
export function formatBirthInput(raw: string): string {
  const kept = raw.replace(/[^\d/]/g, "").slice(0, 10);
  if (/(^|\/)\d\//.test(kept)) return kept;
  const digits = kept.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "YYYY-MM-DD" as the box shows it: "MM/DD/YYYY". */
export function birthInputFrom(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

/** Reads month, day and year into "YYYY-MM-DD", checking the age is 18–100 on `today`. */
function readBirthDate(values: SetupValues, today: string): { date?: string; error?: string } {
  const text = values.birthDate.trim();
  if (text === "") return { error: `Enter your date of birth, ${DATE_EXAMPLE}.` };
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d+)$/.exec(text);
  if (!parts) return { error: `Enter your date of birth as month/day/year, ${DATE_EXAMPLE}.` };
  const [month, day, year] = parts.slice(1).map(Number);
  if (parts[3].length !== 4) return { error: "Enter the year with four digits, like 1995." };
  if (month < 1 || month > 12) return { error: "Enter a month between 1 and 12." };
  if (!isRealDate(year, month, day)) return { error: `Enter a real date, ${DATE_EXAMPLE}.` };

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (date > today) return { error: "Enter a date of birth in the past." };
  const age = ageOn(date, today);
  if (age < LIMITS.age.min) return { error: "These targets are for adults 18 and over. Check the year you entered." };
  if (age > LIMITS.age.max) return { error: "These targets cover ages 18 to 100. Check the year you entered." };
  return { date };
}

function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

function readHeightCm(values: SetupValues): { cm?: number; error?: string } {
  if (values.units === "metric") {
    const cm = parseNumber(values.heightCm);
    if (cm === null) return { error: "Enter your height in centimeters, like 178." };
    if (cm < LIMITS.heightCm.min || cm > LIMITS.heightCm.max) {
      return { error: `Enter a height between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.` };
    }
    return { cm };
  }

  const feet = parseNumber(values.heightFt);
  const inches = values.heightIn.trim() === "" ? 0 : parseNumber(values.heightIn);
  if (feet === null || inches === null) return { error: "Enter your height in feet and inches, like 5 ft 10 in." };
  if (inches >= 12) return { error: "Inches should be between 0 and 11." };
  const totalInches = feet * 12 + inches;
  if (totalInches < LIMITS.heightIn.min || totalInches > LIMITS.heightIn.max) {
    return { error: "Enter a height between 4 ft and 7 ft 6 in." };
  }
  return { cm: totalInches * CM_PER_INCH };
}

function readWeightKg(values: SetupValues): { kg?: number; error?: string } {
  const value = parseNumber(values.weight);
  if (values.units === "metric") {
    if (value === null) return { error: "Enter your weight in kilograms, like 72." };
    if (value < LIMITS.weightKg.min || value > LIMITS.weightKg.max) {
      return { error: `Enter a weight between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.` };
    }
    return { kg: value };
  }
  if (value === null) return { error: "Enter your weight in pounds, like 160." };
  if (value < LIMITS.weightLb.min || value > LIMITS.weightLb.max) {
    return { error: `Enter a weight between ${LIMITS.weightLb.min} and ${LIMITS.weightLb.max} lb.` };
  }
  return { kg: value * KG_PER_LB };
}

/** `today` is the local date, "YYYY-MM-DD", used to check the age. */
export function validateSetup(values: SetupValues, today: string): { profile: Profile | null; errors: SetupErrors } {
  const errors: SetupErrors = {};
  const height = readHeightCm(values);
  const weight = readWeightKg(values);
  const birth = readBirthDate(values, today);

  if (height.error) errors.height = height.error;
  if (weight.error) errors.weight = weight.error;
  if (birth.error) errors.birthDate = birth.error;
  if (!values.sex) errors.sex = "Choose one so we can estimate your needs.";
  if (!values.activity) errors.activity = "Choose the option closest to a typical week.";

  if (Object.keys(errors).length > 0) return { profile: null, errors };
  return {
    profile: {
      units: values.units,
      heightCm: height.cm!,
      weightKg: weight.kg!,
      birthDate: birth.date!,
      sex: values.sex!,
      activity: values.activity!,
      allergies: values.allergies,
      pattern: values.pattern,
      // Only asked for female and non-binary; a hidden answer isn't kept.
      lifeStage: asksLifeStage(values.sex) ? values.lifeStage : "none",
    },
    errors,
  };
}

/** Prefills the form from a saved profile, for editing. */
export function valuesFromProfile(profile: Profile): SetupValues {
  const { feet, inches } = cmToFeetInches(profile.heightCm);
  return {
    units: profile.units,
    heightFt: String(feet),
    heightIn: String(inches),
    heightCm: trimNumber(profile.heightCm),
    weight: profile.units === "us" ? trimNumber(profile.weightKg / KG_PER_LB) : trimNumber(profile.weightKg),
    birthDate: birthInputFrom(profile.birthDate),
    sex: profile.sex,
    activity: profile.activity,
    ...dietOf(profile),
  };
}

/** Switches units, converting whatever height and weight can be read. */
export function switchUnits(values: SetupValues, units: Units): SetupValues {
  if (units === values.units) return values;
  const height = readHeightCm(values);
  const weight = parseNumber(values.weight);
  const next: SetupValues = { ...values, units };

  if (height.cm !== undefined) {
    const { feet, inches } = cmToFeetInches(height.cm);
    next.heightFt = String(feet);
    next.heightIn = String(inches);
    next.heightCm = String(Math.round(height.cm));
  }
  if (weight !== null) {
    next.weight = units === "metric" ? trimNumber(weight * KG_PER_LB) : String(Math.round(weight / KG_PER_LB));
  }
  return next;
}
