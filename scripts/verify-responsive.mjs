#!/usr/bin/env node
/**
 * Responsive smoke check against a running dev server.
 *
 * Logs in as a seeded test user, then at each viewport asserts the structural
 * properties that matter and captures a screenshot for eyeballing:
 *
 *   - no horizontal page scroll (the single best proxy for "it fits")
 *   - exactly one nav surface is visible, and it is the right one
 *   - no interactive element is below the 44px tap-target floor (phone only)
 *
 * This is the precursor to the Playwright suite in the plan's §2.5 -- same
 * assertions, same seeded users -- kept as a standalone script so it can run
 * before the full harness exists.
 *
 * Usage:
 *   node --env-file=.env.e2e scripts/verify-responsive.mjs [baseUrl]
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { assertNotProduction } from "./assert-not-production.mjs";

const BASE = process.argv[2] ?? "http://localhost:1421";
const OUT = "artifacts/responsive";

const VIEWPORTS = [
  { name: "phone", width: 412, height: 915, expect: "tabbar" },
  { name: "tablet", width: 820, height: 1180, expect: "rail" },
  { name: "desktop", width: 1440, height: 900, expect: "sidebar" },
];

const results = [];

function record(vp, check, pass, detail = "") {
  results.push({ vp, check, pass, detail });
  const mark = pass ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m";
  console.log(`  ${mark} ${check}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  // The login flow writes a session; never point this at production.
  assertNotProduction();
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n\x1b[1m${vp.name}\x1b[0m (${vp.width}x${vp.height})`);
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.name === "phone",
      isMobile: vp.name === "phone",
      deviceScaleFactor: vp.name === "phone" ? 2 : 1,
    });
    const page = await ctx.newPage();

    page.on("console", (m) => {
      if (m.type() === "error") console.log(`    [console] ${m.text().slice(0, 140)}`);
    });

    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    // ── sign in ────────────────────────────────────────────────────────────
    await page.getByLabel(/email/i).fill("admin@test.local");
    await page.getByLabel(/^password$/i).fill("test-password-admin");
    // "Sign In" is both the mode tab and the submit button, so scope to the form.
    await page.locator("form").getByRole("button", { name: /sign in/i }).click();

    // The shell is up once a nav surface exists.
    await page
      .locator("nav[aria-label='Main']:visible, [aria-label='More navigation']:visible")
      .first()
      .waitFor({ timeout: 20000 });
    await page.waitForTimeout(600); // let layout settle

    // ── no horizontal page scroll ──────────────────────────────────────────
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.body;
      return { scroll: el.scrollWidth, client: el.clientWidth };
    });
    record(
      vp.name,
      "no horizontal page scroll",
      overflow.scroll <= overflow.client + 1,
      `scrollWidth ${overflow.scroll} vs clientWidth ${overflow.client}`,
    );

    // ── the right single nav surface is visible ────────────────────────────
    const surfaces = {
      tabbar: await page.locator("[aria-label='More navigation']").isVisible(),
      rail: await page.locator("aside.w-16").isVisible(),
      sidebar: await page.locator("aside.w-56").isVisible(),
    };
    const visible = Object.entries(surfaces)
      .filter(([, v]) => v)
      .map(([k]) => k);
    record(
      vp.name,
      `nav surface is "${vp.expect}"`,
      visible.length === 1 && visible[0] === vp.expect,
      `visible: ${visible.join(", ") || "none"}`,
    );

    // ── tap targets (phone only) ───────────────────────────────────────────
    if (vp.name === "phone") {
      const small = await page.evaluate(() => {
        const sel = "button, a[href], [role='button'], [role='tab']";
        const bad = [];
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // hidden
          if (r.height < 44 || r.width < 44) {
            bad.push(
              `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 18)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          }
        }
        return bad;
      });
      record(
        vp.name,
        "all tap targets >= 44px",
        small.length === 0,
        small.length ? `${small.length} too small: ${small.slice(0, 4).join("; ")}` : "",
      );
    }

    const shot = `${OUT}/${vp.name}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`    screenshot: ${shot}`);

    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL [${f.vp}] ${f.check}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
