import { test, expect } from "./fixtures";
import { admin, must } from "./support/admin";
import { AppShell } from "./pages/AppShell";

/**
 * Levelling up is a two-person act: the DM levels the party, and each
 * player's sheet -- already open -- raises the wizard on its own, live.
 * Level 4 -> 5 for the Fighter (no ASI at 5), taking average HP.
 */
test("the DM levels the party; the player's open sheet runs the wizard", async ({
  openAs,
  campaign,
}) => {
  const fighter = campaign.characters.player1;
  await admin().from("characters").update({ level: 4 }).eq("id", fighter.id);

  const player = await openAs("player1");
  await player.goto(`/characters/${fighter.id}`);
  await new AppShell(player).expectSignedIn();
  await expect(player.getByRole("heading", { name: fighter.name })).toBeVisible();

  const dm = await openAs("dm");
  await dm.goto("/dm/campaigns");
  await new AppShell(dm).expectSignedIn();
  await dm.getByRole("button", { name: "Level Up Party" }).click();
  const confirm = dm.getByRole("dialog", { name: "Level Up Party" });
  await confirm.getByRole("button", { name: /^Level Up to \d+$/ }).click();
  await expect(confirm).toBeHidden();

  // No reload: the sheet's realtime row update opens the wizard.
  const wizard = player.getByRole("dialog", { name: /Level Up — Level 5/ });
  await expect(wizard).toBeVisible();
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Hit Point Increase" }),
  ).toBeVisible();
  await wizard.getByText("Take Average").click();
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await expect(wizard.getByRole("heading", { name: "Summary" })).toBeVisible();

  const summary = (await wizard.textContent()) ?? "";
  const hp = /HP Max\s*(\d+)\s*→\s*(\d+)/.exec(summary);
  expect(hp, "the summary states the HP change").not.toBeNull();
  const newMax = Number(hp?.[2]);

  await wizard.getByRole("button", { name: "Apply Level Up" }).click();
  await expect(wizard).toBeHidden();

  const row = must(
    await admin()
      .from("characters")
      .select("level, hp_max, level_up_pending")
      .eq("id", fighter.id)
      .single(),
    "levelled character",
  );
  expect(row).toEqual({ level: 5, hp_max: newMax, level_up_pending: false });
  expect(newMax).toBeGreaterThan(28);
});
