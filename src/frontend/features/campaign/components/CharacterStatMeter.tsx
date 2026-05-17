import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Card, CardContent } from "@/core/components/ui/card";
import { Progress } from "@/core/components/ui/progress";
import type { Character } from "@/features/characters/types/character.types";

interface Props {
  character: Character;
}

export function CharacterStatMeter({ character }: Props) {
  const initials = character.name.slice(0, 2).toUpperCase();

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
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Homebrew Stat A</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Homebrew Stat B</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-1.5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">Details coming soon</p>
      </CardContent>
    </Card>
  );
}
