import { RulesButton } from "@/features/rules/components/RulesButton";
import { CampaignSelector } from "./CampaignSelector";

/**
 * The phone's top app bar: the selected campaign, under Android's status bar,
 * with the desktop title bar's light bar along its lower edge, and the Rules
 * Reference a tap away on every screen.
 *
 * The status bar overlaps the page (the app draws edge to edge), so the bar
 * grows by its height (--safe-top) rather than giving it a slice of a fixed
 * height: a fixed 48px that also held the inset is what squeezed the campaign
 * name under the clock. The bar's colour runs up behind the status bar, so
 * the two read as one surface.
 */
export function PhoneAppBar() {
  return (
    <header
      className="relative z-10 shrink-0 bg-card pl-[var(--safe-left)] pr-[var(--safe-right)] pt-[var(--safe-top)] md:hidden"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex h-14 items-center justify-between gap-2 pl-4 pr-1">
        <CampaignSelector />
        <RulesButton />
      </div>
      <div aria-hidden="true" className="ctp-accent-bar h-[2px] w-full" />
    </header>
  );
}
