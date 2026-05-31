import { Eye } from "lucide-react";
import { DicePoolBuilder } from "./DicePoolBuilder";
import { DiceRollButton } from "./DiceRollButton";
import { useDice } from "../context/DiceContext";

interface Props {
  campaignId: string;
  encounterId: string | null;
  /** Display name to attribute rolls to (e.g. the player's name). */
  spectatorName: string;
  isDM?: boolean;
}

/**
 * Roll surface for users without a character/participant in the encounter.
 * Lets spectators make basic checks (d20) and arbitrary dice-pool rolls so they
 * can resolve interactions during sessions where they have no active character.
 */
export function SpectatorRollPanel({ campaignId, encounterId, spectatorName, isDM }: Props) {
  const { rollPool } = useDice();

  // Common d20 checks — single click, no modifier.
  const quickChecks = ["Check", "Save", "Attack"] as const;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-muted p-3">
          <Eye className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Spectating as {spectatorName}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have a character in this encounter, but you can still make
          rolls. Results are shared with the table.
        </p>
      </div>

      {/* Quick d20 checks */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick d20
        </p>
        <div className="flex flex-wrap gap-2">
          {quickChecks.map((label) => (
            <DiceRollButton
              key={label}
              label={label}
              options={{
                campaignId,
                encounterId,
                characterName: spectatorName,
                rolledByDm: isDM,
                diceType: "1d20",
                sides: 20,
                modifier: 0,
                rollType: label,
              }}
            />
          ))}
        </div>
      </div>

      {/* Full dice-pool builder for anything else */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Custom roll
        </p>
        <DicePoolBuilder
          onRoll={(opts) =>
            rollPool({
              campaignId,
              encounterId,
              characterName: spectatorName,
              rolledByDm: isDM,
              ...opts,
            })
          }
        />
      </div>
    </div>
  );
}
