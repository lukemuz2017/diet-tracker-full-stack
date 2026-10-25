"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSavedData } from "@/lib/storage";

// The first visit starts at the welcome screen; a returning visit goes
// straight to Today (flows.md: Routes).

/** On app pages: sends someone who hasn't set up yet to the welcome screen. */
export function RequireProfile() {
  const data = useSavedData();
  const router = useRouter();
  useEffect(() => {
    if (data && !data.profile) router.replace("/");
  }, [data, router]);
  return null;
}

/** On the welcome screen: sends someone who has set up to Dashboard. */
export function RedirectIfSetUp() {
  const data = useSavedData();
  const router = useRouter();
  useEffect(() => {
    if (data?.profile) router.replace("/log");
  }, [data, router]);
  return null;
}
