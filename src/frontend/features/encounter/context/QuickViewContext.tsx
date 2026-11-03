import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { RollSource } from "../types/encounter.types";

/** What the quick view can show: an ability, or a combatant's highlights. */
export type QuickViewSubject =
  | { kind: "ability"; source: RollSource; actorId: string | null }
  | { kind: "combatant"; id: string };

interface QuickViewApi {
  /** What's showing; null when closed. */
  subject: QuickViewSubject | null;
  /** Show a subject. From inside an open view, Back returns to the last one. */
  open: (subject: QuickViewSubject) => void;
  back: (() => void) | null;
  close: () => void;
}

const QuickViewContext = createContext<QuickViewApi | null>(null);

/**
 * One quick view for the encounter screen, opened from wherever a name or an
 * ability appears (the log, attack cards, tracker cards), so the same tap does
 * the same thing everywhere. Rendered once, by QuickViewDialog.
 */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<QuickViewSubject[]>([]);
  const api = useMemo<QuickViewApi>(
    () => ({
      subject: stack.at(-1) ?? null,
      open: (subject) => {
        setStack((prev) => [...prev, subject]);
      },
      back:
        stack.length > 1
          ? () => {
              setStack((prev) => prev.slice(0, -1));
            }
          : null,
      close: () => {
        setStack([]);
      },
    }),
    [stack],
  );
  return <QuickViewContext.Provider value={api}>{children}</QuickViewContext.Provider>;
}

/**
 * The quick view, or null outside the encounter screen: callers then show
 * plain text instead of a link, so their components work anywhere.
 */
export function useQuickView(): QuickViewApi | null {
  return useContext(QuickViewContext);
}
