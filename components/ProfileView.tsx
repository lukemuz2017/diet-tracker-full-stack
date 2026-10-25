"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { InfoButton } from "@/components/ui/InfoButton";
import { formatValue } from "@/lib/log";
import { NUTRIENT_GROUPS, NUTRIENTS } from "@/lib/nutrients";
import { addDays, formatDay } from "@/lib/dates";
import { ALLERGEN_OPTIONS, LIFE_STAGE_OPTIONS, PATTERN_OPTIONS, dietOf, profileFacts, type Profile, asksLifeStage } from "@/lib/profile";
import { isSample, SAMPLE_DAYS, withSample, withoutSample } from "@/lib/sample";
import { updateData, useSavedData, type SavedData } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { useToday } from "@/lib/useToday";
import { computeTargets, explainTarget, formatTarget, maintenanceCalories } from "@/lib/targets";

// Your profile: the details you entered, the maintenance estimate they give,
// and the daily ranges that follow from them (each with an explanation).
export function ProfileView() {
  const data = useSavedData();
  const today = useToday();
  if (!data?.profile || !today) return <PageHeader title="Your profile" />;

  const { profile } = data;
  const targets = computeTargets(profile, today);
  const firstVisit = data.entries.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={firstVisit ? "Step 2 of 2" : undefined}
        title="Your profile"
      />
      <div className="flex max-w-2xl flex-col gap-5">
        {/* Right after setup, the next step comes first, not after the ranges. */}
        {firstVisit && (
          <ButtonLink href="/log?add=1" className="min-h-12 self-start px-7 text-[17px]">
            Log your first food
          </ButtonLink>
        )}
        <MemberCard profile={profile} today={today} />

        <h2 className="-mb-2 mt-2 font-display text-2xl font-extrabold">Your daily ranges</h2>
        {NUTRIENT_GROUPS.map((group, index) => (
          <Card key={group.title} className={`flex flex-col gap-1 border-t-[6px] ${GROUP_ACCENTS[index]}`}>
            <h3 className="font-display text-xl font-extrabold">{group.title}</h3>
            <ul className="divide-y divide-line">
              {group.keys.map((key) => {
                const { label } = NUTRIENTS[key];
                const range = formatTarget(key, targets[key]);
                return (
                  <li key={key} className="relative flex items-center justify-between gap-4 py-3">
                    <span className="flex items-center gap-2 font-bold">
                      {label}
                      <InfoButton label={`About the ${label.toLowerCase()} range`} anchor="parent">
                        <b>
                          {label}: {range} a day.
                        </b>{" "}
                        {explainTarget(key, profile, targets, today)}
                      </InfoButton>
                    </span>
                    <span className="text-right tabular-nums">{range}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

        <p className="text-sm text-muted">
          Estimates, not medical advice.{" "}
          <Link href="/faq" className="font-bold text-leaf underline underline-offset-[3px]">
            How the ranges and averages work
          </Link>
        </p>

        {!firstVisit && (
          <ButtonLink href="/log" className="min-h-12 self-start px-7 text-[17px]">
            Back to your dashboard
          </ButtonLink>
        )}

        <SampleData data={data} today={today} />
      </div>
    </>
  );
}

/** Top edges for the range groups: macros, get enough of. */
const GROUP_ACCENTS = ["border-leaf", "border-lemon", "border-carrot"];
/** Stat tiles get a colored top edge each, like price cards. */
const STAT_ACCENTS: Record<string, string> = { Height: "border-leaf", Weight: "border-lemon", Age: "border-carrot" };

/**
 * Your details as a farmers-market member card: light green card (it stood out too little on the brown-bag page), big stat tiles,
 * sex and activity chips, the maintenance estimate as a lemon badge, and the
 * diet notes as tags.
 */
function MemberCard({ profile, today }: { profile: Profile; today: string }) {
  const facts = profileFacts(profile, today);
  const stat = (label: string) => facts.find((fact) => fact.label === label)!.value;
  const diet = dietOf(profile);
  const lifeStage = LIFE_STAGE_OPTIONS.find((option) => option.value === diet.lifeStage)!;
  const kcal = Math.round(maintenanceCalories(profile, today) / 10) * 10;

  return (
    <section aria-labelledby="details-title" className="flex flex-col gap-4 rounded-card border-[1.5px] border-band bg-celery p-5 shadow-[3px_4px_0_rgb(46_107_63_/_0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-lemon font-display text-xl font-extrabold shadow-[0_2px_0_rgb(31_42_28_/_0.15)]">
            ✿
          </span>
          <h2 id="details-title" className="font-display text-xl font-extrabold">
            Your details
          </h2>
        </div>
        <ButtonLink href="/setup" variant="secondary" className="bg-paper">
          Edit details
        </ButtonLink>
      </div>

      <dl className="grid grid-cols-3 gap-2.5">
        {["Height", "Weight", "Age"].map((label) => (
          <div key={label} className={`rounded-xl border-t-4 bg-paper px-3 py-2.5 ${STAT_ACCENTS[label]}`}>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
            <dd className="whitespace-nowrap font-display text-xl font-extrabold leading-tight sm:text-2xl">{stat(label)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-leaf-tint px-3 py-1 text-sm font-bold">{stat("Sex")}</span>
        <span className="rounded-full bg-lemon-tint px-3 py-1 text-sm font-bold">{stat("Activity")}</span>
        <span className="ml-auto rounded-full bg-lemon px-3.5 py-1.5 text-sm font-bold">
          <span aria-hidden="true">★ </span>Maintenance about {formatValue(kcal)} kcal a day
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-band pt-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Diet notes</h3>
        {diet.pattern === "everything" && diet.allergies.length === 0 && diet.lifeStage === "none" ? (
          <p className="text-sm">
            None yet. Add your eating pattern{asksLifeStage(profile.sex) ? ", allergies or a pregnancy" : " or allergies"} in{" "}
            <Link href="/setup" className="font-bold text-leaf underline underline-offset-[3px]">
              Edit details
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {diet.pattern !== "everything" && (
              <li className="rounded-full bg-leaf px-3 py-1 text-sm font-bold text-white">
                {PATTERN_OPTIONS.find((option) => option.value === diet.pattern)!.label}
              </li>
            )}
            {diet.allergies.map((allergen) => (
              <li key={allergen} className="rounded-full bg-carrot/30 px-3 py-1 text-sm font-bold">
                No {ALLERGEN_OPTIONS.find((option) => option.value === allergen)!.contains}
              </li>
            ))}
            {diet.lifeStage !== "none" && <li className="rounded-full bg-band px-3 py-1 text-sm font-bold">{lifeStage.short}</li>}
          </ul>
        )}
        {diet.pattern === "vegan" && (
          <p className="text-[13px] text-muted">
            Vegan diets need a vitamin B12 source, like fortified foods or a supplement. This app doesn’t track B12.
          </p>
        )}
        {diet.lifeStage !== "none" && (
          <p className="text-[13px] text-muted">Your ranges use the official values for pregnancy or breastfeeding. Your doctor or midwife knows best.</p>
        )}
      </div>
    </section>
  );
}

/**
 * Two weeks of example meals, for trying the app (or showing it) without
 * logging every day by hand. Asks on the page before changing anything.
 */
function SampleData({ data, today }: { data: SavedData; today: string }) {
  const [confirming, setConfirming] = useState(false);
  const hasSample = data.entries.some(isSample);
  const range = `${formatDay(addDays(today, -SAMPLE_DAYS))} – ${formatDay(addDays(today, -1))}`;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-extrabold">Sample data</h2>
      {hasSample ? (
        <>
          <p className="text-[15px] text-muted">Example meals are loaded for the days before today. Clearing them keeps everything you logged.</p>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              updateData(withoutSample);
              showToast("Removed the sample meals");
            }}
          >
            Clear sample data
          </Button>
        </>
      ) : confirming ? (
        <>
          <p className="text-[15px]">
            Add example meals for <b>{range}</b>? Days you already logged are left alone, and you can clear the samples
            here later.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                updateData((saved) => withSample(saved, today, data.profile ? maintenanceCalories(data.profile, today) : undefined));
                setConfirming(false);
                showToast("Added two weeks of sample meals");
              }}
            >
              Yes, add sample meals
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted">Want to see how full weeks look? Load two weeks of example meals.</p>
          <Button variant="secondary" className="self-start" onClick={() => setConfirming(true)}>
            Load a sample 2 weeks
          </Button>
        </>
      )}
    </Card>
  );
}
