import type { Metadata } from "next";
import { Suspense } from "react";
import { FoodLog } from "@/components/FoodLog";
import { RequireProfile } from "@/components/Gates";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Dashboard" };

export default function LogPage() {
  return (
    <>
      <RequireProfile />
      {/* FoodLog reads ?add=, which needs a Suspense boundary. */}
      <Suspense fallback={<PageHeader title="Dashboard" />}>
        <FoodLog />
      </Suspense>
    </>
  );
}
