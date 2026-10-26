"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A page section whose heading collapses it. The content stays mounted while
 * hidden, so charts keep what was picked in them.
 */
export function Disclosure({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="flex flex-col gap-3">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 items-center gap-2 rounded-lg pr-3 text-left font-display text-2xl font-extrabold hover:bg-track/60"
        >
          <span aria-hidden="true" className={`text-base text-muted transition-transform ${open ? "rotate-90" : ""}`}>
            ▸
          </span>
          {title}
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="flex flex-col gap-5">
        {children}
      </div>
    </section>
  );
}
