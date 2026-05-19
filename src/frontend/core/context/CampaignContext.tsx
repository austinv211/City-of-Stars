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
  const campaigns = allMemberships.map((m) => m.campaigns);
  const memberships: CampaignMember[] = allMemberships.map(({ id, campaign_id, user_id, role, joined_at }) => ({
    id, campaign_id, user_id, role, joined_at,
  }));
  const activeMembership =
    allMemberships.find((m) => m.campaign_id === selectedId) ?? allMemberships[0] ?? null;
  const campaign = activeMembership?.campaigns ?? null;
  const membership = activeMembership
    ? { id: activeMembership.id, campaign_id: activeMembership.campaign_id, user_id: activeMembership.user_id, role: activeMembership.role, joined_at: activeMembership.joined_at }
    : null;
  const activeEncounterId = campaign ? (campaignEncounters[campaign.id] ?? null) : null;

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
      const ids = rows.map((r) => r.campaign_id);
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

  // ── Subscribe to encounters for ALL campaigns ──────────────────────────────
  // One channel per campaign — updates the shared map so the selector can show
  // live encounter indicators for every campaign, not just the active one.
  useEffect(() => {
    if (allMemberships.length === 0) return;

    const channels = allMemberships.map((m) =>
      supabase
        .channel(`enc:${m.campaign_id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "encounters", filter: `campaign_id=eq.${m.campaign_id}` },
          (payload) => {
            const row = payload.new as { id: string; status: string } | undefined;
            setCampaignEncounters((prev) => {
              if (!row) return { ...prev, [m.campaign_id]: null };
              if (row.status === "active") return { ...prev, [m.campaign_id]: row.id };
              // Clear only if this encounter was the tracked one
              return {
                ...prev,
                [m.campaign_id]: prev[m.campaign_id] === row.id ? null : prev[m.campaign_id],
              };
            });
          }
        )
        .subscribe()
    );

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [allMemberships]);

  // ── Subscribe to active campaign row updates and deletes ───────────────────
  useEffect(() => {
    if (!campaign) return;

    const ch = supabase
      .channel(`campaign:${campaign.id}`)
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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "campaigns", filter: `id=eq.${campaign.id}` },
        () => {
          setAllMemberships((prev) => prev.filter((m) => m.campaign_id !== campaign.id));
          setSelectedId((prev) => (prev === campaign.id ? null : prev));
          localStorage.removeItem(STORAGE_KEY);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [campaign?.id]);

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        campaigns,
        memberships,
        membership,
        isDM: membership?.role === "dm",
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
