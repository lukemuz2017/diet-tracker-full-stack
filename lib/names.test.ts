import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanName, initialsOf, validateName } from "./names.ts";

test("initials come from the first and last name", () => {
  assert.equal(initialsOf("Luke", "Muzikowski", "muzikowski@gmail.com"), "LM");
  assert.equal(initialsOf(" ana ", "de la cruz"), "AD");
});

test("without a name, initials come from the email handle", () => {
  assert.equal(initialsOf(null, null, "muzikowski@gmail.com"), "MU");
  assert.equal(initialsOf(null, null, "luke.muz@uchicago.edu"), "LM");
  assert.equal(initialsOf(undefined, undefined, undefined), "?");
});

test("both names are required, with errors that say what to do", () => {
  assert.deepEqual(validateName("", "  "), { firstName: "Enter your first name.", lastName: "Enter your last name." });
  assert.deepEqual(validateName("Luke", "Muzikowski"), {});
  assert.match(validateName("x".repeat(51), "M").firstName!, /50 characters/);
});

test("names are trimmed and their spaces tidied", () => {
  assert.equal(cleanName("  Mary   Ann "), "Mary Ann");
});
