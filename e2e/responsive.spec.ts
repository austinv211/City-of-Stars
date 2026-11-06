import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { AppShell } from "./pages/AppShell";
import { ROUTES } from "../scripts/lib/routes.mjs";
import { findSmallTapTargets } from "../scripts/lib/tap-targets.mjs";

/**
 * Structural checks on every top-level route, at every viewport (plan
 * §Verification). Structural on purpose: these survive restyling, which pixel
 * snapshots would not.
 *
 *   - no horizontal page scroll -- wide content scrolls in its own container
 *   - the right nav surface: the tab bar below 768px, the sidebar/rail above
 *   - on a touch screen, no tap area under 44px
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


async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.body;
    return el.scrollWidth - el.clientWidth;
  });
}

/**
 * Interactive elements whose tap area is under 44px. Small controls may keep
 * their desktop size on a phone if an invisible ::after makes up the rest
 * (see the touch rules in globals.scss).
 */
async function smallTapTargets(page: Page) {
  return page.evaluate(findSmallTapTargets, 44);
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

      // The tab bar is the phone layout, below 768px; touch screens of any
      // width need full-size tap areas.
      const phone = (page.viewportSize()?.width ?? 1440) < 768;
      const touch = testInfo.project.use.hasTouch === true;
      await expect(page.getByRole("button", { name: "More navigation" })).toBeVisible({
        visible: phone,
      });
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible({
        visible: !phone,
      });

      if (touch)
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
