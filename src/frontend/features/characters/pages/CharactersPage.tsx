import { useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Plus } from "lucide-react";
import { CharacterCard } from "../components/CharacterCard";
import { useCharacters } from "../hooks/useCharacters";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";

export default function CharactersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaign } = useCampaign();
  const { characters, loading } = useCharacters();

  const active = characters.filter((c) => c.status === "active");
  const drafts = characters.filter((c) => c.status === "draft");
  const backups = characters.filter((c) => c.status === "backup");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Characters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All adventurers in this campaign
          </p>
        </div>
        <Button onClick={() => navigate("/characters/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Character
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !campaign ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-muted-foreground">You are not a member of any campaign yet.</p>
          <p className="text-xs text-muted-foreground">Ask your Dungeon Master to add you to the campaign.</p>
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">No characters yet.</p>
          <Button onClick={() => navigate("/characters/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your Character
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active
              </h2>
              {active.map((c) => (
                <CharacterCard key={c.id} character={c} isOwn={c.owner_id === user?.id} />
              ))}
            </section>
          )}

          {drafts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Drafts
              </h2>
              {drafts.map((c) => (
                <CharacterCard key={c.id} character={c} isOwn={c.owner_id === user?.id} />
              ))}
            </section>
          )}

          {backups.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Backup Characters
              </h2>
              {backups.map((c) => (
                <CharacterCard key={c.id} character={c} isOwn={c.owner_id === user?.id} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
