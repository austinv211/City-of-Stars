import { cn } from "@/lib/utils";
import type { StagePhase } from "../../lib/encounterStage";

const FRAME: Partial<Record<StagePhase, string>> = {
  "my-turn":
    "border-primary shadow-[0_0_24px_color-mix(in_oklch,var(--primary)_22%,transparent)]",
  "on-deck": "border-secondary/70",
  watching: "border-border/40 saturate-[0.6]",
  dying:
    "border-destructive shadow-[inset_0_0_48px_color-mix(in_oklch,var(--destructive)_22%,transparent)]",
};

const BANNER: Partial<Record<StagePhase, { text: string; className: string }>> = {
  "my-turn": { text: "Your turn", className: "bg-primary text-primary-foreground" },
  "on-deck": {
    text: "You're next — plan your move",
    className: "bg-secondary/20 text-secondary",
  },
  dying: {
    text: "You're dying",
    className: "bg-destructive text-destructive-foreground",
  },
};

/**
 * The stage's border and banner, by phase, so the screen's whole character
 * changes with the moment instead of only a word in the header: alive on your
 * turn, warming up on deck, quiet while watching, stark while dying.
 *
 * The banner's entrance is `motion-safe:` only -- with reduced motion it is
 * simply there.
 */
export function StageFrame({
  phase,
  children,
}: {
  phase: StagePhase;
  children: React.ReactNode;
}) {
  const banner = BANNER[phase];
  return (
    <section
      aria-label="Your stage"
      className={cn(
        "border p-3 transition-[border-color,box-shadow,filter] duration-500",
        FRAME[phase] ?? "border-transparent",
      )}
    >
      {banner && (
        <p
          // Re-key on phase so the entrance plays on each change.
          key={phase}
          role="status"
          className={cn(
            "-mx-3 -mt-3 mb-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
            "motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-4",
            banner.className,
          )}
        >
          {banner.text}
        </p>
      )}
      {children}
    </section>
  );
}
