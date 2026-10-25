import { Navigate, Outlet } from "react-router";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";

/**
 * Gate for `/admin/*`.
 *
 * These routes were previously behind `ProtectedRoute` only — hidden from the
 * sidebar for non-admins, but reachable by typing the URL as any signed-in
 * user. Nav visibility is not access control.
 *
 * The data itself is protected server-side by RLS (`is_app_admin()`), so this
 * closes a UI gap rather than a data breach. It still matters: without it the
 * pages render their chrome and then fail their queries, which reads as a
 * broken app rather than a denied one.
 *
 * Mirrors DmGuard's shape, including showing a spinner while auth resolves —
 * returning `null` during loading is what caused the blank-page crashes noted
 * in docs/progress_notes.md.
 */
export default function AdminGuard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { isPlayer, loading } = useCampaign();

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (isAdmin) return <Outlet />;
  return <Navigate to={isPlayer ? "/characters" : "/campaigns"} replace />;
}
