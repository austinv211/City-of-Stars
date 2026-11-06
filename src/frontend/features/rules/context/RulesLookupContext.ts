import { createContext, useContext } from "react";

export interface RulesLookupApi {
  openRules: () => void;
}

/** Provided by RulesLookupProvider, which renders the one Rules Reference. */
export const RulesLookupContext = createContext<RulesLookupApi | null>(null);

/** Opens the app's Rules Reference from anywhere inside the app shell. */
export function useRulesLookup(): RulesLookupApi {
  const api = useContext(RulesLookupContext);
  if (!api) throw new Error("useRulesLookup must be used inside RulesLookupProvider");
  return api;
}
