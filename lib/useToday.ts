"use client";

import { useSyncExternalStore } from "react";
import { toISODate } from "./dates.ts";

// Today's local date, read only in the browser (null on the server), and
// refreshed when midnight passes or the tab becomes visible again.

function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, nextMidnight.getTime() - now.getTime() + 1000);
  };
  schedule();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => toISODate(new Date()), () => null);
}
