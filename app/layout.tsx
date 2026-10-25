import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AccountButtons } from "@/components/AccountButtons";
import { SiteNav } from "@/components/SiteNav";
import { DataSync } from "@/components/DataSync";
import { Toast } from "@/components/Toast";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: { default: "Diet Tracker", template: "%s · Diet Tracker" },
  description:
    "Track a balanced diet, not a diet. Personal ranges for calories, protein, fiber and key vitamins, judged over your last 7 days.",
};

// Clerk's sign-in, sign-up and account menu in Market Stand colors (design.md).
const clerkAppearance = {
  variables: {
    colorPrimary: "#2e6b3f", // leaf
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#1f2a1c", // soil
    colorMutedForeground: "#4a5545", // muted
    colorBackground: "#fbfcf7", // paper
    colorInput: "#fbfcf7",
    colorInputForeground: "#1f2a1c",
    colorBorder: "#b8c4a8", // field
    colorDanger: "#c8402a", // tomato
    colorRing: "#1f2a1c",
    fontFamily: "var(--font-atkinson), Verdana, sans-serif",
    fontFamilyButtons: "var(--font-bricolage), 'Arial Black', sans-serif",
    borderRadius: "10px",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider appearance={clerkAppearance}>
          <a
            href="#main"
            className="sr-only rounded-full bg-soil px-4 py-2 font-bold text-paper focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30"
          >
            Skip to content
          </a>
          <DataSync />
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 rounded-full">
              <span
                aria-hidden="true"
                className="size-7 rounded-full bg-lemon shadow-[inset_0_0_0_3px_var(--color-lemon),inset_0_0_0_4.5px_var(--color-soil)]"
              />
              <span className="font-display text-xl font-extrabold">Diet Tracker</span>
            </Link>
            {/* Both read the URL, which the sign-in and sign-up routes only know per request. */}
            <Suspense>
              <div className="flex items-center gap-3">
                <SiteNav />
                <AccountButtons />
              </div>
            </Suspense>
          </header>
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 sm:px-6 sm:pb-16">
            {children}
          </main>
          <Toast />
        </ClerkProvider>
      </body>
    </html>
  );
}
