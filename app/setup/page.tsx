import type { Metadata } from "next";
import { SetupScreen } from "@/components/SetupForm";

export const metadata: Metadata = { title: "Your details" };

export default function SetupPage() {
  return <SetupScreen />;
}
