import type { ComponentProps, ReactNode } from "react";
import { AlertIcon } from "./icons";
import { InfoButton } from "./InfoButton";

// Shared form fields (design.md: Form field). Every field has a visible label,
// an optional hint for "why we ask", and an error next to the field that says
// what to do. Callers keep the typed value in state, so an error never clears it.

function describedBy(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm font-bold text-tomato">
      <AlertIcon width={16} height={16} className="flex-none" />
      {children}
    </p>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  invalid = false,
  unit,
  info,
  className = "",
  "aria-describedby": extraDescribedBy,
  ...inputProps
}: Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Marks the field invalid when its message is shown elsewhere (e.g. a group's). */
  invalid?: boolean;
  /** Shown after the input; `long` is read out with the label. */
  unit?: { short: string; long: string };
  /** A note behind an ⓘ button beside the label, e.g. why we ask. */
  info?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const isInvalid = Boolean(error) || invalid;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[15px] font-bold">
          {label}
          {unit && <span className="sr-only"> in {unit.long}</span>}
        </label>
        {info && <InfoButton label={`About ${label.toLowerCase()}`}>{info}</InfoButton>}
      </span>
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      <div
        className={`field-box flex h-12 items-center gap-2 rounded-field bg-white px-3.5 ${
          isInvalid ? "border-2 border-tomato" : "border-[1.5px] border-field"
        }`}
      >
        <input
          id={id}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={describedBy(hintId, errorId, extraDescribedBy)}
          className="min-w-0 flex-1 bg-transparent text-base text-soil"
          {...inputProps}
        />
        {unit && (
          <span className="text-muted" aria-hidden="true">
            {unit.short}
          </span>
        )}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

const choiceBase =
  "cursor-pointer border-[1.5px] border-field bg-white has-checked:border-leaf has-checked:bg-leaf has-checked:text-white has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-soil has-focus-visible:outline-solid";

/** Several choices at once, as pills (same look as ChoiceField). */
export function CheckboxPills<T extends string>({
  name,
  legend,
  hint,
  info,
  options,
  values,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: ReactNode;
  /** A note behind an ⓘ button beside the legend. */
  info?: ReactNode;
  options: readonly { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hintId}>
      <legend className="flex items-center gap-1.5 pb-1.5 text-[15px] font-bold">
        {legend}
        {info && <InfoButton label={`About ${legend.toLowerCase()}`}>{info}</InfoButton>}
      </legend>
      {hint && (
        <p id={hintId} className="-mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={`${choiceBase} inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold`}>
            <input
              type="checkbox"
              id={`${name}-${option.value}`}
              checked={values.includes(option.value)}
              onChange={(event) =>
                onChange(event.target.checked ? [...values, option.value] : values.filter((value) => value !== option.value))
              }
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Radio choices as pills, or as stacked cards when options have descriptions.
 * Each radio's id is `${name}-${value}`, so a form can focus the first one.
 */
export function ChoiceField<T extends string>({
  name,
  legend,
  hint,
  info,
  error,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: ReactNode;
  /** A note behind an ⓘ button beside the legend. */
  info?: ReactNode;
  error?: string;
  options: readonly { value: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const stacked = options.some((option) => option.description);

  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={describedBy(hintId, errorId)}>
      <legend className="flex items-center gap-1.5 pb-1.5 text-[15px] font-bold">
        {legend}
        {info && <InfoButton label={`About ${legend.toLowerCase()}`}>{info}</InfoButton>}
      </legend>
      {hint && (
        <p id={hintId} className="-mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
      <div className={stacked ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        {options.map((option) => (
          <label
            key={option.value}
            className={
              stacked
                ? `${choiceBase} group flex flex-col rounded-field px-4 py-2.5`
                : `${choiceBase} inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold`
            }
          >
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {stacked ? (
              <>
                <span className="text-[15px] font-bold">{option.label}</span>
                <span className="text-[13px] text-muted group-has-checked:text-leaf-tint">
                  {option.description}
                </span>
              </>
            ) : (
              option.label
            )}
          </label>
        ))}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
