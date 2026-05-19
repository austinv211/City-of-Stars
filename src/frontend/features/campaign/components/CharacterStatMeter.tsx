import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Card, CardContent } from "@/core/components/ui/card";
import { cn } from "@/lib/utils";
import type { Character } from "@/features/characters/types/character.types";

interface Props {
  character: Character;
}

export function CharacterStatMeter({ character }: Props) {
  const initials = character.name.slice(0, 2).toUpperCase();
  const voidLevel = character.will_of_void ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {character.portrait_url && (
              <AvatarImage src={character.portrait_url} alt={character.name} />
            )}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{character.name}</p>
            <p className="text-xs text-muted-foreground">
              {character.class} · Lv. {character.level}
            </p>
          </div>
        </div>

        {/* Will of the Void gauge (0-5, read-only) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Will of the Void</span>
            <span className="font-medium text-foreground">{voidLevel} / 5</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2 rounded-sm",
                  i <= voidLevel ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
