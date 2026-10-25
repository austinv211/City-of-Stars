import { expect, type Page } from "@playwright/test";

/**
 * The signed-in shell. Its nav differs by width -- bottom tab bar on a phone,
 * icon rail on a tablet, labelled sidebar on a desktop -- so the actions that
 * live in it are written once here, for all three.
 */
export class AppShell {
  constructor(private readonly page: Page) {}

  /** Exactly one nav surface is showing once the shell has rendered. */
  get nav() {
    return this.page
      .locator("nav[aria-label='Main']:visible, [aria-label='More navigation']:visible")
      .first();
  }

  async expectSignedIn() {
    await expect(this.nav).toBeVisible({ timeout: 20_000 });
  }

  private get isPhone() {
    return (this.page.viewportSize()?.width ?? 1440) < 768;
  }

  async signOut() {
    if (this.isPhone) {
      await this.page.getByRole("button", { name: "More navigation" }).click();
      await this.page
        .getByRole("dialog")
        .getByRole("button", { name: "Sign out" })
        .click();
    } else {
      // Rail and sidebar each have one; only the current layout's is visible.
      await this.page
        .getByRole("button", { name: "Sign out" })
        .locator("visible=true")
        .click();
    }
  }
}
