import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { AppShell } from "./pages/AppShell";
import { DmEncountersPage } from "./pages/DmEncountersPage";

/**
 * The encounter screen fits at every size the layout projects cover, the
 * desktop app's default window and a phone held sideways among them:
 *
 *   - no horizontal page scroll;
 *   - nothing pushed above the top of the content, out of reach. A centred
 *     column taller than a short screen did exactly that to the player's
 *     initiative screen, which is why that is checked here too.
 */

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.body;
    return el.scrollWidth - el.clientWidth;
  });
}

/**
 * How far the highest element in <main> starts above <main> itself, with
 * <main> scrolled to the top. A few pixels is decoration (a live dot nudged
 * above its icon); more is content nobody can scroll to.
 */
async function clippedAboveContent(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return 0;
    main.scrollTop = 0;
    const top = main.getBoundingClientRect().top;
    let highest = top;
    for (const el of main.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) highest = Math.min(highest, r.top);
    }
    return top - highest;
  });
}

async function expectFits(page: Page, what: string) {
  await page.waitForLoadState("networkidle");
  expect(await horizontalOverflow(page), `${what}: horizontal page scroll`).toBeLessThanOrEqual(1);
  expect(await clippedAboveContent(page), `${what}: content above the top`).toBeLessThanOrEqual(8);
}

test("the encounter screen fits for the DM and a player", async ({ openAs }) => {
  const dm = await openAs("dm");
  const list = new DmEncountersPage(dm);
  await list.goto();
  await list.runTemplate("Goblin Ambush");
  await expectFits(dm, "DM's encounter");

  // A player who hasn't rolled yet sees the initiative screen.
  const player = await openAs("player1");
  await player.goto("/encounter");
  await new AppShell(player).expectSignedIn();
  await expect(player.getByRole("heading", { name: "Roll for Initiative" })).toBeVisible();
  await expectFits(player, "player's initiative screen");
});
