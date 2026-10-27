"use client";

import { bandFor, useSize } from "@/components/HistoryCharts";
import { ChangeCell } from "@/components/HistoryInsights";
import { addDays, formatDay, formatShortDay } from "@/lib/dates";
import { COMPARE_MIN_DAYS, compareWeeks } from "@/lib/insights";
import { formatValue } from "@/lib/log";
import { NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import type { SavedData } from "@/lib/storage";
import { formatTarget, type Targets } from "@/lib/targets";
import { WINDOW_DAYS, summarizeWindow, type WindowDay } from "@/lib/week";

// The same nutrient over two weeks: the picked week's seven days drawn over the
// week before, matched by weekday, against the target band. Hollow dots are days
// that aren't marked complete (they don't count in the averages).

/** Points for one week, as pixel positions; a day with no value breaks the line. */
function segments(days: WindowDay[], key: NutrientKey, top: number, width: number, height: number) {
  const column = width / WINDOW_DAYS;
  const parts: { x: number; y: number; counted: boolean }[][] = [[]];
  days.forEach((day, index) => {
    const value = day.totals[key];
    if (value === undefined) {
      if (parts.at(-1)!.length > 0) parts.push([]);
      return;
    }
    parts.at(-1)!.push({ x: index * column + column / 2, y: height - (value / top) * height, counted: day.state === "complete" });
  });
  return parts.filter((part) => part.length > 0);
}

const pathOf = (points: { x: number; y: number }[]) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

export function NutrientCompare({ data, targets, end, nutrient: key }: { data: SavedData; targets: Targets; end: string; nutrient: NutrientKey }) {
  const { label, unit } = NUTRIENTS[key];
  const target = targets[key];
  const current = summarizeWindow(data, end, targets);
  const previousEnd = addDays(end, -WINDOW_DAYS);
  const previous = summarizeWindow(data, previousEnd, targets);
  const comparison = compareWeeks(data, end, targets);
  const row = comparison.rows.find((item) => item.key === key);

  const values = [...current.days, ...previous.days].flatMap((day) => (day.totals[key] === undefined ? [] : [day.totals[key]!]));
  const band = bandFor(target, values);
  const [plotRef, plot] = useSize<HTMLDivElement>();
  const y = (value: number) => `${(value / band.top) * 100}%`;
  const weeks = [
    { name: "Last week", summary: previous, dashed: true },
    { name: "This week", summary: current, dashed: false },
  ];

  const range = (summary: { start: string; end: string }) => `${formatShortDay(summary.start)} – ${formatShortDay(summary.end)}`;
  const average = (value: number | undefined) => (value === undefined ? "no average yet" : `${formatValue(value)} ${unit}`);

  return (
    <div className="flex flex-col gap-4">
      {/* The two averages and what changed. */}
      <div className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
          <span>
            <b>{range(current)}</b> {average(current.averages[key])}
          </span>
          <span className="text-muted">
            <b>{range(previous)}</b> {average(previous.averages[key])}
          </span>
          {row && <ChangeCell row={row} />}
        </p>
        {!comparison.ready && (
          <p className="text-[13px] text-muted">
            Comparing the averages needs at least {COMPARE_MIN_DAYS} complete days in each week. {range(current)} has {comparison.current}, {range(previous)} has{" "}
            {comparison.previous}.
          </p>
        )}
        <p className="text-[13px] text-muted">
          Shaded band: {formatTarget(key, target)}. The change is from the earlier week to the later one; averages are of the complete days in each.
        </p>
      </div>

      <div className="relative h-52 pl-12" aria-hidden="true">
        <div className="absolute inset-x-12 right-0 bg-band/60" style={{ bottom: y(band.from), height: `calc(${y(band.to)} - ${y(band.from)})` }} />
        {band.edges.map((value) => (
          <span key={value} className="absolute left-0 w-11 translate-y-1/2 text-right text-[11px] leading-none tabular-nums text-muted" style={{ bottom: y(value) }}>
            {formatValue(value)}
          </span>
        ))}
        <div className="absolute bottom-0 left-12 right-0 h-px bg-line" />
        <div ref={plotRef} className="relative h-full">
          {plot.width > 0 && (
            <svg className="absolute inset-0 overflow-visible" width={plot.width} height={plot.height}>
              {weeks.map((week) =>
                segments(week.summary.days, key, band.top, plot.width, plot.height).map((points, index) => {
                  const color = week.dashed ? "var(--color-faded)" : "var(--color-soil)";
                  return (
                    <g key={`${week.name}-${index}`}>
                      {!week.dashed && <path d={pathOf(points)} fill="none" stroke="var(--color-paper)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />}
                      <path
                        d={pathOf(points)}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray={week.dashed ? "5 4" : undefined}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {points.map((point) => (
                        <circle
                          key={point.x}
                          cx={point.x}
                          cy={point.y}
                          r={week.dashed ? 3.5 : 4.5}
                          fill={point.counted ? color : "var(--color-paper)"}
                          stroke={week.dashed && point.counted ? "var(--color-paper)" : color}
                          strokeWidth={point.counted ? 2 : 1.75}
                        />
                      ))}
                    </g>
                  );
                }),
              )}
            </svg>
          )}
        </div>
      </div>
      <ol className="grid grid-cols-7 pl-12 text-center text-xs text-muted" aria-hidden="true">
        {current.days.map((day) => (
          <li key={day.date}>{formatDay(day.date).slice(0, 3)}</li>
        ))}
      </ol>

      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="10" aria-hidden="true">
            <path d="M1 5h24" stroke="var(--color-soil)" strokeWidth="2" />
            <circle cx="13" cy="5" r="3.5" fill="var(--color-soil)" />
          </svg>
          {range(current)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="10" aria-hidden="true">
            <path d="M1 5h24" stroke="var(--color-faded)" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          {range(previous)}
        </span>
        <span>Hollow dot: not marked complete</span>
      </p>

      <details>
        <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-leaf">Show as a table</summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-[15px]">
            <caption className="sr-only">
              {label} each weekday, {range(current)} against {range(previous)}
            </caption>
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th scope="col" className="py-2 pr-4 font-normal">
                  Weekday
                </th>
                <th scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">
                  {range(previous)} ({unit})
                </th>
                <th scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">
                  {range(current)} ({unit})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {current.days.map((day, index) => {
                const before = previous.days[index];
                const cell = (item: WindowDay) =>
                  item.totals[key] === undefined ? (item.foods === 0 ? "–" : "no value") : `${formatValue(item.totals[key]!)}${item.state === "complete" ? "" : " (not complete)"}`;
                return (
                  <tr key={day.date}>
                    <th scope="row" className="py-2 pr-4 text-left font-bold">
                      {formatDay(day.date).slice(0, 3)}
                    </th>
                    <td className="whitespace-nowrap py-2 pl-4 text-right tabular-nums text-muted">{cell(before)}</td>
                    <td className="whitespace-nowrap py-2 pl-4 text-right tabular-nums">{cell(day)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
