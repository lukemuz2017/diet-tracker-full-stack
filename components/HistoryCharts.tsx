"use client";

import { useEffect, useRef, useState } from "react";
import { formatDay, formatShortDay } from "@/lib/dates";
import { formatValue, statusFor } from "@/lib/log";
import { NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import { formatTarget, type Target, type Targets } from "@/lib/targets";
import { runningAverages, type WindowSummary } from "@/lib/week";

// Charts for History (dataviz skill): one measure per chart, recessive grid,
// status color always paired with words (tooltip, table), and a table view.

const STATUS_FILL = { "to-go": "bg-lemon", "in-range": "bg-leaf", over: "bg-carrot", unknown: "bg-track" } as const;
const STATE_WORDS = { complete: "", open: " · not marked complete, not counted", missed: "" } as const;

/** Where the shaded "good" band sits for a target, and which edges get a label. */
function bandFor(target: Target, values: number[]) {
  // A "usual" target (cholesterol) with no history yet has no band: just the values.
  if (target.kind === "usual" && target.max === undefined) {
    return { top: Math.max(1, ...values) * 1.12, from: 0, to: 0, edges: [] as number[] };
  }
  const reference = target.max ?? target.upper ?? target.min! * 1.5;
  const top = Math.max(reference, ...values) * 1.12;
  if (target.kind === "range") return { top, from: target.min!, to: target.max!, edges: [target.min!, target.max!] };
  if (target.kind === "min") {
    const to = target.upper !== undefined ? Math.min(target.upper, top) : top;
    return { top, from: target.min!, to, edges: target.upper !== undefined && target.upper < top ? [target.min!, target.upper] : [target.min!] };
  }
  return { top, from: 0, to: target.max!, edges: [target.max!] };
}

const BAND_WORDS: Record<Target["kind"], string> = { range: "your range", min: "at or above your target", max: "under your limit", usual: "within your usual" };

/** Gap between the day columns (Tailwind gap-2), so the line meets each bar's center. */
const COLUMN_GAP = 8;

/** The plot's size in pixels, kept current as the page resizes. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * The running average drawn over the bars: a 2px line with a paper halo
 * (it crosses the bars) and a marker per day, labeled at the end.
 */
function RunningLine({ running, top, width, height, unit }: { running: (number | undefined)[]; top: number; width: number; height: number; unit: string }) {
  if (width === 0) return null;
  const column = (width - COLUMN_GAP * 6) / 7;
  const points = running.flatMap((value, index) =>
    value === undefined ? [] : [{ x: index * (column + COLUMN_GAP) + column / 2, y: height - (value / top) * height, value }],
  );
  if (points.length === 0) return null;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const last = points.at(-1)!;
  return (
    <svg className="pointer-events-none absolute bottom-0 left-12 right-0 top-0 overflow-visible" width={width} height={height} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--color-paper)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--color-soil)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point) => (
        <circle key={point.x} cx={point.x} cy={point.y} r={4} fill="var(--color-soil)" stroke="var(--color-paper)" strokeWidth={2} />
      ))}
      <text
        x={last.x}
        y={last.y - 10}
        textAnchor="end"
        className="fill-soil text-[11px] font-bold"
        stroke="var(--color-paper)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        avg {formatValue(last.value)} {unit}
      </text>
    </svg>
  );
}

