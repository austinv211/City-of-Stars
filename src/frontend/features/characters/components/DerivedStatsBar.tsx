import { Separator } from "@/core/components/ui/separator";
import type { DerivedStats } from "../types/character.types";

interface Stat {
  label: string;
  value: string | number;
}

interface Props {
  derived: DerivedStats;
}

export function DerivedStatsBar({ derived }: Props) {
  const stats: Stat[] = [
    { label: "Prof. Bonus", value: `+${derived.proficiencyBonus}` },
    { label: "Initiative", value: derived.initiative >= 0 ? `+${derived.initiative}` : derived.initiative },
    { label: "Passive Perc.", value: derived.passivePerception },
  ];

  return (
    <div className="flex items-center justify-around rounded-lg border bg-muted/40 px-4 py-3">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
          {i < stats.length - 1 && <Separator orientation="vertical" className="h-8" />}
        </div>
      ))}
    </div>
  );
}
