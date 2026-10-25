"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { NutrientBar } from "@/components/NutrientBar";
import { InfoButton } from "@/components/ui/InfoButton";
import { StatusChip } from "@/components/ui/StatusChip";
import { DayBadge } from "@/components/WindowView";
import { addDays, formatDay, formatShortDay } from "@/lib/dates";
import { NUTRIENT_KEYS, formatValue, statusFor } from "@/lib/log";
import { NUTRIENT_GROUPS, NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import type { Profile } from "@/lib/profile";
import type { SavedData } from "@/lib/storage";
import { computeTargets } from "@/lib/targets";
import { WINDOW_DAYS, summarizeWindow, type DayState } from "@/lib/week";

const CELL: Record<string, string> = {
  "in-range": "bg-leaf",
  "to-go": "bg-lemon",
  over: "bg-carrot",
  unknown: "bg-track",
};
const COUNTED: DayState[] = ["complete"];
// On a phone the grid shows PHONE_DAYS days at a time, paged with arrows, so
// nothing scrolls sideways; from sm up it shows all 7.
const PHONE_DAYS = 3;
const GRID =
  "grid grid-cols-[5.5rem_repeat(3,minmax(0,1fr))_5rem] items-center gap-x-1.5 sm:grid-cols-[8.5rem_repeat(7,minmax(2.25rem,1fr))_9.5rem]";
// Between sm and a wide screen the 7 days can still scroll; the names stay put.
const PINNED = "sm:sticky sm:left-0 sm:z-[1] self-stretch bg-paper";
// The summary column says only where the average stands; the amounts and how
// far to go are in the nutrient's detail.
const SUMMARY: Record<string, string> = { "to-go": "Under", "in-range": "In range", over: "Over" };

/**
 * Week ribbons: one row per nutrient, a cell per day (in range / under / over
 * / not logged; brown-bag kraft when logged but not marked complete) and the
 * average that counts. Clicking a day opens that day; clicking a nutrient
 * expands its weekly detail. On a phone the grid scrolls sideways: it opens
 * scrolled to the newest days, the names stay pinned, and the detail stays the
 * width of the screen.
 */
export function WeekRibbons({
  data,
  profile,
  today,
  end,
  onOpenDay,
}: {
  data: SavedData;
  profile: Profile;
  today: string;
  /** The window's last day: yesterday until today is marked complete. */
  end: string;
  onOpenDay: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState<NutrientKey | null>(null);
  // Phone paging: the first of the PHONE_DAYS days shown, starting on the newest.
  const lastStart = WINDOW_DAYS - PHONE_DAYS;
  const [pageStart, setPageStart] = useState(lastStart);
  const onPhonePage = (index: number) => index >= pageStart && index < pageStart + PHONE_DAYS;
  const hideOnPhone = (index: number) => (onPhonePage(index) ? "" : "max-sm:hidden");
  const scroller = useRef<HTMLDivElement>(null);
  const [visibleWidth, setVisibleWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    // Start at the newest days and the averages.
    element.scrollLeft = element.scrollWidth;
    const observer = new ResizeObserver(() => setVisibleWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const targets = computeTargets(profile, today);
  const summary = summarizeWindow(data, end, targets);
  const dayLabel = (date: string) => (date === today ? "Today" : formatDay(date).slice(0, 3));
  const dayName = (date: string) => (date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : formatDay(date));

  const dayShare = summary.days.map((day) => {
    const known = NUTRIENT_KEYS.filter((key) => day.totals[key] !== undefined);
    if (known.length === 0) return null;
    return known.filter((key) => statusFor(key, targets[key], day.totals[key]).kind === "in-range").length / known.length;
  });

  return (
    <div className="rounded-card bg-paper p-4 sm:p-5">
      <div ref={scroller} className="sm:overflow-x-auto">
        <div className="sm:min-w-[40rem]">
          {/* Column headers: each day's badge opens that day. */}
          <div className={`${GRID} pb-2`}>
            <span className={`${PINNED} flex items-center pr-2 text-xs text-muted`}>
              <span className="max-sm:hidden">Pick a day or a nutrient</span>
              {/* Phone: step through the week a few days at a time. */}
              <span className="flex gap-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setPageStart((start) => Math.max(0, start - PHONE_DAYS))}
                  disabled={pageStart === 0}
                  aria-label="Earlier days"
                  className="grid size-10 place-items-center rounded-full border-[1.5px] border-field text-lg font-bold text-soil disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setPageStart((start) => Math.min(lastStart, start + PHONE_DAYS))}
                  disabled={pageStart === lastStart}
                  aria-label="Later days"
                  className="grid size-10 place-items-center rounded-full border-[1.5px] border-field text-lg font-bold text-soil disabled:opacity-30"
                >
                  ›
                </button>
              </span>
            </span>
            {summary.days.map((day, index) => (
              <button
                key={day.date}
                type="button"
                onClick={() => onOpenDay(day.date)}
                aria-label={`Open ${dayName(day.date)}`}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-xs text-muted hover:bg-track ${hideOnPhone(index)}`}
              >
                <DayBadge state={day.state} share={dayShare[index]} />
                {/* Weekday and date on one line, so the header stays one row tall. */}
                <span aria-hidden="true" className={`whitespace-nowrap ${day.date === today ? "font-bold text-soil" : ""}`}>
                  {dayLabel(day.date)}
                  {day.date !== today && <span className="font-bold text-soil"> {Number(day.date.slice(8))}</span>}
                </span>
              </button>
            ))}
            <span className="flex items-center gap-1 pl-3 text-xs font-bold text-leaf">
              Average
              {/* Which days the average rests on, instead of a line in the summary card. */}
              <InfoButton label="About the average" align="end">
                <b>
                  {summary.counted} of {WINDOW_DAYS} days count so far.
                </b>{" "}
                Each nutrient is averaged over the days in this week that you marked complete. Days not marked complete
                (brown) and days not logged are left out, never counted as zero.
              </InfoButton>
            </span>
          </div>

          {NUTRIENT_GROUPS.flatMap((group) => group.keys).map((key) => {
            const { label, unit } = NUTRIENTS[key];
            const average = summary.averages[key];
            const status = statusFor(key, targets[key], summary.counted > 0 ? average : undefined);
            const open = expanded === key;
            return (
              <Fragment key={key}>
                <div className={`${GRID} border-t border-line py-1`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : key)}
                    className={`${PINNED} flex min-h-8 items-center gap-1.5 rounded-lg pr-2 text-left text-sm font-bold hover:text-leaf`}
                  >
                    <span aria-hidden="true" className={`text-xs text-muted transition-transform ${open ? "rotate-90" : ""}`}>
                      ▸
                    </span>
                    {label}
                  </button>
                  {summary.days.map((day, index) => {
                    const value = day.totals[key];
                    const dayStatus = statusFor(key, targets[key], value);
                    const pending = day.foods > 0 && !COUNTED.includes(day.state);
                    const words =
                      day.foods === 0
                        ? "not logged"
                        : value === undefined
                          ? "no value"
                          : `${formatValue(value)} ${unit}, ${dayStatus.text.toLowerCase()}${pending ? ", not marked complete" : ""}`;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => onOpenDay(day.date)}
                        aria-label={`${label}, ${dayName(day.date)}: ${words}`}
                        title={`${dayName(day.date)}: ${words}`}
                        className={`h-6 rounded-md ${hideOnPhone(index)} ${
                          day.foods === 0 ? "border-[1.5px] border-dashed border-field" : pending ? "bg-kraft" : CELL[dayStatus.kind]
                        }`}
                      />
                    );
                  })}
                  <span className="pl-3">
                    {summary.counted > 0 && average !== undefined ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : key)}
                        aria-label={`${label} average: ${status.text}. ${open ? "Hide" : "Show"} details`}
                        className="whitespace-nowrap rounded-full"
                      >
                        <StatusChip status={status.kind}>{SUMMARY[status.kind]}</StatusChip>
                      </button>
                    ) : (
                      <span className="text-sm text-muted">–</span>
                    )}
                  </span>
                </div>
                {open && (
                  // Pinned and screen-wide, so the detail doesn't scroll sideways with the days.
                  <div className="sticky left-0" style={visibleWidth ? { width: visibleWidth } : undefined}>
                    <NutrientDetail data={data} nutrientKey={key} summary={summary} targets={targets} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-leaf align-[-2px]" />In range that day</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-lemon align-[-2px]" />Under</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-carrot align-[-2px]" />Over</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm border-[1.5px] border-dashed border-field align-[-2px]" />Not logged</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-kraft align-[-2px]" />Not marked complete</span>
      </div>
    </div>
  );
}

/** Weekly detail for one nutrient: the bar against its target, then each day with its top food. */
function NutrientDetail({
  data,
  nutrientKey,
  summary,
  targets,
}: {
  data: SavedData;
  nutrientKey: NutrientKey;
  summary: ReturnType<typeof summarizeWindow>;
  targets: ReturnType<typeof computeTargets>;
}) {
  const { label, unit } = NUTRIENTS[nutrientKey];

  // The food that gave the most of this nutrient on each day (same food logged twice adds up).
  const topByDay = new Map<string, { name: string; value: number }>();
  for (const day of summary.days) {
    const byFood = new Map<string, number>();
    for (const entry of data.entries) {
      const value = entry.nutrients[nutrientKey];
      if (entry.date !== day.date || !value) continue;
      byFood.set(entry.name, (byFood.get(entry.name) ?? 0) + value);
    }
    const [name, value] = [...byFood].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (name !== undefined) topByDay.set(day.date, { name, value: value! });
  }

  const countedDays = summary.coverage[nutrientKey].days;

  return (
    <div className="mb-2 flex flex-col gap-4 rounded-xl bg-celery/60 p-4">
      <NutrientBar nutrient={nutrientKey} target={targets[nutrientKey]} value={summary.counted > 0 ? summary.averages[nutrientKey] : undefined} />
      <table className="w-full text-sm">
        <caption className="sr-only">{label} each day and the food that gave the most. Grayed days aren’t marked complete, so they’re left out of the average.</caption>
        <thead>
          <tr className="text-left text-xs font-bold uppercase tracking-[0.08em] text-leaf">
            <th scope="col" className="pb-1 font-bold">Day</th>
            <th scope="col" className="pb-1 pl-3 text-right font-bold">{label}</th>
            <th scope="col" className="pb-1 pl-6 font-bold">Top source</th>
          </tr>
        </thead>
        <tbody>
          {summary.days.map((day) => {
            const value = day.totals[nutrientKey];
            const top = topByDay.get(day.date);
            const counts = day.state === "complete" && value !== undefined;
            return (
              // Days that don't count are grayed out; the average leaves them out.
              <tr key={day.date} className={counts ? "" : "text-faded"}>
                <th scope="row" className="py-1 text-left font-normal">
                  {formatShortDay(day.date)}
                  {!counts && <span className="sr-only"> (not counted)</span>}
                </th>
                <td className="py-1 pl-3 text-right tabular-nums">
                  {day.foods === 0 ? "not logged" : value === undefined ? "no value" : `${formatValue(value)} ${unit}`}
                </td>
                <td className="py-1 pl-6">
                  {top ? (
                    <>
                      {top.name}
                      <span className="tabular-nums text-muted"> · {formatValue(top.value)} {unit}</span>
                    </>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <th scope="row" className="pt-2 text-left font-bold">Average</th>
            <td className="pt-2 pl-3 text-right font-bold tabular-nums">
              {summary.averages[nutrientKey] === undefined ? "–" : `${formatValue(summary.averages[nutrientKey]!)} ${unit}`}
            </td>
            <td className="pt-2 pl-6 text-[13px] text-muted">
              {countedDays === 0 ? "Mark a day complete to start the average." : `of ${countedDays} ${countedDays === 1 ? "day" : "days"}`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
