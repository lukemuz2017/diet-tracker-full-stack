"use client";

import { useSyncExternalStore } from "react";
import { canSave } from "@/lib/storage";

const noop = () => () => {};

// flows.md: "Can't save". Private windows and some settings block storage.
export function StorageBanner() {
  const blocked = useSyncExternalStore(noop, () => !canSave(), () => false);
  if (!blocked) return null;
  return (
    <div role="alert" className="bg-lemon-tint px-4 py-3 text-center text-sm">
      <b>This browser isn’t letting the app save.</b> Anything you enter will be lost when you close
      the tab. Try a regular (not private) window.
    </div>
  );
}
