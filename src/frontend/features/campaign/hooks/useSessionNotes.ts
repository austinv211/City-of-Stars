import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { SessionNote, SessionNoteVisibility } from "../types/campaign.types";

export function useSessionNotes() {
  const { campaign } = useCampaign();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!campaign) return;
    const { data } = await supabase
      .from("session_notes")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("session_number", { ascending: false });
    setNotes((data as SessionNote[]) ?? []);
    setLoading(false);
  }, [campaign]);

  useEffect(() => {
    if (!campaign) {
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  async function upsertNote(
    sessionNumber: number,
    visibility: SessionNoteVisibility,
    content: string
  ) {
    if (!campaign) return;
    setSaving(true);
    const { data } = await supabase
      .from("session_notes")
      .upsert(
        { campaign_id: campaign.id, session_number: sessionNumber, visibility, content },
        { onConflict: "campaign_id,session_number,visibility" }
      )
      .select()
      .single();
    if (data) {
      const note = data as SessionNote;
      setNotes((prev) => {
        const idx = prev.findIndex(
          (n) => n.session_number === note.session_number && n.visibility === note.visibility
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = note;
          return next;
        }
        return [...prev, note].sort((a, b) => b.session_number - a.session_number);
      });
    }
    setSaving(false);
  }

  return { notes, loading, saving, upsertNote, reload: load };
}
