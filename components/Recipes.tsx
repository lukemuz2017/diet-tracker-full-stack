"use client";

import { useState, type FormEvent } from "react";
import { AmountSelect } from "@/components/FoodRow";
import { FoodSearch, type SearchOption } from "@/components/FoodSearch";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { FieldError, TextField } from "@/components/ui/Field";
import { deleteRecipe, saveRecipe } from "@/lib/actions";
import { formatAmount, multipleFor, quantityFor } from "@/lib/amounts";
import { FOODS, amountFor } from "@/lib/foods";
import { formatValue, scaleNutrients } from "@/lib/log";
import { NUTRIENTS, type Nutrients } from "@/lib/nutrients";
import { perServingFromIngredients, type Ingredient, type Recipe } from "@/lib/recipe";
import { useSavedData } from "@/lib/storage";
import { useToday } from "@/lib/useToday";

export function RecipesScreen() {
  const data = useSavedData();
  const today = useToday();
  const [justSaved, setJustSaved] = useState<Recipe | null>(null);
  const header = (
    <PageHeader
      back={{ href: "/log", label: "Dashboard" }}
      title="Recipes"
      description="Build a recipe from ingredients once, then log it by the serving whenever you eat it."
    />
  );
  if (!data?.profile || !today) return header;

  return (
    <>
      {header}
      <div className="flex max-w-2xl flex-col gap-5">
        {justSaved && (
          <p role="status" className="rounded-2xl bg-leaf-tint px-4 py-3 text-[15px]">
            <b>Saved {justSaved.name}.</b> It’s now in Meals & recipes when you add food.
          </p>
        )}

        <Card className="flex flex-col gap-5">
          <BuildRecipe ownFoods={data.entries.filter((entry) => !entry.foodId)} onSaved={setJustSaved} />
        </Card>

        {data.recipes.length > 0 && (
          <Card>
            <h2 className="font-display text-xl font-extrabold">Your recipes</h2>
            <ul className="divide-y divide-line">
              {data.recipes.map((recipe) => (
                <li key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    <b>{recipe.name}</b>
                    <span className="text-muted">
                      {" "}
                      · {recipe.servings > 1 ? `makes ${recipe.servings} · ${formatValue(recipe.perServing.calories ?? 0)} kcal a serving` : `${formatValue(recipe.perServing.calories ?? 0)} kcal`}
                    </span>
                  </span>
                  <Button variant="quiet" onClick={() => deleteRecipe(recipe.id)} aria-label={`Delete ${recipe.name}`}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
            <ButtonLink href="/log?add=1" variant="quiet" className="mt-2">
              Log a recipe on Add food
            </ButtonLink>
          </Card>
        )}
      </div>
    </>
  );
}

function BuildRecipe({
  ownFoods,
  onSaved,
}: {
  ownFoods: { name: string; servings: number; nutrients: Nutrients }[];
  onSaved: (recipe: Recipe) => void;
}) {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [hint, setHint] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Common foods plus foods you've added yourself (by name, per portion).
  const own = new Map(ownFoods.map((entry) => [`own:${entry.name.toLowerCase()}`, entry]));
  const choices = [
    ...FOODS.map((food) => ({ key: food.id, name: food.name, foodId: food.id as string | undefined, perBase: food.nutrients })),
    ...[...own].map(([key, entry]) => ({ key, name: entry.name, foodId: undefined, perBase: scaleNutrients(entry.nutrients, 1 / entry.servings) })),
  ];
  const options: SearchOption[] = choices.map((choice) => {
    const spec = amountFor(choice.foodId);
    return { key: choice.key, name: choice.name, detail: `${formatAmount(spec, spec.base)} · ${formatValue(choice.perBase.calories ?? 0)} kcal` };
  });

  const nameProblem = name.trim() ? undefined : "Enter a recipe name, like Chicken chili.";
  const ingredientsProblem = ingredients.length ? undefined : "Add at least one ingredient.";
  // The recipe is one serving; log half or double of it when you add it.
  const perServing = ingredients.length ? perServingFromIngredients(ingredients, 1) : null;

  function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (nameProblem || ingredientsProblem) {
      document.getElementById(nameProblem ? "build-name" : "build-ingredients")?.focus();
      return;
    }
    onSaved(saveRecipe({ name: name.trim(), servings: 1, perServing: perServing!, ingredients }));
    setName("");
    setIngredients([]);
    setSubmitted(false);
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-5">
      <TextField
        id="build-name"
        label="Recipe name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={submitted ? nameProblem : undefined}
      />
      <div className="flex flex-col gap-3">
        <FoodSearch
          label="Add to recipe"
          options={options}
          onPick={(key) => {
            // Picking adds it at the usual amount; change the amount in the list.
            const choice = choices.find((item) => item.key === key);
            if (choice) {
              setIngredients((list) => [
                ...list,
                { name: choice.name, foodId: choice.foodId, multiple: 1, nutrients: scaleNutrients(choice.perBase, 1) },
              ]);
            }
            setHint("");
          }}
          onAddOwn={(typed) =>
            setHint(`“${typed}” isn’t in the list. Add it once as your own food on the Add food page, and it’ll show up here.`)
          }
        />
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>

      <div id="build-ingredients" tabIndex={-1} className="flex flex-col gap-2">
        <h3 className="font-bold">Ingredients</h3>
        {ingredients.length === 0 ? (
          <p className="text-[15px] text-muted">Search above to add the first ingredient.</p>
        ) : (
          <ul className="divide-y divide-line">
            {ingredients.map((item, index) => {
              const spec = amountFor(item.foodId);
              return (
                <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <b className="block leading-snug">{item.name}</b>
                    <span className="text-sm text-muted">{formatValue(item.nutrients.calories ?? 0)} kcal</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <AmountSelect
                      id={`ingredient-${index}`}
                      label={`Amount of ${item.name}`}
                      spec={spec}
                      quantity={quantityFor(spec, item.multiple)}
                      onChange={(quantity) => {
                        const multiple = multipleFor(spec, quantity);
                        const base = scaleNutrients(item.nutrients, 1 / item.multiple);
                        setIngredients((list) =>
                          list.map((entry, i) => (i === index ? { ...entry, multiple, nutrients: scaleNutrients(base, multiple) } : entry)),
                        );
                      }}
                    />
                  <Button
                    variant="quiet"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setIngredients((list) => list.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {submitted && ingredientsProblem && <FieldError id="build-ingredients-error">{ingredientsProblem}</FieldError>}
      </div>

      {perServing && (
        <p className="rounded-2xl bg-leaf-tint px-4 py-3 text-[15px]">
          <b>Whole recipe:</b> {formatValue(perServing.calories ?? 0)} kcal
          {(["protein", "carbs", "fat"] as const).map((key) =>
            perServing[key] !== undefined ? ` · ${formatValue(perServing[key]!)} g ${NUTRIENTS[key].label.toLowerCase()}` : "",
          )}
        </p>
      )}

      <Button type="submit" className="self-start">
        Save recipe
      </Button>
    </form>
  );
}
