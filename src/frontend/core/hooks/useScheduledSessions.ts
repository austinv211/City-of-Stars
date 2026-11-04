import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ScheduledSession {
  id: string;
  campaign_id: string;
  starts_at: string;
  location: string | null;
  note: string | null;
  created_at: string;
}

/** Sessions stay "next" until four hours after they start, i.e. while being played. */
const STILL_RUNNING_MS = 4 * 3_600_000;

async function fetchUpcoming(campaignId: string): Promise<ScheduledSession[]> {
  const since = new Date(Date.now() - STILL_RUNNING_MS).toISOString();
  const { data, error } = await supabase
    .from("scheduled_sessions")
    .select("*")
    .eq("campaign_id", campaignId)
    .gte("starts_at", since)
    .order("starts_at");
  if (error) console.error("[schedule] load failed:", error.message);
  return (data ?? []) as ScheduledSession[];
}

/** The campaign's upcoming sessions, soonest first, kept live. */
export function useScheduledSessions(campaignId: string | undefined) {
  const [state, setState] = useState<{ campaignId?: string; sessions: ScheduledSession[] }>({ sessions: [] });

  const reload = useCallback(async () => {
    if (!campaignId) return;
    setState({ campaignId, sessions: await fetchUpcoming(campaignId) });
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    const load = () =>
      void fetchUpcoming(campaignId).then((sessions) => {
        if (!cancelled) setState({ campaignId, sessions });
      });
    load();
    const channel = supabase
      .channel(`scheduled-sessions:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_sessions", filter: `campaign_id=eq.${campaignId}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const sessions = state.campaignId === campaignId ? state.sessions : [];
  return { sessions, next: sessions.at(0) ?? null, loading: !!campaignId && state.campaignId !== campaignId, reload };
}
