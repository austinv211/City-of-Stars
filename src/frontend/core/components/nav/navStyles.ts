import { cn } from "@/lib/utils";

/**
 * The indicator behind a rail or tab bar icon: it fills when the destination
 * is active, as in Material 3's navigation bar and rail, square to match the
 * theme. Also used by the tab bar's More button, which isn't a link but
 * should look like one.
 */
export function navIndicator(active: boolean) {
  return cn(
    "relative flex h-8 w-14 shrink-0 items-center justify-center transition-colors",
    active ? "bg-primary/20 text-primary" : "group-hover:bg-accent/30",
  );
}
