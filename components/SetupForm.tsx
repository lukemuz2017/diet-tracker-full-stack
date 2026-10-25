"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { WeekCalendar } from "@/components/WeekCalendar";
import { PageHeader } from "@/components/ui/Card";
import { InfoButton } from "@/components/ui/InfoButton";
import { CalendarIcon } from "@/components/ui/icons";
import { CheckboxPills, ChoiceField, FieldError, TextField } from "@/components/ui/Field";
import {
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  LIFE_STAGE_OPTIONS,
  PATTERN_OPTIONS,
  SEX_OPTIONS,
  asksLifeStage,
  type Profile,
} from "@/lib/profile";
import { EMPTY_SETUP, birthInputFrom, formatBirthInput, switchUnits, validateSetup, valuesFromProfile, type SetupField, type SetupValues } from "@/lib/setup";
import { updateData, useSavedData } from "@/lib/storage";
import { useToday } from "@/lib/useToday";

export function SetupScreen() {
  const data = useSavedData();
  const today = useToday();
  const editing = Boolean(data?.profile);

  return (
    <>
      <PageHeader
        eyebrow={editing ? undefined : "Step 1 of 2"}
        title={editing ? "Edit your details" : "Your details"}
        back={editing ? { href: "/profile", label: "Profile" } : undefined}
        description={
          editing
            ? "Change anything and save. Your ranges update to match."
            : "Six quick questions, plus optional diet notes. We use them only to estimate your daily ranges and tailor suggestions, and they stay on this device."
        }
      />
      {/* The form waits for saved data so editing starts prefilled. */}
      {data && today && <SetupForm key={editing ? "edit" : "new"} saved={data.profile} today={today} />}
    </>
  );
}


/** Where focus goes when a field has an error, in form order. */
function firstErrorTarget(field: SetupField, values: SetupValues) {
  if (field === "height") return values.units === "us" ? "setup-height-ft" : "setup-height-cm";
  if (field === "birthDate") return "setup-birth";
  if (field === "sex") return `sex-${values.sex ?? "female"}`;
  if (field === "activity") return `activity-${values.activity ?? "sedentary"}`;
  return `setup-${field}`;
}

/** The typed date as "YYYY-MM-DD" when it reads as one, else null. */
function typedBirthDate(text: string): string | null {
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  return parts ? `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}` : null;
}

/**
 * Date of birth: type it as month/day/year (the slashes fill in), or open the
 * calendar from the button in the box, with month and year menus.
 */
function BirthDateField({
  values,
  set,
  today,
  error,
}: {
  values: SetupValues;
  set: (patch: Partial<SetupValues>) => void;
  today: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const calendarId = useId();
  const input = useRef<HTMLInputElement>(null);
  const picked = typedBirthDate(values.birthDate);
  const thisYear = Number(today.slice(0, 4));
  // With nothing typed yet, the calendar opens on a typical adult's birth year.
  const start = picked && picked <= today ? picked : `${thisYear - 30}-${today.slice(5, 7)}-01`;

  return (
    <div
      className="flex flex-col gap-1.5"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
        }
      }}
    >
      <span className="flex items-center gap-1.5">
        <label htmlFor="setup-birth" className="text-[15px] font-bold">
          Date of birth
        </label>
        <InfoButton label="About date of birth">Used only to work out your age. Stays on this device.</InfoButton>
      </span>
      <div
        className={`field-box flex h-12 items-center rounded-field bg-white pl-3.5 ${error ? "border-2 border-tomato" : "border-[1.5px] border-field"}`}
      >
        <input
          ref={input}
          id="setup-birth"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="e.g. 02/19/1995"
          value={values.birthDate}
          onChange={(event) => set({ birthDate: formatBirthInput(event.target.value) })}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "setup-birth-error" : undefined}
          className="min-w-0 flex-1 bg-transparent text-base text-soil placeholder:text-muted"
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={calendarId}
          aria-label={open ? "Close calendar" : "Pick from a calendar"}
          onClick={() => setOpen((value) => !value)}
          className="grid size-11 flex-none place-items-center rounded-full text-leaf hover:bg-track"
        >
          <CalendarIcon width={22} height={22} />
        </button>
      </div>
      {open && (
        <div id={calendarId} className="w-full rounded-card border-[1.5px] border-line shadow-sm">
          <WeekCalendar
            end={start}
            selected={picked}
            min={`${thisYear - 100}-01-01`}
            max={today}
            week={false}
            jump
            onPick={(date) => {
              set({ birthDate: birthInputFrom(date) });
              setOpen(false);
              requestAnimationFrame(() => input.current?.focus());
            }}
          />
        </div>
      )}
      {error && <FieldError id="setup-birth-error">{error}</FieldError>}
    </div>
  );
}

