import { NavLink, Outlet } from "react-router";
import { Swords, Users, BookOpen, LogOut, Shield } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { cn } from "@/lib/utils";
import DiceRollOverlay from "./DiceRollOverlay";

const navItems = [
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/campaign",   label: "Campaign",   icon: BookOpen },
  { to: "/encounter",  label: "Encounter",  icon: Swords, requiresEncounter: true },
];

export default function AppShell() {
  const { activeEncounterId, isDM, campaign } = useCampaign();
  const { user, signOut } = useAuth();

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className="flex w-56 shrink-0 flex-col"
          style={{
            background: "hsl(var(--card))",
            borderRight: "1px solid hsl(var(--border))",
            boxShadow: "var(--shadow-panel)",
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-4 py-5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                background: "hsl(var(--primary) / 0.15)",
                boxShadow: "inset 0 1px 0 hsl(var(--primary) / 0.2)",
              }}
            >
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">City of Stars</span>
          </div>

          {campaign && (
            <p className="truncate px-4 pb-3 text-xs text-muted-foreground">{campaign.name}</p>
          )}

          <Separator />

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
            {navItems.map(({ to, label, icon: Icon, requiresEncounter }) => {
              const disabled = requiresEncounter && !activeEncounterId;

              if (disabled) {
                return (
                  <Tooltip key={to}>
                    <TooltipTrigger asChild>
                      <span className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 text-sm text-muted-foreground opacity-40 select-none">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">No active encounter</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { boxShadow: "inset 0 1px 0 hsl(var(--primary) / 0.15)" }
                      : {}
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {requiresEncounter && activeEncounterId && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          <Separator />

          {/* Footer */}
          <div className="p-3 space-y-1">
            <div className="px-2 py-1">
              <p className="truncate text-xs font-medium text-foreground">{user?.email}</p>
              {isDM && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Dungeon Master
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
        <main className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </div>

      <DiceRollOverlay />
    </TooltipProvider>
  );
}
