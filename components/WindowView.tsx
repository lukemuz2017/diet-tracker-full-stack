"use client";

import { MacroSplit, NutrientByDay } from "@/components/HistoryCharts";
import { NutrientBar } from "@/components/NutrientBar";
import { Card } from "@/components/ui/Card";
import { formatDay } from "@/lib/dates";
import { NUTRIENT_KEYS, statusFor } from "@/lib/log";
import { NUTRIENT_GROUPS } from "@/lib/nutrients";
import { profileAge, type Profile } from "@/lib/profile";
import type { SavedData } from "@/lib/storage";
import { computeTargets } from "@/lib/targets";
import { summarizeWindow, type DayState } from "@/lib/week";

const STATE_LABEL: Record<DayState, string> = {
  complete: "complete",
  open: "not marked complete",
  missed: "not logged",
};

/** A day is marked ✓ when at least this share of its nutrients were in range. */
const GOOD_DAY_SHARE = 0.8;
const RING = 2 * Math.PI * 15;

/**
 * One day's badge: a ring that fills (leaf) with the share of that day's
 * nutrients in range, a ✓ for a good day, faded until the day is marked
 * complete, and a dashed ring when nothing is logged.
 */
export function DayBadge({ state, share }: { state: DayState; share: number | null }) {
  const dashed = state === "missed" || share === null;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" fill="var(--color-paper)" />
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke={dashed ? "var(--color-field)" : "var(--color-track)"}
        strokeWidth="4"
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      {share !== null && share > 0 && (
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--color-leaf)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${share * RING} ${RING}`}
          transform="rotate(-90 18 18)"
          opacity={state === "complete" ? 1 : 0.55}
        />
      )}
      {share !== null && share >= GOOD_DAY_SHARE && (
        <path d="M12 18.5l4 4 8-8.5" fill="none" stroke="var(--color-leaf)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/**
 * The 7 days ending on `end`: a score card ("X of 11 nutrients in range",
 * days logged, the day strip), then either each nutrient's bar against its
 * target ("bars", for Dashboard) or high-level charts ("charts", for History).
 */
export function WindowView({
  data,
  profile,
  end,
  today,
  detail = "bars",
}: {
  data: SavedData;
  profile: Profile;
  end: string;
  today: string;
  detail?: "bars" | "charts";
}) {
  const targets = computeTargets(profile, today);
  const summary = summarizeWindow(data, end, targets);
  // Per day: the share of nutrients with a value that were in range.
  const dayShare = summary.days.map((day) => {
    const known = NUTRIENT_KEYS.filter((key) => day.totals[key] !== undefined);
    if (known.length === 0) return null;
    const inRange = known.filter((key) => statusFor(key, targets[key], day.totals[key]).kind === "in-range").length;
    return { inRange, known: known.length, share: inRange / known.length };
  });

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card className="flex flex-col gap-4">
        {detail === "charts" && (
          <h2 className="font-display text-xl font-extrabold">
            {formatDay(summary.start)} – {formatDay(summary.end)}
          </h2>
        )}
        <ol className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
          {summary.days.map((day, index) => {
            const score = dayShare[index];
            return (
              <li key={day.date} className="flex flex-col items-center gap-1">
                <DayBadge state={day.state} share={score?.share ?? null} />
                <span aria-hidden="true">{formatDay(day.date).slice(0, 3)}</span>
                <span className="sr-only">
                  {formatDay(day.date)}: {score ? `${score.inRange} of ${score.known} nutrients in range, ` : ""}
                  {STATE_LABEL[day.state]}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted">
          Green ring: share of that day’s nutrients in range · ✓ mostly in range · Faded: not marked complete · Dashed: not logged
        </p>
      </Card>

      {detail === "charts" ? (
        <>
          {summary.logged > 0 && <NutrientByDay summary={summary} targets={targets} />}
          {summary.counted > 0 && <MacroSplit averages={summary.averages} teen={profileAge(profile, today) <= 18} />}
        </>
      ) : summary.counted === 0 ? (
        <Card>
          <p className="text-[15px]">
            {end === today
              ? "Your weekly balance starts when you finish your first day. Mark today complete on the Dashboard, or come back tomorrow."
              : "No complete days in this week."}
          </p>
        </Card>
      ) : (
        NUTRIENT_GROUPS.map((group) => (
          <Card key={group.title} className="flex flex-col gap-5">
            <h2 className="font-display text-xl font-extrabold">{group.title}</h2>
            {group.keys.map((key) => (
              <NutrientBar key={key} nutrient={key} target={targets[key]} value={summary.averages[key]} />
            ))}
          </Card>
        ))
      )}

      {summary.counted > 0 && summary.counted < 3 && (
        <p className="text-sm text-muted">Based on {summary.counted} complete {summary.counted === 1 ? "day" : "days"} so far.</p>
      )}
    </div>
  );
}
