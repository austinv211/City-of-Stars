import { expect, type Page } from "@playwright/test";
import { AppShell } from "./AppShell";

/** The six-step character creation wizard at /characters/new. */
export class CharacterWizardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/characters/new");
    await new AppShell(this.page).expectSignedIn();
    await this.expectStep(1);
  }

  async expectStep(n: number) {
    await expect(this.page.getByText(`Step ${String(n)} of 6`)).toBeVisible();
  }

  /** Pick `option` from the Radix select labelled `label`. */
  async choose(label: string | RegExp, option: string) {
    await this.page.getByRole("combobox", { name: label }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }

  async next(to: string) {
    await this.page.getByRole("button", { name: `Next: ${to}` }).click();
  }

  async identity(name: string, species: string, cls: string) {
    await this.page.getByLabel("Character Name").fill(name);
    await this.choose("Species", species);
    await this.choose("Class", cls);
    await this.next("Background");
    await this.expectStep(2);
  }

  async background(background: string) {
    await this.choose("Background", background);
    await this.next("Ability Scores");
    await this.expectStep(3);
  }

  /** Standard array, assigned in the order given (STR, DEX, CON, INT, WIS, CHA). */
  async standardArray(
    scores: Record<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA", number>,
  ) {
    for (const [ability, score] of Object.entries(scores))
      await this.choose(`${ability} score`, String(score));
    await this.next("Proficiencies");
    await this.expectStep(4);
  }

  async skills(names: string[]) {
    for (const name of names) await this.page.getByLabel(name, { exact: true }).check();
    await this.next("Portrait");
    await this.expectStep(5);
  }

  /** The portrait is optional; this step only moves on. */
  async skipPortrait() {
    await this.page.getByRole("button", { name: /Next: Review$/ }).click();
    await this.expectStep(6);
  }

  async create() {
    await this.page.getByRole("button", { name: "Create Character" }).click();
    await this.page.waitForURL(/\/characters\/[0-9a-f-]{36}$/);
  }
}
