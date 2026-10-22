import { useMediaQuery } from "./useMediaQuery";

/**
 * Semantic breakpoints, matching Tailwind's defaults so a hook result and a
 * `md:` class can never disagree.
 *
 * The project convention is **phone-first**: unprefixed Tailwind classes are
 * the phone design, and `sm:`/`md:`/`lg:`/`xl:` widen from there. That inverts
 * the codebase's previous habit, where unprefixed meant desktop.
 *
 *   (base)  0-639    phone portrait — 360-430px is the real Android target
 *   sm:     640+     large phone / phone landscape
 *   md:     768+     tablet portrait
 *   lg:     1024+    tablet landscape / small desktop window
 *   xl:     1280+    full desktop (the only size supported until now)
 *
 * Prefer a CSS breakpoint over this hook wherever CSS can do the job: a media
 * query costs nothing and cannot cause a re-render or a layout flash. Reach for
 * the hook when the *structure* must differ — rendering a Drawer instead of a
 * Dialog, a bottom tab bar instead of a sidebar — not merely the styling.
 */
export interface Breakpoint {
  /** < 768px. Bottom tab bar, off-canvas nav, stacked layouts. */
  isPhone: boolean;
  /** 768px - 1279px. Icon rail, two-column encounter layout. */
  isTablet: boolean;
  /** >= 1280px. Full sidebar, three-column encounter layout. */
  isDesktop: boolean;
  /** Primary pointer is coarse — touch. Independent of width: a 1920px kiosk
   *  can be touch, and a 600px desktop window is not. Drives hit-target sizing. */
  isTouch: boolean;
  /** User asked for reduced motion. Every animation must honour this. */
  prefersReducedMotion: boolean;
}

export function useBreakpoint(): Breakpoint {
  const isPhone = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isTouch = useMediaQuery("(pointer: coarse)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return { isPhone, isTablet, isDesktop, isTouch, prefersReducedMotion };
}
