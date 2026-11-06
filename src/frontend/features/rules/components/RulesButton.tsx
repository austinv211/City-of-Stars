import { Scale } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useRulesLookup } from "../context/RulesLookupContext";

/** Opens the Rules Reference: the phone app bar's button. */
export function RulesButton() {
  const { openRules } = useRulesLookup();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Rules Reference"
      title="Rules Reference"
      className="shrink-0 text-muted-foreground hover:text-foreground"
      onClick={openRules}
    >
      <Scale className="h-5 w-5" />
    </Button>
  );
}
