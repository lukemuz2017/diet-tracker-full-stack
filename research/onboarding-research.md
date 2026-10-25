# Onboarding research

Step 3 of the brief: study how three similar tools welcome someone new (the first screen, what they ask for, how soon you get something useful) and decide what to use in our own first visit.

On Oct 18, 2026, three research agents each studied one app: **MyFitnessPal**, **MyNetDiary** and **Noom**. They used public sources: help centers, app-store listings, UX teardowns, reviews and news. Two caveats. Several official help sites blocked automated reading, so some details come from search-engine excerpts or third-party teardowns. And these apps A/B test their onboarding, so screen counts differ between sources.

## At a glance

| | MyFitnessPal | MyNetDiary | Noom |
|---|---|---|---|
| First screen | Welcome carousel, then "Sign Up For Free / Log In" | Welcome, consent, ad-tracking prompt | "What's your weight loss goal?" |
| Steps before anything useful | 18–67 screens | About 30 screens | 77–113 screens (10–15 min) |
| Account | Required, before or after the quiz | Optional, only for syncing | Email gate about a third of the way in |
| Paywall | Right after setup, before the first log | Before the dashboard; closing it brings a second offer | End of the quiz, with a 15-minute countdown, before seeing any app screen |
| Goal math | Maintenance from age, height, weight, sex and activity, then ± a weekly rate (formula not published) | Institute of Medicine energy equations; "maintain" is just a weekly rate of zero | Calorie budget; Maintenance Mode uses Harris-Benedict |
| Vitamins and minerals | A, C, calcium, iron, potassium; by day or as a weekly average | Up to 108; you choose which show on the dashboard | Not a focus |
| Framing | Weight loss, "calories remaining" | Weight loss, target date | Weight loss; foods colored by calorie density |

## MyFitnessPal

- **Onboarding:**
  - Welcome carousel → sign up (email, Google or Apple) → name → up to 3 goals (lose, maintain or gain weight, build muscle, change diet…).
  - Then a quiz about habits and past barriers, followed by sex, birthday, height, weight, activity level (4 levels), goal weight and weekly rate.
  - A two-tier free-trial paywall comes before any logging.
  - In one recorded walkthrough, signup comes at 1:45 and the paywall at 2:12. A UX Collective reviewer said the "custom plan" ignored their answers.
- **Logging:**
  - The Today tab (April 2026) shows calories consumed and remaining at the top, then meals, each with a Log button.
  - Tapping "+" on a food logs the default portion at once ("Quick Log"); tapping its name opens serving size and servings.
  - Recent and frequent foods; "Quick Add" for raw calories; copy one meal (copying several days is Premium); a date picker for past days.
  - A Nutrients screen shows Total / Goal / Left for each nutrient, by day or as a weekly average.
- **Coming back:**
  - A food-logging streak and a login streak, neither of which can be hidden.
  - Meal reminders and a Weekly Digest every Sunday.
  - A "First Food Logged" celebration (Aug 2025). MyFitnessPal reports that people who log 4 days in their first week are "7x more likely" to make progress (a correlation).
- **What users dislike:**
  - The April 2026 redesign: more taps, and the diary hidden behind "View All".
  - Streak pop-ups that can't be turned off.
  - Basics moved behind the paywall: barcode scanning (2022) and gram-based macros.
  - Duplicate database entries with calories 100–200 kcal apart.

## MyNetDiary

- **Onboarding:**
  - No account needed to start; an account is only used for syncing.
  - About 30 screens: sex, goals, weight, height, birth date, a body-fat grid, target weight, a pace slider, success stories, an upsell, diet type, meals per day, fasting, exercise and weekend eating.
  - Then a notification prompt, a fake "Preparing personalized plan" progress screen and a plan summary.
  - Then a paywall, with a second offer if you close it. You can choose "calorie counting only" to skip diets and coaching.
- **Logging:**
  - Search that lets you tick several results at once, and "Staple Foods" grouped by category.
  - Favorites, recent foods and copy-a-day. Your previous amount for a food is shown for one-tap reuse.
  - A calorie "apple" turns green, yellow or red. A short nutrient list shows on the dashboard; tapping expands the full vitamin and mineral list.
  - You choose which of 108 nutrients appear on the dashboard. A "Food Grade" (A–D) is built from 12 nutrients.
