import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import type { Campaign, CampaignMember } from "@/features/campaign/types/campaign.types";

const STORAGE_KEY = "cityofstars:selectedCampaign";

interface MembershipRow extends CampaignMember {
  campaigns: Campaign;
}

interface CampaignContextValue {
  campaign: Campaign | null;
  campaigns: Campaign[];
  memberships: CampaignMember[];
  membership: CampaignMember | null;
  isDM: boolean;
  isPlayer: boolean;
  activeEncounterId: string | null;
  // encounter id (or null) for every campaign the user belongs to
  campaignEncounters: Record<string, string | null>;
  loading: boolean;
  refreshCampaign: () => Promise<void>;
  switchCampaign: (id: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [allMemberships, setAllMemberships] = useState<MembershipRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [campaignEncounters, setCampaignEncounters] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  // ── Derived ────────────────────────────────────────────────────────────────
  // When a user holds multiple roles in one campaign there are multiple rows per
  // campaign_id. Deduplicate for the campaigns list and active-membership lookup,
  // preferring the dm row so isDM resolves correctly.
  const deduplicatedMemberships = (() => {
    const seen = new Map<string, MembershipRow>();
    for (const m of allMemberships) {
      const existing = seen.get(m.campaign_id);
      if (!existing || (m.role === "dm" && existing.role !== "dm")) {
        seen.set(m.campaign_id, m);
      }
    }
    return Array.from(seen.values());
  })();

  const campaigns = deduplicatedMemberships.map((m) => m.campaigns);
  const memberships: CampaignMember[] = allMemberships.map(({ id, campaign_id, user_id, role, joined_at }) => ({
    id, campaign_id, user_id, role, joined_at,
  }));
  const activeMembership =
    deduplicatedMemberships.find((m) => m.campaign_id === selectedId) ?? deduplicatedMemberships[0] ?? null;
  const campaign = activeMembership?.campaigns ?? null;
  const membership = activeMembership
    ? { id: activeMembership.id, campaign_id: activeMembership.campaign_id, user_id: activeMembership.user_id, role: activeMembership.role, joined_at: activeMembership.joined_at }
    : null;
  const activeEncounterId = campaign ? (campaignEncounters[campaign.id] ?? null) : null;
  // isDM / isPlayer are true if the user has ANY matching-role row for the active campaign
  const isDM = allMemberships.some((m) => m.campaign_id === activeMembership?.campaign_id && m.role === "dm");
  const isPlayer = allMemberships.some((m) => m.campaign_id === activeMembership?.campaign_id && m.role === "player");

  // ── Load memberships + active encounters for all campaigns ─────────────────
  async function loadMemberships() {
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("campaign_members")
      .select("*, campaigns(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });

    if (error) console.error("[CampaignContext] load error:", error);

    const rows = (data as MembershipRow[]) ?? [];
    setAllMemberships(rows);

    // Drop persisted selection if that campaign is gone
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId && !rows.some((m) => m.campaign_id === storedId)) {
      localStorage.removeItem(STORAGE_KEY);
      setSelectedId(null);
    }

    // Load active encounter for every campaign in one query
    if (rows.length > 0) {
      const ids = [...new Set(rows.map((r) => r.campaign_id))];
      const { data: encData } = await supabase
        .from("encounters")
        .select("id, campaign_id")
        .in("campaign_id", ids)
        .eq("status", "active");

      const encMap: Record<string, string | null> = Object.fromEntries(ids.map((id) => [id, null]));
      ((encData ?? []) as { id: string; campaign_id: string }[]).forEach((e) => {
        encMap[e.campaign_id] = e.id;
      });
      setCampaignEncounters(encMap);
    }

    setLoading(false);
  }

  useEffect(() => { loadMemberships(); }, [user]);

  const refreshCampaign = useCallback(async () => { await loadMemberships(); }, [user]);

  async function switchCampaign(id: string) {
    // If the campaign isn't in our loaded memberships yet (e.g. context is stale
    // after a trigger-based insert), refresh before switching so the derived
    // `activeMembership` can find the new id.
    if (!allMemberships.some((m) => m.campaign_id === id)) {
      await loadMemberships();
    }
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  // ── Subscribe to current user's membership changes ────────────────────────
  // Catches role additions/removals so isDM and isPlayer update without a reload.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("user-memberships")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_members", filter: `user_id=eq.${user.id}` },
        () => { loadMemberships(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── Subscribe to encounters for ALL campaigns ──────────────────────────────
  // One channel per campaign — updates the shared map so the selector can show
  // live encounter indicators for every campaign, not just the active one.
  useEffect(() => {
    if (allMemberships.length === 0) return;

    const uniqueIds = [...new Set(allMemberships.map((m) => m.campaign_id))];
    const channels = uniqueIds.map((campaignId) =>
      supabase
        .channel(`enc:${campaignId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "encounters", filter: `campaign_id=eq.${campaignId}` },
          (payload) => {
            const row = payload.new as { id: string; status: string } | undefined;
            setCampaignEncounters((prev) => {
              if (!row) return { ...prev, [campaignId]: null };
              if (row.status === "active") return { ...prev, [campaignId]: row.id };
              // Clear only if this encounter was the tracked one
              return {
                ...prev,
                [campaignId]: prev[campaignId] === row.id ? null : prev[campaignId],
              };
            });
          }
        )
        .subscribe()
    );

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [allMemberships]);

  // ── Subscribe to active campaign UPDATE (field changes only) ─────────────
  useEffect(() => {
    if (!campaign) return;

    const ch = supabase
      .channel(`campaign-update:${campaign.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${campaign.id}` },
        (payload) => {
          setAllMemberships((prev) =>
            prev.map((m) =>
              m.campaign_id === campaign.id
                ? { ...m, campaigns: { ...m.campaigns, ...(payload.new as Campaign) } }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [campaign?.id]);

  // ── Global campaign DELETE listener — covers active AND non-active campaigns
  // Fires whenever any campaign row is deleted; handler checks if user was a member.
  // payload.old contains at least {id} (DEFAULT replica identity on campaigns table).
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel("campaign-deletions")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "campaigns" },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (!deletedId) return;
          setAllMemberships((prev) => prev.filter((m) => m.campaign_id !== deletedId));
          setSelectedId((prev) => {
            if (prev !== deletedId) return prev;
            localStorage.removeItem(STORAGE_KEY);
            return null;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        campaigns,
        memberships,
        membership,
        isDM,
        isPlayer,
        activeEncounterId,
        campaignEncounters,
        loading,
        refreshCampaign,
        switchCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used within CampaignProvider");
  return ctx;
}
