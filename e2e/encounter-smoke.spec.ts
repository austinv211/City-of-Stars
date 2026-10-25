import { test, expect } from "./fixtures";
import { participantFor } from "./support/encounter";
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

  const row = await participantFor(campaign.id, campaign.characters.player1.id);
  expect(row.initiative_score).toBe(17 + mod);
});
