import type { Metadata } from "next";
import { RequireProfile } from "@/components/Gates";
import { ProfileView } from "@/components/ProfileView";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <>
      <RequireProfile />
      <ProfileView />
    </>
  );
}
