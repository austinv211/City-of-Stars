import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * The app had no `matchMedia`, no `window.innerWidth` and no resize listener
 * anywhere before this, which is why nothing in the UI could respond to
 * viewport size. Everything responsive builds on this.
 *
 * Reads the match synchronously on first render so there is no incorrect first
 * paint, and guards `window` so the hook is safe in a non-DOM environment
 * (jsdom without matchMedia, or any future SSR/prerender step).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const list = window.matchMedia(query);
    // Re-sync on mount: `query` may have changed since the initial state ran.
    setMatches(list.matches);

    const onChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    list.addEventListener("change", onChange);
    return () => {
      list.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
}
