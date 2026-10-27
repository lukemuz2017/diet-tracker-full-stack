import assert from "node:assert/strict";
import { test } from "node:test";
import { portionsFrom, tidyLabel, tidyName } from "./usda.ts";

test("portion labels use US units", () => {
  assert.equal(tidyLabel("60 milliliter"), "2 fl oz");
  assert.equal(tidyLabel("100 ml"), "3.4 fl oz");
  assert.equal(tidyLabel("1 liter"), "33.8 fl oz");
  assert.equal(tidyLabel("1 cup (240 g)"), "1 cup (8.5 oz)");
  assert.equal(tidyLabel("2 kilograms"), "4.4 lb");
  assert.equal(tidyLabel("1 tablespoon"), "1 tbsp");
  assert.equal(tidyLabel("2 fluid ounces"), "2 fl oz");
});

test("labels that are already fine, and milligrams, are left alone", () => {
  assert.equal(tidyLabel("1 container (6 oz)"), "1 container (6 oz)");
  assert.equal(tidyLabel("1 cup"), "1 cup");
  assert.equal(tidyLabel("5 mg"), "5 mg");
  assert.equal(tidyLabel("1 large"), "1 large");
});

test("a portion from USDA comes through in US units", () => {
  const details = { foodPortions: [{ amount: 60, measureUnit: { name: "milliliter" }, gramWeight: 83 }] };
  assert.deepEqual(portionsFrom(details), [{ label: "2 fl oz", grams: 83 }]);
});

test("simple foods named kind-after-food read the natural way round", () => {
  assert.equal(tidyName("Syrup, maple, Canadian"), "Maple syrup, Canadian");
  assert.equal(tidyName("Milk, whole"), "Whole milk");
  assert.equal(tidyName("Cheese, cottage, lowfat, 2% milkfat"), "Cottage cheese, lowfat, 2% milkfat");
  assert.equal(tidyName("Rice, white, long-grain, cooked"), "White rice, long-grain, cooked");
  assert.equal(tidyName("Oil, olive, salad or cooking"), "Olive oil, salad or cooking");
});

test("other names are kept, with filler and shouting cleaned up", () => {
  assert.equal(tidyName("Chicken breast, NFS"), "Chicken breast");
  assert.equal(tidyName("BANANA, RAW"), "Banana, raw");
  assert.equal(tidyName("Beef, ground, 90% lean meat / 10% fat, raw"), "Beef, ground, 90% lean meat / 10% fat, raw");
  assert.equal(tidyName("Milk, reduced fat, fluid, 2% milkfat"), "Milk, reduced fat, fluid, 2% milkfat");
  assert.equal(tidyName("Nuts, almonds"), "Nuts, almonds");
  assert.equal(tidyName("Apple"), "Apple");
});
