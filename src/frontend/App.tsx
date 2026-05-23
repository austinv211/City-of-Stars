import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Toaster } from "@/core/components/ui/sonner";
import { AuthProvider, useAuth } from "@/core/context/AuthContext";
import { CampaignProvider, useCampaign } from "@/core/context/CampaignContext";
import ProtectedRoute from "@/core/components/ProtectedRoute";
import { ErrorBoundary } from "@/core/components/ErrorBoundary";
import AppShell from "@/core/components/AppShell";
import EncounterGuard from "@/core/components/EncounterGuard";
import DmGuard from "@/core/components/DmGuard";
import PlayerGuard from "@/core/components/PlayerGuard";
import LoginPage from "@/core/pages/LoginPage";
import NotFoundPage from "@/core/pages/NotFoundPage";
import CharactersPage from "@/features/characters/pages/CharactersPage";
import CharacterCreatePage from "@/features/characters/pages/CharacterCreatePage";
import CharacterViewPage from "@/features/characters/pages/CharacterViewPage";
import CampaignsPage from "@/features/campaign/pages/CampaignsPage";
import EncounterPage from "@/features/encounter/pages/EncounterPage";
import DmSessionsPage from "@/features/dm/pages/DmSessionsPage";
import DmEncountersPage from "@/features/dm/pages/DmEncountersPage";
import DmMonstersPage from "@/features/dm/pages/DmMonstersPage";
import DmCampaignsPage from "@/features/dm/pages/DmCampaignsPage";
import DmMembersPage from "@/features/dm/pages/DmMembersPage";
import DmCharactersPage from "@/features/dm/pages/DmCharactersPage";
import DmCharacterViewPage from "@/features/dm/pages/DmCharacterViewPage";
import AdminWhitelistPage from "@/features/admin/pages/AdminWhitelistPage";
import AdminCampaignsPage from "@/features/admin/pages/AdminCampaignsPage";
import RealtimeDebugOverlay from "@/core/components/RealtimeDebugOverlay";

function RootRedirect() {
  const { isPlayer, isDM, loading } = useCampaign();
  const { isAdmin, isPlayerRole, loading: authLoading } = useAuth();
  if (loading || authLoading) return null;
  if (isPlayer || isPlayerRole) return <Navigate to="/characters" replace />;
  if (isDM || isAdmin) return <Navigate to="/dm/campaigns" replace />;
  return <Navigate to="/campaigns" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <CampaignProvider>
                  <AppShell />
                </CampaignProvider>
              }
            >
              <Route path="/" element={<RootRedirect />} />
              {/* Campaigns page is accessible to all authenticated users as a fallback */}
              <Route path="/campaigns" element={<ErrorBoundary><CampaignsPage /></ErrorBoundary>} />
              <Route path="/campaign" element={<Navigate to="/campaigns" replace />} />
              {/* Player-only routes */}
              <Route element={<PlayerGuard />}>
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/characters/new" element={<CharacterCreatePage />} />
                <Route path="/characters/:characterId" element={<CharacterViewPage />} />
              </Route>
              {/* Encounter — player view (always player mode regardless of DM role) */}
              <Route element={<EncounterGuard />}>
                <Route path="/encounter" element={<ErrorBoundary><EncounterPage playerMode={true} /></ErrorBoundary>} />
              </Route>
              {/* DM-only routes */}
              <Route path="/dm" element={<Navigate to="/dm/campaigns" replace />} />
              <Route element={<DmGuard />}>
                <Route path="/dm/campaigns" element={<DmCampaignsPage />} />
                <Route path="/dm/members" element={<DmMembersPage />} />
                <Route path="/dm/characters" element={<DmCharactersPage />} />
                <Route path="/dm/characters/:characterId" element={<DmCharacterViewPage />} />
                <Route path="/dm/sessions" element={<DmSessionsPage />} />
                <Route path="/dm/encounters" element={<DmEncountersPage />} />
                <Route path="/dm/encounters/active" element={<ErrorBoundary><EncounterPage /></ErrorBoundary>} />
                <Route path="/dm/monsters" element={<DmMonstersPage />} />
              </Route>
              {/* Admin-only routes */}
              <Route path="/admin/whitelist" element={<AdminWhitelistPage />} />
              <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
      {import.meta.env.DEV && <RealtimeDebugOverlay />}
    </AuthProvider>
  );
}
