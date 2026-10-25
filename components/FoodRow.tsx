"use client";

import { useId, useState } from "react";
import { Sticker, type StickerTone } from "@/components/ui/Sticker";
import { PlusIcon } from "@/components/ui/icons";
import { choicesWith, formatAmount, formatChoice, multipleFor, quantityFor, type AmountSpec } from "@/lib/amounts";
import { formatValue, goodSourceTags } from "@/lib/log";
import type { Nutrients } from "@/lib/nutrients";

/** Each "what it adds" tag keeps its color wherever it appears. */
const TAG_TONES: Record<string, StickerTone> = {
  Fiber: "leaf",
  Protein: "lemon",
  Potassium: "kraft",
  Calcium: "paper",
  Iron: "kraft",
  "Vitamin A": "lemon",
  "Vitamin C": "leaf",
};

/** An amount picker in the food's own unit ("2 eggs", "½ cup", "3 oz"). */
export function AmountSelect({
  id,
  label,
  spec,
  quantity,
  onChange,
}: {
  id: string;
  label: string;
  spec: AmountSpec;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={quantity}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-field border-[1.5px] border-field bg-white px-2 text-[15px]"
      >
        {choicesWith(spec, quantity).map((choice) => (
          <option key={choice} value={choice}>
            {formatChoice(spec, choice)}
          </option>
        ))}
      </select>
    </>
  );
}

/** One food you can add: name, amount, kcal for that amount, "what it adds" tags, and Add. */
export function FoodRow({
  name,
  spec,
  perBase,
  defaultMultiple = 1,
  actionLabel = "Add",
  warnings = [],
  onAdd,
}: {
  name: string;
  /** Clashes with the profile's diet notes, e.g. "Contains dairy". */
  warnings?: string[];
  spec: AmountSpec;
  /** Values for the base amount. */
  perBase: Nutrients;
  defaultMultiple?: number;
  /** Button text; the default is "Add". */
  actionLabel?: string;
  onAdd: (multiple: number) => void;
}) {
  const [quantity, setQuantity] = useState(quantityFor(spec, defaultMultiple));
  const selectId = useId();
  const tags = goodSourceTags(perBase);
  const calories = perBase.calories !== undefined ? perBase.calories * multipleFor(spec, quantity) : undefined;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="font-bold">
          {name}
          {calories !== undefined && <span className="font-normal text-muted"> · {formatValue(calories)} kcal</span>}
        </span>
        {spec.note && <span className="text-[13px] text-muted">{spec.note}</span>}
        {warnings.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {warnings.map((warning) => (
              <span key={warning} className="rounded-full bg-carrot/25 px-2 py-0.5 text-xs font-bold">
                {warning}
              </span>
            ))}
          </span>
        )}
        {tags.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            <span className="sr-only">Good source of {tags.join(", ")}</span>
            {tags.map((tag, index) => (
              <Sticker key={tag} tone={TAG_TONES[tag] ?? "lemon"} index={index} aria-hidden="true" className="text-[11px]">
                {tag}
              </Sticker>
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <AmountSelect id={selectId} label={`Amount of ${name}`} spec={spec} quantity={quantity} onChange={setQuantity} />
        <button
          type="button"
          onClick={() => onAdd(multipleFor(spec, quantity))}
          aria-label={`${actionLabel} ${formatAmount(spec, quantity)} of ${name}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-leaf px-4 font-display text-[15px] font-extrabold text-white hover:bg-leaf-dark"
        >
          <PlusIcon width={18} height={18} strokeWidth={2.25} />
          {actionLabel}
        </button>
      </div>
    </li>
  );
}
