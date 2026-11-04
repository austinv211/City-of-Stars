import type { Candidate } from "../hooks/useCandidateSearch";
import type { MemberRole } from "../hooks/useCampaignRoster";

/** What the "Add member" search offers for one person, given the chosen role. */
export type CandidateAction =
  | { kind: "add"; userId: string }
  | { kind: "invite" }
  | { kind: "member" }
  | { kind: "invited" };

export function candidateAction(c: Candidate, role: MemberRole): CandidateAction {
  if (c.member_roles.includes(role)) return { kind: "member" };
  if (c.invited_roles.includes(role)) return { kind: "invited" };
  return c.user_id ? { kind: "add", userId: c.user_id } : { kind: "invite" };
}

const ROLE_NOUN: Record<MemberRole, string> = { player: "a player", dm: "a DM" };

export function candidateStatus(c: Candidate, role: MemberRole): string {
  switch (candidateAction(c, role).kind) {
    case "member":
      return `Already ${ROLE_NOUN[role]} here`;
    case "invited":
      return "Invited, joins when they sign up";
    case "invite":
      return "Hasn't signed up yet";
    case "add":
      return c.member_roles.length > 0 ? `Also ${ROLE_NOUN[c.member_roles[0]]} here` : "";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const looksLikeEmail = (s: string) => EMAIL_RE.test(s.trim());
