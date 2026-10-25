"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { InfoIcon } from "./icons";

// The ⓘ button (design.md: Info button). Opens a small popover that explains
// a range; closes on Escape (returning focus) or on a click outside.
// anchor="parent" spans the popover across the nearest positioned ancestor
// (e.g. a list row), so it can't run off a narrow screen.
export function InfoButton({
  label,
  children,
  anchor = "button",
  align = "start",
}: {
  label: string;
  children: ReactNode;
  anchor?: "button" | "parent";
  /** With anchor="button": "end" opens the popover leftward, for buttons near the right edge. */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className={`${anchor === "button" ? "relative" : ""} inline-flex align-middle`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
        className="grid size-7 place-items-center rounded-full bg-track text-leaf hover:bg-band"
      >
        <InfoIcon width={18} height={18} strokeWidth={2} />
      </button>
      <span
        id={popoverId}
        hidden={!open}
        className={`absolute z-10 rounded-xl border-[1.5px] border-soil bg-white p-3 text-[13px] font-normal leading-relaxed text-soil shadow-[3px_3px_0_var(--color-kraft)] ${
          anchor === "button" ? `${align === "end" ? "right-0" : "left-0"} top-9 w-72 max-w-[calc(100vw-3rem)]` : "inset-x-0 top-full mt-1"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
