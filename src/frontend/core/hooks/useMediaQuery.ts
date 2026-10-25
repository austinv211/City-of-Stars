import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * The app had no `matchMedia`, no `window.innerWidth` and no resize listener
 * anywhere before this, which is why nothing in the UI could respond to
 * viewport size. Everything responsive builds on this.
 *
 * Implemented with `useSyncExternalStore` rather than useState + useEffect.
 * matchMedia *is* an external store, and this is the API built for reading one:
 * it gets the value during render instead of after mount, so there is no
 * wrong-value first paint and no setState-inside-an-effect cascade.
 *
 * `window.matchMedia` is typed as always present but is genuinely absent in
 * bare jsdom, so the guards are deliberate — tests would otherwise crash on
 * import.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = getMediaQueryList(query);
      if (!mql) return () => undefined;
      mql.addEventListener("change", onChange);
      return () => {
        mql.removeEventListener("change", onChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => getMediaQueryList(query)?.matches ?? false,
    [query],
  );

  // Server/prerender snapshot: assume the query does not match, so the
  // mobile-first layout is what renders before hydration.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (typeof window.matchMedia !== "function") return null;
  return window.matchMedia(query);
}
