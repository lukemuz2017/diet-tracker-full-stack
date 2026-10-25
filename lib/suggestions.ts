// The summary at the top of Dashboard: a verdict in words and three tiles,
// judged on the 7-day averages: one thing going well, one that could improve,
// and a bigger-picture habit drawn from the week as a whole. Suggestions stay
// at the food-group level, not a specific food to add. Foods in the text are
// wrapped in ** so the page can show them in bold.

import { clashes, type Tag } from "./diet.ts";
import { formatValue, NUTRIENT_KEYS, statusFor } from "./log.ts";
import { NUTRIENTS, type NutrientKey } from "./nutrients.ts";
import type { Diet } from "./profile.ts";
import type { Entry } from "./storage.ts";
import { formatTarget, type Targets } from "./targets.ts";
import type { WindowSummary } from "./week.ts";

/**
 * A suggestion with example foods. {list} becomes up to three examples that
 * fit the person's allergies and eating pattern; if none fit, the fallback
 * is used. Each example is [word, ...what it contains].
 */
interface TipText {
  text: string;
  examples: [string, ...Tag[]][];
  fallback: string;
}

/** What to try when a nutrient's average is low: food groups, with everyday examples. */
const LOW_TIPS: Partial<Record<NutrientKey, TipText>> = {
  calories: {
    text: "Consider slightly bigger portions or an extra snack, like {list}, this week.",
    examples: [["nuts", "treeNuts"], ["yogurt", "dairy"], ["hummus", "sesame"], ["bananas"]],
    fallback: "Consider slightly bigger portions or an extra snack this week.",
  },
  protein: {
    text: "Consider adding protein foods, like {list}, this week.",
    examples: [["beans"], ["eggs", "eggs"], ["fish", "fish"], ["chicken", "meat"], ["tofu", "soy"], ["lentils"]],
    fallback: "Consider adding a protein food to more meals this week.",
  },
  carbs: {
    text: "Consider adding some grains, like {list}, this week.",
    examples: [["rice"], ["oats"], ["whole-wheat bread", "gluten"], ["quinoa"]],
    fallback: "Consider adding some grains this week.",
  },
  fat: {
    text: "Consider adding healthy fats, like {list}, this week.",
    examples: [["nuts", "treeNuts"], ["avocado"], ["olive oil"], ["salmon", "fish"]],
    fallback: "Consider adding some healthy fats this week.",
  },
  fiber: {
    text: "Consider adding {list} this week.",
    examples: [["beans"], ["lentils"], ["whole grains"]],
    fallback: "Consider adding more beans, vegetables and whole grains this week.",
  },
  potassium: {
    text: "Consider adding {list} this week.",
    examples: [["potatoes"], ["beans"], ["bananas"]],
    fallback: "Consider adding more fruit and vegetables this week.",
  },
  calcium: {
    text: "Consider adding calcium-rich foods, like {list}, this week.",
    examples: [["yogurt", "dairy"], ["milk", "dairy"], ["cheese", "dairy"], ["tofu", "soy"], ["fortified soy milk", "soy"], ["leafy greens"], ["fortified orange juice"]],
    fallback: "Consider adding calcium-rich foods this week.",
  },
  iron: {
    text: "Consider adding {list} this week.",
    examples: [["beans"], ["lentils"], ["leafy greens"]],
    fallback: "Consider adding iron-rich foods this week.",
  },
  vitaminA: {
    text: "Consider adding orange vegetables or leafy greens, like {list}, this week.",
    examples: [["sweet potatoes"], ["carrots"], ["spinach"]],
    fallback: "Consider adding orange vegetables or leafy greens this week.",
  },
  vitaminC: {
    text: "Consider adding fruit or peppers, like {list}, this week.",
    examples: [["oranges"], ["strawberries"], ["bell peppers"]],
    fallback: "Consider adding fruit or peppers this week.",
  },
};

const NO_DIET: Pick<Diet, "allergies" | "pattern"> = { allergies: [], pattern: "everything" };

