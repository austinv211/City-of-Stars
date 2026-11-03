import { Badge } from "@/core/components/ui/badge";
import { useSourceDescription } from "../../hooks/useSourceDescription";
import type { EncounterParticipant, RollSource } from "../../types/encounter.types";
import { CombatantBanner } from "../CombatantArt";
import { renderInline } from "../stage/renderInline";

const SOURCE_LABEL: Record<RollSource["type"], string> = {
  weapon: "Weapon",
  spell: "Spell",
  monster_action: "Action",
  legendary: "Legendary action",
  standard_action: "Action",
  unarmed: "Unarmed strike",
};

/**
 * What an ability does, in full: who has it, and its text. Players read a
 * monster's flavour without its numbers (see useSourceDescription).
 */
export function AbilityQuickView({
  source,
  actor,
  viewerIsDM,
}: {
  source: RollSource;
  actor: EncounterParticipant | null;
  viewerIsDM: boolean;
}) {
  const { text, loading } = useSourceDescription(actor, source, viewerIsDM, true);
  const monster = actor && !actor.is_player ? actor : null;

  return (
    <div className="space-y-3">
      {actor && (
        <CombatantBanner participant={actor} showHp={viewerIsDM || actor.is_player} compact>
          <Badge variant="secondary" className="text-xs">
            {SOURCE_LABEL[source.type]}
          </Badge>
        </CombatantBanner>
      )}
      <Description text={text} loading={loading} />
      {monster?.description && (
        <p className="border-t border-border/40 pt-3 text-sm italic leading-relaxed text-muted-foreground">
          {monster.description}
        </p>
      )}
    </div>
  );
}

function Description({ text, loading }: { text: string | null; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!text) return <p className="text-sm italic text-muted-foreground">No description.</p>;
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        // Paragraphs of one static text: their order is their identity.
        <p key={i}>{renderInline(para)}</p>
      ))}
    </div>
  );
}
