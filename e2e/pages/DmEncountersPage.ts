import { expect, type Page } from "@playwright/test";

/** The DM's encounter list: templates, and the dialog that runs one. */
export class DmEncountersPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/dm/encounters");
  }

  templateRow(name: string) {
    // ResponsiveTable is a real <table> at every width; CSS restyles its rows
    // as cards on a phone, so a row is still a row.
    return this.page.getByRole("row").filter({ hasText: name });
  }

  /** Run a template with the whole active party, as the dialog defaults. */
  async runTemplate(name: string) {
    await this.templateRow(name).getByRole("button", { name: "Run" }).click();
    const dialog = this.page.getByRole("dialog", { name: `Run: ${name}` });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Run Encounter" }).click();
    await this.page.waitForURL("**/dm/encounters/active");
  }
}
