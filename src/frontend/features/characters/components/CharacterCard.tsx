import { useNavigate } from "react-router";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { LevelBadge } from "./LevelBadge";
import { Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character } from "../types/character.types";

interface Props {
  character: Character;
  isOwn?: boolean;
  onDelete?: (character: Character) => void;
  onSetActive?: (character: Character) => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  backup: "outline",
};

export function CharacterCard({
  character,
  isOwn,
  onDelete,
  onSetActive,
}: Props) {
  const navigate = useNavigate();

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const showSetActive = isOwn && character.status !== "active" && onSetActive;
  const showDelete = isOwn && onDelete;

  return (
    <Card
      className={cn(
        "cursor-pointer border-border/60 transition-all duration-150 hover:border-[hsl(var(--ctp-lavender)/0.5)] hover:shadow-sm",
      )}
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-border shrink-0">
          {character.portrait_url && (
            <AvatarImage
              src={character.portrait_url}
              alt={character.name}
              className="object-cover"
            />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{character.name}</span>
            {isOwn && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
            <Badge
              variant={STATUS_VARIANT[character.status] ?? "secondary"}
              className="text-xs capitalize"
            >
              {character.status}
            </Badge>
            {character.level_up_pending && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border animate-pulse bg-[hsl(var(--ctp-yellow)/0.15)] text-[hsl(var(--ctp-yellow))] border-[hsl(var(--ctp-yellow)/0.35)]">
                Level Up! →
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {character.species} {character.class}
            {character.subclass ? ` · ${character.subclass}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {character.background}
          </p>
        </div>
        <LevelBadge level={character.level} />
        {(showSetActive || showDelete) && (
          <div
            className="flex gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {showSetActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                title="Set as active character"
                onClick={() => onSetActive!(character)}
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            {showDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete character"
                onClick={() => onDelete!(character)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
