"use client";

import Link from "next/link";
import { useState, type Dispatch, type SetStateAction } from "react";
import { CustomFoodForm } from "@/components/CustomFoodForm";
import { AmountSelect, FoodRow } from "@/components/FoodRow";
import { FoodSearch, type SearchOption } from "@/components/FoodSearch";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { addFoods, setDayComplete } from "@/lib/actions";
import { formatAmount, multipleFor, quantityFor } from "@/lib/amounts";
import { formatDay } from "@/lib/dates";
import { warningsFor } from "@/lib/diet";
import { CATEGORY_ORDER, FOODS, amountFor, categoryOf } from "@/lib/foods";
import { formatValue, recentFoods, totalsFor } from "@/lib/log";
import { MEALS, type Meal } from "@/lib/meals";
import type { Nutrients } from "@/lib/nutrients";
import { dietOf, type Diet } from "@/lib/profile";
import type { SavedData, TrayItem } from "@/lib/storage";

interface Choice {
  key: string;
  name: string;
  foodId?: string;
  perServing: Nutrients;
  multiple: number;
}

type Mode = "foods" | "meals";

/** Saved recipes and meals shown under the search before anything is typed. */
const MEALS_SHOWN = 6;

function toOption(choice: Choice, diet: Diet): SearchOption {
  const spec = amountFor(choice.foodId);
  const kcal = choice.perServing.calories;
  const warning = warningsFor(choice.foodId, diet).join(" · ");
  return {
    key: choice.key,
    name: choice.name,
    detail: `${formatAmount(spec, spec.base)}${kcal !== undefined ? ` · ${formatValue(kcal)} kcal` : ""}`,
    warning: warning || undefined,
  };
}

function newUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Adding food to one meal: a search with a Foods / Meals & recipes toggle,
// plus links to browse all foods, add your own, or make a recipe. Picking a
// food puts it on a "To add" list (amounts can be changed there); one button
// adds the whole list to the meal. The pop-up stays open afterwards, so you can
// log the next meal, and it can mark the day complete. The list belongs to the
// page (components/FoodLog.tsx), so closing the pop-up or visiting New recipe
// doesn't lose it.
export function AddFoodPanel({
  data,
  date,
  meal,
  today,
  staged,
  setStaged,
  onDone,
}: {
  data: SavedData;
  date: string;
  meal: Meal;
  today: string;
  staged: TrayItem[];
  setStaged: Dispatch<SetStateAction<TrayItem[]>>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>("foods");
  // On a phone, focusing the search at once opens the keyboard and shifts the pop-up.
  const [focusSearch] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const [extra, setExtra] = useState<"browse" | "own" | null>(null);
  const [ownName, setOwnName] = useState("");
  const isToday = date === today;
  const dayLabel = isToday ? "today" : formatDay(date);
  const diet = dietOf(data.profile!);
  const mealName = MEALS.find((item) => item.value === meal)!.label.toLowerCase();

  // The chosen day so far, for the Mark complete toggle.
  const { totals, foods } = totalsFor(data.entries.filter((entry) => entry.date === date));
  const marked = data.completeDays.includes(date);

  /** Puts a food on the list; picking the same food again adds to its amount. */
  function stage(food: { name: string; foodId?: string; perServing: Nutrients }, multiple: number) {
    setStaged((list) => {
      const same = list.find((item) => item.name === food.name && item.foodId === food.foodId);
      if (same) return list.map((item) => (item === same ? { ...item, multiple: item.multiple + multiple } : item));
      return [...list, { uid: newUid(), name: food.name, foodId: food.foodId, perServing: food.perServing, multiple }];
    });
  }

  function commit() {
    const where = `${isToday ? "" : `${formatDay(date)} `}${mealName}`;
    const [only] = staged;
    const spec = amountFor(only.foodId);
    const message =
      staged.length === 1
        ? `Added ${formatAmount(spec, quantityFor(spec, only.multiple))} of ${only.name.toLowerCase()} to ${where}`
        : `Added ${staged.length} foods to ${where}`;
    addFoods(
      staged.map((item) => ({ food: item, servings: item.multiple })),
      date,
      meal,
      message,
    );
    setStaged([]);
    setExtra(null);
  }

  const recent = recentFoods(data.entries, 100);
  const lastMultiple = (foodId: string) => recent.find((item) => item.foodId === foodId)?.lastServings ?? 1;

  const foodChoices: Choice[] = FOODS.map((food) => ({
    key: food.id,
    name: food.name,
    foodId: food.id,
    perServing: food.nutrients,
    multiple: lastMultiple(food.id),
  }));

  // Meals & recipes: saved recipes plus foods you've added yourself, newest first.
  const mealChoices: Choice[] = [
    ...data.recipes
      .slice()
      .reverse()
      .map((recipe) => ({
        key: `recipe:${recipe.id}`,
        name: recipe.name,
        foodId: `recipe:${recipe.id}`,
        perServing: recipe.perServing,
        multiple: 1,
      })),
    ...recent
      .filter((item) => !item.foodId)
      .map((item) => ({ key: item.key, name: item.name, perServing: item.perServing, multiple: item.lastServings })),
  ];

  // Foods search finds your recipes too, so you don't make a duplicate.
  const choices = mode === "foods" ? [...foodChoices, ...mealChoices.filter((choice) => choice.foodId)] : mealChoices;
  const options = choices.map((choice) => toOption(choice, diet));
  const allChoices = [...foodChoices, ...mealChoices];
  const totalKcal = staged.reduce((sum, item) => sum + (item.perServing.calories ?? 0) * item.multiple, 0);

  function addOwn(name: string) {
    setOwnName(name);
    setExtra("own");
    requestAnimationFrame(() => document.getElementById("custom-calories")?.focus());
  }

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => setMode(value)}
      className={`min-h-11 flex-1 rounded-full px-4 text-sm font-bold ${
        mode === value ? "bg-soil text-paper" : "text-soil hover:bg-track"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="What to search" className="flex gap-1 rounded-full border-[1.5px] border-field bg-white p-1">
        {modeButton("foods", "Foods")}
        {modeButton("meals", "Meals & recipes")}
      </div>

      <FoodSearch
        key={mode}
        autoFocus={focusSearch}
        label={mode === "foods" ? "Search foods" : "Search your meals and recipes"}
        placeholder={mode === "foods" ? "Try “eggs” or “rice”" : mealChoices.length ? "Type a name, or pick one below" : "No saved recipes yet"}
        options={options}
        onPick={(key) => {
          const choice = allChoices.find((item) => item.key === key);
          if (choice) stage(choice, choice.multiple);
        }}
        onAddOwn={addOwn}
      />

      {/* Meals & recipes lists your saved ones, so you can pick without typing. */}
      {mode === "meals" && mealChoices.length > 0 && (
        <ul aria-label="Your meals and recipes" className="divide-y divide-line">
          {mealChoices.slice(0, MEALS_SHOWN).map((choice) => (
            <FoodRow
              key={choice.key}
              name={choice.name}
              spec={amountFor(choice.foodId)}
              perBase={choice.perServing}
              defaultMultiple={choice.multiple}
              actionLabel="Select"
              onAdd={(multiple) => stage(choice, multiple)}
            />
          ))}
        </ul>
      )}

      {staged.length > 0 && (
        <section aria-label="Foods to add" className="rounded-field border-[1.5px] border-leaf px-3 pb-1 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-leaf">
              To add to {mealName} · {dayLabel} · {formatValue(totalKcal)} kcal
            </h3>
            <button type="button" onClick={() => setStaged([])} className="min-h-9 text-sm font-bold text-leaf underline underline-offset-[3px]">
              Clear
            </button>
          </div>
          <ul className="divide-y divide-line">
            {staged.map((item) => {
              const spec = amountFor(item.foodId);
              const warnings = warningsFor(item.foodId, diet);
              return (
                <li key={item.uid} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                  <span className="min-w-0">
                    <b className="block leading-snug">{item.name}</b>
                    <span className="text-sm text-muted">{formatValue((item.perServing.calories ?? 0) * item.multiple)} kcal</span>
                    {warnings.map((warning) => (
                      <span key={warning} className="ml-2 rounded-full bg-carrot/25 px-2 py-0.5 text-xs font-bold">
                        {warning}
                      </span>
                    ))}
                  </span>
                  <span className="flex items-center gap-2">
                    <AmountSelect
                      id={`${item.uid}-amount`}
                      label={`Amount of ${item.name}`}
                      spec={spec}
                      quantity={quantityFor(spec, item.multiple)}
                      onChange={(quantity) =>
                        setStaged((list) => list.map((entry) => (entry.uid === item.uid ? { ...entry, multiple: multipleFor(spec, quantity) } : entry)))
                      }
                    />
                    <Button
                      variant="quiet"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setStaged((list) => list.filter((entry) => entry.uid !== item.uid))}
                    >
                      Remove
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
          <Button className="mb-2 mt-1 w-full sm:w-auto" onClick={commit}>
            Add {staged.length} {staged.length === 1 ? "food" : "foods"} to {mealName}
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-x-5 text-sm font-bold">
        <button
          type="button"
          aria-expanded={extra === "browse"}
          onClick={() => setExtra(extra === "browse" ? null : "browse")}
          className="inline-flex min-h-11 items-center text-leaf underline underline-offset-[3px]"
        >
          Browse all foods
        </button>
        <button
          type="button"
          aria-expanded={extra === "own"}
          onClick={() => setExtra(extra === "own" ? null : "own")}
          className="inline-flex min-h-11 items-center text-leaf underline underline-offset-[3px]"
        >
          Add your own food
        </button>
        <Link href="/recipes" className="inline-flex min-h-11 items-center text-leaf underline underline-offset-[3px]">
          New recipe
        </Link>
      </div>

      {extra === "browse" &&
        CATEGORY_ORDER.map((category) => {
          const foodsInCategory = FOODS.filter((food) => categoryOf(food) === category);
          if (foodsInCategory.length === 0) return null;
          return (
            <section key={category}>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-leaf">{category}</h3>
              <ul className="divide-y divide-line">
                {foodsInCategory.map((food) => (
                  <FoodRow
                    key={food.id}
                    name={food.name}
                    spec={amountFor(food.id)}
                    perBase={food.nutrients}
                    defaultMultiple={lastMultiple(food.id)}
                    warnings={warningsFor(food.id, diet)}
                    actionLabel={staged.some((item) => item.foodId === food.id) ? "Add more" : "Select"}
                    onAdd={(multiple) => stage({ name: food.name, foodId: food.id, perServing: food.nutrients }, multiple)}
                  />
                ))}
              </ul>
            </section>
          );
        })}

      {extra === "own" && (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="font-display text-lg font-extrabold">Add your own food</h3>
          <p className="pb-2 text-[15px] text-muted">
            Enter the numbers for one portion of what you ate. Only the name and calories are required.
          </p>
          <CustomFoodForm
            key={ownName}
            initialName={ownName}
            date={date}
            today={today}
            onAdd={(name, nutrients) => {
              stage({ name, perServing: nutrients }, 1);
              setExtra(null);
            }}
          />
        </section>
      )}

      {/* The day so far: mark it complete without leaving, then close when done. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[15px]">
          <b>{isToday ? "Today" : formatDay(date)}</b>
          <span className="text-muted"> · {foods > 0 ? `${formatValue(totals.calories ?? 0)} kcal logged` : "nothing logged yet"}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {foods > 0 && (
            <button
              type="button"
              aria-pressed={marked}
              onClick={() => setDayComplete(date, !marked)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                marked ? "bg-leaf text-white hover:bg-leaf-dark" : "border-[1.5px] border-soil text-soil hover:bg-track"
              }`}
            >
              {marked && <CheckIcon width={16} height={16} strokeWidth={2.5} />}
              {marked ? "Day complete" : "Mark complete"}
            </button>
          )}
          <Button variant="secondary" onClick={onDone}>
            Done
          </Button>
        </span>
      </div>
    </div>
  );
}
