import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-card bg-paper p-5 sm:p-6 ${className}`} {...props} />;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.08em] text-leaf ${className}`}>{children}</p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** A link back, for pages that aren't in the nav (Recipes, Edit details). */
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-2 pb-6 pt-2 sm:pt-6">
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-1 text-[15px] font-bold text-leaf hover:bg-track">
          <span aria-hidden="true">‹</span> {back.label}
        </Link>
      )}
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-tight text-balance">
        {title}
      </h1>
      {description && <p className="max-w-[60ch] text-[17px] text-muted">{description}</p>}
    </div>
  );
}
