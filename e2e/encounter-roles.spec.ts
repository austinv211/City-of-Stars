import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { activeEncounter, participantFor, participants } from "./support/encounter";
import { DmEncountersPage } from "./pages/DmEncountersPage";
import { EncounterPage } from "./pages/EncounterPage";

/**
 * The DM and two players in one fight, checking what each role may see and
 * do on each screen: DM-only controls, a monster's hidden numbers, the
 * player-facing monster profile, views that follow the turn, per-combatant
 * targets, and a log that tells each side the story at its own level of
 * detail. Every assertion about a role is made in that role's browser.
 */
test("each role sees and controls only what it should", async ({ openAs, campaign }) => {
  test.slow(); // three browsers, many realtime round trips

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

  await test.step("the DM runs the template and both players roll in", async () => {
    await Promise.all([p1.goto(), p2.goto()]);
    const list = new DmEncountersPage(dmPage);
    await list.goto();
    await list.runTemplate("Goblin Ambush");
    await p1.rollInitiative(18);
    await p2.rollInitiative(3);
  });

  // A second goblin, named and described for the players.
  const { id: encounterId } = await activeEncounter(campaign.id);
  const grizzleRow = must(
    await admin()
      .from("encounter_participants")
      .insert({
        encounter_id: encounterId,
        name: "Goblin",
        nickname: "Grizzle",
        description: "A one-eared goblin with a grudge.",
        portrait_url: "https://example.invalid/grizzle.png",
        art_url: "https://example.invalid/grizzle-art.png",
        is_player: false,
        hp_current: 7,
        hp_max: 7,
        ac: 15,
        initiative_order: 99,
        initiative_score: 1,
        has_rolled_initiative: true,
        actions: [
          {
            name: "Scimitar",
            desc: "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 5 (1d6 + 2) slashing.",
            attack_bonus: 4,
            damage_dice: "1d6+2",
            damage_type: "slashing",
          },
        ],
      })
      .select("id")
      .single(),
    "grizzle",
  );
  const all = await participants(campaign.id);
  const goblin = all.find((p) => p.name === "Goblin" && p.id !== grizzleRow.id);
  if (!goblin) throw new Error("no template goblin in the run");
  const isoldeRow = await participantFor(campaign.id, campaign.characters.player1.id);
  const corinRow = await participantFor(campaign.id, campaign.characters.player2.id);

  await test.step("only the DM gets the DM's controls", async () => {
    await expect(dm.nextTurnButton).toBeVisible();
    await expect(dm.endButton).toBeVisible();
    for (const p of [p1, p2]) {
      await expect(p.nextTurnButton).toHaveCount(0);
      await expect(p.endButton).toHaveCount(0);
    }
    await expect(await dm.editAppearanceButton(goblin.id, "Goblin")).toBeVisible();
    await expect(await p1.editAppearanceButton(goblin.id, "Goblin")).toHaveCount(0);
  });

  await test.step("a player edits only their own combatant", async () => {
    const damageHeal = { name: "Damage / Heal" } as const;
    await expect((await p1.combatant(isoldeRow.id)).getByRole("button", damageHeal)).toBeVisible();
    await expect((await p1.combatant(corinRow.id)).getByRole("button", damageHeal)).toHaveCount(0);
    await expect((await p1.combatant(goblin.id)).getByRole("button", damageHeal)).toHaveCount(0);
    await expect((await dm.combatant(goblin.id)).getByRole("button", damageHeal)).toBeVisible();
  });

  await test.step("players don't see a monster's HP or AC", async () => {
    await expect(await p1.hpOf(goblin.id)).toHaveCount(0);
    await expect(await p1.combatant(goblin.id)).not.toContainText(" AC");
    await expect(await dm.hpOf(goblin.id)).toHaveText("7 / 7 HP");
    await expect(await dm.combatant(goblin.id)).toContainText("15 AC");
  });

  await test.step("a nicknamed monster: its name for players, both for the DM", async () => {
    await expect(await p1.combatant(grizzleRow.id)).toContainText("Grizzle");
    await expect(await p1.combatant(grizzleRow.id)).not.toContainText("(Goblin)");
    await expect(await dm.combatant(grizzleRow.id)).toContainText("Grizzle (Goblin)");
  });

  await test.step("a player looking at a monster sees its profile, not its stats", async () => {
    await p1.select(grizzleRow.id, "Grizzle");
    await expect(p1.viewingChip).toContainText("Grizzle");
    await expect(p1Page.getByText("A one-eared goblin with a grudge.").first()).toBeVisible();
    // Its full art, big, rather than the small portrait.
    await expect(p1Page.getByRole("img", { name: "Grizzle, full art" }).first()).toBeVisible();
    await expect(p1Page.getByRole("group", { name: "Scimitar" })).toHaveCount(0);
    await p1.backToDefault();
  });

  await test.step("the DM renames a monster mid-fight and players see it", async () => {
    await (await dm.editAppearanceButton(goblin.id, "Goblin")).click();
    const dialog = dmPage.getByRole("dialog");
    await dialog.getByLabel("Nickname for Goblin").fill("Snaggletooth");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(await p1.combatant(goblin.id)).toContainText("Snaggletooth");
    await expect(await p2.combatant(goblin.id)).toContainText("Snaggletooth");
  });

  await test.step("each monster keeps its own target", async () => {
    await dm.select(goblin.id, "Snaggletooth");
    await dm.target(isoldeRow.id, isolde);
    await dm.select(grizzleRow.id, "Grizzle");
    await dm.target(corinRow.id, corin);
    await dm.select(goblin.id, "Snaggletooth");
    await expect(
      (await dm.combatant(isoldeRow.id)).getByRole("button", { name: `Stop targeting ${isolde}` }),
    ).toBeVisible();
    await expect(
      (await dm.combatant(corinRow.id)).getByRole("button", { name: `Target ${corin}` }),
    ).toBeVisible();
  });

  await test.step("the log tells the DM the call and players the story", async () => {
    await dm.select(grizzleRow.id, "Grizzle");
    await dm.queueDice([14]);
    await dm
      .monsterAction("Scimitar")
      .getByRole("button", { name: /To Hit \+4/ })
      .click();

    const dmLog = await dm.log();
    await expect(dmLog).toContainText(`Grizzle (Goblin) → ${corin}`);
    await expect(dmLog).toContainText("vs AC 16");
    await expect(dmLog).toContainText("1d20 (14+4)");
    await dm.closeLog();

    const playerLog = await p1.log();
    await expect(playerLog).toContainText(`Grizzle → ${corin}`);
    await expect(playerLog).toContainText("18");
    await expect(playerLog).not.toContainText("vs AC");
    await expect(playerLog).not.toContainText("(14+4)");

    await playerLog.getByRole("button", { name: "Scimitar" }).first().click();
    const card = p1Page.getByRole("dialog", { name: "Scimitar" });
    await expect(card).toContainText("Hit: slashing");
    await expect(card).not.toContainText("+4 to hit");
    await expect(card).toContainText("A one-eared goblin with a grudge.");
    await p1Page.keyboard.press("Escape");
    await p1.closeLog();
  });

  await test.step("a combatant's quick view keeps a monster's numbers from players", async () => {
    const about = async (page: typeof p1Page, enc: EncounterPage) => {
      await (await enc.combatant(grizzleRow.id)).getByRole("button", { name: /^About Grizzle/ }).click();
      const view = page.getByRole("dialog", { name: /^Grizzle/ });
      await expect(view).toBeVisible();
      return view;
    };
    const playerView = await about(p1Page, p1);
    await expect(playerView.getByText("HP").locator("xpath=following-sibling::dd")).toHaveText("?");
    await expect(playerView.getByText("AC").locator("xpath=following-sibling::dd")).toHaveText("?");
    // What it did, one tap from what that was.
    await expect(playerView.getByRole("region", { name: "Recent actions" })).toContainText("Scimitar");
    await p1Page.keyboard.press("Escape");

    const dmView = await about(dmPage, dm);
    await expect(dmView.getByText("HP").locator("xpath=following-sibling::dd")).toHaveText("7/7");
    await expect(dmView.getByText("AC").locator("xpath=following-sibling::dd")).toHaveText("15");
    await dmPage.keyboard.press("Escape");
  });

  await test.step("the DM's view follows the turn", async () => {
    // Peek at someone who isn't acting: the acting combatant is the default.
    const isoldeActing = (await dm.turnBar.textContent())?.includes(`${isolde}'s turn`);
    const [peekId, peekName] = isoldeActing ? [corinRow.id, corin] : [isoldeRow.id, isolde];
    await dm.select(peekId, peekName);
    await expect(dm.viewingChip).toContainText(peekName);
    const before = await dm.turnBar.textContent();
    await dm.nextTurnButton.click();
    await expect(dm.turnBar).not.toHaveText(before ?? "");
    await expect(dm.viewingChip).toBeHidden();
  });

  await test.step("a player peeking elsewhere is brought back for their turn", async () => {
    // Off-turn first, so the peek starts while watching.
    if ((await dm.turnBar.textContent())?.includes(`${isolde}'s turn`)) {
      await dm.nextTurnButton.click();
      await expect(dm.turnBar).not.toContainText(`${isolde}'s turn`);
    }
    // Wait for the turn to reach the player too: a turn change landing after
    // the peek would (rightly) end it.
    // The DM's label adds the stat block, "Grizzle (Goblin)"; players see "Grizzle".
    const acting = (await dm.activeName()).replace(/ \(.+\)$/, "");
    if (acting === isolde) throw new Error("expected someone else's turn");
    await p1.expectTurnOf(acting);
    await p1.select(corinRow.id, corin);
    await expect(p1.viewingChip).toContainText(corin);
    await dm.advanceTo(isolde);
    await expect(p1.viewingChip).toBeHidden();
    await expect(p1.endTurnButton).toBeVisible();
  });
});

