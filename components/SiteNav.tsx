"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSavedData } from "@/lib/storage";

const links = [
  { href: "/log", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
  { href: "/faq", label: "FAQ" },
] as const;

/** Pages outside the nav highlight the item they belong to. */
const SECTION_OF: Record<string, string> = { "/recipes": "/log", "/setup": "/profile" };

// Shared navigation: pills in the header on wider screens, a bottom tab bar on
// phones. Shown once setup is done, so the first visit stays one straight path.
export function SiteNav() {
  const pathname = usePathname();
  const data = useSavedData();
  if (pathname === "/" || !data?.profile) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0"
    >
      <ul className="flex justify-around gap-1 sm:justify-end">
        {links.map(({ href, label }) => {
          const current = (SECTION_OF[pathname] ?? pathname) === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-2.5 text-[13px] font-bold sm:px-4 sm:text-[15px] ${
                  current ? "bg-leaf text-white" : "text-soil hover:bg-track"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
