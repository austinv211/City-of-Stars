import { chromium, type FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import {
  assertNotProduction,
  assertTestMarker,
} from "../scripts/assert-not-production.mjs";
import { LoginPage } from "./pages/LoginPage";
import { AppShell } from "./pages/AppShell";
import { USERS, storageStatePath, type Role } from "./support/users";

/**
 * Runs once, after the dev server is up and before any spec.
 *
 * 1. Refuse anything but the local test stack. Specs write freely -- they
 *    create and delete whole campaigns -- so the target must be provably
 *    local: loopback host, not the real project, not the production key, and
 *    carrying the _cos_test_marker table.
 * 2. (Re)create the deterministic users. Idempotent.
 * 3. Sign each role in once through the real login form and keep the browser
 *    state, so specs start signed in instead of each paying for the form.
 *
 * Schema and seeds are NOT reset here: `npm run e2e:up` does that once, and
 * specs isolate themselves by campaign (see fixtures.ts) rather than by
 * truncation, so they can run in parallel.
 */
export default async function globalSetup(config: FullConfig) {
  assertNotProduction(process.env);
  await assertTestMarker(process.env);

  execFileSync(process.execPath, ["scripts/seed-test-users.mjs"], {
    stdio: "inherit",
    env: process.env,
  });

  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("global-setup: no baseURL in playwright.config.ts");

  mkdirSync("e2e/.auth", { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const role of Object.keys(USERS) as Role[]) {
      const page = await browser.newPage({ baseURL });
      const login = new LoginPage(page);
      await login.goto();
      await login.signIn(USERS[role].email, USERS[role].password);
      await new AppShell(page).expectSignedIn();
      await page.context().storageState({ path: storageStatePath(role) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
