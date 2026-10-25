import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/**
 * The E2E suite (plan §2.5), against the LOCAL Supabase stack only.
 *
 *   npm run e2e:up      # once: start the stack, reset schema + seeds
 *   npm run e2e         # this suite
 *
 * The environment is .env.e2e and nothing else, loaded here and handed to
 * both the test workers and the vite build explicitly -- vite's own --mode
 * loading would layer the real .env (production) underneath it.
 * global-setup refuses to run unless that environment is provably local.
 */
const e2eEnv = parseEnv(readFileSync(".env.e2e", "utf8")) as Record<string, string>;
Object.assign(process.env, e2eEnv);

const PORT = 1421;
const OUT_DIR = "dist-e2e";
const baseURL = `http://localhost:${String(PORT)}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "artifacts/e2e/results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries hide flakes; a test that needs one is a bug to fix (plan §2.5).
  retries: process.env.CI ? 2 : 0,
  // Realtime fan-out on one local stack: a few workers, not one per core.
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "artifacts/e2e/report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "artifacts/e2e/report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
      },
    },
    {
      name: "phone",
      // Pixel 7's viewport on Chromium (devices["Pixel 7"] is 412x839).
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 915 },
      },
    },
  ],
  // A production build, served by `vite preview`: what ships, and none of
  // the dev server's on-demand transforms -- which, under nine browsers at
  // once, intermittently failed a module import and left a blank app. Built
  // to its own directory so dist/ (the Tauri bundle input) is never touched.
  webServer: {
    command:
      `npx vite build --mode e2e --outDir ${OUT_DIR} --emptyOutDir && ` +
      `npx vite preview --mode e2e --outDir ${OUT_DIR} --port ${String(PORT)} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: e2eEnv,
  },
});
