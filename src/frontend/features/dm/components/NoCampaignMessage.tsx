import { BookOpen } from "lucide-react";
import { NavLink } from "react-router";

export default function NoCampaignMessage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
      <div className="space-y-1">
        <p className="font-semibold text-foreground">No campaign selected</p>
        <p className="text-sm text-muted-foreground">
          Create or select a campaign before using DM tools.
        </p>
      </div>
      <NavLink
        to="/dm/campaigns"
        className="text-sm font-medium text-primary hover:underline"
      >
        Go to Campaigns
      </NavLink>
    </div>
  );
}
