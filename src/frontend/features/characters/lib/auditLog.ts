import { supabase } from "@/lib/supabase";

export async function logAudit(
  characterId: string,
  changedBy: string,
  fieldName: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined
): Promise<void> {
  if (oldValue === newValue) return;
  await supabase.from("character_audit_log").insert({
    character_id: characterId,
    changed_by: changedBy,
    field_name: fieldName,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  });
}
