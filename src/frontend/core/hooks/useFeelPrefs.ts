import { useEffect, useSyncExternalStore } from "react";
import { useMediaQuery } from "./useMediaQuery";

/**
 * How the app feels on this device: whether it animates, and whether it
 * vibrates. Device preferences, not account settings -- a phone at the table
 * and a laptop at home can reasonably differ -- so they live in localStorage
 * and apply the moment they change.
 *
 * Storage access is guarded: it can throw in private windows or with site
 * data blocked, and the app must work without it.
 */
export interface FeelPrefs {
  /** Reduce motion regardless of the OS setting. */
  reduceMotion: boolean;
  /** Vibrate on your turn, when you go down, and on a natural 20. */
  vibration: boolean;
}

const KEY = "cos.feel";
const DEFAULTS: FeelPrefs = { reduceMotion: false, vibration: true };
const listeners = new Set<() => void>();

function read(): FeelPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FeelPrefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

// One snapshot object per change, so useSyncExternalStore sees stable values.
let snapshot = read();

export function getFeelPrefs(): FeelPrefs {
  return snapshot;
}

export function setFeelPrefs(patch: Partial<FeelPrefs>) {
  snapshot = { ...snapshot, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Not persisted; still applies for this session.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeelPrefs(): FeelPrefs {
  return useSyncExternalStore(subscribe, getFeelPrefs, () => DEFAULTS);
}

/**
 * The single motion check everything animated defers to: the OS asked for
 * reduced motion, or the user did in the app.
 */
export function useReducedMotion(): boolean {
  // Both hooks run on every render: `system || useFeelPrefs()` would skip the
  // second whenever the OS setting is on, changing the hook order.
  const system = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { reduceMotion } = useFeelPrefs();
  return system || reduceMotion;
}

/**
 * Mirror the motion preference onto <html data-motion>, so one CSS rule in
 * globals.scss stills every animation and transition -- including the many
 * that predate `motion-safe:` and do not check the media query themselves.
 * Mounted once, by the app shell.
 */
export function useMotionAttribute() {
  const reduce = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.motion = reduce ? "reduce" : "full";
  }, [reduce]);
}
