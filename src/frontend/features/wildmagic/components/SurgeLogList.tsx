import { Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { endSurge, type CharacterSurge } from "@/core/hooks/useCharacterSurges";
import { cn } from "@/lib/utils";
import type { SurgeTarget } from "../hooks/useSurgeLog";

const timeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Recent surges, newest first; active ones can be ended from here. */
export function SurgeLogList({ log, targets }: { log: CharacterSurge[]; targets: SurgeTarget[] }) {
  if (log.length === 0) return <p className="text-sm text-muted-foreground">No surges yet.</p>;
  const nameOf = new Map(targets.map((t) => [t.id, t.name]));

  async function handleEnd(id: string) {
    const { error } = await endSurge(id);
    if (error) toast.error(error);
  }

  return (
    <ul className="divide-y divide-border border border-border">
      {log.map((s) => {
        const active = s.ended_at === null;
        return (
          <li key={s.id} className={cn("flex items-center gap-3 px-3 py-2 text-sm", !active && "opacity-60")}>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="font-medium">{nameOf.get(s.character_id) ?? "A character"}</span>
                {" · "}
                {s.name}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {s.effect_id && <Swords className="h-3 w-3" aria-label="In combat" />}
                {timeFormat.format(new Date(s.created_at))}
                {s.roll !== null && ` · rolled ${String(s.roll)}`}
                {!active && " · ended"}
              </p>
            </div>
            {active && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void handleEnd(s.id)}>
                End
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
