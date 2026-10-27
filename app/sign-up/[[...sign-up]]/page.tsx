import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign up" };

// Clerk's form (its title is the page heading), which ends with "Already have
// an account? Sign in". A new account goes straight to setup.
export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-6 sm:py-10">
      <Suspense>
        <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/setup" />
      </Suspense>
    </div>
  );
}
