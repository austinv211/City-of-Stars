import { cn } from "@/lib/utils";
import type { StageState } from "../../lib/encounterStage";

/**
 * "R3 · Goblin's turn · Next: you". The round, who is acting, who is next,
 * and -- when it is the viewer -- a chip that says so, coloured by phase.
 *
 * Before the round counter existed the only cue was a "Turn: <name>" string,
 * and nothing distinguished it being YOUR turn or being next.
 */
export function TurnBar({
  stage,
  className,
}: {
  stage: StageState;
  className?: string;
}) {
  const { phase, round, active, next, own } = stage;
  const isMe = (id: string | undefined) => !!own && id === own.id;

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2 text-sm", className)}
      data-testid="enc-turn-bar"
    >
      <span
        className="shrink-0 bg-primary/15 px-1.5 py-0.5 font-mono text-xs font-bold text-primary"
        title={`Round ${String(round)}`}
      >
        R{round}
      </span>
      {active && isMe(active.id) ? (
        <span className="shrink-0 bg-primary px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
          Your turn
        </span>
      ) : active ? (
        <span className="min-w-0 truncate">
          <span className="font-semibold text-primary">
            {isMe(active.id) ? "Your" : `${active.name}'s`}
          </span>{" "}
          <span className="text-muted-foreground">turn</span>
        </span>
      ) : (
        <span className="text-muted-foreground">Not started</span>
      )}
      {next && next.id !== active?.id && (
        <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">
          · Next: {isMe(next.id) ? "you" : next.name}
        </span>
      )}
      {phase === "on-deck" && (
        <span className="shrink-0 bg-secondary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
          You're next
        </span>
      )}
      {phase === "dying" && (
        <span className="shrink-0 bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
          Dying
        </span>
      )}
    </div>
  );
}
