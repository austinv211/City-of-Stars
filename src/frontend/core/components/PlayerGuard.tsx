import { Navigate, Outlet } from "react-router";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";

export default function PlayerGuard() {
  const { isPlayer, isDM, loading } = useCampaign();
  const { isAdmin, isPlayerRole, loading: authLoading } = useAuth();

  if (loading || authLoading) return null;
  // Allow through if they have the player role (even without a campaign yet) OR are already a player in a campaign
  if (isPlayerRole || isPlayer) return <Outlet />;
  return <Navigate to={isDM || isAdmin ? "/dm/campaigns" : "/campaigns"} replace />;
}
