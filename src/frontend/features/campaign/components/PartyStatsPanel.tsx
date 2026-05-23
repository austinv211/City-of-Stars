import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import { BarChart3, Swords, Heart, HeartPulse, Star, Skull, Target } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { usePartyStats } from "../hooks/usePartyStats";
import { cn } from "@/lib/utils";

const MAX_VOID_ALIGNMENT = 10;

function VoidGauge({
  value,
  max,
  canEdit,
  onSet,
}: {
  value: number;
  max: number;
  canEdit: boolean;
  onSet: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: max }, (_, i) => {
        const pip = i + 1;
        const filled = value >= pip;
        return (
          <button
            key={pip}
            type="button"
            onClick={() => canEdit && onSet(filled ? pip - 1 : pip)}
            title={canEdit ? `Set to ${filled ? pip - 1 : pip}` : undefined}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-colors",
              filled ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/30 hover:border-primary",
              canEdit ? "cursor-pointer" : "cursor-default",
            )}
          />
        );
      })}
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

export function PartyStatsPanel() {
  const { isDM } = useCampaign();
  const { partyStats, loading, updateVoidAlignment } = usePartyStats();

  const voidAlignment = partyStats?.void_alignment ?? 0;
  const stats = (partyStats?.stats ?? {}) as Record<string, number>;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          Loading party stats…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Party Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Void Alignment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Void Alignment:{" "}
              <span className="text-primary">{voidAlignment}</span> / {MAX_VOID_ALIGNMENT}
            </p>
            {isDM && (
              <span className="text-xs text-muted-foreground italic">DM can edit</span>
            )}
          </div>
          <VoidGauge
            value={voidAlignment}
            max={MAX_VOID_ALIGNMENT}
            canEdit={isDM}
            onSet={updateVoidAlignment}
          />
          <p className="text-xs text-muted-foreground">
            A measure of the Void's influence over the campaign world. Higher values mean greater Void corruption.
          </p>
        </div>

        <Separator />

        {/* Encounter Statistics */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Campaign Combat Log
          </p>
          <div className="space-y-2">
            <StatRow
              icon={<Swords className="h-3.5 w-3.5" />}
              label="Total Damage Dealt"
              value={stats.total_damage_dealt ?? 0}
            />
            <StatRow
              icon={<HeartPulse className="h-3.5 w-3.5" />}
              label="Total HP Healed"
              value={stats.total_hp_healed ?? 0}
            />
            <StatRow
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Total HP Lost"
              value={stats.total_hp_lost ?? 0}
            />
            <StatRow
              icon={<Star className="h-3.5 w-3.5" />}
              label="Critical Hits"
              value={stats.total_crits ?? 0}
            />
            <StatRow
              icon={<Target className="h-3.5 w-3.5" />}
              label="Fumbles"
              value={stats.total_fumbles ?? 0}
            />
            <StatRow
              icon={<Skull className="h-3.5 w-3.5" />}
              label="Monsters Defeated"
              value={stats.monsters_defeated ?? 0}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
