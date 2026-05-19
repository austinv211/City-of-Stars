import { useEffect, useRef, useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  level: number;
}

export function LevelBadge({ level }: Props) {
  const prevLevel = useRef(level);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (prevLevel.current !== level && prevLevel.current !== 0) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 3000);
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
  }, [level]);

  return (
    <Badge
      className={cn(
        "text-sm px-2 py-0.5",
        pulsing && "animate-level-up-pulse"
      )}
    >
      Level {level}
    </Badge>
  );
}
