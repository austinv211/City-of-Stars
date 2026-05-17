import { Button } from "@/core/components/ui/button";
import { Dice6 } from "lucide-react";
import { useDiceRolls } from "../hooks/useDiceRolls";
import type { RollOptions } from "../hooks/useDiceRolls";

interface Props {
  label: string;
  options: Omit<RollOptions, never>;
  variant?: "default" | "outline" | "secondary";
  disabled?: boolean;
}

export function DiceRollButton({ label, options, variant = "outline", disabled }: Props) {
  const { roll } = useDiceRolls();

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={disabled}
      onClick={() => roll(options)}
      className="gap-1.5"
    >
      <Dice6 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
