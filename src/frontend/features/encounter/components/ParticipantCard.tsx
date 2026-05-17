import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
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

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isActive && "border-primary ring-1 ring-primary",
        selected && "bg-muted/50",
        onClick && "hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {participant.portrait_url && (
                <AvatarImage src={participant.portrait_url} alt={participant.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{participant.name}</span>
              {participant.is_npc && (
                <Badge variant="outline" className="text-xs">NPC</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>{participant.ac} AC</span>
              <span>·</span>
              <span>Init {participant.initiative}</span>
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
