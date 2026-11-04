import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "dm" | "player";
export const ALL_ROLES: AppRole[] = ["admin", "dm", "player"];
export const ROLE_LABELS: Record<AppRole, string> = { admin: "Admin", dm: "DM", player: "Player" };

export interface WhitelistEntry {
  id: string;
  email: string;
  app_role: AppRole;
  created_at: string;
}

export interface Signup {
  email: string;
  display_name: string | null;
  signed_up_at: string;
}

interface Whitelist {
  entries: WhitelistEntry[];
  signups: Map<string, Signup>;
}

async function fetchWhitelist(): Promise<Whitelist> {
  const [entries, signups] = await Promise.all([
    supabase
      .from("allowed_emails")
      .select("*")
      .order("email", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.rpc("get_whitelist_signups"),
  ]);
  const rows = (signups.data ?? []) as Signup[];
  return {
    entries: (entries.data ?? []) as WhitelistEntry[],
    signups: new Map(rows.map((r) => [r.email, r])),
  };
}

/**
 * The whitelist grouped one row per email (an email can hold several roles),
 * plus whether each person has signed up and under what name.
 */
export function useWhitelist() {
  const [data, setData] = useState<Whitelist | null>(null);

  const reload = useCallback(async () => {
    setData(await fetchWhitelist());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchWhitelist().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => data?.entries ?? [], [data]);

  const grouped = useMemo(() => {
    const byEmail = new Map<string, WhitelistEntry[]>();
    for (const entry of entries) {
      byEmail.set(entry.email, [...(byEmail.get(entry.email) ?? []), entry]);
    }
    return [...byEmail.entries()];
  }, [entries]);

  const rolesFor = useCallback(
    (email: string) => entries.filter((e) => e.email === email).map((e) => e.app_role),
    [entries],
  );

  return {
    loading: data === null,
    entries,
    grouped,
    signups: data?.signups ?? new Map<string, Signup>(),
    rolesFor,
    reload,
  };
}

export async function addWhitelistRole(email: string, role: AppRole, invitedBy: string | undefined) {
  const { error } = await supabase
    .from("allowed_emails")
    .insert({ email, app_role: role, invited_by: invitedBy ?? null });
  return error ? { error: error.message } : {};
}

export async function removeWhitelistRole(entryId: string) {
  await supabase.from("allowed_emails").delete().eq("id", entryId);
}
