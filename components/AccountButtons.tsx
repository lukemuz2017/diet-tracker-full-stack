"use client";

import { Show, useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";

// Header account controls: Sign in and Sign up when signed out, an account
// button when signed in. The sign-in and sign-up pages already link to each
// other, so the buttons step aside there.
export function AccountButtons() {
  const pathname = usePathname();
  const onAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  return (
    <>
      <Show when="signed-out">
        {!onAuthPage && (
          <div className="flex items-center gap-2">
            <ButtonLink href="/sign-in" variant="secondary">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up">Sign up</ButtonLink>
          </div>
        )}
      </Show>
      <Show when="signed-in">
        <AccountMenu />
      </Show>
    </>
  );
}

/** "Luke Muzikowski" → "LM"; an email alone → its first letter. */
function initialsOf(first: string | null | undefined, last: string | null | undefined, email: string | undefined): string {
  const fromName = [first, last].map((part) => part?.trim()[0] ?? "").join("");
  return (fromName || email?.[0] || "?").toUpperCase();
}

// Our own button instead of Clerk's UserButton, whose default picture is a
// purple placeholder: a lemon badge with the person's initials and a soil
// ring, like the logo (design.md). A photo they uploaded to Clerk is shown
// instead. The menu is a disclosure (button + panel), closed by Escape, a
// click outside, or choosing an item.
function AccountMenu() {
  const { user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName || email || "Your account";
  const initials = initialsOf(user.firstName, user.lastName, email);
  const photo = user.hasImage ? user.imageUrl : null;

  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] font-bold text-soil hover:bg-track";

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account: ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-full"
      >
        {photo ? (
          // A photo the person chose; plain <img> since it's a tiny remote avatar.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-9 rounded-full object-cover shadow-[0_0_0_2px_var(--color-paper),0_0_0_3.5px_var(--color-soil)]" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-lemon font-display text-sm font-extrabold text-soil shadow-[inset_0_0_0_2.5px_var(--color-lemon),inset_0_0_0_4px_var(--color-soil)]"
          >
            {initials}
          </span>
        )}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border-[1.5px] border-soil bg-paper p-2 shadow-[3px_3px_0_var(--color-kraft)]"
      >
        <p className="px-3 pb-2 pt-1 text-sm">
          <span className="block font-bold">{user.fullName || "Signed in"}</span>
          {email && <span className="block truncate text-muted">{email}</span>}
        </p>
        <div className="flex flex-col border-t border-line pt-1">
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              clerk.openUserProfile();
            }}
          >
            Manage account
          </button>
          <button type="button" className={item} onClick={() => void clerk.signOut({ redirectUrl: "/" })}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
