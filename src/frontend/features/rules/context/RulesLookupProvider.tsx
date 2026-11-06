import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RulesLookup } from "../components/RulesLookup";
import { RulesLookupContext } from "./RulesLookupContext";

/** Ctrl+K (Cmd+K on a Mac): the usual "search" shortcut in desktop apps. */
const isShortcut = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";

/**
 * One Rules Reference for the whole app, opened from the app bar, the rail,
 * the sidebar or Ctrl+K on any screen, rather than each screen keeping its
 * own copy and its own button.
 */
export function RulesLookupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isShortcut(e)) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const api = useMemo(
    () => ({
      openRules: () => {
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <RulesLookupContext.Provider value={api}>
      {children}
      <RulesLookup
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </RulesLookupContext.Provider>
  );
}