/** Fills a tip's {list} with up to three examples that fit the diet notes. */
function fill(tip: TipText | string, diet: Pick<Diet, "allergies" | "pattern">): string {
  if (typeof tip === "string") return tip;
  const words = tip.examples
    .filter(([, ...tags]) => !clashes(tags, diet))
    .slice(0, 3)
    .map(([word]) => `**${word}**`);
  if (words.length === 0) return tip.fallback;
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} or ${words.at(-1)}`;
  return tip.text.replace("{list}", list);
}

/** Which on-track nutrient to praise first: the harder wins lead. */
const GOOD_ORDER: NutrientKey[] = ["fiber", "vitaminC", "potassium", "calcium", "iron", "vitaminA", "protein", "carbs", "fat", "calories"];
/** Staying under a limit or near maintenance is good, but no single food earns the credit. */
const NO_SOURCE: NutrientKey[] = ["calories"];

export type TileKind = "good" | "improve" | "big";

export interface Tile {
  kind: TileKind;
  /** Tints the tile: in range, under, over, or a general habit. */
  tone: "good" | "low" | "high" | "big";
  /** "Fiber is on track", "Carbs are low", "Fill up on produce" */
  title: string;
  /** "Averaging 2,420 mg · at least 3,400 mg" (nutrient tiles only) */
  detail?: string;
  tip: string;
  key?: NutrientKey;
}

export type Verdict = "waiting" | "early" | "balanced" | "mostly" | "work";

/** The first week unlocks in stages (flows.md): suggestions need this many complete days. */
export const SUGGESTION_DAYS = 3;

export interface Summary {
  verdict: Verdict;
  headline: string;
  tiles: Tile[];
  /** Complete days still needed before suggestions appear (0 once they do). */
  daysToGo: number;
}

const HEADLINES: Record<Verdict, string> = {
  waiting: "Your summary starts when you mark a day complete.",
  early: "Getting started.",
  balanced: "Balanced across the board.",
  mostly: "Mostly balanced.",
  work: "A few things to work on.",
};

/**
 * Bigger-picture habits, first match wins. `keys` lists the nutrients that
 * triggered a rule; a rule is skipped when it would only repeat the
 * "could improve" tile.
 */
const HABITS: { title: string; tip: TipText | string; keys: (low: Set<NutrientKey>, high: Set<NutrientKey>) => NutrientKey[] }[] = [
  {
    title: "Fill up on produce",
    tip: "Try making half your plate **vegetables** and **fruit** at two meals a day.",
    keys: (low) => {
      const produce = (["fiber", "potassium", "vitaminA", "vitaminC"] as NutrientKey[]).filter((key) => low.has(key));
      return produce.length >= 2 ? produce : [];
    },
  },
  {
    title: "Fuller days",
    tip: {
      text: "Your days run light. Try a fuller lunch, or plan an afternoon snack like {list}.",
      examples: [["nuts", "treeNuts"], ["yogurt", "dairy"], ["hummus", "sesame"], ["fruit"]],
      fallback: "Your days run light. Try a fuller lunch, or plan an afternoon snack.",
    },
    keys: (low) => (low.has("calories") && ["carbs", "protein", "fat"].some((key) => low.has(key as NutrientKey)) ? (["calories", "carbs", "protein", "fat"] as NutrientKey[]).filter((key) => low.has(key)) : []),
  },
  {
    title: "Portion check",
    tip: "Try a slightly smaller portion at your biggest meal of the day.",
    keys: (_, high) => (high.has("calories") ? ["calories"] : []),
  },
  {
    title: "Protein at each meal",
    tip: {
      text: "Build each meal around a protein, like {list}.",
      examples: [["eggs", "eggs"], ["beans"], ["fish", "fish"], ["tofu", "soy"], ["chicken", "meat"], ["lentils"]],
      fallback: "Build each meal around a protein.",
    },
    keys: (low) => (low.has("protein") ? ["protein"] : []),
  },
  {
    title: "Mix in minerals",
    tip: {
      text: "Add foods like {list} to one meal a day.",
      examples: [["yogurt", "dairy"], ["leafy greens"], ["beans"], ["tofu", "soy"]],
      fallback: "Add a calcium- or iron-rich food to one meal a day.",
    },
    keys: (low) => (["calcium", "iron"] as NutrientKey[]).filter((key) => low.has(key)),
  },
];
const DEFAULT_HABIT = { title: "Keep it varied", tip: "Try a different **vegetable** each day this week; variety keeps vitamins and minerals in range." };

/** "Carbs are low", "Fiber is low" */
function verb(label: string): string {
  return label.endsWith("s") ? "are" : "is";
}

/** How far off the average is, as a share of the target edge it missed. */
function distance(value: number, edge: number): number {
  return Math.abs(value - edge) / edge;
}

/** `diet` keeps example foods within the person's allergies and eating pattern. */
export function summarize(summary: WindowSummary, targets: Targets, entries: Entry[], diet: Pick<Diet, "allergies" | "pattern"> = NO_DIET): Summary {
  if (summary.counted === 0) return { verdict: "waiting", headline: HEADLINES.waiting, tiles: [], daysToGo: SUGGESTION_DAYS };
  // One or two days is too little to judge a week on.
  if (summary.counted < SUGGESTION_DAYS) {
    return { verdict: "early", headline: HEADLINES.early, tiles: [], daysToGo: SUGGESTION_DAYS - summary.counted };
  }

  const counted = new Set(summary.days.filter((day) => day.state === "complete").map((day) => day.date));
  const inRange: NutrientKey[] = [];
  const off: { key: NutrientKey; direction: "low" | "high"; distance: number }[] = [];
  const detailFor = (key: NutrientKey) => `Averaging ${formatValue(summary.averages[key]!)} ${NUTRIENTS[key].unit} · ${formatTarget(key, targets[key])}`;

  for (const key of NUTRIENT_KEYS) {
    const value = summary.averages[key];
    if (value === undefined) continue;
    const target = targets[key];
    const status = statusFor(key, target, value).kind;
    if (status === "in-range") inRange.push(key);
    else if (status === "to-go") off.push({ key, direction: "low", distance: distance(value, target.min!) });
    else if (status === "over") {
      const edge = target.max !== undefined && value > target.max ? target.max : target.upper!;
      off.push({ key, direction: "high", distance: distance(value, edge) });
    }
  }
  off.sort((a, b) => b.distance - a.distance);

  const tiles: Tile[] = [];

  // Going well: the on-track nutrient that was in range on the most days.
  const share = (key: NutrientKey) => {
    const { days, inRange: good } = summary.coverage[key];
    return days === 0 ? 0 : good / days;
  };
  // Calories are only praised when nothing else is on track.
  const rank = (key: NutrientKey) => (NO_SOURCE.includes(key) ? 1 : 0);
  const good = [...inRange].sort((a, b) => rank(a) - rank(b) || share(b) - share(a) || GOOD_ORDER.indexOf(a) - GOOD_ORDER.indexOf(b))[0];
  if (good) {
    const { label } = NUTRIENTS[good];
    const source = NO_SOURCE.includes(good) ? undefined : topSource(entries, counted, good);
    tiles.push({
      kind: "good",
      tone: "good",
      key: good,
      title: `${label} ${verb(label)} on track`,
      detail: detailFor(good),
      tip: source ? `Mostly from **${shortName(source)}**. Keep it up.` : "Keep it up.",
    });
  }

  // Could improve: the nutrient furthest off.
  const worst = off[0];
  if (worst) {
    const { label } = NUTRIENTS[worst.key];
    const source = worst.direction === "high" ? topSource(entries, counted, worst.key) : undefined;
    tiles.push({
      kind: "improve",
      tone: worst.direction,
      key: worst.key,
      title: `${label} ${verb(label)} ${worst.direction}`,
      detail: detailFor(worst.key),
      tip:
        worst.direction === "low"
          ? fill(LOW_TIPS[worst.key]!, diet)
          : source
            ? `Mostly from **${shortName(source)}**. Consider having it a little less often this week.`
            : "Consider cutting back a little this week.",
    });
  }

  // Bigger picture: a habit from the week's overall pattern.
  const low = new Set(off.filter((item) => item.direction === "low").map((item) => item.key));
  const high = new Set(off.filter((item) => item.direction === "high").map((item) => item.key));
  const habit =
    HABITS.find((rule) => {
      const keys = rule.keys(low, high);
      return keys.length > 0 && !keys.every((key) => key === worst?.key);
    }) ?? DEFAULT_HABIT;
  tiles.push({ kind: "big", tone: "big", title: habit.title, tip: fill(habit.tip, diet) });

  const verdict: Verdict = off.length === 0 ? "balanced" : off.length <= 3 && inRange.length >= off.length * 2 ? "mostly" : "work";
  return { verdict, headline: HEADLINES[verdict], tiles, daysToGo: 0 };
}

/** "Cheese pizza" → "cheese pizza"; "Lentils, cooked" → "lentils" */
function shortName(name: string): string {
  return name.split(",")[0].toLowerCase();
}

function topSource(entries: Entry[], dates: Set<string>, key: NutrientKey): string | undefined {
  const byFood = new Map<string, number>();
  for (const entry of entries) {
    const value = entry.nutrients[key];
    if (!dates.has(entry.date) || !value) continue;
    byFood.set(entry.name, (byFood.get(entry.name) ?? 0) + value);
  }
  return [...byFood].sort((a, b) => b[1] - a[1])[0]?.[0];
}