- **Coming back:**
  - Reminders, streaks and daily tips. A Daily Analysis status ("On target", high-sodium flags).
  - Premium adds a weekly analysis of iron, vitamin A, vitamin C and calcium, weekly averages, and a Trend Analysis that spots patterns like weekend sodium spikes.
  - Days that look incomplete are marked "review needed" and left out of the analysis until you add food or tap "Mark day complete".
- **What users dislike:**
  - Basics behind the paywall, and constant upgrade prompts even after paying.
  - A cluttered dashboard and tooltip tours.
  - Reports of 700–950 kcal daily targets.

## Noom

- **Onboarding:**
  - A web quiz comes before the app. It explains why each question is asked, offers reassurance after sensitive answers and an "I haven't decided" option, and blocks unhealthy goal weights.
  - Then an email gate about a third of the way in, a projected goal-date graph, behavior sliders and staged "building your plan" loaders.
  - A paywall at the end, with a 15-minute countdown and a "pay what you want" trial that doesn't change the offer.
  - A 2022 class action over auto-renewal settled for $62M.
- **Logging:**
  - Search, barcode, and AI photo or voice logging.
  - Foods are colored by calorie density. For solids: green below 1.0, yellow 1.0–2.4, orange above 2.4 kcal/g. "Red" was renamed "orange" around 2022 because it implied danger.
  - Noom frames the colors as a portion guide, not a list of banned foods.
- **Coming back:**
  - Daily task cards, with coins only when every task is done. Short daily psychology lessons (1–12 minutes). Daily weigh-ins, and a human coach plus AI.
  - **Maintenance Mode** shows a steady band around your target weight, not a single line.
- **What users dislike:**
  - Billing and cancellation, and a quiz that's too long.
  - Repetitive lessons and generic coaching.
  - Nutrient-dense foods (nuts, olive oil, avocado) landing in "orange". Dietitians warn about good-vs-bad food labels.
  - Low starting calorie budgets and daily weigh-in pressure.

## Patterns across all three

1. **Value comes late.** Every app puts a long quiz, and usually a signup and paywall, before the first useful thing.
2. **Weight loss is the default.** Maintenance is a side option, even though it's what most people need long term.
3. **Many nutrients get shown a few at a time.** The rest expand on tap or sit on a separate screen.
4. **Streaks that reset annoy people,** and so do celebrations that can't be dismissed.
5. **Good-vs-bad food labels** (colors, grades) draw criticism from users and dietitians.

## What we're using

