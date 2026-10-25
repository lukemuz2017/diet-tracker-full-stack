"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { WeekCalendar } from "@/components/WeekCalendar";
import { WindowView } from "@/components/WindowView";
import { PageHeader } from "@/components/ui/Card";
import { useSavedData } from "@/lib/storage";
import { useToday } from "@/lib/useToday";
import { currentWindowEnd } from "@/lib/week";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** History: high-level stats for the 7 days ending on any day you pick. */
export function History() {
  const data = useSavedData();
  const today = useToday();
  const router = useRouter();
  const requested = useSearchParams().get("end");
  const header = (
    <PageHeader title="History" />
  );
  if (!data?.profile || !today) return header;

  const end = requested && ISO_DATE.test(requested) && requested <= today ? requested : currentWindowEnd(data.completeDays, today);

  return (
    <>
      {header}
      <div className="grid items-start gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
        <WeekCalendar end={end} max={today} onPick={(date) => router.replace(`/history?end=${date}`, { scroll: false })} />
        <WindowView data={data} profile={data.profile} end={end} today={today} detail="charts" />
      </div>
    </>
  );
}
