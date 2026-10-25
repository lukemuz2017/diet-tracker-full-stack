import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "FAQ" };

// How the app works, in plain words. Each answer matches the rules in
// flows.md and research/nutrition-targets.md; update both together.
const SECTIONS: { title: string; tone: string; questions: { q: string; a: ReactNode }[] }[] = [
  {
    title: "The basics",
    tone: "border-leaf",
    questions: [
      {
        q: "What is Diet Tracker for?",
        a: "Keeping a balanced diet over a week, not losing weight. Your ranges are set to maintain your current weight, and the app looks at how each nutrient averages out across the week, because single days vary with events and meals out.",
      },
      {
        q: "Is this medical advice?",
        a: "No. The ranges are estimates for maintaining your weight, based on national guidelines. If you have a medical condition, are pregnant, or have a history of disordered eating, check with your doctor or a registered dietitian.",
      },
      {
        q: "Where is my data saved?",
        a: "Only in this browser, on this device. There’s no account and nothing is sent anywhere. Clearing your browser data erases it, and another device or browser starts fresh.",
      },
    ],
  },
  {
    title: "Your week",
    tone: "border-lemon",
    questions: [
      {
        q: "How does the average work?",
        a: "Each nutrient is judged on its average over the last 7 days, using only the days you’ve marked complete. If you completed 6 of them, it’s a 6-day average; a day you skipped is left out, never counted as zero. A day out of range is normal; the average is what counts.",
      },
      {
        q: "Why mark a day complete?",
        a: "So a half-logged day doesn’t drag your numbers down. A day only counts once you mark it complete. Until today is complete, the week runs from yesterday back; once you mark today, it rolls forward to include it.",
      },
      {
        q: "What do the colors mean?",
        a: "Yellow is under a range, green is in range, and orange is over. Going over a minimum, like more fiber or vitamin C, stays green. Grayed-out days aren’t marked complete, so they don’t count yet.",
      },
      {
        q: "When do suggestions show up?",
        a: "After 3 complete days, so they rest on more than a day or two. Then the summary shows one thing going well, one that could improve, and a bigger-picture habit to try.",
      },
    ],
  },
  {
    title: "Your ranges",
    tone: "border-carrot",
    questions: [
      {
        q: "How are my ranges worked out?",
        a: (
          <>
            Calories come from the National Academies’ 2023 energy equations, using your age, height, weight, sex and
            activity, with about 10% either side. Protein is set per kilogram of body weight, and vitamins and minerals
            use the official recommended amounts for your age and sex. Tap ⓘ next to any range on your{" "}
            <Link href="/profile" className="font-bold text-leaf underline underline-offset-[3px]">
              profile
            </Link>{" "}
            to see how it was calculated.
          </>
        ),
      },
      {
        q: "What about pregnancy or breastfeeding?",
        a: "If you add it in your details, your ranges switch to the official values for pregnancy or breastfeeding: more calories from the second trimester, and more protein, iron and some vitamins. Your doctor or midwife knows best for you.",
      },
      {
        q: "How do allergies and eating patterns work?",
        a: "They don’t change your ranges. Built-in foods that clash are flagged when you search (for example, “Contains dairy” or “Not vegan”), and suggestions only name foods that fit. Foods you add yourself aren’t checked, so read their labels.",
      },
    ],
  },
  {
    title: "Food and logging",
    tone: "border-kraft",
    questions: [
      {
        q: "Where do the food numbers come from?",
        a: "The 41 built-in foods use the US Department of Agriculture’s FoodData Central. You can also add your own food, or build a recipe from ingredients and log it by the serving.",
      },
      {
        q: "Can I fill in an earlier day?",
        a: "Yes. In Add food, pick any day in the current week from the Day menu, and the meal it belongs to.",
      },
      {
        q: "Can I try it without logging a week first?",
        a: (
          <>
            Yes. On your{" "}
            <Link href="/profile" className="font-bold text-leaf underline underline-offset-[3px]">
              profile
            </Link>
            , choose “Load a sample 2 weeks”. It fills days you haven’t logged, and you can clear it there later.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader title="FAQ" />
      <p className="mb-5 max-w-2xl rounded-card border-l-[6px] border-leaf bg-leaf-tint p-4 font-display text-lg font-extrabold leading-snug sm:p-5 sm:text-xl">
        Diet Tracker keeps your week balanced, not your weight lower. Log what you eat, mark the day complete, and see
        which nutrients are on track.
      </p>
      <div className="flex max-w-2xl flex-col gap-5">
        {SECTIONS.map((section) => (
          <section key={section.title} className={`rounded-card border-t-[6px] bg-paper p-4 sm:p-5 ${section.tone}`}>
            <h2 className="pb-1 font-display text-xl font-extrabold">{section.title}</h2>
            <div className="divide-y divide-line">
              {section.questions.map(({ q, a }) => (
                <details key={q} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-bold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden="true" className="text-leaf transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-[62ch] pb-3 text-[15px] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
