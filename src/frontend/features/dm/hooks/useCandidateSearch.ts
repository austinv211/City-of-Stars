import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MemberRole } from "./useCampaignRoster";

export interface Candidate {
  /** Null until they sign up. */
  user_id: string | null;
  display_name: string;
  email: string;
  member_roles: MemberRole[];
  invited_roles: MemberRole[];
}

const DEBOUNCE_MS = 200;

/**
 * Whitelisted people matching `query` by name or email, for the DM's
 * "Add member" search. Debounced; an empty query lists everyone.
 */
export function useCandidateSearch(campaignId: string | undefined, query: string, enabled: boolean) {
  const [results, setResults] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // The request whose results are showing; anything else means one is in flight.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const key = [campaignId, query, version].join("|");

  useEffect(() => {
    if (!campaignId || !enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void supabase
        .rpc("search_campaign_candidates", { cid: campaignId, q: query })
        .then(({ data, error: rpcError }) => {
          if (cancelled) return;
          setError(rpcError ? rpcError.message : null);
          setResults((data ?? []) as Candidate[]);
          setSettledKey(key);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, query, enabled, key]);

  return { results, searching: enabled && settledKey !== key, error, refresh };
}
