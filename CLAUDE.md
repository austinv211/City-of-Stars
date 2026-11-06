# CLAUDE.md

This file provides guidance to Claude Code
(claude.ai/code) when working with code in this repository.

## Project

City of Stars is a companion app for a custom Dungeons & Dragons campaign.
It lets players import character data and track their character's progress through the campaign.

This project is a Tauri application, which is a cross-platform application. It
should run on Windows, Linux, and Mobile Devices.

The data of this application is stored in a Supabase Postgres database.

It has no web-backend and should simply communicate with the database to
prevent additional hosting being required.

All users must authenticate with Supabase authentication before they can use
the application.

## Application Structure

The application is structured as follows:

- src: the source code for the application
- dist: the compiled versions of the application

### Source Module Structure

The application source code is structured as follows:

package.json, tsconfig, tauri.conf.json should exist in the root of the folder, along with other artifacts from node

- frontend: the frontend code for the application
- tauri: the tauri code for the application

### Frontend Details

- The frontend for the application is written in React, and uses
  the tauri module to create a cross-platform application.
- React should use the latest version of React, and the latest
  version of React Router.
- Supabase communication and authentication should be used to allow users to
  log in and out of the application.
- Uses Vite for bundler

Frontend modules:

- core: the core functionality of the client, subfolders for common pages and components
- features: individual feature routes, subfolders for each feature page and feature specific components

Both core and features should have components and pages

### Tauri Details

- Simply a server for the react client fronted, should only be used for
  OS specific calls

Note: `tauri.conf.json` lives in `src/tauri/` alongside `Cargo.toml` — the
Rust `generate_context!()` macro requires both files to be co-located.
The root `Cargo.toml` is a workspace that references `src/tauri`.

## Commands

### Linux / macOS (Makefile)

All developer entry points are in the `Makefile`. Run `make` (or `make help`) to see
the full list with descriptions. Key targets:

```
make setup              # copy .env.example → .env and npm install (run first)
make dev                # Vite dev server only (port 1420)
make tauri-dev          # Vite + native Tauri desktop window (local)
make docker-dev         # same, inside Docker with X11/Wayland forwarding
make docker-build-linux # Linux desktop distributable via Docker
make docker-build-android  # Android APK/AAB via Docker
```

Docker named volumes cache `node_modules`, the Cargo registry, and `target/` between
runs. Use `make docker-clean` to wipe them and force a full reinstall.

### Windows (PowerShell)

Use `dev.ps1` instead of `make`. It mirrors all the same targets:

```powershell
.\dev.ps1 setup       # copy .env.example → .env and npm install (run first)
.\dev.ps1 dev         # Vite dev server only (port 1420)
.\dev.ps1 tauri-dev   # Vite + native Tauri desktop window
.\dev.ps1 build       # type-check and build frontend
.\dev.ps1 clean       # remove dist/ and src\tauri\target\
.\dev.ps1 db-push     # deploy migrations to Supabase
```

If PowerShell blocks the script, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Testing the Android UI

`npm run verify:android` checks every top-level route on an Android
emulator, in its Chrome (the engine the Android WebView uses), signed in as
the seeded test users. It needs the local stack (`npm run e2e:up`) and an
Android SDK with an AVD. It boots the first AVD (or `-- --avd <name>`) if
no device is connected, serves the e2e build on :1421, and uses `adb reverse`
so the phone reaches the app and local Supabase. It fails on horizontal page
scroll, tap areas under 44px, missing touch styles, or native-looking
checkboxes. Screenshots go to `artifacts/android/`.

It tests the web UI, not the installed app: the launcher icon and anything
Tauri does natively still need a real APK (`npm run tauri:android:init`, then
`npm run tauri:android:dev`).

## Rich notes

