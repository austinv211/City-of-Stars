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
import CampaignPage from "@/features/campaign/pages/CampaignPage";
import EncounterPage from "@/features/encounter/pages/EncounterPage";

export default function App() {
  return (
    <AuthProvider>
      <CampaignProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/characters" replace />} />
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/characters/new" element={<CharacterCreatePage />} />
                <Route path="/characters/:characterId" element={<CharacterViewPage />} />
                <Route path="/campaign" element={<CampaignPage />} />
                <Route element={<EncounterGuard />}>
                  <Route path="/encounter" element={<EncounterPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </CampaignProvider>
    </AuthProvider>
  );
}
