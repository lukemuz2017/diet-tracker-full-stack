"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DAY_CHIP } from "@/components/ui/DayStatus";
import { formatAmount, quantityFor } from "@/lib/amounts";
import { formatDay } from "@/lib/dates";
import { amountFor } from "@/lib/foods";
import { formatValue } from "@/lib/log";
import { byMeal } from "@/lib/meals";
import type { Entry } from "@/lib/storage";
import type { WindowSummary } from "@/lib/week";

// The days of the picked week, newest first. Each opens to the meals logged
// that day, read-only (change a day's foods from the Dashboard).

export function HistoryDays({ entries, summary }: { entries: Entry[]; summary: WindowSummary }) {
  const [open, setOpen] = useState<string[]>([]);
  const baseId = useId();
  const toggle = (date: string) => setOpen((dates) => (dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date]));

  return (
    <Card className="flex flex-col py-2">
      <ol className="flex flex-col divide-y divide-line">
        {[...summary.days].reverse().map((day) => {
          const chip = DAY_CHIP[day.state];
          const expanded = day.foods > 0 && open.includes(day.date);
          const panelId = `${baseId}-${day.date}`;
          const heading = (
            <>
              <span className="font-bold">{formatDay(day.date)}</span>
              <span className="text-[13px] text-muted">
                {day.foods === 0 ? "Nothing logged" : `${day.foods} ${day.foods === 1 ? "food" : "foods"} · ${formatValue(day.totals.calories ?? 0)} kcal`}
              </span>
            </>
          );
          return (
            <li key={day.date} className="py-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 flex-1">
                  {day.foods > 0 ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggle(day.date)}
                      className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg text-left hover:bg-track/60"
                    >
                      <span aria-hidden="true" className={`text-xs text-muted transition-transform ${expanded ? "rotate-90" : ""}`}>
                        ▸
                      </span>
                      {heading}
                    </button>
                  ) : (
                    <span className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 pl-5">{heading}</span>
                  )}
                </h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.className}`}>{chip.text}</span>
              </div>
              {expanded && (
                <div id={panelId} className="flex flex-col gap-3 pb-3 pl-5 pt-1">
                  {byMeal(entries.filter((entry) => entry.date === day.date))
                    .filter((group) => group.entries.length > 0)
                    .map((group) => (
                      <section key={group.meal} aria-label={group.label}>
                        <h4 className="flex flex-wrap items-baseline gap-x-3 text-xs font-bold uppercase tracking-[0.08em] text-leaf">
                          {group.label}
                          <span className="text-[13px] font-normal normal-case tracking-normal text-muted">
                            {formatValue(group.entries.reduce((sum, entry) => sum + (entry.nutrients.calories ?? 0), 0))} kcal
                          </span>
                        </h4>
                        <ul className="divide-y divide-line">
                          {group.entries.map((entry) => (
                            <li key={entry.id} className="py-2">
                              <b className="block leading-snug">{entry.name}</b>
                              <span className="block text-sm text-muted">
                                {formatAmount(amountFor(entry.foodId), quantityFor(amountFor(entry.foodId), entry.servings))}
                                {entry.nutrients.calories !== undefined && ` · ${formatValue(entry.nutrients.calories)} kcal`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
