"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { AddFoodPanel } from "@/components/AddFood";
import { AmountSelect } from "@/components/FoodRow";
import { WeekCalendar } from "@/components/WeekCalendar";
import { WeekRibbons } from "@/components/WeekRibbons";
import { DashboardStickers } from "@/components/DashboardStickers";
import { WeekSummary } from "@/components/WeekSummary";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Card, PageHeader } from "@/components/ui/Card";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { changeServings, removeEntry, setDayComplete } from "@/lib/actions";
import { multipleFor, quantityFor } from "@/lib/amounts";
import { addDays, formatDay, formatShortDay, weekdayName } from "@/lib/dates";
import { amountFor } from "@/lib/foods";
import { dayHighlights } from "@/lib/highlights";
import { formatValue, totalsFor } from "@/lib/log";
import { MEALS, byMeal, mealAt, type Meal } from "@/lib/meals";
import { NUTRIENT_GROUPS, NUTRIENTS } from "@/lib/nutrients";
import { readTray, useSavedData, writeTray, type Entry, type SavedData, type TrayItem } from "@/lib/storage";
import { computeTargets } from "@/lib/targets";
import { useToday } from "@/lib/useToday";
import { WINDOW_DAYS, currentWindowEnd, dayState, type DayState } from "@/lib/week";

// Dashboard, one page: a summary, a Today strip (where you log and mark the
// day complete), and the week ribbons (each nutrient, each day, and the
// average that counts). "+ Add food" opens a pop-up form (also opened by
// /log?add=1, e.g. "Log your first food"); clicking a day opens that day in a
// side panel. Foods picked in Add food but not added yet live here, saved for
// the tab, so closing the pop-up or visiting New recipe keeps them.
export function FoodLog() {
  const data = useSavedData();
  const today = useToday();
  const router = useRouter();
  const requested = useSearchParams().get("add") === "1";
  const [autoOpen, setAutoOpen] = useState(requested);
  const [addDate, setAddDate] = useState<string | null>(null);
  // The time of day picks the meal; only read in the browser.
  const [addMeal, setAddMeal] = useState<Meal>(() => (typeof window === "undefined" ? "breakfast" : mealAt(new Date())));
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [staged, setStaged] = useState<TrayItem[]>(() => readTray());
  useEffect(() => writeTray(staged), [staged]);
  if (!data?.profile || !today) return <PageHeader title="Dashboard" />;

  // The day Add food is open for, if it's open.
  const openDate = addDate ?? (autoOpen ? today : null);
  function closeAdd() {
    setAddDate(null);
    if (autoOpen) {
      setAutoOpen(false);
      router.replace("/log", { scroll: false });
    }
  }
  const addLabel = staged.length ? `Add food · ${staged.length} picked` : "Add food";

  // The 7 days that count: ending yesterday until today is marked complete.
  const end = currentWindowEnd(data.completeDays, today);
  const start = addDays(end, -(WINDOW_DAYS - 1));
  const firstFood = data.entries.length === 1;
  // Nothing logged yet: one clear prompt instead of an empty grid.
  const nothingYet = data.entries.length === 0;

  // Opened from a meal's "+ Add", that meal; otherwise a guess from the time of day.
  function openAdd(date: string, meal: Meal = mealAt(new Date())) {
    setAddMeal(meal);
    setAddDate(date);
  }

  return (
    <div className="relative max-w-4xl">
      {nothingYet ? (
        <section aria-labelledby="dashboard-first" className="mb-4 mt-1 flex flex-col items-start gap-4 rounded-card border-l-[6px] border-leaf bg-paper p-6 sm:mt-3 sm:p-8">
          <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight">Dashboard</h1>
          <p id="dashboard-first" className="max-w-md font-display text-2xl font-extrabold leading-snug text-leaf sm:text-3xl">
            Log what you ate today to start your week.
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => openAdd(today)}
            className="inline-flex min-h-14 items-center gap-2 rounded-full bg-leaf px-8 font-display text-xl font-extrabold text-white hover:bg-leaf-dark"
          >
            <PlusIcon width={22} height={22} strokeWidth={2.25} />
            {addLabel}
          </button>
        </section>
      ) : (
        <>
          <DashboardStickers />
          <WeekSummary data={data} profile={data.profile} today={today} end={end} range={`${formatShortDay(start)} – ${formatShortDay(end)}`} />
          <TodayStrip data={data} today={today} addLabel={addLabel} onAdd={() => openAdd(today)} onOpen={() => setOpenDay(today)} />
        </>
      )}

      <Dialog open={openDate !== null} onClose={closeAdd} title="Add food">
        {openDate && (
          <>
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
              <DayPicker date={openDate} today={today} earliest={start} onPick={setAddDate} />
              <MealPicker value={addMeal} onChange={setAddMeal} />
            </div>
            <AddFoodPanel
              data={data}
              date={openDate}
              meal={addMeal}
              today={today}
              staged={staged}
              setStaged={setStaged}
              onDone={closeAdd}
            />
          </>
        )}
      </Dialog>

      <Dialog open={openDay !== null} onClose={() => setOpenDay(null)} title={openDay ? dayName(openDay, today) : ""} side="right">
        {openDay && <DayCard data={data} date={openDay} today={today} onAdd={(meal) => openAdd(openDay, meal)} inPanel />}
      </Dialog>

      {firstFood && (
        <p role="status" className="mb-5 rounded-2xl bg-leaf-tint px-4 py-3 text-[15px]">
          <b>First food logged.</b> When you’re done eating for the day, mark it complete in the Today row and it joins
          your numbers.
        </p>
      )}

      {!nothingYet && <WeekRibbons data={data} profile={data.profile} today={today} end={end} onOpenDay={setOpenDay} />}
    </div>
  );
}

