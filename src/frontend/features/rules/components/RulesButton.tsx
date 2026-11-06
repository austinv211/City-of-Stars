import { BookOpen } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useRulesLookup } from "../context/RulesLookupContext";

/**
 * Opens the Rules Reference: the phone app bar's button. A primary book in a
 * tinted square, like the campaign icon beside it, so it reads as a button
 * rather than a stray glyph.
 */
export function RulesButton() {
  const { openRules } = useRulesLookup();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Rules Reference"
      title="Rules Reference"
      className="shrink-0 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
      onClick={openRules}
    >
      <BookOpen className="h-5 w-5" />
    </Button>
  );
}
