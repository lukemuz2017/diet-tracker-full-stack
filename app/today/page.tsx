import { redirect } from "next/navigation";

// Today and Add food merged into Dashboard (/log); keep old links working.
export default function TodayPage() {
  redirect("/log");
}
