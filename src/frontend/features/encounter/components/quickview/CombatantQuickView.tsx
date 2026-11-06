import { Brain, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { RichText } from "@/core/components/RichText";
import type { RollEntry } from "../../context/DiceContext";
import { useQuickView } from "../../context/QuickViewContext";
import { canSeeAc } from "../../lib/attack";
import { describeRoll } from "../../lib/logLine";
import type { EncounterEffect, EncounterParticipant } from "../../types/encounter.types";
import { CombatantBanner } from "../CombatantArt";

const RECENT = 5;

/**
 * "Player highlights": a combatant at a glance. Its picture, the numbers the
 * viewer may see, what's affecting it, and what it has done lately in this
 * fight, each ability one tap from its own quick view.
 */
export function CombatantQuickView({
  participant: p,
  participants,
  history,
  effects,
  viewerIsDM,
}: {
  participant: EncounterParticipant;
  /** Everyone, named as this viewer sees them. */
  participants: EncounterParticipant[];
  history: RollEntry[];
  effects: EncounterEffect[];
  viewerIsDM: boolean;
}) {
  const showHp = viewerIsDM || p.is_player;
  const onThem = effects.filter((e) => e.target_participant_id === p.id);
  const recent = history.filter((e) => e.context?.actorId === p.id).slice(0, RECENT);

  return (
    <div className="space-y-4">
      <CombatantBanner participant={p} showHp={showHp}>
        {!p.is_player && <Badge variant="secondary" className="text-xs">NPC</Badge>}
      </CombatantBanner>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <Fact label="HP" value={showHp ? `${String(p.hp_current)}/${String(p.hp_max)}` : "?"} />
        <Fact label="AC" value={canSeeAc(viewerIsDM, p) ? String(p.ac) : "?"} />
        <Fact label="Initiative" value={String(p.initiative_score)} />
      </dl>

      <Status participant={p} effects={onThem} />

      {!p.is_player && p.description && (
        <RichText source="srd" className="italic text-muted-foreground">{p.description}</RichText>
      )}

      <section aria-label="Recent actions" className="space-y-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lately</h3>
        {recent.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Nothing yet this fight.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((e) => (
              <RecentAction key={e.id} entry={e} participants={participants} viewerIsDM={viewerIsDM} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/40 bg-muted/30 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-base font-bold">{value}</dd>
    </div>
  );
}

/** Conditions, concentration, exhaustion and effects; nothing when there are none. */
function Status({ participant: p, effects }: { participant: EncounterParticipant; effects: EncounterEffect[] }) {
  const any = p.conditions.length > 0 || !!p.concentrating_on || p.exhaustion > 0 || effects.length > 0;
  if (!any) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.conditions.map((c) => (
        <Badge key={c} variant="outline" className="border-secondary/50 text-xs text-secondary">
          {c}
        </Badge>
      ))}
      {p.exhaustion > 0 && (
        <Badge variant="outline" className="text-xs">
          Exhaustion {p.exhaustion}
        </Badge>
      )}
      {p.concentrating_on && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Brain className="h-3 w-3" /> {p.concentrating_on}
        </Badge>
      )}
      {effects.map((e) => (
        <Badge key={e.id} variant="outline" className="gap-1 border-primary/40 text-xs text-primary">
          <Sparkles className="h-3 w-3" /> {e.name}
        </Badge>
      ))}
    </div>
  );
}

function RecentAction({
  entry,
  participants,
  viewerIsDM,
}: {
  entry: RollEntry;
  participants: EncounterParticipant[];
  viewerIsDM: boolean;
}) {
  const quickView = useQuickView();
  const line = describeRoll(entry, participants, viewerIsDM);
  const source = entry.context?.source;
  const title = source && quickView ? (
    <button
      type="button"
      className="font-semibold text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
      onClick={() => {
        quickView.open({ kind: "ability", source, actorId: entry.context?.actorId ?? null });
      }}
    >
      {line.title}
    </button>
  ) : (
    <span className="font-semibold text-foreground">{line.title}</span>
  );

  return (
    <li className="flex items-baseline gap-1.5 bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1 truncate">
        {title}
        {line.kind && ` · ${line.kind}`}
        {line.target && ` → ${line.target}`}
      </span>
      {line.verdict && (
        <span className="flex shrink-0 items-center gap-0.5">
          <Shield className="h-3 w-3" /> {line.verdict.verdict}
        </span>
      )}
      {line.total !== null && <span className="shrink-0 font-bold text-foreground">{line.total}</span>}
    </li>
  );
}
