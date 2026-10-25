import type { ComponentProps } from "react";

// Produce-sticker tags (design.md: Produce stickers): a pill with a thin inner
// ring, tilted slightly. Used for "what it adds" tags and quick-add foods.

export type StickerTone = "lemon" | "leaf" | "paper" | "kraft" | "tomato";

const tones: Record<StickerTone, string> = {
  lemon: "bg-lemon text-soil shadow-[inset_0_0_0_2px_var(--color-paper),inset_0_0_0_3.5px_var(--color-soil)]",
  leaf: "bg-leaf text-white shadow-[inset_0_0_0_2px_var(--color-leaf),inset_0_0_0_3.5px_var(--color-paper)]",
  paper: "bg-paper text-leaf shadow-[inset_0_0_0_2px_var(--color-paper),inset_0_0_0_3.5px_var(--color-leaf)]",
  kraft: "bg-kraft text-soil shadow-[inset_0_0_0_2px_var(--color-paper),inset_0_0_0_3.5px_var(--color-soil)]",
  tomato: "bg-tomato text-white shadow-[inset_0_0_0_2px_var(--color-tomato),inset_0_0_0_3.5px_var(--color-paper)]",
};

const tilts = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-3", "-rotate-3", "rotate-1"];

/** Picks a tilt from the sticker's position so a row looks hand-placed. */
export function stickerTilt(index: number) {
  return tilts[index % tilts.length];
}

export function Sticker({
  tone = "lemon",
  index = 0,
  className = "",
  ...props
}: ComponentProps<"span"> & { tone?: StickerTone; index?: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] ${tones[tone]} ${stickerTilt(index)} ${className}`}
      {...props}
    />
  );
}

export function StickerButton({
  tone = "lemon",
  index = 0,
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { tone?: StickerTone; index?: number }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-bold transition-transform hover:rotate-0 hover:scale-105 ${tones[tone]} ${stickerTilt(index)} ${className}`}
      {...props}
    />
  );
}
