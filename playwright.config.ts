import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (npm run test:e2e). The keys and the two test users come
// from .env.local, which the student keeps (the agent can't read it): Clerk's
// keys, the Supabase URL and publishable key, and E2E_USER_A_EMAIL /
// E2E_USER_B_EMAIL (Clerk test addresses, e.g. name+clerk_test@example.com).
try {
  process.loadEnvFile(".env.local");
} catch {
  // In CI the variables are set directly.
}

const PORT = Number(process.env.E2E_PORT ?? 3001);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Signing in and loading from Supabase takes a few seconds per user.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    // Gets a Clerk testing token once, so sign-ins skip bot protection.
    { name: "setup", testMatch: /global\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  // Uses the dev server if it's already running on the port; starts one otherwise.
  webServer: { command: `npx next dev -p ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
