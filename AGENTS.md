<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Context for any coding agent working in this repo. Read it before doing anything. When a decision changes, update this file in the same commit.

## What we're building

A diet tracking and planning tool for keeping a **balanced diet**. It is not a weight-loss app: targets are set to *maintain* current weight.

1. **Set up once.** The person enters a few facts about themselves (height, weight, age, sex, activity level). The app estimates maintenance calories and sets target ranges for each tracked nutrient.
2. **Log food.** They log what they eat each day (or catch up on earlier days of the week) and mark the day complete.
3. **Check the last 7 days.** Every nutrient is judged on its average over the complete days in the last 7. The Dashboard shows what's going well, what could improve (with a food-group suggestion) and a bigger-picture habit.

Name: Diet Tracker. Repo folder: `health-tracker`.

## Project files

- `flows.md`: the three user flows (Mermaid diagram), routes, states and errors, and the table of nutrient targets. It's the source of truth for what the app does.
- `README.md`: shows the same diagram (keep the two copies in sync), plus the onboarding research and first-run check write-ups.
- `design.md`: the visual design (Market Stand): color tokens with checked contrast, type, spacing, component rules, imagery and voice. Follow it for every screen; `mood-board.pdf` shows it.
- `user-flows.pdf`: the diagram as a PDF, made with Mermaid CLI (`@mermaid-js/mermaid-cli`, run through `npx`, not a project dependency). Regenerate it whenever the diagram changes.
- `research/onboarding-research.md`: notes and sources from the onboarding research.
- `AGENTS.md`: this file, the only agent context file. If a tool generates `CLAUDE.md`, move anything useful here and delete it.

## Course context

- MPCS 51238 *Design, Build, Ship*, Assignment 3, "Patterns & Flows: An Everyday Tool". Due **Tue Oct 20, 2026, 5:30 PM**. The brief is `Assignment 3 - Patterns & Flows.pdf` in the repo root. It's gitignored, so never commit it.
- The student directs every change. Don't one-shot features: propose options, let the student choose, then build in small steps. A one-shot submission is marked incomplete.
- Graded: a working Vercel URL; a page per flow step with shared navigation; the flow diagram in `README.md`; a first visit that's useful right away; form errors next to the field that say what to do and keep what was typed; a reason to come back, with data that persists; keyboard access, real labels, contrast checked; the first-run check feedback in `README.md`; a commit history that shows progress.

## Hard constraints

- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript, scaffolded with `create-next-app`. Deployed on Vercel's free Hobby plan from the student's own GitHub repo.
- **Storage:** browser `localStorage` only. No database, no backend or API routes for data, no accounts or sign-in, no external APIs (including nutrition lookup APIs). Data lives on the device the person used; "logging in" just means opening the app.
- **Dependencies:** add a package only when it's clearly needed, and ask first. Push back on a database, auth, state-management libraries or UI kits.
- **Dev machine:** Windows. Use `npm` (`npm run dev`, `npm run build`, `npm run lint`).

## Design rules (from the brief)

- **Flows first.** Three flows: first visit, main task (logging food), coming back (your last 7 days and suggestions). Each step is its own route; see `flows.md`.
- **The first visit is the onboarding.** Someone new understands what the tool is for and does something useful right away. Learn by doing: no tours, no dead-end empty screens.
- **Forms:** one column; a visible `<label>` on every field; errors sit next to the field and say what to do next ("Enter your weight in pounds", not "Invalid input"); never clear what the person typed when there's an error.
- **Shared components:** buttons, inputs, fields (label + hint + error) and navigation are built once in `components/` and used everywhere.
- **Navigation:** it's always clear where you are (active nav item, page title) and how to get back.
- **Accessibility:** everything works with a keyboard and has a visible focus state; real labels; text contrast checked with the agent (WCAG AA: 4.5:1 for body text).
- **Simplicity:** cut any step, field or tap that doesn't earn its place.

## Domain notes

Targets are estimates for maintaining weight, not medical advice. Say so once in the UI, plainly. The full target table is in `flows.md`.

