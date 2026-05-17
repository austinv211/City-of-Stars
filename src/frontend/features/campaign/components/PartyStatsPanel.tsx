import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Progress } from "@/core/components/ui/progress";
import { BarChart3 } from "lucide-react";

const PLACEHOLDER_METERS = [
  { label: "Party Morale", value: 72 },
  { label: "Infamy", value: 35 },
  { label: "Guild Standing", value: 58 },
];

export function PartyStatsPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Party Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground italic">
          Homebrew campaign meters — details coming soon
        </p>
        {PLACEHOLDER_METERS.map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="text-muted-foreground">{value}%</span>
            </div>
            <Progress value={value} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
