import { useNavigate } from "react-router";
import { Users } from "lucide-react";
import { Skeleton } from "@/core/components/ui/skeleton";
import { CharacterCard } from "@/features/characters/components/CharacterCard";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useCampaign } from "@/core/context/CampaignContext";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import type { Character } from "@/features/characters/types/character.types";
import { uniqueMembers, useCampaignRoster } from "../hooks/useCampaignRoster";

export default function DmCharactersPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { characters, loading: charsLoading } = useCharacters();
  const { members, loading: membersLoading } = useCampaignRoster(campaign?.id);

  if (!campaign) return <NoCampaignMessage />;

  const loading = charsLoading || membersLoading;
  const nameByOwner = new Map(uniqueMembers(members).map((m) => [m.user_id, m.display_name]));

  const grouped = characters.reduce<Map<string, Character[]>>((acc, c) => {
    const list = acc.get(c.owner_id) ?? [];
    list.push(c);
    acc.set(c.owner_id, list);
    return acc;
  }, new Map());

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Campaign Characters
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{campaign.name}</p>
      </div>

      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No characters in this campaign yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([ownerId, chars]) => (
            <section key={ownerId} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {nameByOwner.get(ownerId) ?? "Former member"}
              </h2>
              {chars.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onView={(ch) => navigate(`/dm/characters/${ch.id}`)}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
