import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "@/core/context/AuthContext";
import { CampaignProvider } from "@/core/context/CampaignContext";
import ProtectedRoute from "@/core/components/ProtectedRoute";
import AppShell from "@/core/components/AppShell";
import EncounterGuard from "@/core/components/EncounterGuard";
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
import AdminWhitelistPage from "@/features/admin/pages/AdminWhitelistPage";

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
              <Route path="/" element={<Navigate to="/characters" replace />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/characters/new" element={<CharacterCreatePage />} />
              <Route path="/characters/:characterId" element={<CharacterViewPage />} />
              <Route path="/campaign" element={<Navigate to="/campaigns" replace />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route element={<EncounterGuard />}>
                <Route path="/encounter" element={<EncounterPage />} />
              </Route>
              {/* DM-only routes — access is enforced at the DB/policy level */}
              <Route path="/dm" element={<Navigate to="/dm/campaigns" replace />} />
              <Route path="/dm/campaigns" element={<DmCampaignsPage />} />
              <Route path="/dm/members" element={<DmMembersPage />} />
              <Route path="/dm/sessions" element={<DmSessionsPage />} />
              <Route path="/dm/encounters" element={<DmEncountersPage />} />
              <Route path="/dm/monsters" element={<DmMonstersPage />} />
              {/* Admin-only routes */}
              <Route path="/admin/whitelist" element={<AdminWhitelistPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
