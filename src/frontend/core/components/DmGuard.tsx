import { Navigate, Outlet } from "react-router";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";

export default function DmGuard() {
  const { isDM, isPlayer, loading } = useCampaign();
  const { isAdmin, loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (isDM || isAdmin) return <Outlet />;
  return <Navigate to={isPlayer ? "/characters" : "/campaigns"} replace />;
}
