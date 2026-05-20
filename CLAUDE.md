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
