import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { RulesLookup } from "./pages/RulesLookup";

/**
 * Rules lookup from the table: search the glossary mid-encounter and read an
 * entry. SRD content is not seeded in a test database (it is parsed from
 * docs/rules, which is not committed), so the spec brings its own entry --
 * uniquely named, so parallel runs never see each other's -- and removes it.
 */
test("the DM looks up a rule mid-encounter", async ({ openAs }) => {
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
    const page = await openAs("dm");
    const list = new DmEncountersPage(page);
    await list.goto();
    await list.runTemplate("Goblin Ambush");

    const rules = new RulesLookup(page);
    await rules.open();
    await rules.searchGlossary(tag);
    await rules.result(title).click();
    await expect(rules.detail(title)).toBeVisible();
    await expect(rules.dialog).toContainText("can't take reactions");
  } finally {
    await admin().from("srd_rules").delete().eq("id", rule.id);
  }
});
