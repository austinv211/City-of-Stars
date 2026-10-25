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
 * "More" sheet — so they have to come from one place or they will drift.
 */

export interface NavEntry {
  to: string;
  label: string;
  /** Shorter label for the bottom tab bar, where ~68px is the budget. */
  shortLabel?: string;
  /**
   * Label for the tablet rail (~80px), where one word fits but two long
   * ones wrap. Defaults to `label`.
   */
  railLabel?: string;
  /**
   * One line of context for the phone "More" sheet, where a destination is a
   * tile rather than a sidebar row and the label alone does not say enough.
   */
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Disabled, with a tooltip, until an encounter is live. */
  requiresEncounter?: boolean;
}

/** Player-facing destinations. Also the phone bottom tab bar. */
export const playerNav: NavEntry[] = [
  {
    to: "/characters",
    label: "Characters",
    shortLabel: "Chars",
    description: "Your sheets and progress",
    icon: Users,
  },
  {
    to: "/campaigns",
    label: "Campaigns",
    shortLabel: "Campaign",
    description: "Campaigns you belong to",
    icon: BookOpen,
  },
  {
    to: "/encounter",
    label: "Encounter",
    shortLabel: "Combat",
    description: "The live combat tracker",
    icon: Swords,
    requiresEncounter: true,
  },
];

export const dmNav: NavEntry[] = [
  {
    to: "/dm/campaigns",
    label: "Campaigns",
    description: "Create, run and switch campaigns",
    icon: BookMarked,
  },
  {
    to: "/dm/members",
    label: "Members",
    description: "Invite players and assign roles",
    icon: UserCog,
  },
  {
    to: "/dm/characters",
    label: "Characters",
    description: "Every party member's sheet",
    icon: Users,
  },
  {
    to: "/dm/sessions",
    label: "Session Manager",
    railLabel: "Sessions",
    description: "Party and DM notes per session",
    icon: ScrollText,
  },
  {
    to: "/dm/encounters",
    label: "Encounters",
    description: "Build, run and review fights",
    icon: ListChecks,
  },
  {
    to: "/dm/monsters",
    label: "Monster Library",
    railLabel: "Monsters",
    description: "Custom stat blocks",
    icon: Skull,
  },
];

export const adminNav: NavEntry[] = [
  {
    to: "/admin/whitelist",
    label: "Email Whitelist",
    railLabel: "Whitelist",
    description: "Who is allowed to sign up",
    icon: ShieldCheck,
  },
  {
    to: "/admin/campaigns",
    label: "All Campaigns",
    description: "Every campaign on the server",
    icon: Globe,
  },
];
