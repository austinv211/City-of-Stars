import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface AuditEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

interface Props {
  characterId: string;
}

export function CharacterAuditLog({ characterId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("character_audit_log")
      .select("*")
      .eq("character_id", characterId)
      .order("changed_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setEntries((data as AuditEntry[]) ?? []);
        setLoading(false);
      });
  }, [characterId]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          DM — Change Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="text-xs border-b pb-1.5 last:border-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{e.field_name}</Badge>
              <span className="text-muted-foreground">
                {new Date(e.changed_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
              {e.old_value ? (
                <span className="line-through opacity-60 truncate max-w-[120px]">{e.old_value}</span>
              ) : (
                <span className="italic opacity-40">empty</span>
              )}
              <span>→</span>
              {e.new_value ? (
                <span className="text-foreground truncate max-w-[120px]">{e.new_value}</span>
              ) : (
                <span className="italic opacity-40">cleared</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
