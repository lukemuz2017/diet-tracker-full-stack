"use client";

import { topSources, type ComparisonRow, type Tone } from "@/lib/insights";
import { formatValue } from "@/lib/log";
import { NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import type { SavedData } from "@/lib/storage";
import type { WindowSummary } from "@/lib/week";

// Pieces of the nutrient charts pop-up: which foods a nutrient came from, and
// the change cell for week over week. The numbers are worked out in
// lib/insights.ts.

/** Which foods gave the most of a nutrient, over the days that count. */
export function WhereFrom({ data, summary, nutrient: key }: { data: SavedData; summary: WindowSummary; nutrient: NutrientKey }) {
  const counted = new Set(summary.days.filter((day) => day.state === "complete").map((day) => day.date));
  const { label, unit } = NUTRIENTS[key];
  const { total, items, otherShare } = topSources(data.entries, counted, key);
  const perDay = (value: number) => formatValue(value / counted.size);

  if (counted.size === 0) {
    return <p className="text-[15px]">No complete days in this week yet, so there’s nothing to add up. Mark a day complete on the Dashboard.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-muted">
        The foods behind your {label.toLowerCase()}, over the {counted.size} {counted.size === 1 ? "day" : "days"} that count.
      </p>
      {total === 0 ? (
        <p className="text-[15px]">
          None of the foods in these days list {label.toLowerCase()} yet. Foods you add yourself only have what you type in, and meals logged before
          this nutrient was tracked don’t have it.
        </p>
      ) : (
        <>
          <ol aria-label={`Foods that gave the most ${label.toLowerCase()}`} className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.name} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_9rem] sm:items-center">
                <span className="truncate font-bold" title={item.name}>
                  {item.name}
                </span>
                <span aria-hidden="true" className="block h-3 rounded-full bg-track">
                  <span className="block h-full rounded-full bg-leaf" style={{ width: `${Math.max(3, (item.share / items[0].share) * 100)}%` }} />
                </span>
                <span className="text-[13px] text-muted sm:text-right">
                  {Math.round(item.share)}% · {perDay(item.value)} {unit} a day
                </span>
              </li>
            ))}
          </ol>
          {otherShare >= 1 && <p className="text-[13px] text-muted">Everything else: {Math.round(otherShare)}%.</p>}
        </>
      )}
    </div>
  );
}

const TONE_STYLE: Record<Tone, string> = {
  better: "bg-leaf-tint text-soil",
  worse: "bg-carrot/30 text-soil",
  same: "text-muted",
};

const TONE_WORDS: Record<Tone, string> = { better: "closer to your target", worse: "further from your target", same: "" };

/** "+10 g" or "−300 mg", with the sign always shown. */
function signed(delta: number, unit: string): string {
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatValue(Math.abs(delta))} ${unit}`;
}

/** The change in a nutrient's average from last week: an arrow and amount, tinted by whether it moved toward the target. */
export function ChangeCell({ row }: { row: ComparisonRow }) {
  const { unit } = NUTRIENTS[row.key];
  if (row.delta === 0) {
    return (
      <span className="text-muted">
        Steady<span className="sr-only"> (changed by less than 3%)</span>
      </span>
    );
  }
  const up = row.delta > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold ${TONE_STYLE[row.tone]}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {signed(row.delta, unit)}
      <span className="sr-only">
        , {up ? "up" : "down"} {Math.round(Math.abs(row.percent))}%{row.tone !== "same" && `, ${TONE_WORDS[row.tone]}`}
      </span>
    </span>
  );
}