/**
 * The day to add food to: a button showing the day that drops down a month
 * calendar, from the first day of the window to today.
 */
function DayPicker({ date, today, earliest, onPick }: { date: string; today: string; earliest: string; onPick: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const calendarId = useId();
  const button = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          // Close just the calendar, not the whole pop-up.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <span className="text-[15px] font-bold">Day</span>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={calendarId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 max-w-xs items-center justify-between gap-3 rounded-field border-[1.5px] border-field bg-white px-3.5 text-left text-base"
      >
        <span>
          <b>{dayName(date, today)}</b>
          {(date === today || date === addDays(today, -1)) && <span className="text-muted"> · {formatDay(date)}</span>}
        </span>
        <span aria-hidden="true" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div id={calendarId} className="w-full max-w-xs rounded-card border-[1.5px] border-line shadow-sm">
          <WeekCalendar
            end={date}
            min={earliest}
            max={today}
            week={false}
            onPick={(picked) => {
              onPick(picked);
              setOpen(false);
              requestAnimationFrame(() => button.current?.focus());
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Today, above the week: calories so far, status, Add food and Mark complete.
 * Today isn't in the ribbons until it's complete, so this is where it lives.
 */
function TodayStrip({
  data,
  today,
  addLabel,
  onAdd,
  onOpen,
}: {
  data: SavedData;
  today: string;
  addLabel: string;
  onAdd: () => void;
  onOpen: () => void;
}) {
  const { totals, foods } = totalsFor(data.entries.filter((entry) => entry.date === today));
  const marked = data.completeDays.includes(today);
  const chip = STATE_CHIP[dayState(foods, marked)];
  return (
    <section aria-label="Today" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border-l-[6px] border-kraft bg-paper p-3 sm:px-5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-extrabold">Today</h2>
        <span className="text-sm text-muted">{formatDay(today)}</span>
        {foods > 0 && <span className="text-[15px] font-bold">{formatValue(totals.calories ?? 0)} kcal</span>}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.className}`}>{chip.text}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {foods > 0 && (
          <>
            <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-leaf hover:bg-track">
              See meals
            </button>
            <button
              type="button"
              aria-pressed={marked}
              onClick={() => setDayComplete(today, !marked)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                marked ? "bg-leaf text-white hover:bg-leaf-dark" : "border-[1.5px] border-soil text-soil hover:bg-track"
              }`}
            >
              {marked && <CheckIcon width={16} height={16} strokeWidth={2.5} />}
              {marked ? "Day complete" : "Mark complete"}
            </button>
          </>
        )}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onAdd}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-leaf px-6 font-display text-[17px] font-extrabold text-white hover:bg-leaf-dark"
        >
          <PlusIcon width={20} height={20} strokeWidth={2.25} />
          {addLabel}
        </button>
      </div>
    </section>
  );
}

