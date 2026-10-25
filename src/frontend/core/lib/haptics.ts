import { getFeelPrefs } from "@/core/hooks/useFeelPrefs";

/**
 * Short vibrations for the moments that matter at the table. Uses the web
 * Vibration API, which Android's WebView implements; desktops and iOS simply
 * lack it, so this is a no-op there. If the API proves unreliable in the
 * Tauri Android WebView on a real device, tauri-plugin-haptics is the
 * fallback the plan names -- that needs a device to decide.
 */
export const HAPTIC = {
  /** Your turn has started: two firm taps. */
  turn: [60, 40, 60],
  /** You dropped to 0 HP: long, heavy. */
  downed: [200, 100, 200],
  /** A natural 20: a quick flourish. */
  crit: [30, 30, 30, 30, 80],
} as const;

export function buzz(pattern: readonly number[]) {
  if (!getFeelPrefs().vibration) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function")
    return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    // Blocked (e.g. no user gesture yet on some browsers): not worth surfacing.
  }
}
