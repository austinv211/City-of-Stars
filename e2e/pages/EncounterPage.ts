import { expect, type Page } from "@playwright/test";

/** A player's /encounter route: the guard, the initiative screen, the stage. */
export class EncounterPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/encounter");
  }

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

  /**
   * Roll initiative with the d20 showing `face`. The suite runs with
   * VITE_DICE_MODE=deterministic, which installs window.__setDiceQueue.
   */
  async rollInitiative(face: number) {
    await this.page.evaluate((f) => {
      if (!window.__setDiceQueue) throw new Error("deterministic dice are not enabled");
      window.__setDiceQueue([f]);
    }, face);
    await this.rollInitiativeButton.click();
    // Once the roll is saved the waiting room gives way to the encounter.
    await expect(this.initiativeHeading).toBeHidden();
  }
}
