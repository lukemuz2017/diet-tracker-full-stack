import { redirect } from "next/navigation";

// Last 7 days is part of the Dashboard (/log).
export default function WeekPage() {
  redirect("/log");
}
