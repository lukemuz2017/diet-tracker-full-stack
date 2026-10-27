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
  // Meals start collapsed inside an open day.
  const [openMeals, setOpenMeals] = useState<string[]>([]);
  const toggleMeal = (key: string) => setOpenMeals((keys) => (keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]));
  const baseId = useId();
  const toggle = (date: string) => setOpen((dates) => (dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date]));

  return (
    <Card className="flex flex-col py-2">
      <h2 className="sr-only">Days</h2>
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
                <div id={panelId} className="flex flex-col pb-2 pl-5">
                  {byMeal(entries.filter((entry) => entry.date === day.date))
                    .filter((group) => group.entries.length > 0)
                    .map((group) => {
                      const mealKey = `${day.date}-${group.meal}`;
                      const mealOpen = openMeals.includes(mealKey);
                      const listId = `${baseId}-${mealKey}`;
                      const kcal = group.entries.reduce((sum, entry) => sum + (entry.nutrients.calories ?? 0), 0);
                      return (
                        <section key={group.meal} aria-label={group.label} className="border-t border-line first:border-t-0">
                          <h4>
                            <button
                              type="button"
                              aria-expanded={mealOpen}
                              aria-controls={listId}
                              onClick={() => toggleMeal(mealKey)}
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left hover:bg-track/60"
                            >
                              <span aria-hidden="true" className={`text-xs text-muted transition-transform ${mealOpen ? "rotate-90" : ""}`}>
                                ▸
                              </span>
                              <span className="text-xs font-bold uppercase tracking-[0.08em] text-leaf">{group.label}</span>
                              <span className="text-[13px] text-muted">
                                {group.entries.length} {group.entries.length === 1 ? "food" : "foods"} · {formatValue(kcal)} kcal
                              </span>
                            </button>
                          </h4>
                          {mealOpen && (
                            <ul id={listId} className="divide-y divide-line pl-5">
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
                          )}
                        </section>
                      );
                    })}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
