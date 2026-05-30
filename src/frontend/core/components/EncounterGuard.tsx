import { Outlet } from "react-router";
import { Swords } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";

export default function EncounterGuard() {
  const { activeEncounterId, loading } = useCampaign();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!activeEncounterId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Swords className="h-16 w-16 text-muted-foreground/30" />
        <div>
          <h2 className="text-xl font-semibold">No Active Encounter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The Dungeon Master hasn't started an encounter yet. Stand by.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
