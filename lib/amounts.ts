// How much of a food someone ate, in the food's natural unit: things you
// count (2 eggs, 1 slice), scoop (½ cup, 2 tbsp) or weigh (3 oz). Pure
// functions, checked by lib/amounts.test.ts.

export interface AmountSpec {
  /** The amount the food's nutrition values are for, in this unit. */
  base: number;
  /** Unit name for 1 or less ("egg", "cup"), and for more than 1 ("eggs", "cups"). */
  one: string;
  many: string;
  /** Amounts offered in the picker, in this unit. */
  choices: number[];
  /** A size hint, e.g. "about the size of a deck of cards". */
  note?: string;
  /** Whole foods (banana, egg): the picker shows just the number. */
  bare?: boolean;
}

/** Custom foods: the numbers entered are for one portion of what was eaten. */
export const PORTION: AmountSpec = { base: 1, one: "portion", many: "portions", choices: [0.5, 1, 1.5, 2, 3] };

const FRACTIONS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };

/** 0.5 → "½", 1.5 → "1½", 2 → "2". */
export function formatQuantity(quantity: number): string {
  const whole = Math.floor(quantity);
  const fraction = Math.round((quantity - whole) * 100) / 100;
  const symbol = FRACTIONS[String(fraction)];
  if (fraction === 0) return String(whole);
  if (symbol) return whole === 0 ? symbol : `${whole}${symbol}`;
  return String(Math.round(quantity * 100) / 100);
}

/** "½ cup", "1½ cups", "2 eggs", "3 oz". */
export function formatAmount(spec: AmountSpec, quantity: number): string {
  return `${formatQuantity(quantity)} ${quantity > 1 ? spec.many : spec.one}`;
}

const close = (a: number, b: number) => Math.abs(a - b) < 0.001;

/** A picker option: "2" for whole foods, otherwise "½ cup", "3 ounces". */
export function formatChoice(spec: AmountSpec, quantity: number): string {
  return spec.bare ? formatQuantity(quantity) : formatAmount(spec, quantity);
}

/** The picker's choices, including `current` if it isn't one of them. */
export function choicesWith(spec: AmountSpec, current: number): number[] {
  return spec.choices.some((choice) => close(choice, current))
    ? spec.choices
    : [...spec.choices, current].sort((a, b) => a - b);
}

/** An entry stores a multiple of the base amount; these convert both ways. */
export function quantityFor(spec: AmountSpec, multiple: number): number {
  return Math.round(spec.base * multiple * 1000) / 1000;
}

export function multipleFor(spec: AmountSpec, quantity: number): number {
  return quantity / spec.base;
}
