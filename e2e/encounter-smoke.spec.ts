import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { EncounterPage } from "./pages/EncounterPage";

/**
 * The smallest end-to-end proof of the realtime loop: the DM starts an
 * encounter in one browser and a player, already watching in another, is
 * pulled into it without reloading -- then rolls initiative with a scripted
 * die, and the score lands in the database.
 */
test("the DM runs a template and a watching player is pulled in", async ({
  openAs,
  campaign,
}) => {
  const player = await openAs("player1");
  const encounter = new EncounterPage(player);
  await encounter.goto();
  await expect(encounter.noActiveEncounter).toBeVisible();

  const dm = await openAs("dm");
  await new DmEncountersPage(dm).goto();
  await new DmEncountersPage(dm).runTemplate("Goblin Ambush");

  // No reload: the encounters channel moves the player in.
  await expect(encounter.initiativeHeading).toBeVisible();

  const mod = await encounter.initiativeModifier();
  await encounter.rollInitiative(17);

  const row = must(
    await admin()
      .from("encounter_participants")
      .select(
        "initiative_score, has_rolled_initiative, encounters!inner(campaign_id, status)",
      )
      .eq("character_id", campaign.characters.player1.id)
      .eq("encounters.campaign_id", campaign.id)
      .eq("encounters.status", "active")
      .single(),
    "player1's participant",
  );
  expect(row.has_rolled_initiative).toBe(true);
  expect(row.initiative_score).toBe(17 + mod);
});
