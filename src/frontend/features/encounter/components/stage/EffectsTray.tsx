import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EncounterEffect,
  EncounterParticipant,
} from "../../types/encounter.types";
import { describeExpiry } from "../../lib/effects";

/**
 * Tracked effects, as chips with how long each has left.
 *
 * The DM sees everything, grouped by who it is on, and can dismiss any of it.
 * A player sees what is on them and what they have placed on others, and can
 * dismiss only the latter -- exactly what the delete policy permits.
 */
export function EffectsTray({
  effects,
  participants,
  own,
  isDM,
  onRemove,
  onAdd,
}: {
  effects: EncounterEffect[];
  participants: EncounterParticipant[];
  own: EncounterParticipant | null;
  isDM: boolean;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const nameOf = (id: string | null) =>
    !id ? "—" : id === own?.id ? "you" : (byId.get(id)?.name ?? "someone");
  const canAdd = isDM || !!own;

  const groups = isDM
    ? groupByTarget(effects, (id) => byId.get(id)?.name ?? "Unknown")
    : [
        {
          label: "On you",
          items: effects.filter((e) => e.target_participant_id === own?.id),
        },
        {
          label: "Yours",
          items: effects.filter(
            (e) =>
              !!own &&
              e.source_participant_id === own.id &&
              e.target_participant_id !== own.id,
          ),
        },
      ].filter((g) => g.items.length > 0);

  if (groups.length === 0 && !canAdd) return null;

  return (
    <section aria-label="Effects" className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-secondary" />
        <p className="text-xs font-semibold text-muted-foreground">Effects</p>
        {canAdd && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 px-2 text-xs"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">None active.</p>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {g.label}
            </span>
            {g.items.map((e) => (
              <EffectChip
                key={e.id}
                effect={e}
                detail={describeExpiry(e, nameOf)}
                onRemove={
                  isDM || (!!own && e.source_participant_id === own.id)
                    ? () => {
                        onRemove(e.id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

function EffectChip({
  effect,
  detail,
  onRemove,
}: {
  effect: EncounterEffect;
  detail: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-secondary/40 bg-secondary/10 py-0.5 pl-2 text-xs",
        onRemove ? "pr-0.5" : "pr-2",
      )}
      title={effect.description ?? undefined}
    >
      <span className="font-medium text-foreground">{effect.name}</span>
      <span className="text-muted-foreground">· {detail}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${effect.name}`}
          className="p-0.5 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function groupByTarget(
  effects: EncounterEffect[],
  targetName: (id: string) => string,
): { label: string; items: EncounterEffect[] }[] {
  const groups = new Map<string, EncounterEffect[]>();
  for (const e of effects) {
    const list = groups.get(e.target_participant_id) ?? [];
    list.push(e);
    groups.set(e.target_participant_id, list);
  }
  return [...groups].map(([id, items]) => ({ label: targetName(id), items }));
}
