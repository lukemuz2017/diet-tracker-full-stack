import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireProfile } from "@/components/Gates";
import { History } from "@/components/WeekView";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <RequireProfile />
      {/* History reads ?end=, which needs a Suspense boundary. */}
      <Suspense fallback={<PageHeader title="History" />}>
        <History />
      </Suspense>
    </>
  );
}
