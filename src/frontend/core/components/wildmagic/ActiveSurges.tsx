import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { RichText } from "@/core/components/RichText";
import { endSurge, useActiveSurges } from "@/core/hooks/useCharacterSurges";

interface Props {
  characterId: string;
  /** The character's player and the DM can end a surge; everyone else just sees it. */
  canEnd: boolean;
}

/** The wild magic currently affecting a character, shown at the top of their sheet. */
export function ActiveSurges({ characterId, canEnd }: Props) {
  const { surges, refresh } = useActiveSurges(characterId);
  if (surges.length === 0) return null;

  async function handleEnd(id: string) {
    const { error } = await endSurge(id);
    if (error) toast.error(error);
    refresh();
  }

  return (
    <section aria-label="Active wild magic" className="mb-4 space-y-2">
      {surges.map((s) => (
        <div key={s.id} className="wild-surge relative overflow-hidden border border-surge/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-surge" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-surge">
                Wild magic{s.roll !== null && ` · rolled ${String(s.roll)}`}
              </p>
              <p className="font-semibold">{s.name}</p>
              {s.description && <RichText size="xs" className="mt-1 text-muted-foreground">{s.description}</RichText>}
            </div>
            {canEnd && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                aria-label={`End ${s.name}`}
                title="End this surge"
                onClick={() => void handleEnd(s.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
