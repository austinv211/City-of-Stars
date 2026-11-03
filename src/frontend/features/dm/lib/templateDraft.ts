import type { NpcDraft } from "@/features/dm/hooks/useEncounterManager";

/** A template open in the editor. */
export interface TemplateDraft {
  /** null for a new template. */
  id: string | null;
  name: string;
  npcs: NpcDraft[];
}

export const BLANK_NPC: NpcDraft = { name: "", hp: 10, ac: 12, initiative: 0 };
