/// <reference types="vite/client" />

/**
 * Typed environment variables.
 *
 * Vite's own `ImportMetaEnv` carries an `[key: string]: any` index signature, so
 * `import.meta.env.ANYTHING` already compiles — silently, as `any`, including
 * typos. Declaring the ones this app actually reads turns a misspelling into a
 * compile error and documents the full set in one place.
 *
 * `TAURI_ENV_*` reaches the bundle via `envPrefix` in vite.config.ts and is
 * injected by the Tauri CLI at build time, so every one of them is `undefined`
 * under a plain `vite dev` server.
 */
interface ImportMetaEnv {
  /** Supabase project URL. Baked into the shipped bundle. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon key. Public by design, and baked into the shipped bundle. */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /**
   * Set to "deterministic" by the E2E harness to make DiceProvider bypass the
   * @3d-dice/dice-box physics engine and draw from a seeded sequence instead.
   * Undefined in every normal build.
   */
  readonly VITE_DICE_MODE?: "deterministic";

  /**
   * Target OS, injected by the Tauri CLI. Undefined in a browser build —
   * which is how usePlatform() detects "browser". See src/frontend/core/hooks/usePlatform.ts.
   */
  readonly TAURI_ENV_PLATFORM?:
    | "windows"
    | "linux"
    | "darwin"
    | "android"
    | "ios";

  /** Set by the Tauri CLI for a debug build; gates sourcemaps in vite.config.ts. */
  readonly TAURI_ENV_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
