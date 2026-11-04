import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type MemberRole = "player" | "dm";

export interface RosterMember {
  /** The campaign_members row: one per (user, role). */
  id: string;
  user_id: string;
  display_name: string;
  /** Only filled in for the campaign's DM and app admins. */
  email: string | null;
  role: MemberRole;
  joined_at: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

interface Roster {
  members: RosterMember[];
  invites: PendingInvite[];
}

async function fetchRoster(campaignId: string): Promise<Roster> {
  const [roster, pending] = await Promise.all([
    supabase.rpc("get_campaign_roster", { cid: campaignId }),
    supabase
      .from("campaign_invites")
      .select("id, email, role, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at"),
  ]);
  if (roster.error) console.error("[roster] load failed:", roster.error.message);
  return {
    members: (roster.data ?? []) as RosterMember[],
    invites: pending.data ?? [],
  };
}

/**
 * The campaign's members and the invites waiting for someone to sign up.
 * Names come from profiles, so a player never needs another player's email.
 */
export function useCampaignRoster(campaignId: string | undefined) {
  const [roster, setRoster] = useState<Roster & { campaignId?: string }>({ members: [], invites: [] });

  const reload = useCallback(async () => {
    if (!campaignId) return;
    const next = await fetchRoster(campaignId);
    setRoster({ ...next, campaignId });
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    void fetchRoster(campaignId).then((next) => {
      if (!cancelled) setRoster({ ...next, campaignId });
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Loading until this campaign's roster has arrived (not a previous one's).
  const loading = !!campaignId && roster.campaignId !== campaignId;
  return { members: roster.members, invites: roster.invites, loading, reload };
}

/** Each user once, for screens that label things by person rather than role. */
export function uniqueMembers(members: RosterMember[]): RosterMember[] {
  const byUser = new Map<string, RosterMember>();
  for (const m of members) {
    if (!byUser.has(m.user_id)) byUser.set(m.user_id, m);
  }
  return [...byUser.values()];
}

interface Result {
  error?: string;
}

const failed = (error: { message: string } | null): Result =>
  error ? { error: error.message } : {};

export async function addMember(campaignId: string, userId: string, role: MemberRole): Promise<Result> {
  const { error } = await supabase
    .from("campaign_members")
    .insert({ campaign_id: campaignId, user_id: userId, role });
  return failed(error);
}

export async function inviteEmail(campaignId: string, email: string, role: MemberRole): Promise<Result> {
  const { error } = await supabase
    .from("campaign_invites")
    .insert({ campaign_id: campaignId, email: email.trim().toLowerCase(), role });
  return failed(error);
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  const { error } = await supabase.from("campaign_invites").delete().eq("id", inviteId);
  return failed(error);
}

export async function removeMember(memberId: string): Promise<Result> {
  const { error } = await supabase.from("campaign_members").delete().eq("id", memberId);
  return failed(error);
}

export async function changeMemberRole(memberId: string, role: MemberRole): Promise<Result> {
  const { error } = await supabase.from("campaign_members").update({ role }).eq("id", memberId);
  return failed(error);
}

/**
 * Whitelist an email and invite it to the campaign in one go, so it joins
 * the moment they sign up. Admins only; RLS on allowed_emails enforces it.
 */
export async function whitelistAndInvite(campaignId: string, email: string, role: MemberRole): Promise<Result> {
  const { error } = await supabase
    .from("allowed_emails")
    .insert({ email: email.trim().toLowerCase(), app_role: role });
  if (error) return failed(error);
  return inviteEmail(campaignId, email, role);
}
