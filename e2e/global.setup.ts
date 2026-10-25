import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Asks Clerk for a testing token (with the secret key, on this machine only),
// which the sign-in helper attaches so test sign-ins aren't treated as bots.
setup("get a Clerk testing token", async () => {
  await clerkSetup();
});
