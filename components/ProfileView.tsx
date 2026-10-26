"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Card, PageHeader } from "@/components/ui/Card";
import { InitialsBadge } from "@/components/ui/InitialsBadge";
import { PlusIcon } from "@/components/ui/icons";
import { DIET_NOTES_ID } from "@/components/SetupForm";
import { handleOf, initialsOf } from "@/lib/names";
import { InfoButton } from "@/components/ui/InfoButton";
import { NUTRIENT_GROUPS, NUTRIENTS, WHY } from "@/lib/nutrients";
import { activitySummary } from "@/lib/activity";
import { addDays, formatDay, formatShortDay, toISODate } from "@/lib/dates";
import { ALLERGEN_OPTIONS, LIFE_STAGE_OPTIONS, PATTERN_OPTIONS, dietOf, profileFacts, type Profile, asksLifeStage } from "@/lib/profile";
import { isSample, SAMPLE_DAYS, withSample, withoutSample } from "@/lib/sample";
import { updateData, useSavedData, type SavedData } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { useToday } from "@/lib/useToday";
import { withUsual } from "@/lib/usual";
import { valuesFromProfile, validateSetup } from "@/lib/setup";
import { computeTargets, explainTarget, formatTarget, maintenanceCalories } from "@/lib/targets";

// Profile: the details you entered, the maintenance estimate they give,
// and the daily ranges that follow from them (each with an explanation).
export function ProfileView() {
  const data = useSavedData();
  const today = useToday();
  if (!data?.profile || !today) return <PageHeader title="Profile" />;

  const { profile } = data;
  const targets = withUsual(computeTargets(profile, today), data, today);
  const firstVisit = data.entries.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={firstVisit ? "Step 2 of 2" : undefined}
        title="Profile"
      />
      {/* From lg the details card is one wide strip and the ranges sit in 2 columns (3 from xl). */}
      <div className="flex max-w-2xl flex-col gap-5 lg:max-w-none">
        {/* Right after setup, the next step comes first, not after the ranges. */}
        {firstVisit && (
          <ButtonLink href="/log?add=1" className="min-h-12 self-start px-7 text-[17px]">
            Log your first food
          </ButtonLink>
        )}
        <MemberCard profile={profile} today={today} />
        <ActivityCard data={data} targets={targets} />

        <h2 className="mt-2 font-display text-2xl font-extrabold">Your daily ranges</h2>
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {NUTRIENT_GROUPS.map((group, index) => (
            <Card key={group.title} className={`flex flex-col gap-1 border-t-[6px] ${GROUP_ACCENTS[index]} ${group.keys.length > 6 ? "lg:row-span-2 xl:col-span-2 xl:row-span-1" : ""}`}>
              <h3 className="font-display text-xl font-extrabold">{group.title}</h3>
              <ul className={`divide-y divide-line ${group.keys.length > 6 ? "xl:grid xl:grid-cols-2 xl:gap-x-10 xl:items-start xl:[&>li:nth-last-child(-n+2)]:border-b-0" : ""}`}>
                {group.keys.map((key) => {
                  const { label } = NUTRIENTS[key];
                  const range = formatTarget(key, targets[key]);
                  return (
                    <li key={key} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                      <span className="flex items-center gap-2 font-bold">
                        {label}
                        <InfoButton label={`About the ${label.toLowerCase()} range`} anchor="parent">
                          <b>
                            {label}: {range} a day.
                          </b>{" "}
                          {WHY[key]} {explainTarget(key, profile, targets, today)}
                        </InfoButton>
                      </span>
                      <span className={`tabular-nums ${range.length <= 22 ? "whitespace-nowrap text-right" : "basis-full text-[15px] text-muted"}`}>{range}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
          {/* Beside Keep under on wide screens, the same height. */}
          <div className="flex flex-col lg:col-span-2 [&>*]:flex-1">
            <SampleData data={data} today={today} />
          </div>
        </div>

        {!firstVisit && (
          <ButtonLink href="/log" className="min-h-12 self-start px-7 text-[17px]">
            Back to your dashboard
          </ButtonLink>
        )}
      </div>
    </>
  );
}

/** Small facts about your use of the app, from your own entries (sample meals don't count). */
function ActivityCard({ data, targets }: { data: SavedData; targets: ReturnType<typeof computeTargets> }) {
  const { user } = useUser();
  const activity = activitySummary(data, targets);
  const since = user?.createdAt ? formatShortDay(toISODate(user.createdAt)) : "—";
  const tiles = [
    { label: "Member since", value: since, note: user?.createdAt ? String(user.createdAt.getFullYear()) : "" },
    { label: "Days logged", value: String(activity.daysLogged), note: `${activity.completeDays} marked complete` },
    { label: "Foods logged", value: String(activity.foods), note: "" },
    { label: "Days on target", value: String(activity.onTargetDays), note: `of ${activity.completeDays} complete ${activity.completeDays === 1 ? "day" : "days"}` },
  ];
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <h2 id="activity-title" className="font-display text-2xl font-extrabold">
        Your activity
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <div key={tile.label} className={`rounded-card border-t-4 bg-paper px-4 py-3 ${ACTIVITY_ACCENTS[index]}`}>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{tile.label}</dt>
            <dd className="font-display text-2xl font-extrabold leading-tight">{tile.value}</dd>
            {tile.note && <dd className="text-[13px] text-muted">{tile.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

const ACTIVITY_ACCENTS = ["border-leaf", "border-lemon", "border-carrot", "border-leaf"];

/**
 * Update weight in one step: a small form on the details card. It saves through
 * the same checks as Edit details, so the ranges recalculate from the new weight.
 */
function WeightUpdate({ profile, today }: { profile: Profile; today: string }) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | undefined>();
  const openRef = useRef<HTMLButtonElement>(null);
  const unit = profile.units === "us" ? { short: "lb", long: "pounds" } : { short: "kg", long: "kilograms" };

  function open() {
    setWeight(valuesFromProfile(profile).weight);
    setError(undefined);
    setEditing(true);
  }
  function close() {
    setEditing(false);
    // The form unmounts, so put focus back on the button that opened it.
    requestAnimationFrame(() => openRef.current?.focus());
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const { profile: next, errors } = validateSetup({ ...valuesFromProfile(profile), weight }, today);
    if (!next) {
      setError(errors.weight ?? "Couldn’t save. Check the rest of your details in Edit details.");
      return;
    }
    updateData((data) => ({ ...data, profile: next }));
    showToast("Weight updated. Your ranges now use it.");
    close();
  }

  if (!editing) {
    return (
      <Button ref={openRef} type="button" variant="quiet" className="self-start" onClick={open}>
        Update weight
      </Button>
    );
  }
  return (
    <form onSubmit={save} noValidate onKeyDown={(event) => event.key === "Escape" && close()} className="flex flex-wrap items-start gap-3">
      <TextField
        id="quick-weight"
        label="New weight"
        unit={unit}
        error={error}
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        inputMode="decimal"
        autoFocus
        className="w-52"
      />
      <div className="flex items-center gap-2 pt-[1.85rem]">
        <Button type="submit">Save</Button>
        <Button type="button" variant="quiet" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
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
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <section aria-labelledby="details-title" className="flex flex-col gap-4 rounded-card border-[1.5px] border-band bg-celery p-5 shadow-[3px_4px_0_rgb(46_107_63_/_0.18)] lg:flex-row lg:items-center lg:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-start lg:justify-start">
        <div className="flex min-w-0 items-center gap-3">
          {/* The same badge as the header's account button, with the name from Clerk. */}
          <InitialsBadge initials={initialsOf(user?.firstName, user?.lastName, email)} photo={user?.hasImage ? user.imageUrl : null} size="large" />
          <div className="min-w-0">
            <h2 id="details-title" className="truncate font-display text-xl font-extrabold">
              {user?.fullName || handleOf(email) || "Your details"}
            </h2>
          </div>
        </div>
        <ButtonLink href="/setup" variant="secondary" className="bg-paper">
          Edit details
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-2">
        <dl className="grid grid-cols-3 gap-2.5 lg:flex">
          {["Height", "Weight", "Age"].map((label) => (
            <div key={label} className={`rounded-xl border-t-4 bg-paper px-3 py-2.5 lg:min-w-28 ${STAT_ACCENTS[label]}`}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
              <dd className="whitespace-nowrap font-display text-xl font-extrabold leading-tight sm:text-2xl">{stat(label)}</dd>
            </div>
          ))}
        </dl>
        <WeightUpdate profile={profile} today={today} />
      </div>

      {/* Chips and diet notes: a column of their own from lg, set off by a rule. */}
      <div className="flex flex-col gap-4 lg:flex-1 lg:border-l lg:border-band lg:pl-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-leaf-tint px-3 py-1 text-sm font-bold">{stat("Sex")}</span>
        <span className="rounded-full bg-lemon-tint px-3 py-1 text-sm font-bold">{stat("Activity")}</span>
      </div>

      <div className="flex flex-col gap-2 border-t border-band pt-3 lg:border-t-0 lg:pt-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Diet notes</h3>
        {diet.pattern === "everything" && diet.allergies.length === 0 && diet.lifeStage === "none" ? (
          // One link straight to the diet notes in Edit details.
          <Link
            href={`/setup#${DIET_NOTES_ID}`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-[1.5px] border-dashed border-leaf bg-paper px-4 text-sm font-bold text-leaf hover:bg-leaf-tint"
          >
            <PlusIcon width={16} height={16} strokeWidth={2.5} />
            Add your eating pattern{asksLifeStage(profile.sex) ? ", allergies or a pregnancy" : " or allergies"}
          </Link>
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
          <p className="text-[15px] text-muted">
            Example meals are loaded for the days before today. Clearing or reloading them keeps everything you logged. Reload
            if the samples were added before a nutrient was tracked.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                updateData((saved) => withSample(withoutSample(saved), today, data.profile ? maintenanceCalories(data.profile, today) : undefined));
                showToast("Reloaded the sample meals");
              }}
            >
              Reload sample data
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                updateData(withoutSample);
                showToast("Removed the sample meals");
              }}
            >
              Clear sample data
            </Button>
          </div>
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
