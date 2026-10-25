import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { replaySrdApi } from "./support/srdApi";
import { AppShell } from "./pages/AppShell";

/**
 * The DM imports an SRD monster into the campaign's library: search, pick,
 * the form pre-fills, save. The SRD API is replayed from recordings.
 */
test("the DM imports a goblin from the SRD", async ({ openAs, campaign }) => {
  const page = await openAs("dm");
  await replaySrdApi(page);
  await page.goto("/dm/monsters");
  await new AppShell(page).expectSignedIn();

  await page.getByRole("button", { name: "New Monster" }).click();
  const dialog = page.getByRole("dialog", { name: "New Monster" });
  await dialog.getByLabel("Search the SRD for a monster").fill("goblin");
  await dialog.getByRole("button", { name: "Goblin", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Hobgoblin" })).toBeHidden();
  await dialog.getByRole("button", { name: "Create Monster" }).click();
  await expect(dialog).toBeHidden();

  const goblin = must(
    await admin()
      .from("custom_monsters")
      .select("name, hp, ac, cr, dex_score, actions")
      .eq("campaign_id", campaign.id)
      .eq("name", "Goblin")
      .single(),
    "imported goblin",
  );
  expect(goblin).toMatchObject({ name: "Goblin", hp: 7, ac: 15, dex_score: 14 });
  const actions = (goblin.actions ?? []) as { name: string }[];
  expect(actions.map((a) => a.name)).toEqual(["Scimitar", "Shortbow"]);
});
