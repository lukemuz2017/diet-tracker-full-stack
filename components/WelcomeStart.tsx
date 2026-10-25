"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

// The welcome card's call to action: a new visitor makes an account first;
// someone signed in who hasn't set up yet goes straight to setup.
export function WelcomeStart() {
  return (
    <>
      <Show when="signed-out">
        <ButtonLink href="/sign-up" className="min-h-12 text-[17px]">
          Get started
        </ButtonLink>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-bold text-leaf underline underline-offset-[3px] hover:text-soil">
            Sign in
          </Link>
        </p>
      </Show>
      <Show when="signed-in">
        <ButtonLink href="/setup" className="min-h-12 text-[17px]">
          Get started
        </ButtonLink>
        <p className="text-center text-sm text-muted">About a minute</p>
      </Show>
    </>
  );
}
