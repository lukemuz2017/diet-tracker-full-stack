"use client";

import { Show, useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { InitialsBadge } from "@/components/ui/InitialsBadge";
import { handleOf, initialsOf } from "@/lib/names";

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
  // Shown beside the badge: first name if Clerk has one, else the email handle.
  const shortName = user.firstName || handleOf(email) || "Account";
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
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-soil bg-paper py-1 pl-1 pr-3 hover:bg-track ${
          open ? "bg-track" : ""
        }`}
      >
        <InitialsBadge initials={initials} photo={photo} />
        <span aria-hidden="true" className="max-w-[7rem] truncate text-sm font-bold text-soil sm:max-w-[9rem]">
          {shortName}
        </span>
        <span aria-hidden="true" className={`text-xs text-soil transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
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
