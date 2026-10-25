import { test, expect } from "./fixtures";
import { admin } from "./support/admin";
import { participantFor, participants } from "./support/encounter";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { EncounterPage } from "./pages/EncounterPage";

/**
 * The realtime journey (plan §2.5): one DM and two players, each in their own
 * browser, through one whole fight. Every assertion about a player is made in
 * that player's browser -- the point is that the DM's actions reach them.
 */
test("a full fight reaches every player live", async ({ openAs, campaign }) => {
  test.slow(); // three browsers and a dozen realtime round trips

  const [p1Page, p2Page, dmPage] = await Promise.all([
    openAs("player1"),
    openAs("player2"),
    openAs("dm"),
  ]);
  const p1 = new EncounterPage(p1Page);
  const p2 = new EncounterPage(p2Page);
  const dm = new EncounterPage(dmPage);
  const isolde = campaign.characters.player1.name;
  const corin = campaign.characters.player2.name;

  await test.step("the DM runs the template; both players are pulled in", async () => {
    await Promise.all([p1.goto(), p2.goto()]);
    await expect(p1.noActiveEncounter).toBeVisible();
    await expect(p2.noActiveEncounter).toBeVisible();

    const list = new DmEncountersPage(dmPage);
    await list.goto();
    await list.runTemplate("Goblin Ambush");

    await expect(p1.initiativeHeading).toBeVisible();
    await expect(p2.initiativeHeading).toBeVisible();
  });

  await test.step("both roll initiative with scripted dice", async () => {
    const [mod1, mod2] = await Promise.all([
      p1.initiativeModifier(),
      p2.initiativeModifier(),
    ]);
    await p1.rollInitiative(18);
    await p2.rollInitiative(3);

    const order = await participants(campaign.id);
    const score = (name: string) =>
      order.find((p) => p.name === name)?.initiative_score;
    expect(score(isolde)).toBe(18 + mod1);
    expect(score(corin)).toBe(3 + mod2);
    // Higher initiative acts first.
    const names = order.map((p) => p.name);
    expect(names.indexOf(isolde)).toBeLessThan(names.indexOf(corin));
  });

  const isoldeRow = await participantFor(campaign.id, campaign.characters.player1.id);

  await test.step("the DM advances; the turn moves in every browser", async () => {
    await dm.advanceTo(isolde);
    await p1.expectTurnOf("you");
    await expect(p1.endTurnButton).toBeVisible();
    await p2.expectTurnOf(isolde);
  });

  await test.step("the player ends their own turn", async () => {
    await p1.endTurnButton.click();
    await expect(p1.endTurnButton).toBeHidden();
    // Whoever is next, the DM and the other player agree on it.
    // The bar reads "R2Corin Ashgrove's turn· Next: …": skip the round.
    await expect(dm.turnBar).not.toContainText(`${isolde}'s turn`);
    const nextText = /^R\d+(.+)'s turn/.exec((await dm.turnBar.textContent()) ?? "");
    expect(nextText).not.toBeNull();
    const nextName = nextText?.[1] ?? "";
    expect(nextName).not.toBe(isolde);
    await p1.expectTurnOf(nextName);
    if (nextName === corin) await p2.expectTurnOf("you");
    else await p2.expectTurnOf(nextName);
  });

  await test.step("damage reaches the player, and prompts concentration", async () => {
    await admin()
      .from("encounter_participants")
      .update({ concentrating_on: "Bless" })
      .eq("id", isoldeRow.id);

    // The prompt reads the DM's copy of the row: wait for the update to land.
    await expect(await dm.combatant(isoldeRow.id)).toContainText("Bless");
    await dm.damage(isoldeRow.id, 10);
    await expect(await dm.concentrationPrompt(isoldeRow.id)).toContainText(
      "DC 10 for Bless",
    );
    await expect(await dm.hpOf(isoldeRow.id)).toHaveText("18 / 28 HP");
    await expect(p1.stage).toContainText("18 / 28 HP");
  });

  await test.step("dropped to 0, the player's stage turns to death saves", async () => {
    await dm.damage(isoldeRow.id, 18);
    await expect(p1.stage).toContainText("You are dying");
    await expect(p1.waitForTurnButton).toBeDisabled(); // not their turn yet

    await dm.advanceTo(isolde);
    await expect(p1.rollDeathSaveButton).toBeEnabled();
    await p1.rollDeathSave(15);
    await expect(p1.deathSaves("Successes", 1)).toBeVisible();
    await expect(await dm.deathSaveTrackOf(isoldeRow.id)).toContainText("S ●○○");
  });

  await test.step("the DM ends the encounter; both players are released", async () => {
    await dm.endEncounter();
    await expect(p1.noActiveEncounter).toBeVisible();
    await expect(p2.noActiveEncounter).toBeVisible();
  });
});
