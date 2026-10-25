"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDay, formatShortDay } from "@/lib/dates";
import { formatValue, statusFor } from "@/lib/log";
import { NUTRIENT_GROUPS, NUTRIENTS, type NutrientKey, type Nutrients } from "@/lib/nutrients";
import { formatTarget, type Target, type Targets } from "@/lib/targets";
import { runningAverages, type WindowSummary } from "@/lib/week";

// Charts for History (dataviz skill): one measure per chart, recessive grid,
// status color always paired with words (tooltip, table), and a table view.

const STATUS_FILL = { "to-go": "bg-lemon", "in-range": "bg-leaf", over: "bg-carrot", unknown: "bg-track" } as const;
const STATE_WORDS = { complete: "", open: " · not marked complete, not counted", missed: "" } as const;

/** Where the shaded "good" band sits for a target, and which edges get a label. */
function bandFor(target: Target, values: number[]) {
  const reference = target.max ?? target.upper ?? target.min! * 1.5;
  const top = Math.max(reference, ...values) * 1.12;
  if (target.kind === "range") return { top, from: target.min!, to: target.max!, edges: [target.min!, target.max!] };
  if (target.kind === "min") {
    const to = target.upper !== undefined ? Math.min(target.upper, top) : top;
    return { top, from: target.min!, to, edges: target.upper !== undefined && target.upper < top ? [target.min!, target.upper] : [target.min!] };
  }
  return { top, from: 0, to: target.max!, edges: [target.max!] };
}

const BAND_WORDS: Record<Target["kind"], string> = { range: "your range", min: "at or above your target", max: "under your limit" };

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

/** One nutrient for each of the 7 days against its target (shaded band); a menu picks the nutrient. */
export function NutrientByDay({ summary, targets }: { summary: WindowSummary; targets: Targets }) {
  const [active, setActive] = useState<string | null>(null);
  const [key, setKey] = useState<NutrientKey>("calories");
  const selectId = useId();
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
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">{label} by day</h2>
          <span className="text-[13px] text-muted">
            Shaded band: {BAND_WORDS[target.kind]}, {formatTarget(key, target)}
            {target.upper !== undefined && ` (safe upper limit ${formatValue(target.upper)} ${unit})`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-sm font-bold">
            Nutrient
          </label>
          <select
            id={selectId}
            value={key}
            onChange={(event) => setKey(event.target.value as NutrientKey)}
            className="field-box min-h-11 rounded-field border-[1.5px] border-field bg-white px-3 text-[15px]"
          >
            {NUTRIENT_GROUPS.map((group) => (
              <optgroup key={group.title} label={group.title}>
                {group.keys.map((option) => (
                  <option key={option} value={option}>
                    {NUTRIENTS[option].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

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
        <table className="w-full max-w-lg text-[15px]">
          <caption className="sr-only">
            {label} by day, {formatDay(summary.start)} to {formatDay(summary.end)}
          </caption>
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th scope="col" className="py-1 font-normal">Day</th>
              <th scope="col" className="py-1 text-right font-normal">
                {label} ({unit})
              </th>
              <th scope="col" className="py-1 pl-4 text-right font-normal">Average so far</th>
              <th scope="col" className="py-1 pl-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {summary.days.map((day, index) => {
              const value = day.totals[key];
              const average = running[index];
              return (
                <tr key={day.date}>
                  <th scope="row" className="py-1.5 text-left font-bold">{formatShortDay(day.date)}</th>
                  <td className="py-1.5 text-right tabular-nums">{value === undefined ? "–" : formatValue(value)}</td>
                  <td className="py-1.5 pl-4 text-right tabular-nums">{average === undefined ? "–" : formatValue(average)}</td>
                  <td className="py-1.5 pl-4 text-[13px]">
                    {day.foods === 0 ? "Not logged" : value === undefined ? "No value logged" : statusFor(key, target, value).text}
                    {STATE_WORDS[day.state]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

// Validated with the dataviz palette checker (light surface): all checks pass;
// carbs is below 3:1 contrast, so every segment carries a visible label.
const MACROS = [
  { key: "protein", label: "Protein", kcalPerGram: 4, color: "#2E8048", range: [10, 35] },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, color: "#D29A12", range: [45, 65] },
  { key: "fat", label: "Fat", kcalPerGram: 9, color: "#B04E2C", range: [20, 35] },
] as const;

/** Share of calories from protein, carbs and fat (averages), against their ranges. */
export function MacroSplit({ averages, teen }: { averages: Nutrients; teen: boolean }) {
  const kcal = MACROS.map((macro) => (averages[macro.key] ?? 0) * macro.kcalPerGram);
  const total = kcal.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  const shares = kcal.map((value) => (value / total) * 100);

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-extrabold">Where your calories came from</h2>
      <div className="flex h-10 w-full gap-0.5 overflow-hidden rounded-[6px]" aria-hidden="true">
        {MACROS.map((macro, index) =>
          shares[index] > 0 ? (
            <span key={macro.key} className="h-full first:rounded-l-[6px] last:rounded-r-[6px]" style={{ width: `${shares[index]}%`, background: macro.color }} title={`${macro.label}: ${Math.round(shares[index])}%`} />
          ) : null,
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {MACROS.map((macro, index) => {
          const [low, high] = macro.key === "fat" && teen ? [25, 35] : macro.range;
          const share = Math.round(shares[index]);
          const inRange = share >= low && share <= high;
          return (
            <li key={macro.key} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-1 size-3.5 flex-none rounded-[4px]" style={{ background: macro.color }} />
              <span className="flex flex-col">
                <span>
                  <b>{macro.label}</b> {share}%
                </span>
                <span className="text-[13px] text-muted">
                  Range {low}–{high}% · {inRange ? "in range" : share < low ? "below" : "above"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
