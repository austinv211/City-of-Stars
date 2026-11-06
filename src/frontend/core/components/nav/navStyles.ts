import { cn } from "@/lib/utils";

/**
 * A rail item's shape: an indicator over a short label, at least 56px tall.
 * On a short screen (a phone held sideways) it's a row of icon and label
 * instead: there's width to spare and no height.
 */
export const RAIL_ITEM =
  "group flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-1.5 text-center text-[10.5px] leading-tight short:min-h-10 short:flex-row short:justify-start short:gap-2.5 short:px-2 short:py-0.5 short:text-left short:text-xs";

/**
 * The indicator behind a rail or tab bar icon: it fills when the destination
 * is active, as in Material 3's navigation bar and rail, square to match the
 * theme. Also used by the tab bar's More button, which isn't a link but
 * should look like one.
 */
export function navIndicator(active: boolean) {
  return cn(
    "relative flex h-8 w-14 shrink-0 items-center justify-center transition-colors short:w-9",
    active ? "bg-primary/20 text-primary" : "group-hover:bg-accent/30",
  );
}
