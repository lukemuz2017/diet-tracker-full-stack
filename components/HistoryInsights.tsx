"use client";

import { Card } from "@/components/ui/Card";
import { addDays, formatShortDay } from "@/lib/dates";
import { compareWeeks, topSources, COMPARE_MIN_DAYS, type ComparisonRow, type Tone } from "@/lib/insights";
import { formatValue } from "@/lib/log";
import { NUTRIENT_GROUPS, NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import type { SavedData } from "@/lib/storage";
import type { Targets } from "@/lib/targets";
import { WINDOW_DAYS, type WindowSummary } from "@/lib/week";

// Two cards under the History charts: which foods a nutrient came from, and
// how this week compares with last week. The numbers are worked out in
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

function ChangeCell({ row }: { row: ComparisonRow }) {
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

/** Each nutrient's average this week next to last week's, with the change. */
export function WeekCompare({ data, targets, end }: { data: SavedData; targets: Targets; end: string }) {
  const result = compareWeeks(data, end, targets);
  const previousEnd = addDays(end, -WINDOW_DAYS);
  const dates = `${formatShortDay(addDays(end, -(WINDOW_DAYS - 1)))} – ${formatShortDay(end)} against ${formatShortDay(addDays(previousEnd, -(WINDOW_DAYS - 1)))} – ${formatShortDay(previousEnd)}`;

  if (!result.ready) {
    return (
      <Card className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold">This week vs. last week</h2>
        <p className="text-[15px] text-muted">
          Comparing needs at least {COMPARE_MIN_DAYS} complete days in each week. This week has {result.current}, the week before has {result.previous}.
        </p>
      </Card>
    );
  }

  const names = (tone: Tone) =>
    result.rows
      .filter((row) => row.tone === tone)
      .slice(0, 3)
      .map((row) => NUTRIENTS[row.key].label.toLowerCase());
  const better = names("better");
  const worse = names("worse");
  const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
  const summary =
    better.length === 0 && worse.length === 0
      ? "Not much changed from last week."
      : [better.length > 0 && `Moving toward your targets: ${list(better)}.`, worse.length > 0 && `Moving away: ${list(worse)}.`].filter(Boolean).join(" ");

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold">This week vs. last week</h2>
        <p className="text-[15px]">{summary}</p>
        <p className="text-[13px] text-muted">{dates}. Averages of the complete days in each week.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-[15px]">
          <caption className="sr-only">Each nutrient’s average last week and this week, and the change</caption>
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">
                Nutrient
              </th>
              <th scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">
                Last week
              </th>
              <th scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">
                This week
              </th>
              <th scope="col" className="py-2 pl-6 font-normal">
                Change
              </th>
            </tr>
          </thead>
          {NUTRIENT_GROUPS.map((group) => {
            const rows = result.rows.filter((row) => group.keys.includes(row.key));
            if (rows.length === 0) return null;
            return (
              <tbody key={group.title} className="divide-y divide-line border-t border-line">
                <tr>
                  <th scope="colgroup" colSpan={4} className="pb-1 pt-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-leaf">
                    {group.title}
                  </th>
                </tr>
                {rows.map((row) => {
                  const { label, unit } = NUTRIENTS[row.key];
                  return (
                    <tr key={row.key}>
                      <th scope="row" className="py-2 pr-4 text-left font-bold">
                        {label}
                      </th>
                      <td className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-muted">
                        {formatValue(row.previous)} {unit}
                      </td>
                      <td className="whitespace-nowrap py-2 pl-4 text-right tabular-nums">
                        {formatValue(row.current)} {unit}
                      </td>
                      <td className="py-2 pl-6">
                        <ChangeCell row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </Card>
  );
}
