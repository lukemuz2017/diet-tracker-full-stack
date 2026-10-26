import type { DayState } from "@/lib/week";

/** The chip that says where a day stands: complete, logged but not marked, or nothing logged. */
export const DAY_CHIP: Record<DayState, { text: string; className: string }> = {
  complete: { text: "Complete", className: "bg-leaf text-white" },
  open: { text: "Not complete", className: "border-[1.5px] border-soil text-soil" },
  missed: { text: "Not logged", className: "border-[1.5px] border-dashed border-muted text-muted" },
};
