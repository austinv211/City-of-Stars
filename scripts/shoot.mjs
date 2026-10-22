#!/usr/bin/env node
/**
 * Screenshot a route at a set of viewports, signed in as a seeded test user.
 *
 * A thin manual-inspection tool, not a test: it asserts nothing and is meant
 * for eyeballing a change mid-work. The assertions live in
 * scripts/verify-responsive.mjs and, later, the Playwright suite.
 *
 * Usage:
 *   node --env-file=.env.e2e scripts/shoot.mjs /dm/members dm phone,desktop
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { assertNotProduction } from "./assert-not-production.mjs";

const BASE = process.env.SHOOT_BASE ?? "http://localhost:1421";
const route = process.argv[2] ?? "/";
const who = process.argv[3] ?? "dm";
const only = (process.argv[4] ?? "phone,tablet,desktop").split(",");

const LOGINS = {
  dm: ["dm@test.local", "test-password-dm"],
  player: ["player1@test.local", "test-password-p1"],
  admin: ["admin@test.local", "test-password-admin"],
};

const SIZES = {
  phone: { width: 412, height: 915, mobile: true },
  tablet: { width: 820, height: 1180, mobile: false },
  desktop: { width: 1440, height: 900, mobile: false },
};

const OUT = "artifacts/shots";

async function main() {
  assertNotProduction();
  mkdirSync(OUT, { recursive: true });
  const [email, password] = LOGINS[who] ?? LOGINS.dm;
  const browser = await chromium.launch();

  for (const name of only) {
    const vp = SIZES[name];
    if (!vp) continue;
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.mobile,
      isMobile: vp.mobile,
      deviceScaleFactor: vp.mobile ? 2 : 1,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.locator("form").getByRole("button", { name: /sign in/i }).click();
    await page
      .locator("nav[aria-label='Main']:visible, [aria-label='More navigation']:visible")
      .first()
      .waitFor({ timeout: 20000 });

    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    // The dev realtime overlay sits over the header; hide it for the shot.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("div")) {
        if (el.textContent?.startsWith("Realtime Debug")) {
          el.closest("div[class*='fixed']")?.remove();
        }
      }
    });

    const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
    const file = `${OUT}/${slug}-${name}.png`;
    await page.screenshot({ path: file });
    console.log(`${file}`);
    await ctx.close();
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