export function SetupForm({ saved, today }: { saved: Profile | null; today: string }) {
  const router = useRouter();
  const [values, setValues] = useState<SetupValues>(saved ? valuesFromProfile(saved) : EMPTY_SETUP);
  // Errors show after the first submit, then update as the person fixes them.
  const [submitted, setSubmitted] = useState(false);
  const { errors } = validateSetup(values, today);
  const shown = submitted ? errors : {};

  const set = (patch: Partial<SetupValues>) => setValues((current) => ({ ...current, ...patch }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const result = validateSetup(values, today);
    if (!result.profile) {
      const order: SetupField[] = ["height", "weight", "birthDate", "sex", "activity"];
      const first = order.find((field) => result.errors[field])!;
      document.getElementById(firstErrorTarget(first, values))?.focus();
      return;
    }
    const profile = result.profile;
    updateData((data) => ({ ...data, profile }));
    router.push("/profile");
  }

  const us = values.units === "us";

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-md flex-col gap-6">
      <ChoiceField
        name="units"
        legend="Units"
        options={[
          { value: "us", label: "ft, in, lb" },
          { value: "metric", label: "cm, kg" },
        ]}
        value={values.units}
        onChange={(units) => setValues((current) => switchUnits(current, units))}
      />

      {us ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-[15px] font-bold">Height</legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="setup-height-ft"
              label="Feet"
              unit={{ short: "ft", long: "feet" }}
              inputMode="numeric"
              autoComplete="off"
              value={values.heightFt}
              onChange={(event) => set({ heightFt: event.target.value })}
              invalid={Boolean(shown.height)}
              aria-describedby={shown.height ? "setup-height-error" : undefined}
              className="[&_label]:sr-only"
            />
            <TextField
              id="setup-height-in"
              label="Inches"
              unit={{ short: "in", long: "inches" }}
              inputMode="numeric"
              autoComplete="off"
              value={values.heightIn}
              onChange={(event) => set({ heightIn: event.target.value })}
              invalid={Boolean(shown.height)}
              aria-describedby={shown.height ? "setup-height-error" : undefined}
              className="[&_label]:sr-only"
            />
          </div>
          {shown.height && <FieldError id="setup-height-error">{shown.height}</FieldError>}
        </fieldset>
      ) : (
        <TextField
          id="setup-height-cm"
          label="Height"
          unit={{ short: "cm", long: "centimeters" }}
          inputMode="decimal"
          autoComplete="off"
          value={values.heightCm}
          onChange={(event) => set({ heightCm: event.target.value })}
          error={shown.height}
        />
      )}

      <TextField
        id="setup-weight"
        label="Weight"
        info="Used only to estimate your needs. Stays on this device."
        unit={us ? { short: "lb", long: "pounds" } : { short: "kg", long: "kilograms" }}
        inputMode="decimal"
        autoComplete="off"
        value={values.weight}
        onChange={(event) => set({ weight: event.target.value })}
        error={shown.weight}
      />

      <BirthDateField values={values} set={set} today={today} error={shown.birthDate} />

      <ChoiceField
        name="sex"
        legend="Sex"
        info="Calorie and vitamin estimates differ by sex; non-binary uses a blend of both. Stays on this device."
        options={SEX_OPTIONS}
        value={values.sex}
        onChange={(sex) => set({ sex })}
        error={shown.sex}
      />

      <ChoiceField
        name="activity"
        legend="Activity in a typical week"
        options={ACTIVITY_OPTIONS}
        value={values.activity}
        onChange={(activity) => set({ activity })}
        error={shown.activity}
      />

      <fieldset className="flex flex-col gap-5 rounded-card border-[1.5px] border-line bg-paper p-4">
        <legend className="px-1 font-display text-lg font-extrabold">
          Diet notes <span className="text-sm font-normal text-muted">(optional)</span>
        </legend>
        <ChoiceField
          name="pattern"
          legend="How do you eat?"
          options={PATTERN_OPTIONS}
          value={values.pattern}
          onChange={(pattern) => set({ pattern })}
        />
        <CheckboxPills
          name="allergies"
          legend="Allergies or intolerances"
          options={ALLERGEN_OPTIONS}
          values={values.allergies}
          onChange={(allergies) => set({ allergies })}
        />
        {asksLifeStage(values.sex) && (
          <ChoiceField
            name="lifeStage"
            legend="Pregnant or breastfeeding?"
            hint="Uses the official calorie, protein, iron and vitamin values for pregnancy or breastfeeding."
            options={LIFE_STAGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
            value={values.lifeStage}
            onChange={(lifeStage) => set({ lifeStage })}
          />
        )}
      </fieldset>

      <Button type="submit" className="min-h-12 self-start px-7 text-[17px]">
        {saved ? "Save and update my ranges" : "See my ranges"}
      </Button>
    </form>
  );
}