Notes (session notes, campaign description, character notes, wild magic
surges) are stored as Markdown. `core/components/RichTextEditor.tsx` writes
it; `core/components/RichText.tsx` is the only reader, so always render notes
through `RichText`, never `ReactMarkdown` directly. Fonts, colours,
highlights and underline have no Markdown syntax, so they are saved as a few
fixed inline tags (`<span data-font="epic">`, `<mark>`, `<u>`), and
read-aloud boxes as a `:::read-aloud` … `:::` container
(`core/components/richtext/extensions.ts`). `RichText` never parses HTML:
`richtext/noteMarkup.ts` turns exactly those tags and that container into
elements and drops any other HTML, and `rehype-sanitize` runs after it.
`rehype-raw` is banned by Semgrep (`.semgrep/city-of-stars.yml`). Pictures go
to the public `campaign-media` bucket under `<campaign_id>/`.

SRD text (spells, features, rules, monster and NPC descriptions) is also
Markdown, but a single newline is a line break. Render it with
`<RichText source="srd">`. Pass `size` (`xs` for cards and popovers, `sm`
by default, `base` for a full page) and `clamp={n}` for an n-line preview.

## CI and releasing

- **CI** (`ci.yml`, CodeQL) runs on pull requests into master, and on demand.
  Pushes don't run it.
- **Release by label:** merge a PR labelled `release:patch`, `release:minor` or
  `release:major`. `release-on-merge.yml` bumps the version, commits
  "Release vX.Y.Z" to master, tags it and runs `release.yml`.
- **Release by hand:** `npm run version:bump -- minor` (or `patch`, `major`,
  `x.y.z`), commit, then push a `vX.Y.Z` tag. A tag push runs only
  `release.yml`, which first checks the tag matches the app version.

`scripts/bump-version.mjs` sets the version in package.json,
package-lock.json, src/tauri/tauri.conf.json, src/tauri/Cargo.toml and
Cargo.lock. The release builds every platform and publishes a GitHub Release
with a `latest.json` manifest.

- Windows and Linux AppImage installs update themselves through
  `tauri-plugin-updater`, which reads
  `releases/latest/download/latest.json`. Android and .deb installs can't, so
  the app compares against the GitHub latest-release API and links to the new
  APK or .deb instead. The logic lives in `src/frontend/core/lib/updates.ts`
  and `core/hooks/useUpdateCheck.ts`.
- Updater artifacts are signed. CI needs the `TAURI_SIGNING_PRIVATE_KEY` and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets. The matching public key is
  `plugins.updater.pubkey` in `tauri.conf.json`. Losing the private key means
  installed copies can't accept updates.
- Signing is switched on only in CI, through `src/tauri/tauri.updater.conf.json`
  (`--config`), so local `tauri build` works without the key.
- Prerelease tags (`v1.2.3-beta`) never become "latest", so they don't reach
  players.

## Download page and email confirmation landing page

`site/index.html` is the page to share with players. It reads
`api.github.com/repos/<repo>/releases` in the browser, recommends the file for
the visitor's OS and lists every older version. The file-name patterns in its
`PLATFORMS` list must match the asset names `release.yml` uploads. Prereleases
are left out.

Sign-up passes `emailRedirectTo` (default
`https://austinv211.github.io/City-of-Stars/`, override with
`VITE_AUTH_LANDING_URL`), so confirmation links land on the static page in
`site/`, deployed by `.github/workflows/pages.yml`. One-time setup:

- GitHub repo Settings → Pages → Source: **GitHub Actions**.
- Supabase dashboard → Authentication → URL Configuration: set **Site URL**
  to that address and add it to **Redirect URLs**.

The page's "Open City of Stars" button is a `cityofstars://` link. The app
registers that scheme with `tauri-plugin-deep-link` (config in
`tauri.conf.json`), and `tauri-plugin-single-instance` hands it to a window
that's already open. `core/hooks/useDeepLinks.ts` reacts to it. A scheme
registers only for an installed build (or at runtime on Windows/Linux), so
`vite dev` in a browser never receives one.
