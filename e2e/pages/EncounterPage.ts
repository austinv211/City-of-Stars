import { expect, type Locator, type Page } from "@playwright/test";
import { AppShell } from "./AppShell";

/**
 * The encounter screen, as the DM (/dm/encounters/active) or a player
 * (/encounter) sees it: the guard, the initiative waiting room, the turn bar,
 * the stage, and the tracker.
 *
 * The screen has three layouts. On a phone the tracker sits behind a "Party"
 * tab and the stage behind "Turn", so the methods that need one switch to it
 * first; on wider screens both are always showing.
 */
export class EncounterPage {
  constructor(private readonly page: Page) {}

  /**
   * Open /encounter and wait for the app to boot. Under a full parallel run
   * the dev server can take a while over a cold page, longer than an
   * assertion's default timeout.
   */
  async goto() {
    await this.page.goto("/encounter");
    await new AppShell(this.page).expectSignedIn();
  }

  private get isPhone() {
    return (this.page.viewportSize()?.width ?? 1440) < 768;
  }

  private async showTab(name: "Turn" | "Party") {
    if (!this.isPhone) return;
    const tab = this.page.getByRole("tab", { name, exact: true });
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  }

  // ── Before the fight ────────────────────────────────────────────────────

  /** EncounterGuard's empty state, shown until the DM starts something. */
  get noActiveEncounter() {
    return this.page.getByRole("heading", { name: "No Active Encounter" });
  }

  get initiativeHeading() {
    return this.page.getByRole("heading", { name: "Roll for Initiative" });
  }

  get rollInitiativeButton() {
    return this.page.getByRole("button", { name: /^Roll Initiative/ });
  }

  /** The initiative modifier the button offers, e.g. "+2" -> 2. */
  async initiativeModifier(): Promise<number> {
    const label = (await this.rollInitiativeButton.textContent()) ?? "";
    const m = /d20 ([+-]\d+)/.exec(label);
    if (!m) throw new Error(`no modifier in "${label}"`);
    return Number(m[1]);
  }

  /** Roll initiative with the d20 showing `face`. */
  async rollInitiative(face: number) {
    await this.queueDice([face]);
    await this.rollInitiativeButton.click();
    // Once the roll is saved the waiting room gives way to the encounter.
    await expect(this.initiativeHeading).toBeHidden();
  }

  /**
   * Script the next dice. The suite runs with VITE_DICE_MODE=deterministic,
   * which installs window.__setDiceQueue.
   */
  async queueDice(faces: number[]) {
    await this.page.evaluate((f) => {
      if (!window.__setDiceQueue) throw new Error("deterministic dice are not enabled");
      window.__setDiceQueue(f);
    }, faces);
  }

  // ── Turns ───────────────────────────────────────────────────────────────

  /** "R1 · Goblin's turn · Next: you", in the header on every layout. */
  get turnBar() {
    return this.page.getByTestId("enc-turn-bar");
  }

  /** The turn bar shows `name` acting -- or "Your turn" for the viewer's own. */
  async expectTurnOf(name: string | "you") {
    if (name === "you") await expect(this.turnBar).toContainText(/your turn/i);
    else await expect(this.turnBar).toContainText(`${name}'s turn`);
  }

  get nextTurnButton() {
    return this.page.getByRole("button", { name: "Next Turn" });
  }

  /** The DM advances until it is `name`'s turn, at most once round the table. */
  async advanceTo(name: string, maxSteps = 6) {
    for (let i = 0; i < maxSteps; i++) {
      if ((await this.turnBar.textContent())?.includes(`${name}'s turn`)) return;
      const before = await this.turnBar.textContent();
      await this.nextTurnButton.click();
      await expect(this.turnBar).not.toHaveText(before ?? "");
    }
    await this.expectTurnOf(name);
  }

  // ── A player's own stage ────────────────────────────────────────────────

  get stage() {
    return this.page.getByRole("region", { name: "Your stage" });
  }

  get endTurnButton() {
    return this.page.getByRole("button", { name: "End Turn" });
  }

  get rollDeathSaveButton() {
    return this.stage.getByRole("button", { name: "Roll Death Save" });
  }

  /** The death-save button's label off-turn, when it is disabled. */
  get waitForTurnButton() {
    return this.stage.getByRole("button", { name: "Wait for your turn" });
  }

  deathSaves(kind: "Successes" | "Failures", count: number) {
    return this.stage.getByLabel(`${kind}: ${String(count)} of 3`);
  }

  async rollDeathSave(face: number) {
    await this.showTab("Turn");
    await this.queueDice([face]);
    await this.rollDeathSaveButton.click();
  }

  // ── The tracker (the DM's controls) ─────────────────────────────────────

  async combatant(participantId: string): Promise<Locator> {
    await this.showTab("Party");
    return this.page.getByTestId(`enc-participant:${participantId}`);
  }

  async hpOf(participantId: string): Promise<Locator> {
    await this.showTab("Party");
    return this.page.getByTestId(`enc-participant-hp:${participantId}`);
  }

  async deathSaveTrackOf(participantId: string): Promise<Locator> {
    await this.showTab("Party");
    return this.page.getByTestId(`enc-participant-deathsaves:${participantId}`);
  }

  /** Bring a combatant's panel onto the stage (a phone jumps back to Turn). */
  async select(participantId: string, name: string) {
    if (this.isPhone) {
      await this.page
        .getByRole("navigation", { name: "Initiative order" })
        .getByRole("button", { name: new RegExp(`^${name}`) })
        .click();
    } else {
      await this.page.getByTestId(`enc-participant:${participantId}`).click();
    }
  }

  /** Aim at a combatant with the crosshair on its card. */
  async target(participantId: string, name: string) {
    const card = await this.combatant(participantId);
    await card.getByRole("button", { name: `Target ${name}` }).click();
    await expect(
      card.getByRole("button", { name: `Stop targeting ${name}` }),
    ).toBeVisible();
  }

  /** One of the staged monster's actions: its To Hit, damage, and outcome. */
  monsterAction(name: string) {
    return this.page.getByRole("group", { name });
  }

  /** The DM applies `amount` damage to a combatant through its card. */
  async damage(participantId: string, amount: number) {
    const card = await this.combatant(participantId);
    await card.getByRole("button", { name: "Damage / Heal" }).click();
    const popover = this.page.getByRole("dialog");
    await popover.getByLabel("Amount").fill(String(amount));
    await popover.getByRole("button", { name: "Damage", exact: true }).click();
    await this.page.keyboard.press("Escape");
  }

  /** The concentration prompt the damage raised, on the DM's card. */
  async concentrationPrompt(participantId: string): Promise<Locator> {
    return (await this.combatant(participantId)).getByText(/^Concentration save/);
  }

  async endEncounter() {
    await this.page.getByRole("button", { name: /^End( Encounter)?$/ }).click();
    const dialog = this.page.getByRole("dialog", { name: "End the encounter?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "End Encounter" }).click();
    await expect(dialog).toBeHidden();
  }
}
