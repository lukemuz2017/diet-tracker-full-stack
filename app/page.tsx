import type { CSSProperties } from "react";
import { RedirectIfSetUp } from "@/components/Gates";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";

// Real numbers per serving, from the built-in USDA food list.
const stickers = [
  { food: "Banana", amount: "422 mg", nutrient: "potassium", tone: "bg-lemon text-soil", ring: "var(--color-soil)", ground: "var(--color-lemon)", tilt: "-8deg", place: "left-[3%] top-[6%]" },
  { food: "½ avocado", amount: "7 g", nutrient: "fiber", tone: "bg-leaf text-white", ring: "var(--color-paper)", ground: "var(--color-leaf)", tilt: "6deg", place: "right-[4%] top-[10%]" },
  { food: "Orange", amount: "70 mg", nutrient: "vitamin C", tone: "bg-tomato text-white", ring: "var(--color-paper)", ground: "var(--color-tomato)", tilt: "-4deg", place: "left-[6%] bottom-[8%]" },
  { food: "Spinach, ½ cup", amount: "3.2 mg", nutrient: "iron", tone: "bg-paper text-leaf", ring: "var(--color-leaf)", ground: "var(--color-paper)", tilt: "9deg", place: "right-[7%] bottom-[6%]" },
];

const steps = [
  { title: "Tell us a little about you", text: "Six quick questions give you your own daily ranges." },
  { title: "Log what you eat", text: "Tap a common food or add your own. Catch up on missed days anytime." },
  { title: "See your last 7 days", text: "One day off is normal. See how your week balances out, and what to eat more of." },
];

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export default function WelcomePage() {
  return (
    <div className="relative grid min-h-[calc(100dvh-9rem)] place-items-center py-2 sm:py-4">
      <RedirectIfSetUp />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        {stickers.map((sticker, index) => (
          <div
            key={sticker.food}
            className={`sticker-in absolute flex h-28 w-44 flex-col items-center justify-center rounded-[50%] ${sticker.tone} ${sticker.place}`}
            style={{
              boxShadow: `inset 0 0 0 4px ${sticker.ground}, inset 0 0 0 5.5px ${sticker.ring}`,
              ["--tilt" as string]: sticker.tilt,
              ...delay(350 + index * 120),
            }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{sticker.food}</span>
            <span className="font-display text-[28px] font-extrabold leading-tight">{sticker.amount}</span>
            <span className="text-xs">{sticker.nutrient}</span>
          </div>
        ))}
      </div>

      <section
        aria-labelledby="welcome-title"
        className="pop-in relative z-10 flex w-full max-w-lg flex-col gap-4 rounded-[28px] border-[1.5px] border-soil bg-paper p-6 shadow-[6px_6px_0_var(--color-kraft)] sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>Balanced eating, not dieting</Eyebrow>
          <h1 id="welcome-title" className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-[44px]">
            Welcome to Diet Tracker
          </h1>
          <p className="text-[17px] text-muted">
            See whether what you eat adds up to a balanced week, with ranges made for you. No calorie cutting, no account.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rise-in flex gap-3.5" style={delay(500 + index * 150)}>
              <span
                aria-hidden="true"
                className="grid size-8 flex-none place-items-center rounded-full bg-leaf font-display font-extrabold text-white"
              >
                {index + 1}
              </span>
              <span>
                <b className="block">{step.title}</b>
                <span className="text-[15px] text-muted">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="rise-in flex flex-col gap-2 pt-1" style={delay(1000)}>
          <ButtonLink href="/setup" className="min-h-12 text-[17px]">
            Get started
          </ButtonLink>
          <p className="text-center text-sm text-muted">About a minute · Saved on this device</p>
        </div>
      </section>
    </div>
  );
}