- **All targets** follow `research/nutrition-targets.md` (sources cited there); don't change a rule without updating that file. Calories use the National Academies 2023 energy equations by sex and activity level (±10%); protein is per kg of body weight; calcium, iron and vitamin C have upper limits.
- **Rolling 7-day window:** every nutrient is judged on its average over today and the 6 days before; daily ranges are only a guide. The full rules (only days the person marks complete count, first-week stages, the 14-day weekend trend) are in `flows.md` under "How the 7-day window works". Keep this logic in pure functions in `lib/`.
- **Unknown values:** only food name, date, calories, protein, carbs and fat are required. A blank optional nutrient is unknown, not zero, and summaries say how many foods they're based on.
- **Common foods:** a static, bundled list (about 40 foods) with all 10 nutrients per standard serving. Values come from USDA FoodData Central, cited in the data file.

## Code conventions

- `app/` for routes, `components/` for shared UI, `lib/` for pure logic (target math, weekly summaries, suggestions, storage).
- All `localStorage` access goes through one module (`lib/storage.ts`). Store a `version` field so the saved shape can be migrated. Read only on the client, and handle missing or corrupt data without crashing.
- Keep target math, weekly summaries and suggestion rules in pure functions so they're easy to check.
- Tests: `npm test` runs Node's built-in test runner on `lib/**/*.test.ts` (Node 24 strips the types; no test package). Files in `lib/` import each other with the `.ts` extension (`./targets.ts`) so Node can run them directly; app code imports them as `@/lib/...`.
- Saved data and the current date are read only in the browser (`useSavedData()` returns null on the server). Reading either during server rendering breaks the build under Cache Components.
- Commit after each meaningful step, with a message that says what changed and why.

## Decisions log

- 2026-10-17: Tool chosen: a balanced-diet tracker with maintenance targets, daily logging and a weekly review.
- 2026-10-18 (flow session, in plan mode):
  - First visit: set up first, then log. Your personal ranges are the first useful thing, followed by a one-tap first log.
  - Nutrients: calories, protein, carbs, fat, fiber, added sugar, sodium, potassium, calcium, iron, vitamin A, vitamin C. "Sugar" means added sugar, the kind labels list and guidelines cover.
  - "Log weekly" means catching up on past days. The log form's date defaults to today.
  - Extras kept: common-foods quick add, recent foods in one tap, missed-day nudge, edit and delete with undo.
  - Routes: `/`, `/setup`, `/targets`, `/today`, `/log`, `/week`. Shared nav: Today · Log · Week · Targets.
- 2026-10-18 (onboarding research, step 3): studied MyFitnessPal, MyNetDiary and Noom (`research/onboarding-research.md`). Borrowing:
  - First visit: "why we ask" hints on sensitive setup fields; ⓘ info buttons on the ranges page that explain each range and its calculation (not always on screen); an inline "First food logged" message.
  - Logging: one-tap add with Undo and remembered serving size; bars show grams and what's left (going over a minimum is never red); "what it adds" tags instead of good/bad colors.
  - Coming back: suggestions with a one-tap fix; mark a day complete (half-logged days are flagged and left out of averages); weekend vs. weekday trend; days logged instead of streaks.
  - Not chosen for now: copy yesterday's food.
