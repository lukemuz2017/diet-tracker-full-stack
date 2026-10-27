/** Swaps a chart for its table and back; the label says what a click will show. */
export function ViewToggle({ asTable, onToggle }: { asTable: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1.5 text-sm font-bold text-leaf underline underline-offset-[3px] hover:text-soil"
    >
      {asTable ? "Show as a chart" : "Show as a table"}
    </button>
  );
}