/** One nutrient for each of the 7 days against its target (shaded band), with the running average over the bars. */
export function NutrientByDay({ summary, targets, nutrient: key }: { summary: WindowSummary; targets: Targets; nutrient: NutrientKey }) {
  const [active, setActive] = useState<string | null>(null);
  const target = targets[key];
  const { label, unit } = NUTRIENTS[key];
  const values = summary.days.map((day) => day.totals[key] ?? 0);
  const band = bandFor(target, values);
  const running = runningAverages(summary, key);
  const [plotRef, plot] = useSize<HTMLOListElement>();
  const y = (value: number) => `${(value / band.top) * 100}%`;
  const describe = (day: WindowSummary["days"][number]) => {
    const value = day.totals[key];
    return day.foods === 0 ? "not logged" : value === undefined ? "no value logged" : `${formatValue(value)} ${unit}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Shaded band: {BAND_WORDS[target.kind]}, {formatTarget(key, target)}
        {target.upper !== undefined && ` (safe upper limit ${formatValue(target.upper)} ${unit})`}
      </p>

      <div className="relative h-52 pl-12" aria-hidden="true">
        {/* Band and its edge labels */}
        <div className="absolute inset-x-12 right-0 bg-band/60" style={{ bottom: y(band.from), height: `calc(${y(band.to)} - ${y(band.from)})` }} />
        {band.edges.map((value) => (
          <span key={value} className="absolute left-0 w-11 translate-y-1/2 text-right text-[11px] leading-none tabular-nums text-muted" style={{ bottom: y(value) }}>
            {formatValue(value)}
          </span>
        ))}
        <div className="absolute bottom-0 left-12 right-0 h-px bg-line" />
        <ol ref={plotRef} className="relative grid h-full grid-cols-7 items-end gap-2">
          {summary.days.map((day, index) => {
            const value = day.totals[key];
            const status = statusFor(key, target, value).kind;
            const average = running[index];
            const tip = `${formatShortDay(day.date)}: ${describe(day)}${STATE_WORDS[day.state]}${average === undefined ? "" : ` · average so far ${formatValue(average)} ${unit}`}`;
            return (
              <li key={day.date} className="relative flex h-full flex-col justify-end" onMouseEnter={() => setActive(day.date)} onMouseLeave={() => setActive(null)}>
                {active === day.date && (
                  <span
                    className={`absolute bottom-full z-10 mb-1 w-max max-w-48 rounded-lg bg-soil px-2.5 py-1.5 text-xs text-paper shadow ${
                      index < 2 ? "left-0" : index > summary.days.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    {tip}
                  </span>
                )}
                {value === undefined ? (
                  <span className="mx-auto h-1.5 w-full rounded-full border-[1.5px] border-dashed border-field" />
                ) : (
                  <span
                    className={`w-full rounded-t-[4px] ${STATUS_FILL[status]} ${day.state !== "complete" ? "opacity-60" : ""}`}
                    style={{ height: y(value) }}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <RunningLine running={running} top={band.top} width={plot.width} height={plot.height} unit={unit} />
      </div>
      <ol className="grid grid-cols-7 gap-2 pl-12 text-center text-xs text-muted" aria-hidden="true">
        {summary.days.map((day) => (
          <li key={day.date}>{formatDay(day.date).slice(0, 3)}</li>
        ))}
      </ol>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <path d="M1 5h20" stroke="var(--color-soil)" strokeWidth="2" />
            <circle cx="11" cy="5" r="3.5" fill="var(--color-soil)" />
          </svg>
          Line: your average as the days add up
        </span>
        <span>Faded bars: not marked complete</span>
      </p>

      <details>
        <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-leaf">Show as a table</summary>
        {/* Wide enough that days and numbers never wrap; scrolls sideways on a narrow phone. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-[15px]">
          <caption className="sr-only">
            {label} by day, {formatDay(summary.start)} to {formatDay(summary.end)}
          </caption>
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th scope="col" className="whitespace-nowrap py-2 pr-4 font-normal">Day</th>
              <th scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">
                {label} ({unit})
              </th>
              <th scope="col" className="whitespace-nowrap py-2 pl-6 text-right font-normal">Average so far</th>
              <th scope="col" className="py-2 pl-6 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {summary.days.map((day, index) => {
              const value = day.totals[key];
              const average = running[index];
              return (
                <tr key={day.date}>
                  <th scope="row" className="whitespace-nowrap py-2 pr-4 text-left font-bold">{formatShortDay(day.date)}</th>
                  <td className="whitespace-nowrap py-2 pl-4 text-right tabular-nums">{value === undefined ? "–" : formatValue(value)}</td>
                  <td className="whitespace-nowrap py-2 pl-6 text-right tabular-nums">{average === undefined ? "–" : formatValue(average)}</td>
                  <td className="py-2 pl-6 text-[13px] text-muted">
                    {day.foods === 0 ? "Not logged" : value === undefined ? "No value logged" : statusFor(key, target, value).text}
                    {STATE_WORDS[day.state]}
                  </td>
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
