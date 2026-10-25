"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { MAIN_NUTRIENTS, MORE_NUTRIENTS, emptyCustomFood, validateCustomFood, type CustomFoodValues } from "@/lib/log";
import { NUTRIENTS, type NutrientKey, type Nutrients } from "@/lib/nutrients";

const UNIT_NAMES = { kcal: "kilocalories", g: "grams", mg: "milligrams", mcg: "micrograms" } as const;

// A food that isn't in the list. Only the name and calories are required;
// anything left blank counts as unknown, not zero.
export function CustomFoodForm({
  initialName = "",
  date,
  today,
  onAdd,
}: {
  initialName?: string;
  date: string;
  today: string;
  onAdd: (name: string, nutrients: Nutrients) => void;
}) {
  const [values, setValues] = useState<CustomFoodValues>(() => ({ ...emptyCustomFood(date), name: initialName }));
  const [submitted, setSubmitted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const current = { ...values, date };
  const { errors } = validateCustomFood(current, today);
  const shown = submitted ? errors : {};

  const setAmount = (key: NutrientKey, text: string) =>
    setValues((v) => ({ ...v, amounts: { ...v.amounts, [key]: text } }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const result = validateCustomFood(current, today);
    if (!result.nutrients) {
      const order = ["name", ...MAIN_NUTRIENTS, ...MORE_NUTRIENTS] as const;
      const first = order.find((field) => result.errors[field]);
      if (first && MORE_NUTRIENTS.includes(first as NutrientKey)) setMoreOpen(true);
      // Wait a frame so a just-opened "More nutrients" section can take focus.
      requestAnimationFrame(() => document.getElementById(`custom-${first}`)?.focus());
      return;
    }
    onAdd(current.name.trim(), result.nutrients);
    setValues(emptyCustomFood(date));
    setSubmitted(false);
    setMoreOpen(false);
  }

  const field = (key: NutrientKey) => {
    const { label, unit } = NUTRIENTS[key];
    return (
      <TextField
        key={key}
        id={`custom-${key}`}
        label={key === "calories" ? label : `${label} (optional)`}
        unit={{ short: unit, long: UNIT_NAMES[unit] }}
        inputMode="decimal"
        autoComplete="off"
        value={values.amounts[key]}
        onChange={(event) => setAmount(key, event.target.value)}
        error={shown[key]}
      />
    );
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      <TextField
        id="custom-name"
        label="Food name"
        autoComplete="off"
        value={values.name}
        onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
        error={shown.name}
      />
      {MAIN_NUTRIENTS.map(field)}
      <details
        open={moreOpen}
        onToggle={(event) => setMoreOpen((event.target as HTMLDetailsElement).open)}
        className="rounded-field border-[1.5px] border-line px-4 py-3"
      >
        <summary className="min-h-11 cursor-pointer content-center font-bold text-leaf">
          More nutrients (optional)
        </summary>
        <div className="flex flex-col gap-5 pb-2 pt-3">{MORE_NUTRIENTS.map(field)}</div>
      </details>
      <Button type="submit" variant="secondary" className="self-start">
        Add to list
      </Button>
    </form>
  );
}
