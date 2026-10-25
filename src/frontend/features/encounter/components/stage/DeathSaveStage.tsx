import { useState } from "react";
import { Skull, HeartPulse } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { EncounterParticipant } from "../../types/encounter.types";

/**
 * At 0 HP the only thing a player can do is roll death saves, so that is all
 * the stage shows. The logic already existed (rollDeathSave ->
 * applyDeathSaveRoll -> resolveDeathSave); this makes it a screen.
 */
export function DeathSaveStage({
  participant,
  isTheirTurn,
  onRoll,
}: {
  participant: EncounterParticipant;
  /** Death saves are rolled at the start of your own turn. */
  isTheirTurn: boolean;
  onRoll: () => Promise<void>;
}) {
  const [rolling, setRolling] = useState(false);
  const successes = participant.death_save_successes;
  const failures = participant.death_save_failures;
  const dead = failures >= 3;
  const stable = !dead && successes >= 3;

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      {dead ? (
        <Skull className="h-12 w-12 text-destructive" />
      ) : (
        <HeartPulse className="h-12 w-12 text-destructive motion-safe:animate-pulse" />
      )}
      <div className="space-y-1">
        <p className="text-lg font-bold">
          {dead ? "You have died" : stable ? "You are stable" : "You are dying"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {dead
            ? "Three failed death saves."
            : stable
              ? "Unconscious at 0 HP, but no longer making death saves. Any healing brings you back."
              : "On your turn, roll a d20: 10 or higher succeeds. A 20 brings you back with 1 HP; a 1 counts as two failures."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Pips label="Successes" count={successes} className="bg-success" />
        <Pips label="Failures" count={failures} className="bg-destructive" />
      </div>

      {!dead && !stable && (
        <Button
          size="lg"
          variant="destructive"
          className="h-14 w-full max-w-xs text-base"
          disabled={!isTheirTurn || rolling}
          onClick={() => {
            setRolling(true);
            void onRoll().finally(() => {
              setRolling(false);
            });
          }}
        >
          {isTheirTurn ? "Roll Death Save" : "Wait for your turn"}
        </Button>
      )}
    </div>
  );
}

function Pips({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className="space-y-1.5" aria-label={`${label}: ${String(count)} of 3`}>
      <div className="flex justify-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-5 w-5 rounded-full border",
              i < count ? className : "bg-transparent",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
