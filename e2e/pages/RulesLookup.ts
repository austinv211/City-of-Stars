import { expect, type Page } from "@playwright/test";

/** The Rules Reference dialog, opened from the encounter header. */
export class RulesLookup {
  constructor(private readonly page: Page) {}

  get dialog() {
    return this.page.getByRole("dialog", { name: /Rules Reference/ });
  }

  async open() {
    await this.page.getByRole("button", { name: "Rules Reference" }).click();
    await expect(this.dialog).toBeVisible();
  }

  async searchGlossary(query: string) {
    await this.dialog.getByRole("tab", { name: "Glossary" }).click();
    await this.dialog.getByLabel("Search rules").fill(query);
  }

  result(title: string) {
    return this.dialog.getByRole("button", { name: new RegExp(`^${title}`) });
  }

  /** The detail pane's heading for the open entry. */
  detail(title: string) {
    return this.dialog.getByRole("heading", { name: title });
  }
}
