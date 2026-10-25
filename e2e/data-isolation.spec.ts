import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Two people sign in, each logs a food, and neither can see the other's:
// not in the app (today's meals) and not by asking Supabase directly with
// their own sign-in token. Row-level security is what makes both true (see
// supabase/migrations); break a policy and this test fails.

const USER_A = process.env.E2E_USER_A_EMAIL;
const USER_B = process.env.E2E_USER_B_EMAIL;
// A name no one else has, so the checks can't be fooled by earlier runs.
const RUN = Date.now().toString(36);
const FOOD_A = `E2E food A ${RUN}`;
const FOOD_B = `E2E food B ${RUN}`;

test.skip(!USER_A || !USER_B, "Set E2E_USER_A_EMAIL and E2E_USER_B_EMAIL in .env.local");

async function signIn(page: Page, email: string) {
  // The helper needs a page that loads Clerk; the welcome screen is public.
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}

/** Opens the Dashboard, going through setup first if this account is new. */
async function openDashboard(page: Page) {
  await page.goto("/log");
  const addFood = page.getByRole("button", { name: /^Add food/ }).first();
  const welcome = page.getByRole("heading", { name: "Welcome to Diet Tracker" });
  await expect(addFood.or(welcome)).toBeVisible();
  if (await addFood.isVisible()) return;

  await page.goto("/setup");
  const first = page.locator("#setup-first-name");
  await expect(first).toBeVisible();
  if (!(await first.inputValue())) await first.fill("Test");
  const last = page.locator("#setup-last-name");
  if (!(await last.inputValue())) await last.fill("User");
  await page.locator("#setup-height-ft").fill("5");
  await page.locator("#setup-height-in").fill("9");
  await page.locator("#setup-weight").fill("160");
  await page.locator("#setup-birth").fill("01/01/1990");
  // The radios are visually hidden inside their pill labels.
  await page.locator("#sex-female").check({ force: true });
  await page.locator("#activity-light").check({ force: true });
  await page.getByRole("button", { name: "See my ranges" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto("/log");
  await expect(addFood).toBeVisible();
}

/** Logs a food of your own through Add food, and waits until Supabase has it. */
async function logFood(page: Page, name: string) {
  await page.getByRole("button", { name: /^Add food/ }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: "Add your own food" }).click();
  await dialog.locator("#custom-name").fill(name);
  await dialog.locator("#custom-calories").fill("123");
  await dialog.getByRole("button", { name: "Add to list" }).click();
  const saved = page.waitForResponse(
    (response) => response.url().includes("/rest/v1/log_entries") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /^Add 1 food to/ }).click();
  expect((await saved).ok()).toBe(true);
  await dialog.getByRole("button", { name: "Done" }).click();
}

/** Today's meals as the app shows them, every meal opened. */
async function todaysMeals(page: Page) {
  await page.goto("/log");
  await page.getByRole("button", { name: "See meals" }).click();
  const panel = page.locator("dialog[open]");
  const closed = panel.locator("section button[aria-expanded='false'][aria-controls]");
  while ((await closed.count()) > 0) await closed.first().click();
  return panel;
}

/** A Supabase client acting as whoever is signed in on `page` (their Clerk token). */
async function supabaseAs(page: Page) {
  const token = await page.evaluate(() => window.Clerk.session?.getToken() ?? null);
  expect(token, "signed in with a Clerk session").toBeTruthy();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    accessToken: async () => token,
  });
}

test("two people can't see each other's food", async ({ browser }) => {
  // Separate browser contexts: separate cookies, so two separate sign-ins.
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  try {
    await signIn(a, USER_A!);
    await signIn(b, USER_B!);
    await openDashboard(a);
    await openDashboard(b);

    await logFood(a, FOOD_A);
    await logFood(b, FOOD_B);

    // In the app: each sees their own food in today's meals, never the other's.
    const mealsA = await todaysMeals(a);
    await expect(mealsA.getByText(FOOD_A)).toBeVisible();
    await expect(mealsA.getByText(FOOD_B)).toHaveCount(0);

    const mealsB = await todaysMeals(b);
    await expect(mealsB.getByText(FOOD_B)).toBeVisible();
    await expect(mealsB.getByText(FOOD_A)).toHaveCount(0);

    // Straight to the database with each person's own token: asking for the
    // other's food by name returns nothing, and so does asking for every row.
    const dbA = await supabaseAs(a);
    const dbB = await supabaseAs(b);
    const bAsksForA = await dbB.from("log_entries").select("name").eq("name", FOOD_A);
    expect(bAsksForA.error).toBeNull();
    expect(bAsksForA.data).toEqual([]);
    const aAsksForB = await dbA.from("log_entries").select("name").eq("name", FOOD_B);
    expect(aAsksForB.data).toEqual([]);
    const everyRowB = await dbB.from("log_entries").select("name").like("name", `E2E food % ${RUN}`);
    expect(everyRowB.data?.map((row) => row.name)).toEqual([FOOD_B]);
  } finally {
    // Each removes their own test food (allowed: it's their row).
    for (const [page, food] of [
      [a, FOOD_A],
      [b, FOOD_B],
    ] as const) {
      try {
        await (await supabaseAs(page)).from("log_entries").delete().eq("name", food);
      } catch {
        // Cleanup is best effort; a leftover row has a unique, dated name.
      }
    }
    await contextA.close();
    await contextB.close();
  }
});
