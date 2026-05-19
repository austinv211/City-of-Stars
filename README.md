# City of Stars

A companion app for a custom Dungeons & Dragons 5e campaign. Built with Tauri, React, and Supabase — runs as a native desktop app on Linux and Windows, with Android support.

![Tech Stack](https://img.shields.io/badge/Tauri-2.x-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)

---

## Features

### For Players

- **Character sheet** — full D&D 2024 stat block with ability scores, proficiencies, spells, inventory, and level progression
- **Level up wizard** — guided step-by-step flow covering class features, ability score improvements, and feat selection drawn from the SRD database
- **Encounter panel** — action economy buttons, dice pool builder, attack rolls, spell damage, saving throws, and skill checks in one place
- **Will of the Void** — campaign-specific void ability gauge with per-character tracking
- **Roll log** — live feed of every dice roll in the session, colour-coded for crits, fumbles, advantage, and disadvantage

### For the Dungeon Master

- **Initiative tracker** — manage HP, conditions, and turn order for all participants
- **Monster library** — build and store stat blocks used directly in encounters
- **Session manager** — log sessions with notes and track campaign milestones
- **Encounter builder** — configure participants, roll initiative, and run encounters with full stat block access
- **Party stats panel** — global Void Alignment gauge and aggregate encounter statistics (damage dealt, HP lost/healed, crits, monsters defeated)
- **Level up trigger** — send a level-up prompt to all active characters at once

### Platform

- Frameless native desktop window (Linux, Windows) with a Catppuccin Mocha dark theme
- Android APK build via Docker
- No web backend — the app communicates directly with Supabase; all auth and data access control is handled database-side via Row Level Security

---

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| UI framework  | React 19 + TypeScript                         |
| Desktop shell | Tauri 2.x                                     |
| Styling       | Tailwind CSS + Catppuccin Mocha design tokens |
| Components    | Radix UI primitives + shadcn/ui               |
| Database      | Supabase (Postgres + Realtime + Auth)         |
| Bundler       | Vite                                          |
| Dice          | `@3d-dice/dice-box` (WebGL 3D dice)           |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable toolchain)
- A [Supabase](https://supabase.com/) project

For Android builds you also need the Android SDK and NDK — see the [Tauri Android guide](https://tauri.app/distribute/google-play/).

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/austinv211/cityofstars.git
cd cityofstars

# 2. Install dependencies and create .env
make setup

# 3. Fill in your Supabase credentials
#    Edit .env — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Database

Apply all migrations to your Supabase project:

```bash
# Set SUPABASE_DB_URL and SUPABASE_DB_PASSWORD in .env first
make db-push
```

### Running

```bash
make dev          # Vite dev server only  →  http://localhost:1420
make tauri-dev    # Full native desktop window (requires Rust + system libs)
```

### Building

```bash
make tauri-build          # Linux desktop distributable
make docker-build-linux   # Linux build via Docker (no local Rust required)
make docker-build-android # Android APK/AAB via Docker
```

Run `make` with no arguments to see all available targets.

---

## Project Structure

```
src/
├── frontend/
│   ├── core/           # App shell, auth context, shared UI components
│   ├── features/
│   │   ├── campaign/   # Campaign overview, party stats, session log
│   │   ├── characters/ # Character sheet, level up wizard, spells, inventory
│   │   ├── encounter/  # Initiative tracker, action panel, dice context
│   │   ├── dm/         # DM-only tools: session manager, encounter builder, monsters
│   │   └── rules/      # In-app rules lookup backed by SRD database tables
│   └── styles/         # Global SCSS, Catppuccin design tokens
└── tauri/              # Tauri configuration and Rust entrypoint

supabase/
└── migrations/         # All schema migrations in chronological order
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable                    | Description                                                                       |
| --------------------------- | --------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Your Supabase project URL                                                         |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anonymous (public) key                                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — only needed for the SRD parse script                           |
| `SUPABASE_DB_URL`           | Session-pooler connection string (from Supabase dashboard → Settings → Database)  |
| `SUPABASE_DB_PASSWORD`      | Raw database password (the Makefile URL-encodes special characters automatically) |

`VITE_*` variables are bundled into the frontend at build time. The remaining variables are used only by local tooling (migrations, scripts) and are never included in the app binary.

---

## Docker

Docker named volumes cache `node_modules`, the Cargo registry, and the Rust `target/` directory between runs, so rebuilds after the first are fast.

```bash
make docker-dev           # Dev window forwarded via X11/Wayland
make docker-build-linux   # Headless Linux release build
make docker-build-android # Android APK/AAB
make docker-clean         # Wipe named volumes and force a full reinstall
```

---

## License

This project is source-available for reference and learning. The campaign world, custom mechanics, and all narrative content are the intellectual property of the campaign authors and are not licensed for reuse.

The D&D 5e rules content stored in the database is derived from the [Systems Reference Document 5.1](https://dnd.wizards.com/resources/systems-reference-document) and is used under the [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) licence.
