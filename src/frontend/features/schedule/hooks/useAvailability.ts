import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Availability, AvailabilityMark } from "../lib/calendar";

export interface Member {
  user_id: string;
  display_name: string;
}

interface State {
  campaignId?: string;
  marks: AvailabilityMark[];
  members: Member[];
}

async function fetchState(campaignId: string, fromDay: string): Promise<State> {
  const [marks, roster] = await Promise.all([
    supabase
      .from("session_availability")
      .select("user_id, day, status")
      .eq("campaign_id", campaignId)
      .gte("day", fromDay),
    supabase.rpc("get_campaign_roster", { cid: campaignId }),
  ]);
  const byUser = new Map<string, Member>();
  for (const m of (roster.data ?? []) as Member[]) byUser.set(m.user_id, m);
  return {
    campaignId,
    marks: marks.data ?? [],
    members: [...byUser.values()],
  };
}

/** Every member's marks from `fromDay` on, and the members' names, kept live. */
export function useAvailability(campaignId: string | undefined, fromDay: string) {
  const [state, setState] = useState<State>({ marks: [], members: [] });

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    const load = () =>
      void fetchState(campaignId, fromDay).then((next) => {
        if (!cancelled) setState(next);
      });
    load();
    const channel = supabase
      .channel(`availability:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_availability", filter: `campaign_id=eq.${campaignId}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [campaignId, fromDay]);

  /** Optimistic: the tap shows at once, and realtime confirms it. */
  const setMark = useCallback(
    async (userId: string, day: string, status: Availability | null) => {
      if (!campaignId) return;
      setState((s) => ({
        ...s,
        marks: [
          ...s.marks.filter((m) => !(m.user_id === userId && m.day === day)),
          ...(status ? [{ user_id: userId, day, status }] : []),
        ],
      }));
      const { error } = status
        ? await supabase
            .from("session_availability")
            .upsert({ campaign_id: campaignId, user_id: userId, day, status, updated_at: new Date().toISOString() })
        : await supabase.from("session_availability").delete().match({ campaign_id: campaignId, user_id: userId, day });
      if (error) console.error("[schedule] saving availability failed:", error.message);
    },
    [campaignId],
  );

  const current = state.campaignId === campaignId;
  return {
    marks: current ? state.marks : [],
    members: current ? state.members : [],
    loading: !!campaignId && !current,
    setMark,
  };
}

export interface SessionDraft {
  starts_at: string;
  location: string | null;
  note: string | null;
}

export async function saveSession(campaignId: string, draft: SessionDraft, id?: string) {
  const { error } = id
    ? await supabase.from("scheduled_sessions").update(draft).eq("id", id)
    : await supabase.from("scheduled_sessions").insert({ ...draft, campaign_id: campaignId });
  return error ? { error: error.message } : {};
}

export async function cancelSession(id: string) {
  const { error } = await supabase.from("scheduled_sessions").delete().eq("id", id);
  return error ? { error: error.message } : {};
}
