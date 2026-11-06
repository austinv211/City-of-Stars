import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { RulesLookup } from "./pages/RulesLookup";
import { AppShell } from "./pages/AppShell";

/**
 * The Rules Reference opens from the app's navigation on any screen. SRD
 * content is not seeded in a test database (it is parsed from docs/rules,
 * which is not committed), so each test brings its own entry -- uniquely
 * named, so parallel runs never see each other's -- and removes it.
 */
async function withRule(run: (tag: string, title: string) => Promise<void>) {
  const tag = randomUUID().slice(0, 8);
  const title = `Bewildered ${tag}`;
  const rule = must(
    await admin()
      .from("srd_rules")
      .insert({
        category: "Condition",
        title,
        content: `A bewildered creature (${tag}) can't take reactions.`,
      })
      .select("id")
      .single(),
    "glossary entry",
  );

  try {
    await run(tag, title);
  } finally {
    await admin().from("srd_rules").delete().eq("id", rule.id);
  }
}

async function readRule(rules: RulesLookup, tag: string, title: string) {
  await rules.searchGlossary(tag);
  await rules.result(title).click();
  await expect(rules.detail(title)).toBeVisible();
  await expect(rules.dialog).toContainText("can't take reactions");
}

test("the DM looks up a rule mid-encounter", async ({ openAs }) => {
  await withRule(async (tag, title) => {
    const page = await openAs("dm");
    const list = new DmEncountersPage(page);
    await list.goto();
    await list.runTemplate("Goblin Ambush");

    const rules = new RulesLookup(page);
    await rules.open();
    await readRule(rules, tag, title);
  });
});

test("a player looks up a rule from a screen with no rules of its own", async ({ openAs }) => {
  await withRule(async (tag, title) => {
    const page = await openAs("player1");
    await page.goto("/schedule");

    const rules = new RulesLookup(page);
    await rules.open();
    await readRule(rules, tag, title);
  });
});

test("Ctrl+K opens the rules on desktop", async ({ openAs }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a keyboard shortcut is a desktop affordance");
  const page = await openAs("player1");
  await page.goto("/campaigns");
  await new AppShell(page).expectSignedIn();
  await page.keyboard.press("Control+k");
  await expect(new RulesLookup(page).dialog).toBeVisible();
});
