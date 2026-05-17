import { Badge } from "@/core/components/ui/badge";
import { Users } from "lucide-react";
import type { Campaign } from "../types/campaign.types";

interface Props {
  campaign: Campaign;
  isDM: boolean;
  memberCount: number;
}

export function CampaignHeader({ campaign, isDM, memberCount }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        {isDM && <Badge>DM</Badge>}
      </div>
      {campaign.description && (
        <p className="text-muted-foreground">{campaign.description}</p>
      )}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
