import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { AppShell } from "./pages/AppShell";

/**
 * Structural checks on every top-level route, at every viewport (plan
 * §Verification). Structural on purpose: these survive restyling, which pixel
 * snapshots would not.
 *
 *   - no horizontal page scroll -- wide content scrolls in its own container
 *   - the right nav surface: the tab bar below 768px, the sidebar/rail above
 *   - on a phone, no tap target under 44px
 *   - no serious or critical axe violations, bar the known debt below
 */

/**
 * Axe rules failing today for reasons outside a component's own markup,
 * reported (as a test annotation, with counts) rather than failing the run.
 * Shrink this list; never grow it.
 *
 *   color-contrast  --muted-foreground on the dark background is 3.28:1, under
 *                   AA's 4.5:1 for body text. A theme-token decision for the
 *                   owner (it changes the Polaris look), not a per-page fix.
 */
const KNOWN_AXE_DEBT = new Set(["color-contrast"]);

const ROUTES = {
  player1: ["/characters", "/campaigns", "/encounter"],
  dm: [
    "/dm/campaigns",
    "/dm/members",
    "/dm/characters",
    "/dm/sessions",
    "/dm/encounters",
    "/dm/monsters",
  ],
} as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.body;
    return el.scrollWidth - el.clientWidth;
  });
}

/** Interactive elements rendered smaller than the 44px tap-target floor. */
async function smallTapTargets(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll(
      "button, a[href], [role='button'], [role='tab']",
    )) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // not rendered
      if (r.height < 44 || r.width < 44) {
        const name =
          el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 24);
        bad.push(
          `"${name}" ${String(Math.round(r.width))}x${String(Math.round(r.height))}`,
        );
      }
    }
    return bad;
  });
}

for (const [role, routes] of Object.entries(ROUTES) as [
  keyof typeof ROUTES,
  readonly string[],
][]) {
  for (const route of routes) {
    test(`${route} (${role}) fits, navigates, and passes axe`, async ({
      openAs,
    }, testInfo) => {
      const page = await openAs(role);
      await page.goto(route);
      const shell = new AppShell(page);
      await shell.expectSignedIn();
      await page.waitForLoadState("networkidle");

      expect(
        await horizontalOverflow(page),
        "horizontal page scroll",
      ).toBeLessThanOrEqual(1);

      const phone = testInfo.project.name === "phone";
      await expect(page.getByRole("button", { name: "More navigation" })).toBeVisible({
        visible: phone,
      });
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible({
        visible: !phone,
      });

      if (phone)
        expect(await smallTapTargets(page), "tap targets under 44px").toEqual([]);

      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      for (const v of serious.filter((v) => KNOWN_AXE_DEBT.has(v.id)))
        testInfo.annotations.push({
          type: "axe debt",
          description: `${v.id}: ${String(v.nodes.length)} nodes`,
        });
      expect(
        serious
          .filter((v) => !KNOWN_AXE_DEBT.has(v.id))
          .map((v) => `${v.id} (${String(v.nodes.length)}): ${v.help}`),
        "serious/critical axe violations",
      ).toEqual([]);
    });
  }
}
