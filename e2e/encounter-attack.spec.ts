import { test, expect } from "./fixtures";
import { participantFor, participants } from "./support/encounter";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { EncounterPage } from "./pages/EncounterPage";

/**
 * Target, attack, apply (plan §3.2): the DM aims the goblin at a player, and
 * a scripted d20 is judged against that player's real AC -- then the rolled
 * damage applies to the target in one tap.
 */
test("a goblin's attack is judged against its target's AC and applied", async ({
  openAs,
  campaign,
}) => {
  const page = await openAs("dm");
  const list = new DmEncountersPage(page);
  await list.goto();
  await list.runTemplate("Goblin Ambush");

  const dm = new EncounterPage(page);
  const isolde = campaign.characters.player1.name;
  const target = await participantFor(campaign.id, campaign.characters.player1.id);
  const goblin = (await participants(campaign.id)).find((p) => p.name === "Goblin");
  if (!goblin) throw new Error("no goblin in the run");

  await dm.target(target.id, isolde);
  await dm.select(goblin.id, "Goblin");
  const scimitar = dm.monsterAction("Scimitar");

  await test.step("a natural 1 misses whatever the total", async () => {
    await dm.queueDice([1]);
    await scimitar.getByRole("button", { name: /To Hit \+4/ }).click();
    await expect(scimitar).toContainText("Miss (natural 1)");
  });

  await test.step("14 + 4 = 18 hits AC 16", async () => {
    await dm.queueDice([14]);
    await scimitar.getByRole("button", { name: /To Hit \+4/ }).click();
    await expect(scimitar).toContainText("18 vs AC 16");
    await expect(scimitar).toContainText("Hit");
  });

  await test.step("the damage applies to the target in one tap", async () => {
    await dm.queueDice([5]);
    await scimitar.getByRole("button", { name: "1d6+2" }).click();
    await scimitar.getByRole("button", { name: `Apply to ${isolde}` }).click();
    await expect(scimitar).toContainText(`${isolde} took 7`);

    expect(
      (await participantFor(campaign.id, campaign.characters.player1.id)).hp_current,
    ).toBe(21);
    await expect(await dm.hpOf(target.id)).toHaveText("21 / 28 HP");
  });
});
