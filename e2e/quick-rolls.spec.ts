import { test, expect } from "./fixtures";
import { admin } from "./support/admin";
import { AppShell } from "./pages/AppShell";

/**
 * Rolling from the character sheet, out of combat: a check with advantage
 * keeps the higher die, lands in the roll history with no encounter, and
 * the mode falls back to Normal for the next roll.
 */
test("a player rolls a skill check with advantage from their sheet", async ({
  openAs,
  campaign,
}) => {
  const me = campaign.characters.player1;
  const page = await openAs("player1");
  await page.goto(`/characters/${me.id}`);
  await new AppShell(page).expectSignedIn();

  const tray = page.getByRole("region", { name: "Skills" });
  const perception = tray.getByRole("button", { name: /^Roll Perception / });
  // WIS 12 and no proficiency: +1.
  await expect(perception).toHaveAccessibleName("Roll Perception +1");

  const modes = page.getByRole("radiogroup", { name: "Roll with" });
  await modes.getByRole("radio", { name: "Advantage", exact: true }).click();

  await page.evaluate(() => {
    window.__setDiceQueue?.([4, 17]);
  });
  await perception.click();

  await expect(modes.getByRole("radio", { name: "Normal", exact: true })).toBeChecked();

  await expect
    .poll(async () => {
      const { data } = await admin()
        .from("dice_rolls")
        .select("roll_type, result, total, encounter_id, character_name")
        .eq("campaign_id", campaign.id);
      return data;
    })
    .toEqual([
      {
        roll_type: "Perception Check",
        result: 17,
        total: 18,
        encounter_id: null,
        character_name: me.name,
      },
    ]);
});
