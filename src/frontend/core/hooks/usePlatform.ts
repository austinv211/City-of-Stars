/**
 * Which shell is the app running in?
 *
 * Deliberately build-time, not runtime. `vite.config.ts` already sets
 * `envPrefix: ["VITE_", "TAURI_ENV_*"]`, and `lib/supabase.ts` already gates
 * `autoRefreshToken` on `TAURI_ENV_PLATFORM === "windows"` — this extends that
 * same mechanism rather than inventing a second one. The variable is simply
 * undefined under a plain `vite dev` server, which is exactly the "browser"
 * case.
 *
 * Why this matters immediately: `TitleBar` renders custom window chrome
 * unconditionally, including in the browser and on Android where minimise /
 * maximise / close are meaningless. The buttons currently fail silently via a
 * try/catch. They should not be rendered at all.
 *
 * Not a hook in the React sense — there is nothing to subscribe to, since a
 * build cannot change platform while running. Named `usePlatform` to sit
 * alongside the other hooks and to read naturally at call sites.
 */

export type ShellPlatform =
  | "windows"
  | "linux"
  | "darwin"
  | "android"
  | "ios"
  | "browser";

export interface Platform {
  platform: ShellPlatform;
  /** Running inside a Tauri webview (any OS) rather than a plain browser. */
  isTauri: boolean;
  /** Tauri on a desktop OS — the only case with real window controls. */
  isDesktopShell: boolean;
  /** Tauri on a mobile OS. */
  isMobileShell: boolean;
  isAndroid: boolean;
  isIOS: boolean;
}

const raw = import.meta.env.TAURI_ENV_PLATFORM;

const platform: ShellPlatform =
  raw === "windows" ||
  raw === "linux" ||
  raw === "darwin" ||
  raw === "android" ||
  raw === "ios"
    ? raw
    : "browser";

const isTauri = platform !== "browser";
const isAndroid = platform === "android";
const isIOS = platform === "ios";

const resolved: Platform = {
  platform,
  isTauri,
  isAndroid,
  isIOS,
  isMobileShell: isAndroid || isIOS,
  isDesktopShell: isTauri && !isAndroid && !isIOS,
};

export function usePlatform(): Platform {
  return resolved;
}
