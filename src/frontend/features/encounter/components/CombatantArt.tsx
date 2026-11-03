import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hpFraction } from "../lib/attack";
import { bannerImage, initialsOf, thumbImage } from "../lib/combatantImage";
import type { EncounterParticipant } from "../types/encounter.types";
import { WoundBadge } from "./stage/WoundBadge";

/**
 * A combatant's picture at banner size: the top of the action panel, a
 * player's view of a monster, and the quick view. It adapts to what there is:
 *
 *   full art   the art, wide, with the name over a dark gradient
 *   portrait   the portrait beside the name, over a blurred copy of itself
 *   neither    an initials tile on the app's steel-to-amber tint
 *
 * `children` are badges shown under the name (NPC, You, Concentrating…).
 */
export function CombatantBanner({
  participant: p,
  showHp,
  compact = false,
  children,
}: {
  participant: EncounterParticipant;
  /** The viewer may see exact HP; otherwise only Bloodied/Down shows. */
  showHp: boolean;
  /** Shorter, for a phone's stage or the "who's acting" strip. */
  compact?: boolean;
  children?: ReactNode;
}) {
  const art = p.art_url;
  const image = bannerImage(p);
  const caption = (
    <div className="min-w-0 space-y-1">
      <p className={cn("truncate font-bold leading-tight", compact ? "text-base" : "text-lg")}>{p.name}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {children}
        {!showHp && <WoundBadge participant={p} />}
      </div>
    </div>
  );

  if (art) {
    return (
      <figure
        className={cn(
          "relative w-full overflow-hidden border border-border/60 bg-muted",
          compact ? "aspect-[3/1] max-h-36" : "aspect-[5/2] max-h-60",
        )}
      >
        <img src={art} alt={`${p.name}, full art`} className="h-full w-full object-cover" />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-10 text-white">
          {caption}
        </figcaption>
        {showHp && <HpStrip participant={p} />}
      </figure>
    );
  }

  return (
    <figure
      className={cn(
        "relative flex w-full items-center gap-3 overflow-hidden border border-border/60 p-3",
        image ? "bg-muted" : "bg-gradient-to-r from-primary/15 via-card to-secondary/15",
      )}
    >
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-xl"
        />
      )}
      <CombatantThumb
        participant={p}
        className={cn("relative border border-border/60", compact ? "h-14 w-14 text-base" : "h-20 w-20 text-xl")}
      />
      <figcaption className="relative min-w-0 flex-1">{caption}</figcaption>
      {showHp && <HpStrip participant={p} />}
    </figure>
  );
}

/** A small square picture: portrait first, art second, initials last. */
export function CombatantThumb({
  participant: p,
  className,
}: {
  participant: Pick<EncounterParticipant, "name" | "portrait_url" | "art_url">;
  /** Size and shape, e.g. "h-10 w-10 rounded-full". */
  className?: string;
}) {
  const image = thumbImage(p);
  if (image) {
    return <img src={image} alt={p.name} className={cn("shrink-0 object-cover", className)} />;
  }
  return (
    <span
      role="img"
      aria-label={p.name}
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-primary/40 to-secondary/40 font-semibold text-foreground",
        className,
      )}
    >
      {initialsOf(p.name)}
    </span>
  );
}

/** A thin HP bar along the banner's bottom edge, for viewers who may see HP. */
function HpStrip({ participant: p }: { participant: EncounterParticipant }) {
  const pct = hpFraction(p);
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
      role="meter"
      aria-label={`${p.name} HP`}
      aria-valuenow={p.hp_current}
      aria-valuemin={0}
      aria-valuemax={p.hp_max}
    >
      <div
        className={cn("h-full", pct > 0.5 ? "bg-success" : "bg-destructive")}
        style={{ width: `${String(pct * 100)}%` }}
      />
    </div>
  );
}
