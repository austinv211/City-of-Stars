import { Progress } from "@/core/components/ui/progress";
import { Button } from "@/core/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { WizardState, WizardAction } from "../../types/character.types";

const STEP_LABELS = [
  "Identity",
  "Background",
  "Ability Scores",
  "Proficiencies",
  "Portrait",
  "Review",
];

interface WizardShellProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  children: React.ReactNode;
  onBack?: () => void;
}

export function WizardShell({ state, dispatch, children, onBack }: WizardShellProps) {
  const step = state.step;
  const progress = ((step - 1) / (STEP_LABELS.length - 1)) * 100;

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (step > 1) {
      dispatch({ type: "SET_STEP", step: (step - 1) as WizardState["step"] });
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-3">
            {step > 1 && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Step {step} of {STEP_LABELS.length}
              </p>
              <h2 className="text-lg font-semibold">{STEP_LABELS[step - 1]}</h2>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
