import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";
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

  if (loading || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Change Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Field</TableHead>
              <TableHead>Previous</TableHead>
              <TableHead>New</TableHead>
              <TableHead className="w-44 text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {e.field_name}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {e.old_value ? (
                    <span className="line-through">{e.old_value}</span>
                  ) : (
                    <span className="italic opacity-50">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {e.new_value ?? <span className="italic text-muted-foreground opacity-50">cleared</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                  {new Date(e.changed_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
