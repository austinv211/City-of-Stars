import { ChevronDown } from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import type {
  CharacterWithScores,
  CharacterAttack,
} from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";
import type { DamageResult } from "../hooks/useEncounterParticipants";
import type { TargetInfo } from "../lib/attack";
import { DicePoolBuilder } from "./DicePoolBuilder";
import { AttackCardList } from "./stage/AttackCardList";
import { AbilityCheckRow, SaveRow, SkillRow } from "./stage/CheckRows";
import { CombatStatus } from "./stage/CombatStatus";
import { ConditionEffects } from "./stage/ConditionEffects";
import { EconomyBar } from "./stage/EconomyBar";
import { MonsterActionList, MonsterTraits } from "./stage/MonsterActionList";
import { NpcProfile } from "./stage/NpcProfile";
import { UnarmedStrike } from "./stage/UnarmedStrike";
import { combatantStats } from "./stage/combatantStats";
import type { CombatantView } from "./stage/combatantView";
import { useCombatRolls, type TurnFlag } from "./stage/useCombatRolls";

interface Props {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  attacks: CharacterAttack[];
  campaignId: string;
  encounterId: string;
  isDM: boolean;
  canControl: boolean;
  onSetConcentration: (spell: string | null) => void;
  onSetHeroicInspiration: (value: boolean) => void;
  onSetCover: (cover: string) => void;
  onSetTurnFlag: (flag: TurnFlag, value: boolean) => void;
  target: TargetInfo | null;
  /** DM only; see CombatantView.onApplyDamage. */
  onApplyDamage?: (
    amount: number,
    type: string | null,
    crit: boolean,
  ) => Promise<DamageResult>;
  /**
   * On a player's own turn: lead with the economy and attacks, and fold the
   * dice pool, saves and checks behind "More".
   */
  secondaryCollapsed?: boolean;
}

/**
 * Everything one combatant can do on the encounter screen.
 *
 * A composition of the sections in ./stage. Until Phase 3 this was a single
 * 1,250-line component; the numbers now come from combatantStats() and the
 * rolling from useCombatRolls, so each section is presentational.
 */
export function ActionPanel({
  participant,
  character,
  attacks,
  campaignId,
  encounterId,
  isDM,
  canControl,
  onSetConcentration,
  onSetHeroicInspiration,
  onSetCover,
  onSetTurnFlag,
  target,
  onApplyDamage,
  secondaryCollapsed = false,
}: Props) {
  const rolls = useCombatRolls({
    participant,
    campaignId,
    encounterId,
    isDM,
    onSetTurnFlag,
  });

  // Players see only portrait + description for NPCs.
  if (!isDM && !participant.is_player) return <NpcProfile participant={participant} />;

  const view: CombatantView = {
    participant,
    character,
    stats: combatantStats(participant, character),
    rolls,
    locked: !canControl,
    target,
    onApplyDamage,
  };

  const combatStatus = (
    <CombatStatus
      participant={participant}
      locked={view.locked}
      onSetHeroicInspiration={onSetHeroicInspiration}
      onSetConcentration={onSetConcentration}
      onSetCover={onSetCover}
    />
  );
  const dicePool = (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Dice Pool</p>
      <DicePoolBuilder
        disabled={view.locked}
        onRoll={(args) => void rolls.rollPool(args)}
      />
    </div>
  );
  const checks = (
    <>
      <SaveRow view={view} />
      <Separator />
      <SkillRow view={view} />
      <AbilityCheckRow view={view} />
    </>
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-1">
        <PanelHeader participant={participant} />

        {!secondaryCollapsed && combatStatus}
        <ConditionEffects stats={view.stats} />

        {participant.is_player && (
          <>
            <EconomyBar
              participant={participant}
              characterClass={character?.class ?? ""}
              rolls={rolls}
              locked={view.locked}
              onSetTurnFlag={onSetTurnFlag}
            />
            <Separator />
          </>
        )}
        {secondaryCollapsed && combatStatus}

        {!secondaryCollapsed && (
          <>
            {dicePool}
            <Separator />
          </>
        )}

        <MonsterTraits traits={participant.special_abilities ?? []} />
        <MonsterActionList view={view} />
        <AttackCardList view={view} attacks={attacks} />
        {participant.is_player && <UnarmedStrike view={view} />}
        {secondaryCollapsed ? (
          <MoreSection>
            {dicePool}
            <Separator />
            {checks}
          </MoreSection>
        ) : (
          checks
        )}
      </div>
    </ScrollArea>
  );
}

function MoreSection({ children }: { children: React.ReactNode }) {
  return (
    <details className="group border border-border/40">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-semibold text-muted-foreground">
        More — dice pool, saves and checks
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border/40 p-3">{children}</div>
    </details>
  );
}

/** Name, and for a monster the NPC badge and its flavour text (DM reference). */
function PanelHeader({ participant }: { participant: EncounterParticipant }) {
  const npc = !participant.is_player;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {participant.name}
        </span>
        {npc && (
          <Badge variant="secondary" className="text-xs">
            NPC
          </Badge>
        )}
      </div>
      {npc && participant.description && (
        <p className="text-xs italic leading-relaxed text-muted-foreground">
          {participant.description}
        </p>
      )}
    </>
  );
}
