import type { CSSProperties, ReactNode } from "react";

// The text always states the status, so color is never the only signal.
export type Status = "to-go" | "in-range" | "over" | "unknown";

const styles: Record<Status, string> = {
  "to-go": "bg-lemon text-soil",
  "in-range": "bg-leaf text-white",
  over: "bg-carrot text-soil",
  unknown: "border-[1.5px] border-dashed border-muted text-muted",
};

/**
 * In range, Enough and Under limit all read the same way:
 * a round leaf badge whose check draws itself (globals.css, "check-badge";
 * still for reduced motion). The words stay for screen readers. Under, over
 * and unknown keep their words, since they need them.
 */
export function StatusChip({
  status,
  delay = 0,
  words = false,
  children,
}: {
  status: Status;
  /** ms, to stagger a column of them */
  delay?: number;
  /** Show the words even for in range, instead of the check badge. */
  words?: boolean;
  children: ReactNode;
}) {
  if (status === "in-range" && !words) {
    return (
      <span
        className="check-badge inline-flex size-7 items-center justify-center rounded-full bg-leaf text-white"
        style={{ "--check-delay": `${delay}ms` } as CSSProperties}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 12.5l4.5 4.5L18.5 7.5" pathLength="1" />
        </svg>
        <span className="sr-only">{children}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold ${styles[status]}`}>
      {children}
    </span>
  );
}
