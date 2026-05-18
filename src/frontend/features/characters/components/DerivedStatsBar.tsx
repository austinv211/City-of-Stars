import { Separator } from "@/core/components/ui/separator";
import type { DerivedStats } from "../types/character.types";

interface Props {
  derived: DerivedStats;
  ac?: number | null;
  speed?: number | null;
  passiveInvestigation?: number;
  passiveInsight?: number;
}

export function DerivedStatsBar({ derived, ac, speed, passiveInvestigation, passiveInsight }: Props) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  const stats = [
    { label: "Prof. Bonus",  value: sign(derived.proficiencyBonus) },
    { label: "Initiative",   value: sign(derived.initiative) },
    ...(ac != null        ? [{ label: "AC",              value: String(ac) }] : []),
    ...(speed != null     ? [{ label: "Speed",           value: `${speed} ft` }] : []),
    { label: "Passive Perc.", value: String(derived.passivePerception) },
    ...(passiveInvestigation != null ? [{ label: "Pass. Invest.", value: String(passiveInvestigation) }] : []),
    ...(passiveInsight != null       ? [{ label: "Pass. Insight",  value: String(passiveInsight) }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-around gap-y-2 rounded-lg border bg-muted/40 px-4 py-3">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-4">
          <div className="text-center min-w-[60px]">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
          {i < stats.length - 1 && <Separator orientation="vertical" className="h-8 hidden sm:block" />}
        </div>
      ))}
    </div>
  );
}
