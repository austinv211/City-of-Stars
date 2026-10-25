import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { AppShell } from "./pages/AppShell";
import { USERS } from "./support/users";

// Signed out: these exercise the form itself, not the saved sessions.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("sign in", () => {
  test("a seeded player signs in, lands in the shell, and signs out", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(USERS.player1.email, USERS.player1.password);

    const shell = new AppShell(page);
    await shell.expectSignedIn();
    await expect(login.heading).toBeHidden();

    await shell.signOut();
    await expect(login.heading).toBeVisible();
    await expect(login.email).toBeVisible();
  });

  test("a wrong password is refused, with a message", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(USERS.player1.email, "not-the-password");

    await expect(login.error).toContainText(/invalid/i);
    await expect(login.email).toBeVisible();
  });

  test("a signed-out deep link lands on the sign-in form", async ({ page }) => {
    await page.goto("/encounter");
    await expect(new LoginPage(page).heading).toBeVisible();
  });
});
