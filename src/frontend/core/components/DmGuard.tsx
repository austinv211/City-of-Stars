import { Navigate, Outlet } from "react-router";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";

export default function DmGuard() {
  const { isDM, isPlayer, loading } = useCampaign();
  const { isAdmin, loading: authLoading } = useAuth();

  if (loading || authLoading) return null;
  if (isDM || isAdmin) return <Outlet />;
  return <Navigate to={isPlayer ? "/characters" : "/campaigns"} replace />;
}
