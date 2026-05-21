import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users } from "lucide-react";
import { Skeleton } from "@/core/components/ui/skeleton";
import { CharacterCard } from "@/features/characters/components/CharacterCard";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import type { Character } from "@/features/characters/types/character.types";

interface MemberEmail {
  user_id: string;
  email: string;
}

export default function DmCharactersPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { characters, loading: charsLoading } = useCharacters();
  const [members, setMembers] = useState<MemberEmail[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!campaign) { setMembersLoading(false); return; }
    async function load() {
      const { data } = await supabase.rpc("get_campaign_members_with_email", { cid: campaign!.id });
      const seen = new Set<string>();
      const unique: MemberEmail[] = [];
      for (const m of (data ?? []) as any[]) {
        if (!seen.has(m.user_id)) {
          seen.add(m.user_id);
          unique.push({ user_id: m.user_id, email: m.email });
        }
      }
      setMembers(unique);
      setMembersLoading(false);
    }
    load();
  }, [campaign?.id]);

  if (!campaign) return <NoCampaignMessage />;

  const loading = charsLoading || membersLoading;
  const emailMap = new Map(members.map((m) => [m.user_id, m.email]));

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
                {emailMap.get(ownerId) ?? "Unknown player"}
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
