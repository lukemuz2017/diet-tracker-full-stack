import { Card, Eyebrow } from "@/components/ui/Card";

// Placeholder for pages whose content is built in a later step. Lists what the
// page will do, taken from flows.md, so the stub is honest about its state.
export function ComingNext({ items }: { items: string[] }) {
  return (
    <Card className="flex max-w-2xl flex-col gap-3">
      <Eyebrow>Being built next</Eyebrow>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
