import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import type { Campaign, CampaignMember } from "@/features/campaign/types/campaign.types";

interface CampaignContextValue {
  campaign: Campaign | null;
  membership: CampaignMember | null;
  isDM: boolean;
  activeEncounterId: string | null;
  loading: boolean;
  refreshCampaign: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [membership, setMembership] = useState<CampaignMember | null>(null);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from("campaign_members")
        .select("*, campaigns(*)")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) console.error("[CampaignContext] load error:", error);

      if (data) {
        setMembership(data as CampaignMember);
        setCampaign(data.campaigns as Campaign);

        const { data: enc } = await supabase
          .from("encounters")
          .select("id")
          .eq("campaign_id", (data.campaigns as Campaign).id)
          .eq("status", "active")
          .maybeSingle();
        setActiveEncounterId(enc?.id ?? null);
      }
      setLoading(false);
    }

    load();
  }, [user]);

  const refreshCampaign = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("campaign_members")
      .select("*, campaigns(*)")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setCampaign(data.campaigns as Campaign);
  }, [user]);

  // Subscribe to encounter status changes
  useEffect(() => {
    if (!campaign) return;

    const channel = supabase
      .channel(`encounters:${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "encounters",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string } | undefined;
          if (!row) {
            setActiveEncounterId(null);
            return;
          }
          if (row.status === "active") {
            setActiveEncounterId(row.id);
          } else {
            setActiveEncounterId((prev) => (prev === row.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign]);

  // Subscribe to campaign row updates (e.g. current_session changes)
  useEffect(() => {
    if (!campaign) return;

    const channel = supabase
      .channel(`campaign:${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaign.id}`,
        },
        (payload) => {
          setCampaign((prev) =>
            prev ? { ...prev, ...(payload.new as Campaign) } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id]);

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        membership,
        isDM: membership?.role === "dm",
        activeEncounterId,
        loading,
        refreshCampaign,
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
