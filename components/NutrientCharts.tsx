"use client";

import { useState } from "react";
import { NutrientByDay } from "@/components/HistoryCharts";
import { WhereFrom } from "@/components/HistoryInsights";
import { NutrientCompare } from "@/components/NutrientCompare";
import { WeekCalendar } from "@/components/WeekCalendar";
import { Dialog } from "@/components/ui/Dialog";
import { StatusChip } from "@/components/ui/StatusChip";
import { addDays, formatShortDay } from "@/lib/dates";
import { formatValue, statusFor } from "@/lib/log";
import { NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import type { Profile } from "@/lib/profile";
import type { SavedData } from "@/lib/storage";
import { computeTargets, formatTarget, type Targets } from "@/lib/targets";
import { withUsual } from "@/lib/usual";
import { WINDOW_DAYS, summarizeWindow, type WindowSummary } from "@/lib/week";

// The charts for one nutrient, in a pop-up opened from the Dashboard's nutrient
// detail: how it moved day by day, which foods it came from, and how the picked week compares with the one before. A week control
// goes back to earlier weeks without moving the Dashboard.

export type ChartTab = "trend" | "sources" | "compare";

const TABS: { value: ChartTab; label: string }[] = [
  { value: "trend", label: "Trend" },
  { value: "sources", label: "Sources" },
  { value: "compare", label: "Compare weeks" },
];

export function NutrientChartsDialog({
  chart,
  onClose,
  data,
  profile,
  today,
  initialEnd,
}: {
  /** What to show, or null when closed. */
  chart: { nutrient: NutrientKey; tab: ChartTab } | null;
  onClose: () => void;
  data: SavedData;
  profile: Profile;
  today: string;
  /** The Dashboard's window end, where the pop-up starts. */
  initialEnd: string;
}) {
  return (
    <Dialog open={chart !== null} onClose={onClose} title={chart ? NUTRIENTS[chart.nutrient].label : ""}>
      {/* Mounted only while open, so each opening starts on the current week and the chosen tab. */}
      {chart && <ChartsBody nutrient={chart.nutrient} initialTab={chart.tab} data={data} profile={profile} today={today} initialEnd={initialEnd} />}
    </Dialog>
  );
}

function ChartsBody({
  nutrient,
  initialTab,
  data,
  profile,
  today,
  initialEnd,
}: {
  nutrient: NutrientKey;
  initialTab: ChartTab;
  data: SavedData;
  profile: Profile;
  today: string;
  initialEnd: string;
}) {
  const [tab, setTab] = useState(initialTab);
  const [end, setEnd] = useState(initialEnd);
  const [picking, setPicking] = useState(false);

  const targets = withUsual(computeTargets(profile, today), data, end);
  const summary = summarizeWindow(data, end, targets);
  // Nothing to look back at before the first food was logged.
  const earliest = data.entries.reduce((first, entry) => (entry.date < first ? entry.date : first), today);
  const atEarliest = end <= earliest;
  const atLatest = end >= today;
  const range = `${formatShortDay(addDays(end, -(WINDOW_DAYS - 1)))} – ${formatShortDay(end)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div role="group" aria-label="Chart" className="flex gap-2">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={tab === option.value}
              onClick={() => setTab(option.value)}
              className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-sm font-bold ${
                tab === option.value ? "border-leaf bg-leaf text-white" : "border-field bg-white text-soil hover:bg-track"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* The week: step back and forward, or pick a day from a calendar. */}
        <div role="group" aria-label="Week" className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Earlier week"
            disabled={atEarliest}
            onClick={() => setEnd(addDays(end, -WINDOW_DAYS))}
            className="grid size-11 place-items-center rounded-full border-[1.5px] border-field text-lg font-bold hover:bg-track disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-field bg-white px-4 text-sm font-bold hover:bg-track"
          >
            {range}
            <span aria-hidden="true" className="text-xs text-muted">
              ▾
            </span>
          </button>
          <button
            type="button"
            aria-label="Later week"
            disabled={atLatest}
            onClick={() => setEnd(addDays(end, WINDOW_DAYS) > today ? today : addDays(end, WINDOW_DAYS))}
            className="grid size-11 place-items-center rounded-full border-[1.5px] border-field text-lg font-bold hover:bg-track disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {picking && (
        <div className="self-end">
          <WeekCalendar
            key={end}
            end={end}
            min={earliest}
            max={today}
            onPick={(date) => {
              setEnd(date);
              setPicking(false);
            }}
          />
        </div>
      )}

      {/* Compare weeks opens with the two averages itself. */}
      {tab !== "compare" && <AverageHeader summary={summary} targets={targets} nutrient={nutrient} />}

      {tab === "trend" ? (
        <NutrientByDay summary={summary} targets={targets} nutrient={nutrient} />
      ) : tab === "sources" ? (
        <WhereFrom data={data} summary={summary} nutrient={nutrient} />
      ) : (
        <NutrientCompare data={data} targets={targets} end={end} nutrient={nutrient} />
      )}
    </div>
  );
}

/**
 * What every chart here is about: the week's average against its target, and
 * how many days it rests on. The charts below show how the days added up to it.
 */
function AverageHeader({ summary, targets, nutrient }: { summary: WindowSummary; targets: Targets; nutrient: NutrientKey }) {
  const { label, unit } = NUTRIENTS[nutrient];
  const target = targets[nutrient];
  const average = summary.averages[nutrient];
  const days = summary.coverage[nutrient].days;
  const status = statusFor(nutrient, target, summary.counted > 0 ? average : undefined);
  const range = `${formatShortDay(summary.start)} – ${formatShortDay(summary.end)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-celery/60 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-leaf">Average · {range}</span>
        <span className="font-display text-2xl font-extrabold leading-tight">
          {average === undefined || summary.counted === 0 ? "No average yet" : `${formatValue(average)} ${unit} a day`}
        </span>
        <span className="text-[13px] text-muted">
          {label} target {formatTarget(nutrient, target)} ·{" "}
          {days === 0 ? "no complete days with a value" : `of ${days} complete ${days === 1 ? "day" : "days"}`}
        </span>
      </div>
      <StatusChip status={status.kind} words>
        {status.text}
      </StatusChip>
    </div>
  );
}
