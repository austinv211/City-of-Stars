import {
  Swords,
  Users,
  BookOpen,
  ScrollText,
  ListChecks,
  Skull,
  ShieldCheck,
  BookMarked,
  UserCog,
  Globe,
} from "lucide-react";

/**
 * Navigation, as data.
 *
 * These three arrays previously lived inline in AppShell, which was fine while
 * there was exactly one way to render them. There are now four — the desktop
 * sidebar, the tablet icon rail, the phone bottom tab bar, and the phone
 * overflow sheet — so they have to come from one place or they will drift.
 */

export interface NavEntry {
  to: string;
  label: string;
  /** Shorter label for the bottom tab bar, where ~68px is the budget. */
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Disabled, with a tooltip, until an encounter is live. */
  requiresEncounter?: boolean;
}

/** Player-facing destinations. Also the phone bottom tab bar. */
export const playerNav: NavEntry[] = [
  { to: "/characters", label: "Characters", shortLabel: "Chars", icon: Users },
  { to: "/campaigns", label: "Campaigns", shortLabel: "Campaign", icon: BookOpen },
  {
    to: "/encounter",
    label: "Encounter",
    shortLabel: "Combat",
    icon: Swords,
    requiresEncounter: true,
  },
];

export const dmNav: NavEntry[] = [
  { to: "/dm/campaigns", label: "Campaigns", icon: BookMarked },
  { to: "/dm/members", label: "Members", icon: UserCog },
  { to: "/dm/characters", label: "Characters", icon: Users },
  { to: "/dm/sessions", label: "Session Manager", icon: ScrollText },
  { to: "/dm/encounters", label: "Encounters", icon: ListChecks },
  { to: "/dm/monsters", label: "Monster Library", icon: Skull },
];

export const adminNav: NavEntry[] = [
  { to: "/admin/whitelist", label: "Email Whitelist", icon: ShieldCheck },
  { to: "/admin/campaigns", label: "All Campaigns", icon: Globe },
];
