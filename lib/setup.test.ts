import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_SETUP, formatBirthInput, switchUnits, validateSetup, valuesFromProfile, type SetupValues } from "./setup.ts";

const TODAY = "2026-10-18";

const filled: SetupValues = {
  units: "us",
  heightFt: "5",
  heightIn: "10",
  heightCm: "",
  weight: "160",
  birthDate: "03/14/1992",
  sex: "male",
  activity: "moderate",
  allergies: [],
  pattern: "everything",
  lifeStage: "none",
};

const birthError = (month: string, day: string, year: string) =>
  validateSetup({ ...filled, birthDate: month || day || year ? `${month}/${day}/${year}` : "" }, TODAY).errors.birthDate;

test("an empty form gets a message for every field", () => {
  const { profile, errors } = validateSetup(EMPTY_SETUP, TODAY);
  assert.equal(profile, null);
  assert.deepEqual(Object.keys(errors).sort(), ["activity", "birthDate", "height", "sex", "weight"]);
});

test("a filled form becomes a metric profile", () => {
  const { profile, errors } = validateSetup(filled, TODAY);
  assert.deepEqual(errors, {});
  assert.ok(profile);
  assert.equal(profile.heightCm, 70 * 2.54);
  assert.ok(Math.abs(profile.weightKg - 72.57) < 0.01);
  assert.equal(profile.birthDate, "1992-03-14");
});

test("messages say what to do next", () => {
  assert.equal(validateSetup({ ...filled, weight: "about 160" }, TODAY).errors.weight, "Enter your weight in pounds, like 160.");
  assert.equal(validateSetup({ ...filled, heightIn: "13" }, TODAY).errors.height, "Inches should be between 0 and 11.");
  assert.equal(validateSetup({ ...filled, heightFt: "8" }, TODAY).errors.height, "Enter a height between 4 ft and 7 ft 6 in.");
});

test("height limits include exactly 4 ft and 7 ft 6 in", () => {
  assert.equal(validateSetup({ ...filled, heightFt: "4", heightIn: "" }, TODAY).errors.height, undefined);
  assert.equal(validateSetup({ ...filled, heightFt: "7", heightIn: "6" }, TODAY).errors.height, undefined);
  assert.ok(validateSetup({ ...filled, heightFt: "7", heightIn: "7" }, TODAY).errors.height);
});

test("date of birth must be a real date in the past", () => {
  assert.equal(birthError("", "", ""), "Enter your date of birth, like 02/19/1995.");
  assert.equal(birthError("02", "30", "1990"), "Enter a real date, like 02/19/1995.");
  assert.equal(birthError("13", "01", "1990"), "Enter a month between 1 and 12.");
  assert.equal(birthError("03", "14", "92"), "Enter the year with four digits, like 1995.");
  assert.equal(birthError("03", "14", "2030"), "Enter a date of birth in the past.");
  assert.match(birthError("March", "14", "1992")!, /month\/day\/year/);
});

test("ages 18 to 100 are accepted, counted to the day", () => {
  assert.equal(birthError("10", "18", "2008"), undefined); // 18 today
  assert.match(birthError("10", "19", "2008")!, /adults 18 and over/); // 18 tomorrow
  assert.equal(birthError("10", "19", "1925"), undefined); // 100 until tomorrow
  assert.match(birthError("10", "18", "1925")!, /ages 18 to 100/); // 101 today
});

test("switching units converts what was typed", () => {
  const metric = switchUnits(filled, "metric");
  assert.equal(metric.heightCm, "178");
  assert.equal(metric.weight, "72.6");
  const back = switchUnits(metric, "us");
  assert.equal(back.heightFt, "5");
  assert.equal(back.heightIn, "10");
  assert.equal(back.weight, "160");
});

test("editing round-trips a saved profile", () => {
  const { profile } = validateSetup(filled, TODAY);
  const values = valuesFromProfile(profile!);
  assert.equal(values.heightFt, "5");
  assert.equal(values.heightIn, "10");
  assert.equal(values.weight, "160");
  assert.equal(values.birthDate, "03/14/1992");
});

test("diet notes are saved, and pregnancy is dropped for a male profile", () => {
  const female = validateSetup({ ...filled, sex: "female", allergies: ["gluten"], pattern: "vegan", lifeStage: "pregnant2" }, TODAY).profile!;
  assert.deepEqual([female.allergies, female.pattern, female.lifeStage], [["gluten"], "vegan", "pregnant2"]);
  const male = validateSetup({ ...filled, lifeStage: "pregnant2" }, TODAY).profile!;
  assert.equal(male.lifeStage, "none");
});

test("an older profile without diet notes edits with the defaults", () => {
  const old = validateSetup(filled, TODAY).profile!;
  delete old.allergies;
  delete old.pattern;
  delete old.lifeStage;
  const values = valuesFromProfile(old);
  assert.deepEqual([values.allergies, values.pattern, values.lifeStage], [[], "everything", "none"]);
});

test("typing a date of birth fills in the slashes", () => {
  assert.equal(formatBirthInput("02191995"), "02/19/1995");
  assert.equal(formatBirthInput("021"), "02/1");
  assert.equal(formatBirthInput("02/"), "02");
  assert.equal(formatBirthInput("02/19/1995"), "02/19/1995");
  assert.equal(formatBirthInput("2/19/1995"), "2/19/1995");
  assert.equal(formatBirthInput("02-19-1995x"), "02/19/1995");
  assert.equal(validateSetup({ ...filled, birthDate: "2/9/1995" }, TODAY).errors.birthDate, undefined);
});
