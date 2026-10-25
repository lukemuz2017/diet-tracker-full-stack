import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { StorageBanner } from "@/components/StorageBanner";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only rounded-full bg-soil px-4 py-2 font-bold text-paper focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30"
        >
          Skip to content
        </a>
        <StorageBanner />
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-full">
            <span
              aria-hidden="true"
              className="size-7 rounded-full bg-lemon shadow-[inset_0_0_0_3px_var(--color-lemon),inset_0_0_0_4.5px_var(--color-soil)]"
            />
            <span className="font-display text-xl font-extrabold">Diet Tracker</span>
          </Link>
          <SiteNav />
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 sm:px-6 sm:pb-16">
          {children}
        </main>
        <Toast />
      </body>
    </html>
  );
}
