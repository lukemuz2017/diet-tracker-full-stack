import { StatusChip } from "@/components/ui/StatusChip";
import { formatValue, statusFor } from "@/lib/log";
import { NUTRIENTS, type NutrientKey } from "@/lib/nutrients";
import { formatTarget, type Target } from "@/lib/targets";

// design.md: Nutrient bar. The track shows the target as a band with tick
// marks at its edges. The fill is lemon below the range, leaf within it and
// carrot above it (checked apart for colorblind readers); the chip and
// the lines under it say it in words.

const FILL = { "to-go": "bg-lemon", "in-range": "bg-leaf", over: "bg-carrot", unknown: "bg-track" } as const;

function scaleMax(target: Target): number {
  if (target.kind === "range") return target.max! * 1.25;
  if (target.kind === "min") return target.min! * 1.6;
  return target.max! * 1.3;
}

const pct = (value: number, max: number) => `${Math.min(100, (value / max) * 100)}%`;

export function NutrientBar({
  nutrient,
  target,
  value,
  detail,
}: {
  nutrient: NutrientKey;
  target: Target;
  value: number | undefined;
  /** A second line, e.g. "In range on 4 of 5 days". */
  detail?: string;
}) {
  const { label, unit } = NUTRIENTS[nutrient];
  const status = statusFor(nutrient, target, value);
  const max = scaleMax(target);
  const bandStart = target.kind === "max" ? 0 : target.min!;
  const bandEnd = target.kind === "min" ? max : target.max!;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold">{label}</span>
        <StatusChip status={status.kind}>{status.text}</StatusChip>
      </div>
      <div aria-hidden="true" className="relative h-4 overflow-hidden rounded-full bg-track">
        <div
          className="absolute inset-y-0 bg-band"
          style={{ left: pct(bandStart, max), width: `calc(${pct(bandEnd, max)} - ${pct(bandStart, max)})` }}
        />
        {value !== undefined && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${FILL[status.kind]}`}
            style={{ width: pct(value, max) }}
          />
        )}
        {/* Tick marks at the edges of the target, visible over the fill. */}
        {target.kind !== "max" && <div className="absolute inset-y-0 w-0.5 bg-soil shadow-[0_0_0_1px_var(--color-paper)]" style={{ left: pct(bandStart, max) }} />}
        {target.kind !== "min" && <div className="absolute inset-y-0 w-0.5 bg-soil shadow-[0_0_0_1px_var(--color-paper)]" style={{ left: pct(bandEnd, max) }} />}
      </div>
      <p className="text-[13px] text-muted">
        {value === undefined ? "No values yet" : `${formatValue(value)} ${unit} a day`} · target {formatTarget(nutrient, target)}
        {detail && (
          <>
            <br />
            {detail}
          </>
        )}
      </p>
    </div>
  );
}
