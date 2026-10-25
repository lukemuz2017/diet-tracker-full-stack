"use client";

import { useEffect, useState } from "react";
import { dismissToast, useModalOpen, useToast } from "@/lib/toast";

const SHOW_FOR_MS = 1800;

// design.md: Messages. Sits above the phone tab bar; announced politely.
// The timer pauses while the pointer is over it or focus is inside it, so
// there's always time to reach Undo.
//
// The layout has one for the page. Each open pop-up (components/ui/Dialog.tsx)
// renders its own with `inDialog`, at the top of the screen, because a modal
// pop-up covers the page's message and makes it unclickable; the page's one
// stays quiet meanwhile.
export function Toast({ inDialog = false }: { inDialog?: boolean }) {
  const toast = useToast();
  const modalOpen = useModalOpen();
  const [paused, setPaused] = useState(false);
  const shown = inDialog || !modalOpen ? toast : null;

  useEffect(() => {
    if (!shown || paused) return;
    const timer = setTimeout(() => dismissToast(shown.id), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [shown, paused]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 ${inDialog ? "top-3" : "bottom-24 sm:bottom-8"}`}
    >
      {shown && (
        <div
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl bg-soil px-4 py-3 text-[15px] text-paper shadow-lg"
        >
          <span>{shown.text}</span>
          {shown.undo && (
            <button
              type="button"
              onClick={() => {
                shown.undo!();
                dismissToast(shown.id);
                setPaused(false);
              }}
              className="rounded-md px-1.5 py-1 font-bold text-lemon underline underline-offset-[3px] focus-visible:outline-lemon"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
