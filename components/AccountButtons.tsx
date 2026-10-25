"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";

// Header account controls: Sign in and Sign up when signed out, Clerk's
// account menu (with Sign out) when signed in. The sign-in and sign-up pages
// already link to each other, so the buttons step aside there.
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
        <UserButton />
      </Show>
    </>
  );
}
