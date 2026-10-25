import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

// Clerk's form (its title is the page heading), which ends with "Don't have an
// account? Sign up". After signing in you land on the Dashboard, or back on
// the page you were sent from.
export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-6 sm:py-10">
      <Suspense>
        <SignIn fallbackRedirectUrl="/log" />
      </Suspense>
    </div>
  );
}
