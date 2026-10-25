import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { CharacterWizardPage } from "./pages/CharacterWizardPage";

/**
 * The six-step creation wizard, end to end: what the player picks is what the
 * database stores. player1 already has an active character in the test
 * campaign, so this one lands as a draft -- the wizard's own rule.
 */
test("a player builds a character through all six steps", async ({ openAs }) => {
  const page = await openAs("player1");
  const wizard = new CharacterWizardPage(page);

  await wizard.goto();
  await wizard.identity("Wren Halloway", "Elf", "Fighter");
  await wizard.background("Soldier");
  await wizard.standardArray({ STR: 15, DEX: 14, CON: 13, INT: 8, WIS: 12, CHA: 10 });
  await wizard.skills(["Athletics", "Perception"]);
  await wizard.skipPortrait();

  // The review shows what is about to be saved.
  await expect(page.getByRole("heading", { name: "Wren Halloway" })).toBeVisible();
  await wizard.create();
  await expect(page.getByText("Wren Halloway").first()).toBeVisible();

  const id = page.url().split("/").at(-1) ?? "";
  const character = must(
    await admin()
      .from("characters")
      .select("name, class, species, background, level, status, ability_scores(*)")
      .eq("id", id)
      .single(),
    "created character",
  );
  expect(character).toMatchObject({
    name: "Wren Halloway",
    class: "Fighter",
    species: "Elf",
    background: "Soldier",
    level: 1,
    status: "draft",
  });
  // Base scores: the Soldier's +2/+1 is stored as background_bonus_*, not
  // folded in -- every reader adds it, so folding it in counted it twice.
  expect(character.ability_scores).toMatchObject({
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 8,
    wisdom: 12,
    charisma: 10,
    method: "standard_array",
    background_bonus_primary: "strength",
    background_bonus_secondary: "dexterity",
  });

  const skills = must(
    await admin()
      .from("character_proficiencies")
      .select("skill")
      .eq("character_id", id),
    "proficiencies",
  ).map((p) => p.skill);
  expect(skills).toEqual(expect.arrayContaining(["Athletics", "Perception"]));
});