**First visit**
- Six fields on one screen, then straight to your ranges and a one-tap first log: about a minute, not 30–113 screens.
- A "why we ask" hint under sensitive fields such as sex and age: "Used only to estimate your needs. Stays on this device." *(Noom)*
- Ranges explained behind ⓘ info buttons, covering why this range and how it was calculated from your inputs. The detail is one click away instead of always on screen. *(all three; the ⓘ treatment was the student's call)*
- An inline first-log celebration, "First food logged", with no pop-up. *(MyFitnessPal)*

**Logging**
- One-tap add with an Undo message; 0.5 / 1 / 1.5 / 2 servings; your last serving size is remembered. *(MyFitnessPal, MyNetDiary)*
- Bars show grams and what's left ("28 g to go", "over by 300 mg"). Going over a minimum is never shown in red. *(MyFitnessPal)*
- "What it adds" tags (protein, fiber, vitamin C…) instead of good/bad colors. *(the opposite of Noom)*

**Coming back**
- Suggestions with a one-tap fix: "Potassium averaged 60% of target → Add a banana". *(Noom, MyNetDiary)*
- Mark a day complete. Days that look half-logged are flagged and left out of the averages. *(MyNetDiary, MyFitnessPal)*
- A weekend vs. weekday trend. *(MyNetDiary)*
- Days logged out of the last 7, instead of a streak that resets.
- **A rolling 7-day balance**, which is the student's own idea rather than something from these apps. Nutrients are judged on the last 7 days, not on fixed Monday–Sunday weeks, and daily ranges are a guide. The rules are in `flows.md`, under "How the 7-day window works".

**Not using:** long quizzes, signup or paywall walls, fake progress loaders, countdown timers, streaks that reset, good/bad color labels, tooltip tours, weight projections.

**Not chosen for now:** copying yesterday's food.

## Sources

### MyFitnessPal
- https://lazyweb.com/canvas/flows/myfitnesspal/onboarding
- https://screensdesign.com/showcase/myfitnesspal-calorie-counter
- https://uxdesign.cc/how-not-to-activate-users-lessons-from-myfitnesspal-880e7bbe6fd4
- https://gallery.reteno.com/flows/web-screens-myfitnesspal
- https://www.choosingtherapy.com/myfitnesspal-review/
- https://www.techradar.com/how-to/how-to-use-myfitnesspal-to-help-achieve-your-fitness-goals-on-ios-and-android
- https://support.myfitnesspal.com/hc/en-us/articles/360032625391-How-does-MyFitnessPal-calculate-my-initial-goals
- https://support.myfitnesspal.com/hc/en-us/articles/360032274432-Customize-your-nutritional-goals
- https://support.myfitnesspal.com/hc/en-us/articles/360032625091-Nutrition-101-Vitamins-Minerals
- https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab
- https://support.myfitnesspal.com/hc/en-us/articles/360032274592-How-to-log-food-to-your-diary
- https://support.myfitnesspal.com/hc/en-us/articles/360032621971-What-is-Quick-Add
- https://support.myfitnesspal.com/hc/en-us/articles/33535658002061-Multi-Day-Logging
- https://support.myfitnesspal.com/hc/en-us/articles/360032622591-Weekly-Digest
- https://support.myfitnesspal.com/hc/en-us/articles/360032624931-How-to-fix-an-incorrect-streak
- https://www.prnewswire.com/news-releases/myfitnesspal-announces-its-2025-summer-release-302536319.html
- https://builtformars.com/ux-bites/top-29-of-users
- https://community.myfitnesspal.com/en/discussion/10944298/disable-streaks
- https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/
- https://digitaltrends.com/phones/myfitnesspal-barcode-scanning-not-free-premium-subscription

### MyNetDiary
- https://apps.apple.com/us/app/calorie-counter-mynetdiary/id287529757
- https://www.mynetdiary.com/free-calorie-tracker.html
- https://screensdesign.com/apps/calorie-counter-mynetdiary/
- https://gallery.reteno.com/flows/app-screens-mynetdiary
- https://screensdesign.com/showcase/calorie-counter-pro-mynetdiary
- https://www.mynetdiary.com/adhelp_targetCalories.html
- https://www.mynetdiary.com/weight-loss-maintenance.html
- https://mynetdiary.com/planning-nutrient-targets.html
- https://www.mynetdiary.com/food-grade.html
- https://www.mynetdiary.com/mynetdiary-premium.html
- https://www.mynetdiary.com/iphelp_completeDay.html
- https://feastgood.com/mynetdiary-review/
- https://healthreporter.com/mynetdiary-review/
- https://www.trustpilot.com/review/mynetdiary.com

### Noom
- https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel
- https://screensdesign.com/showcase/noom-weight-loss-food-tracker
- https://www.justinmind.com/blog/ux-case-study-of-noom-app-gamification-progressive-disclosure-nudges/
- https://linares.substack.com/p/great-uxpectations-lessons-from-noom
- https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-nooms-food-color-system-works/ (read via search excerpt)
- https://www.noom.com/support/faqs/using-the-app/daily-features/2026/03/maintenance-mode/ (read via search excerpt)
- https://healthline.com/nutrition/noom-diet-review
- https://fortune.com/article/noom-review
- https://www.choice.com.au/health-and-body/diet-and-fitness/weight-loss/articles/noom-weight-loss-app-review
- https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/noom-to-pay-over-60m-to-cancel-automatic-renewal-suit
- https://www.trustpilot.com/review/noom.com
