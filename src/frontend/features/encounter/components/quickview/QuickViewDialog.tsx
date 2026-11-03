import { ChevronLeft } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import { useQuickView } from "../../context/QuickViewContext";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";
import { AbilityQuickView } from "./AbilityQuickView";
import { CombatantQuickView } from "./CombatantQuickView";

/**
 * The encounter screen's one quick view: a dialog on wide screens, a bottom
 * sheet on a phone. An ability opened from a combatant's highlights keeps the
 * combatant one "Back" away.
 */
export function QuickViewDialog({ screen }: { screen: EncounterScreen }) {
  const quickView = useQuickView();
  if (!quickView) return null;
  const { subject, back, close } = quickView;
  const byId = (id: string | null) => screen.participants.find((p) => p.id === id) ?? null;

  let title = "";
  let body: React.ReactNode = null;
  if (subject?.kind === "ability") {
    title = subject.source.name;
    body = <AbilityQuickView source={subject.source} actor={byId(subject.actorId)} viewerIsDM={screen.isDM} />;
  } else if (subject?.kind === "combatant") {
    const p = byId(subject.id);
    title = p?.name ?? "";
    body = p && (
      <CombatantQuickView
        participant={p}
        participants={screen.participants}
        history={screen.history}
        effects={screen.effects.effects}
        viewerIsDM={screen.isDM}
      />
    );
  }

  return (
    <ResponsiveDialog
      open={!!body}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    >
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-1">
            {back && (
              <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" aria-label="Back" onClick={back}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>{body}</ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
