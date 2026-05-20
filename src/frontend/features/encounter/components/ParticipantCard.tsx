import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent } from "@/core/components/ui/card";
import { Shield } from "lucide-react";
import { HPAdjuster } from "./HPAdjuster";
import { ConditionBadges } from "./ConditionBadges";
import { cn } from "@/lib/utils";
import type { EncounterParticipant } from "../types/encounter.types";

interface Props {
  participant: EncounterParticipant;
  isActive: boolean;
  canEditHP: boolean;
  showHP: boolean;
  onAdjustHP: (delta: number) => void;
  onUpdateConditions: (conditions: string[]) => void;
  onClick?: () => void;
  selected?: boolean;
}

export function ParticipantCard({
  participant,
  isActive,
  canEditHP,
  showHP,
  onAdjustHP,
  onUpdateConditions,
  onClick,
  selected,
}: Props) {
  const initials = participant.name.slice(0, 2).toUpperCase();

  let cardStyle: Record<string, string> = {};
  if (selected) {
    cardStyle["background"] = "hsl(var(--ctp-surface2)/0.15)";
    cardStyle["box-shadow"] = "0 0 0 1px hsl(var(--ctp-teal))";
  }
  if (isActive) {
    cardStyle["border"] = "1px solid hsl(var(--ctp-teal))";
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300",
        !selected && !isActive && "hover:bg-secondary hover:shadow-md",
      )}
      style={cardStyle}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {participant.portrait_url && (
                <AvatarImage
                  src={participant.portrait_url}
                  alt={participant.name}
                />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--ctp-teal))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--ctp-teal))]" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {participant.name}
              </span>
              {!participant.is_player && (
                <Badge variant="outline" className="text-xs">
                  NPC
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>{participant.ac} AC</span>
              <span>·</span>
              <span>Init {participant.initiative_score}</span>
            </div>
          </div>
        </div>

        {showHP ? (
          <HPAdjuster
            current={participant.hp_current}
            max={participant.hp_max}
            canEdit={canEditHP}
            onAdjust={onAdjustHP}
          />
        ) : (
          <div className="text-xs text-muted-foreground italic">HP hidden</div>
        )}

        {participant.conditions.length > 0 || canEditHP ? (
          <ConditionBadges
            conditions={participant.conditions}
            canEdit={canEditHP}
            onUpdate={onUpdateConditions}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
