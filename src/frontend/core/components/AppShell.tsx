import { NavLink, Outlet } from "react-router";
import {
  Swords,
  Users,
  BookOpen,
  LogOut,
  ScrollText,
  ListChecks,
  Skull,
  ShieldCheck,
  BookMarked,
  UserCog,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { DiceProvider } from "@/features/encounter/context/DiceContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { AnimatedStar, TitleBar } from "@/core/components/TitleBar";
import { cn } from "@/lib/utils";
import DiceRollOverlay from "./DiceRollOverlay";

const navItems = [
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: BookOpen },
  {
    to: "/encounter",
    label: "Encounter",
    icon: Swords,
    requiresEncounter: true,
  },
];

const dmNavItems = [
  { to: "/dm/campaigns", label: "Campaigns", icon: BookMarked },
  { to: "/dm/members", label: "Members", icon: UserCog },
  { to: "/dm/characters", label: "Characters", icon: Users },
  { to: "/dm/sessions", label: "Session Manager", icon: ScrollText },
  { to: "/dm/encounters", label: "Encounters", icon: ListChecks },
  { to: "/dm/monsters", label: "Monster Library", icon: Skull },
];

const adminNavItems = [
  { to: "/admin/whitelist", label: "Email Whitelist", icon: ShieldCheck },
  { to: "/admin/campaigns", label: "All Campaigns", icon: Globe },
];

function NavItem({
  to,
  label,
  icon: Icon,
  disabled,
  disabledTip,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  disabledTip?: string;
  badge?: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex cursor-not-allowed items-center gap-3 px-3 py-2 text-sm text-muted-foreground opacity-40 select-none">
            <Icon className="h-4 w-4" />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{disabledTip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150",
          isActive
            ? "bg-primary/10 font-medium text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {badge}
    </NavLink>
  );
}

function CampaignSelector() {
  const { campaign, campaigns, campaignEncounters, switchCampaign } =
    useCampaign();

  if (campaigns.length <= 1) {
    return (
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-tight leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          City of Stars
        </p>
        {campaign && (
          <p className="truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
            {campaign.name}
          </p>
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="min-w-0 text-left group">
          <p className="text-sm font-bold tracking-tight leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            City of Stars
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="truncate text-[11px] text-muted-foreground leading-tight group-hover:text-foreground transition-colors">
              {campaign?.name ?? "Select campaign"}
            </p>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-52 p-1">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Switch Campaign
        </p>
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => switchCampaign(c.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 text-sm transition-colors flex items-center gap-2",
              c.id === campaign?.id
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground",
            )}
          >
            <span className="flex-1 truncate">{c.name}</span>
            {campaignEncounters[c.id] && (
              <Swords className="h-3 w-3 shrink-0 text-success" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function AppShell() {
  const { activeEncounterId, isDM } = useCampaign();
  const { user, isAdmin, isPlayerRole, signOut } = useAuth();


  return (
    <DiceProvider>
      <TooltipProvider>
        <div className="flex h-screen flex-col bg-background overflow-hidden">
          <TitleBar />

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="flex w-56 shrink-0 flex-col bg-card border-r border-border/40">
              {/* Brand + Campaign Selector */}
              <div className="h-12 flex items-center gap-2.5 px-4 border-b border-border/40">
                <div className="flex h-8 w-8 items-center justify-center shrink-0 bg-primary/15">
                  <AnimatedStar size={20} />
                </div>
                <CampaignSelector />
              </div>

              {/* Nav */}
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pt-3">
                {isPlayerRole && navItems.map(({ to, label, icon, requiresEncounter }) => {
                  const disabled = requiresEncounter && !activeEncounterId;
                  return (
                    <NavItem
                      key={to}
                      to={to}
                      label={label}
                      icon={icon}
                      disabled={disabled}
                      disabledTip="No active encounter"
                      badge={
                        requiresEncounter && activeEncounterId ? (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
                        ) : undefined
                      }
                    />
                  );
                })}

                {(isDM || isAdmin) && (
                  <>
                    <div className="px-3 pt-4 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        DM Tools
                      </p>
                    </div>
                    {dmNavItems.map(({ to, label, icon }) => (
                      <NavItem key={to} to={to} label={label} icon={icon} />
                    ))}
                  </>
                )}

                {isAdmin && (
                  <>
                    <div className="px-3 pt-4 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                        Admin
                      </p>
                    </div>
                    {adminNavItems.map(({ to, label, icon }) => (
                      <NavItem key={to} to={to} label={label} icon={icon} />
                    ))}
                  </>
                )}
              </nav>

              <Separator />

              {/* Footer */}
              <div className="p-3 space-y-1">
                <div className="px-2 py-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {user?.email}
                  </p>
                  {isDM && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Dungeon Master
                    </Badge>
                  )}
                  {isPlayerRole && !isDM && !isAdmin && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      Player
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex flex-1 flex-col overflow-auto min-w-0">
              <Outlet />
            </main>
          </div>
        </div>

        <DiceRollOverlay />
      </TooltipProvider>
    </DiceProvider>
  );
}
