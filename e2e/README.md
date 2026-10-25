# E2E suite

Playwright against the **local** Supabase stack, at three viewports
(`desktop` 1440×900, `tablet` 820×1180, `phone` Pixel 7 412×915).

```powershell
npm run e2e:up     # once: start the stack, reset schema + seeds (Docker)
npm run e2e        # the suite; starts its own vite on :1421 in e2e mode
npm run e2e:ui     # Playwright's UI mode, for writing and debugging specs
```

`global-setup.ts` refuses to run unless `.env.e2e` points at a provably local
database (the same guard as the db suite), then makes sure the test users exist
and signs each role in once. Specs start already signed in.

## Writing a spec

- **Isolation is per campaign.** Import `test` from `./fixtures`: every test
  gets its own `campaign` (DM, player1 and player2 as members, a character each,
  one "Goblin Ambush" template), deleted when it finishes. Never depend on the
  seeded "Shattered Vault" campaign; tests run in parallel.
- **More than one person:** `openAs("dm")`, `openAs("player1")` each give a page
  in its own browser context, already on the test's campaign. That is how the
  realtime specs put the DM and the players side by side.
- **Dice are scripted.** The dev server runs with `VITE_DICE_MODE=deterministic`,
  so there is no 3D dice physics and `window.__setDiceQueue([20, 7])` decides the
  next faces (see `EncounterPage.rollInitiative`). Unscripted rolls come from a
  fixed seed. The hook does not exist in normal builds.
- **Selectors live in `pages/`, never in specs.** Prefer `getByRole` /
  `getByLabel`; add a `data-testid` (`<domain>-<entity>[-<role>][:<id>]`, plan
  §2.5) only where there is no accessible name to query. Never select on class
  names or DOM position.
- **Arrange through the service role, act through the UI.** `support/admin.ts`
  is for setting the scene and reading ground truth, not for the step under test.
- A test that needs a retry to pass is a bug, not a tolerance.
