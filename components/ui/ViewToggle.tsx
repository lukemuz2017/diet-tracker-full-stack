import type { ReactNode } from "react";

/** A link-style button that swaps one view of something for another; the label says what a click will show. */
export function ViewToggle({ onToggle, children }: { onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1.5 text-sm font-bold text-leaf underline underline-offset-[3px] hover:text-soil"
    >
      {children}
    </button>
  );
}