function dayName(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return formatDay(day);
}

const STATE_CHIP: Record<DayState, { text: string; className: string }> = {
  complete: { text: "Complete", className: "bg-leaf text-white" },
  open: { text: "Not complete", className: "border-[1.5px] border-soil text-soil" },
  missed: { text: "Not logged", className: "border-[1.5px] border-dashed border-muted text-muted" },
};

/** One day in the side panel: calories, status, highlights, its foods, and actions. */
function DayCard({
  data,
  date,
  today,
  onAdd,
  inPanel = false,
}: {
  data: SavedData;
  date: string;
  today: string;
  onAdd: (meal: Meal) => void;
  /** In the side panel: no card, and the panel title names the day. */
  inPanel?: boolean;
}) {
  const entries = data.entries.filter((entry) => entry.date === date);
  const { totals, known, foods } = totalsFor(entries);
  const marked = data.completeDays.includes(date);
  const state: DayState = dayState(foods, marked);
  const chip = STATE_CHIP[state];
  const Box = inPanel ? "div" : Card;
  const canToggle = foods > 0;
  const showDate = date === today || date === addDays(today, -1);
  const detailsId = useId();
  const showDetails = true;
  const { wins, headsUp } = dayHighlights(totals, computeTargets(data.profile!, today));
  const shortName = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : weekdayName(date);

  return (
    <Box className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {!inPanel && (
                <h2 className="font-display text-xl font-extrabold">
                  {shortName}
                  <span className="sr-only">, {formatDay(date)}</span>
                </h2>
              )}
              {inPanel && showDate && <span className="text-sm text-muted">{formatDay(date)}</span>}
              {foods > 0 && <span className="text-[15px] font-bold">{formatValue(totals.calories ?? 0)} kcal</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.className}`}>{chip.text}</span>
            </div>
            {canToggle && (
              <button
                type="button"
                aria-pressed={marked}
                onClick={() => setDayComplete(date, !marked)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                  marked ? "bg-leaf text-white hover:bg-leaf-dark" : "border-[1.5px] border-soil text-soil hover:bg-track"
                }`}
              >
                {marked && <CheckIcon width={16} height={16} strokeWidth={2.5} />}
                {marked ? "Day complete" : "Mark complete"}
              </button>
            )}
          </div>

          {/* What the day did well, and at most one heads-up. */}
          {foods > 0 && (wins.length > 0 || headsUp) && (
            <ul aria-label="Highlights" className="flex flex-wrap gap-1.5">
              {wins.map((win) => (
                <li key={win} className="rounded-full bg-leaf-tint px-2.5 py-0.5 text-[13px] font-bold">
                  <span aria-hidden="true">✓ </span>
                  {win}
                </li>
              ))}
              {headsUp && <li className="rounded-full bg-carrot/25 px-2.5 py-0.5 text-[13px] font-bold">{headsUp}</li>}
            </ul>
          )}

        </div>
      </div>

      {showDetails && (
        <div id={detailsId} className="flex flex-col gap-3">
          <MealSections entries={entries} onAdd={onAdd} />
          {foods > 0 && (
          <details className="group">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-leaf">
              <span className="group-open:hidden">Show this day’s totals</span>
              <span className="hidden group-open:inline">Hide totals</span>
            </summary>
            <table className="w-full max-w-md text-[15px]">
              <caption className="sr-only">Totals for {formatDay(date)}</caption>
              <tbody className="divide-y divide-line">
                {NUTRIENT_GROUPS.flatMap((group) => group.keys)
                  .filter((key) => key !== "calories")
                  .map((key) => (
                    <tr key={key}>
                      <th scope="row" className="py-1.5 pr-3 text-left font-bold">
                        {NUTRIENTS[key].label}
                      </th>
                      <td className="py-1.5 text-right tabular-nums">
                        {totals[key] === undefined ? "–" : `${formatValue(totals[key]!)} ${NUTRIENTS[key].unit}`}
                        {totals[key] !== undefined && known[key] < foods && (
                          <span className="block text-xs text-muted">from {known[key]} of {foods} foods</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
          )}
        </div>
      )}
    </Box>
  );
}

/**
 * A day's foods under Breakfast, Lunch, Dinner and Snacks, each with its own
 * "+ Add". Meals start collapsed (name, food count, calories); tap one to see
 * its foods.
 */
function MealSections({ entries, onAdd }: { entries: Entry[]; onAdd: (meal: Meal) => void }) {
  const [open, setOpen] = useState<Meal[]>([]);
  const baseId = useId();
  const toggle = (meal: Meal) => setOpen((meals) => (meals.includes(meal) ? meals.filter((item) => item !== meal) : [...meals, meal]));

  return (
    <div className="flex flex-col">
      {byMeal(entries).map((group) => {
        const kcal = group.entries.reduce((sum, entry) => sum + (entry.nutrients.calories ?? 0), 0);
        const count = group.entries.length;
        const expanded = count > 0 && open.includes(group.meal);
        const listId = `${baseId}-${group.meal}`;
        const heading = (
          <>
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-leaf">{group.label}</span>
            <span className="text-[13px] text-muted">
              {count === 0 ? "Nothing yet" : `${count} ${count === 1 ? "food" : "foods"} · ${formatValue(kcal)} kcal`}
            </span>
          </>
        );
        return (
          <section key={group.meal} aria-label={group.label} className="border-t border-line py-1 first:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1">
                {count > 0 ? (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={listId}
                    onClick={() => toggle(group.meal)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left hover:bg-track/60"
                  >
                    <span aria-hidden="true" className={`text-xs text-muted transition-transform ${expanded ? "rotate-90" : ""}`}>
                      ▸
                    </span>
                    {heading}
                  </button>
                ) : (
                  <span className="flex min-h-11 items-center gap-2 pl-5">{heading}</span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => onAdd(group.meal)}
                aria-label={`Add food to ${group.label.toLowerCase()}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-leaf hover:bg-track"
              >
                <PlusIcon width={16} height={16} strokeWidth={2.25} /> Add
              </button>
            </div>
            {expanded && (
              <div id={listId} className="pl-5">
                <FoodList entries={group.entries} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Which meal the food goes in: four options, one chosen. */
function MealPicker({ value, onChange }: { value: Meal; onChange: (meal: Meal) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="pb-2 text-[15px] font-bold">Meal</legend>
      <div className="flex flex-wrap gap-2">
        {MEALS.map((meal) => (
          <label
            key={meal.value}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-field bg-white px-4 text-sm font-bold text-soil hover:bg-track has-checked:border-leaf has-checked:bg-leaf has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-soil"
          >
            <input
              type="radio"
              name={name}
              value={meal.value}
              checked={value === meal.value}
              onChange={() => onChange(meal.value)}
              className="sr-only"
            />
            {meal.value === "snack" ? "Snack" : meal.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Removes a food and puts focus on the next one, or the meal's "+ Add" if it was the last. */
function removeAndRefocus(event: MouseEvent<HTMLButtonElement>, id: string) {
  const row = event.currentTarget.closest("li");
  const meal = row?.closest("section");
  const sibling = (row?.nextElementSibling ?? row?.previousElementSibling)?.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]');
  removeEntry(id);
  requestAnimationFrame(() => (sibling ?? meal?.querySelector<HTMLButtonElement>('button[aria-label^="Add food to"]'))?.focus());
}

function FoodList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => {
        const spec = amountFor(entry.foodId);
        return (
          <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5">
            <span className="min-w-0">
              <b className="block leading-snug">{entry.name}</b>
              {entry.nutrients.calories !== undefined && (
                <span className="block text-sm text-muted">{formatValue(entry.nutrients.calories)} kcal</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <AmountSelect
                id={`amount-${entry.id}`}
                label={`Amount of ${entry.name}`}
                spec={spec}
                quantity={quantityFor(spec, entry.servings)}
                onChange={(quantity) => changeServings(entry.id, multipleFor(spec, quantity))}
              />
              <Button variant="quiet" onClick={(event) => removeAndRefocus(event, entry.id)} aria-label={`Remove ${entry.name}`}>
                Remove
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
