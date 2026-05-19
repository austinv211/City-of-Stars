import { useNavigate } from "react-router";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent } from "@/core/components/ui/card";
import { LevelBadge } from "./LevelBadge";
import type { Character } from "../types/character.types";

interface Props {
  character: Character;
  isOwn?: boolean;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  backup: "outline",
};

export function CharacterCard({ character, isOwn }: Props) {
  const navigate = useNavigate();

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-border shrink-0">
          {character.portrait_url && (
            <AvatarImage src={character.portrait_url} alt={character.name} className="object-cover" />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{character.name}</span>
            {isOwn && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
            <Badge variant={STATUS_VARIANT[character.status] ?? "secondary"} className="text-xs capitalize">
              {character.status}
            </Badge>
            {character.level_up_pending && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-yellow-500 text-black animate-pulse">
                Level Up! →
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {character.species} {character.class}
            {character.subclass ? ` · ${character.subclass}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">{character.background}</p>
        </div>
        <LevelBadge level={character.level} />
      </CardContent>
    </Card>
  );
}
