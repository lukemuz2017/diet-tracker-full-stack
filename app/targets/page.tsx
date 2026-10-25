import { redirect } from "next/navigation";

// Targets became Profile (details plus ranges); keep old links working.
export default function TargetsPage() {
  redirect("/profile");
}
