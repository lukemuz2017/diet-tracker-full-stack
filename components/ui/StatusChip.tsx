import type { ReactNode } from "react";

// The text always states the status, so color is never the only signal.
export type Status = "to-go" | "in-range" | "over" | "unknown";

const styles: Record<Status, string> = {
  "to-go": "bg-lemon text-soil",
  "in-range": "bg-leaf text-white",
  over: "bg-carrot text-soil",
  unknown: "border-[1.5px] border-dashed border-muted text-muted",
};

export function StatusChip({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold ${styles[status]}`}>
      {children}
    </span>
  );
}
