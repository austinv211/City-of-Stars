import { expect, type Page } from "@playwright/test";

/** The sign-in screen. Every selector the suite uses for it lives here. */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
    await expect(this.heading).toBeVisible();
  }

  get heading() {
    return this.page.getByRole("heading", { name: "City of Stars" });
  }

  get email() {
    return this.page.getByLabel("Email");
  }

  get password() {
    return this.page.getByLabel("Password", { exact: true });
  }

  /** The submit button -- "Sign In" is also the name of the mode tab. */
  get submit() {
    return this.page.getByRole("button", { name: "Sign In", exact: true });
  }

  get error() {
    return this.page.getByRole("alert");
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
