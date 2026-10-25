// The person's name, kept in their Clerk account (Clerk asks for it at
// sign-up; Edit details can change it). Pure helpers for the badge and form.

export const NAME_MAX = 50;

/** The part of an email before the @, e.g. "muzikowski". */
export function handleOf(email: string | undefined): string {
  return email?.split("@")[0] ?? "";
}

/**
 * Two letters for the badge: "Luke Muzikowski" → "LM"; with no name, from
 * the email ("luke.muz@…" → "LM", "muzikowski@…" → "MU").
 */
export function initialsOf(first: string | null | undefined, last: string | null | undefined, email?: string): string {
  const name = [first, last].map((part) => part?.trim()[0] ?? "").join("");
  if (name.length === 2) return name.toUpperCase();
  const words = handleOf(email).split(/[^a-zA-Z]+/).filter(Boolean);
  const fromEmail = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2);
  return (name || fromEmail || "?").toUpperCase();
}

/** Trimmed, with runs of spaces made single. */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type NameErrors = Partial<Record<"firstName" | "lastName", string>>;

/** Both names are required (they make the badge's initials). */
export function validateName(first: string, last: string): NameErrors {
  const errors: NameErrors = {};
  const check = (value: string, field: keyof NameErrors, label: string) => {
    const name = cleanName(value);
    if (!name) errors[field] = `Enter your ${label}.`;
    else if (name.length > NAME_MAX) errors[field] = `Shorten your ${label} to ${NAME_MAX} characters or fewer.`;
  };
  check(first, "firstName", "first name");
  check(last, "lastName", "last name");
  return errors;
}