- 2026-10-18 (student's idea): judge nutrients on a **rolling 7-day window** (today and the 6 days before), not Monday–Sunday weeks. Daily ranges stay as a guide.
  - Only complete days count. Today counts once marked complete, or at midnight. Unlogged days are gaps, not zeros.
  - Suggestions refresh daily, from complete days only.
  - The first week unlocks in stages: averages after day 1, suggestions after 3 complete days, the full window on day 7, and the weekend trend once 14 days hold enough data.
  - "Load a sample 2 weeks" on `/targets` (with an on-page confirmation) so later features can be demoed.
  - `/week` is now "Last 7 days". Shared nav: Today · Log · Last 7 days · Targets.
- 2026-10-18 (design): chose the **Market Stand** direction from four mood boards (others: Nutrition Label, Steady Band, Riso Plate). Tokens and component rules are in `design.md`. Images, if any, come from Codex `$imagegen` and are saved as static files in `public/images/`. Codex is used only for images, never for code, so two agents don't edit the same files.
- 2026-10-18 (build): foundation done (theme, shared components, nav, route stubs). First visit done: setup form with validation, target math with tests, "Your ranges" with ⓘ explanations, saving, and redirects (welcome ↔ Today; nav only after setup). Ages 19–100 only, because the RDA tables used start at 19.
- 2026-10-18 (student): setup asks for date of birth (ages 18–100, checked to the day) instead of age, and adds a non-binary option (calories: midpoint of the female and male Mifflin-St Jeor equations; vitamins and minerals: the higher value). The welcome screen is an animated card (pop-in, stickers dropping on; still for reduced motion) with three steps and Get started.
- 2026-10-18 (build): logging done. 41 common foods from USDA FoodData Central (`lib/foods-data.ts`, fdcId on each); "what it adds" tags use the FDA good-source rule (≥10% Daily Value); Add food has date (catch-up), search, recent foods, common foods by category and a custom-food form; Today has calorie and nutrient bars, vitamins and minerals (collapsed), foods with servings and Remove, Undo messages that pause on hover or focus, Mark day complete, and the first-food note.
- 2026-10-18 (student): removed added sugar as a tracked nutrient. 11 nutrients now: calories, protein, carbs, fat, fiber, sodium, potassium, calcium, iron, vitamin A, vitamin C.
- 2026-10-18 (research): targets rebuilt on cited sources (`research/nutrition-targets.md`): NASEM 2023 energy equations instead of Mifflin-St Jeor × unsourced activity factors; protein 0.8–1.6 g/kg (age and activity adjusted, 2.0 if very active); carbs at least 130 g; fat 25–35% at 18; upper limits for calcium, iron, vitamin C. Activity labels now match the NASEM levels.
- 2026-10-18 (student): foods use natural units, not "servings": count (2 eggs, 1 slice), scoop (½ cup, 2 tbsp) or weigh (3 oz, with size hints); custom foods are "portions" (`lib/amounts.ts`, units in `lib/foods.ts`). Today shows plain totals only, with no targets; ranges, bars and judgments live on Last 7 days and a new History page (pick a day → the 7 days ending on it), because single days vary with events and meals out.
- 2026-10-18 (student): search shows a suggestion dropdown (ARIA combobox). Whole foods show bare numbers in the amount picker (1, ½, 2); measured foods keep units. Recipes: paste recipe text (per-serving nutrition panel is parsed; links can't be fetched, no APIs) or build from ingredients; logged by the serving (`lib/recipe.ts`, `/recipes`). Today and Add food merged into one Food log page (`/log`): day picker for today and the 6 days before, totals and foods on the left, add-food panel on the right; `/today` forwards to it. Nav: Food log · Last 7 days · History · Targets.
- 2026-10-18 (student): Last 7 days folded into the Food log as a collapsible "Your 7 days" panel under the day picker (inline disclosure rather than a drawer, so it doesn't cover the log; open state remembered per browser). It shows the 7 days ending on the picked day. `/week` forwards to `/log`; nav is Food log · History · Targets. Add food is one button that opens search ("Cancel" closes it).
- 2026-10-18 (student): the 7-day panel is titled "Dietary stats".
- 2026-10-18 (student): the logging page became **This week** (`/log`), modeled on Strava's profile tabs: a header "+ Add food" (opens a panel with a 7-day picker and search), and two tabs, Progress (7-day averages and day strip; the separate "looks incomplete" note was dropped since the yellow dot says it) and Foods (a card per day with its foods, status, Mark complete toggle and + Add). Nav: This week · History · Targets.
- 2026-10-18 (student): History shows high-level stats only for the 7 days ending on the picked day (default today): score card with the 7 badges, a Calories by day chart and a macro split chart (colors #2E8048 / #D29A12 / #B04E2C, validated with the dataviz palette checker; every segment labeled). No food log there.
- 2026-10-19 (student): no "X of 11 in range" or "N of 7 days logged" text. Each day badge is a ring that fills with the share of that day's nutrients in range, with a ✓ at 80%+ (screen readers get the counts in words). History uses an inline month calendar (`components/WeekCalendar.tsx`) instead of the browser date picker, which popped over the page.
- 2026-10-19 (student): Progress tab is the week ribbons (concept 6); Add food is a modal pop-up with a blurred backdrop; days open in a slide-in side panel (concept 1); nutrient rows expand to weekly detail. Modals use the native <dialog> (`components/ui/Dialog.tsx`) for focus trapping, Escape and focus return.
- 2026-10-19 (student): Add food's day pills replaced by a Day dropdown with a month calendar (`WeekCalendar` with `week={false}` and a `min`); Escape closes the calendar, not the pop-up. The ribbons' 7-day average column is two aligned columns (value right-aligned, chip on one line).
- 2026-10-19 (student): sample data (`lib/sample.ts`): "Load a sample 2 weeks" on Targets adds example meals for the 15 days before today, scaled to maintenance calories, skipping days already logged; ids start "sample-" so "Clear sample data" keeps the person's own entries.
- 2026-10-19 (student): the ribbons' 7-day average column shows only a status chip (In range / Under / Over); clicking it, or the nutrient name, opens the detail with the amounts and how far to go. "Over" is carrot `#D9773A` with soil text, instead of soil black (eggplant purple was tried and rejected; blueberry and toasted kraft were the other options that passed the palette validator).
- 2026-10-19 (student): a day's foods are grouped into Breakfast, Lunch, Dinner and Snacks (`lib/meals.ts`), each with a calorie subtotal and its own + Add that opens Add food with that meal chosen; Add food has a Meal choice (defaults by time of day). Entries saved before meals existed are placed by the time they were logged. Sample data sets meals.
- 2026-10-19 (student): This week opens with a summary card (after concept 3, "Focus first", but compact): "Your last 7 days", a verdict in words (balanced / mostly balanced / a few things to work on, no counts) and up to three focus items, furthest off first. Each comes with a suggestion in words (see the next entry). Rules in `lib/suggestions.ts`.
- 2026-10-19 (student): a day counts only when the person marks it complete. No automatic completion for past days and no "looks incomplete" (40%) state: days are complete, not complete (logged, faded, not counted) or not logged. Sample data marks its full days complete.
- 2026-10-19 (student): the summary card gives suggestions in words at the food-group level ("Consider adding some grains, like rice, oats or whole-wheat bread, this week."), not one-tap foods; high nutrients name their biggest source. History's chart has a Nutrient menu (all 11), with the shaded band fitted to each target kind (range, at least, under).
- 2026-10-19 (student): suggestions show the example foods in bold (marked with ** in `lib/suggestions.ts`). History's by-day chart draws the running 7-day average over the bars (`runningAverages` in `lib/week.ts`): a 2px soil line with a paper halo and a marker per day, labeled "avg …" at the end, so you see it settle toward or away from the target band; the tooltip and table include it.
- 2026-10-19 (student): meal sections start collapsed (name, food count, calories) and expand on tap; empty meals say "Nothing yet" and keep their + Add.
- 2026-10-19 (student): on the Foods tab each day card starts collapsed (day, calories, status, Mark complete) with "See more" to open its meals, which then expand one by one; the side panel shows the meals straight away.
- 2026-10-19 (student): to cut scrolling, the This week title and dates sit inside the summary card (left column, with the verdict), not in a separate page header; ribbon rows are tighter. Foods-tab ideas mocked as concept 7 on the design canvas (date price tag, highlights tags), not built yet.
- 2026-10-19 (student): Foods tab day cards combine concept 7's two options: a kraft date tag (weekday + date, alternating tilt, decorative; the heading carries the date for screen readers) and highlight tags, up to three "did well" nutrients (fiber, vitamins and minerals first) plus at most one heads-up for something over (`lib/highlights.ts`).
- 2026-10-19 (student): the summary card is three tiles instead of up to three problems: Going well (the on-track nutrient in range on the most days, harder wins first; calories and sodium only if nothing else, and never credited to a food), Could improve (the nutrient furthest off, with its food-group suggestion), and Bigger picture (a habit from the week's pattern, e.g. "Fill up on produce", "Ease up on salt"; it skips a habit that would only repeat Could improve). Kraft edge for the habit tile.
- 2026-10-19 (student): a nutrient's expanded detail is one table, each day with its amount and its top source (the food that gave the most that day), replacing the week's top-3 list.
- 2026-10-19 (student): the window ends yesterday until today is marked complete, then rolls forward to include today (`currentWindowEnd` in `lib/week.ts`), so an unfinished today never leaves the week at 6 days. This week shows "Today joins once you mark it complete."; the Foods tab lists today plus the window; History defaults to the same window.
- 2026-10-19 (student): Targets became **Profile** (`/profile`; `/targets` forwards): a Your details card (height, weight, age, sex, activity, maintenance estimate, Edit details) above Your daily ranges. Nav: This week · History · Profile.
- 2026-10-19 (student): the nutrient detail says which days are in the 7-day average: an "In the average?" column (✓ Counted / Not complete / Not logged; uncounted rows muted) and a footer row with the average and "the average of the N counted days above".
- 2026-10-19 (student): Your details is a market member card (kraft card, colored height/weight/age tiles, sex and activity chips, lemon maintenance badge, diet-note tags); range groups get colored top edges. Setup adds optional diet notes: eating pattern (everything, vegetarian, pescatarian, vegan), allergies or intolerances (FDA's nine, gluten for celiac), and pregnancy or breastfeeding, asked only for female and non-binary. Pregnancy and breastfeeding switch to the official values (NASEM 2023 pregnancy equation, +400/+380 kcal breastfeeding, life-stage RDAs; `research/nutrition-targets.md`). Allergies and pattern don't change targets: foods are tagged in `lib/diet.ts`, flagged in search ("Contains dairy", "Not vegan"), and suggestions only name foods that fit.
- 2026-10-19 (student): the first week's stages are enforced: the 7-day average is the average of however many days count (a 3-day average on day 3, growing to 7), the summary card says "Based on N days so far" until the week is full, and suggestions wait for 3 complete days ("Getting started." with how many to go; `SUGGESTION_DAYS` in `lib/suggestions.ts`).
- 2026-10-19 (student): no "In the average?" flags: days that don't count are simply grayed out (new `faded` token #687063, 4.7:1 on the detail panel), and the footer reads "Average · … · of N days". "7-day average" labels became "Average" (the window is still the last 7 days). Profile page header has no description line.
- 2026-10-19 (student): a FAQ page (`/faq`, in the nav) explains the app in short answers; Profile's explanatory paragraph became one line, "Estimates, not medical advice." with a link to the FAQ (keeps the one plain disclaimer the brief asks for). Nav: This week · History · Profile · FAQ.
- 2026-10-20 (student): This week is renamed **Dashboard** (heading, tab title and nav; the route stays `/log`). Nav: Dashboard · History · Profile · FAQ.
- 2026-10-20 (student): the Foods tab is dropped as redundant with the day side panel; Dashboard is one page. A Today row above the week ribbons holds what only Foods did for today (not in the ribbons until complete): calories so far, status, See meals, Mark complete, + Add food. Highlight tags live on in the side panel; the kraft date tags were removed.
- 2026-10-20 (bug): a pop-up left open when you navigated (Add food → New recipe) stayed in the browser's top layer over the next page and swallowed clicks, so "Build from ingredients" did nothing. `Dialog` now closes itself when its page is hidden or unmounted.
- 2026-10-20 (student): in Build from ingredients, picking a food adds it at once (its usual amount); the amount is changed in the Ingredients list. No separate "Add to recipe" step.
- 2026-10-20 (student): Build from ingredients has just a recipe name and "Add to recipe" search; no servings field. A built recipe is one serving (the whole recipe), and you log half, one or more servings of it. Pasted recipes still read their serving count.
- 2026-10-20 (student): saving a recipe no longer offers to log it. A recipe is saved for later and appears under Meals & recipes in Add food, where you pick the number of servings eaten.
- 2026-10-20 (student): Add food stages foods: picking one puts it on a "To add" list (amount and Remove on each, with a kcal total), and a single "Add N foods to [meal]" button adds them all, with one Undo. Nothing is logged until that button.
- 2026-10-20 (student): the paste-a-recipe option is removed (reading recipe text would need an API or fragile parsing); recipes are only built from ingredients. `parseRecipeText` and its tests are gone.
- 2026-10-20 (student): sodium is no longer tracked, so 10 nutrients now (calories, protein, carbs, fat, fiber, potassium, calcium, iron, vitamin A, vitamin C). The "Keep under" group, the salt habit tile and the "salty" heads-up are gone, and the sodium column was removed from `lib/foods-data.ts`. Saved entries that still carry a sodium value are ignored.
- 2026-10-20 (student): the Dashboard has the welcome screen's stickers on wide screens only (xl and up, hidden on phones and narrow windows): two in each margin, unevenly spaced, one each of green, red, yellow and orange, showing your average a day for fiber, carbs, potassium and vitamin C (`components/DashboardStickers.tsx`). The colors are decoration, not status. Decorative (aria-hidden); the ribbons carry the same numbers in words.
- 2026-10-20 (student): right after setup, "Log your first food" sits at the top of Profile (under the title); once food is logged, "Back to your dashboard" stays at the bottom.
- 2026-10-20 (student): with nothing logged yet, the Dashboard is one prompt ("Log what you ate today to start your week." and a large Add food) instead of an empty grid; the summary, Today row and week ribbons appear after the first food.
- 2026-10-20 (student): setup's date of birth is a dropdown button that opens a calendar with month and year menus (`WeekCalendar` with `jump`), replacing the three number boxes that overflowed sideways on phones. The saved shape and the 18–100 age check are unchanged.
- 2026-10-20 (first-run check, four agent testers: first-time and returning, web and a 390px phone frame; each on its own `*.localhost` address so saved data stayed separate). Fixed from their feedback, with the student:
  - Add food keeps picked foods: the "To add" list belongs to the Dashboard and is saved for the tab (`readTray`/`writeTray` in `lib/storage.ts`, sessionStorage), so Escape, the backdrop, × or New recipe don't lose it; the Add food button shows "· N picked". Escape in the search closes only the suggestions. Picking a food again adds to its amount.
  - (student) Add food stays open after adding a meal, so a whole day can be logged in one go, and has the day's calories, Mark complete and Done at the bottom.
  - Undo messages show inside an open pop-up or side panel (a modal covers the page's message); `modalShown`/`useModalOpen` in `lib/toast.ts`. After Remove, focus moves to the next food.
  - Phone grid: pinned nutrient names, opens scrolled to the newest days and averages, narrower columns, and the nutrient detail stays screen-wide. History's tooltip stays on screen.
  - (student) Logged-but-not-complete days are brown-bag kraft cells in the Dashboard grid, instead of faded status colors that read like "Under". Stickers show food facts in each food's own color (strawberries, banana, avocado, sweet potato), so they don't read as status.
  - Smaller: "Log your first food" and Recipes' log link open Add food (`/log?add=1`); Recipes and Edit details have a back link and highlight their nav section; recipe rows say "makes N" only above 1; Edit details has editing copy; "Based on N of 7 days"; status judges the rounded number shown; food tags keep one color per nutrient; no pregnancy wording for men; the custom food button says "Add to list".
- 2026-10-20 (student): date of birth is a text box ("e.g. 02/19/1995"; digits alone get their slashes, `formatBirthInput` in `lib/setup.ts`) with a calendar button inside it; `SetupValues.birthDate` is that text. Setup's "why we ask" notes moved behind ⓘ buttons (`info` on `TextField` and `ChoiceField`); the diet-notes hints were removed.
- 2026-10-20 (student): the Dashboard sits on a light brown-bag background (`kraft-tint` #e9dcc8; muted text 5.8:1, leaf 4.7:1) instead of celery; cards stay paper. (student) Then every page, so it's the body background.
- 2026-10-20 (student): how many days the average rests on ("N of 7 days count so far", and why) is behind an ⓘ next to the ribbons' Average header, not a "Based on" line in the summary card. `InfoButton` has `align="end"` for buttons near the right edge.
- 2026-10-20 (student): the Dashboard summary shows just the title and short dates ("Oct 13 – Oct 19", `formatShortDay`) beside the tiles; no verdict line ("Mostly balanced." / "A few things to work on.").
- 2026-10-20 (student): on phones (below sm) the week grid shows 3 days at a time with ‹ › arrows (opens on the newest; `PHONE_DAYS` in `components/WeekRibbons.tsx`) instead of scrolling sideways; sm and up show all 7. The nutrient detail table's first column is "Day" with dates as "Oct 13".
- 2026-10-20: README and flows.md brought up to date (diagram, first-week stages, states), `user-flows.pdf` regenerated, the first-run check written up in README, and a one-page process write-up added (`docs/`). The weekend vs. weekday trend was dropped for time.
- Next: confirm the Vercel deploy and add its URL to README.