test("roles are kept to their own routes", async ({ openAs }) => {
  const [playerPage, dmPage] = await Promise.all([openAs("player1"), openAs("dm")]);

  await test.step("a player can't open the DM's encounter screen", async () => {
    await playerPage.goto("/dm/encounters/active");
    await playerPage.waitForURL("**/characters");
  });

  await test.step("the DM on the player route gets no DM controls", async () => {
    const list = new DmEncountersPage(dmPage);
    await list.goto();
    await list.runTemplate("Goblin Ambush");
    const asPlayer = new EncounterPage(dmPage);
    await asPlayer.goto();
    await expect(asPlayer.nextTurnButton).toHaveCount(0);
    await expect(asPlayer.endButton).toHaveCount(0);
  });
});

test("starting HP can't exceed a character's max", async ({ openAs, campaign }) => {
  const dmPage = await openAs("dm");
  const list = new DmEncountersPage(dmPage);
  await list.goto();

  const dialog = await list.openRunDialog("Goblin Ambush");
  const hp = dialog.getByRole("spinbutton", {
    name: `${campaign.characters.player1.name} starting HP`,
  });
  await hp.fill("99");
  await expect(hp).toHaveValue("28");
  await dialog.getByRole("button", { name: "Run Encounter" }).click();
  await dmPage.waitForURL("**/dm/encounters/active");

  const { id: encounterId } = await activeEncounter(campaign.id);
  const isolde = must(
    await admin()
      .from("encounter_participants")
      .select("hp_current, hp_max")
      .eq("encounter_id", encounterId)
      .eq("character_id", campaign.characters.player1.id)
      .single(),
    "isolde's participant",
  );
  expect(isolde).toEqual({ hp_current: 28, hp_max: 28 });
});
