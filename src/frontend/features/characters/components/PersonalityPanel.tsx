import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/core/components/ui/button";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { logAudit } from "../lib/auditLog";
import type { Character } from "../types/character.types";

interface Props {
  character: Character;
  isOwn: boolean;
  onRefresh: () => void;
}

type PersonalityField = "personality_traits" | "ideals" | "bonds" | "flaws" | "backstory" | "features_notes";

const FIELDS: { key: PersonalityField; label: string; placeholder: string }[] = [
  { key: "personality_traits", label: "Personality Traits",          placeholder: "How does your character behave and speak?" },
  { key: "ideals",             label: "Ideals",                      placeholder: "What principles does your character believe in?" },
  { key: "bonds",              label: "Bonds",                       placeholder: "What connections does your character have?" },
  { key: "flaws",              label: "Flaws",                       placeholder: "What weaknesses or vices does your character have?" },
  { key: "backstory",          label: "Backstory",                   placeholder: "Write your character's origin story…" },
  { key: "features_notes",     label: "Features, Traits & Abilities", placeholder: "Class features, racial traits, feats, special abilities…" },
];

function fromCharacter(character: Character): Record<PersonalityField, string> {
  return Object.fromEntries(
    FIELDS.map(({ key }) => [key, (character[key as keyof Character] as string | null) ?? ""])
  ) as Record<PersonalityField, string>;
}

export function PersonalityPanel({ character, isOwn, onRefresh }: Props) {
  const { user } = useAuth();

  const [values, setValues] = useState(() => fromCharacter(character));
  const [editing, setEditing] = useState<PersonalityField | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setValues(fromCharacter(character));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, character.personality_traits, character.ideals, character.bonds, character.flaws, character.backstory, character.features_notes]);

  async function save(key: PersonalityField) {
    setSaving(true);
    const newVal = values[key] || null;
    const oldVal = (character[key as keyof Character] as string | null) ?? null;
    await supabase.from("characters").update({ [key]: newVal }).eq("id", character.id);
    if (user) await logAudit(character.id, user.id, key, oldVal, newVal);
    setSaving(false);
    setEditing(null);
    onRefresh();
  }

  function cancel(key: PersonalityField) {
    setValues((prev) => ({ ...prev, [key]: (character[key as keyof Character] as string | null) ?? "" }));
    setEditing(null);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Personality &amp; Roleplay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {isOwn && editing !== key && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setEditing(key)}
                >
                  Edit
                </Button>
              )}
            </div>

            {editing === key ? (
              <div className="space-y-2">
                <RichTextEditor
                  content={values[key]}
                  onChange={(md) => setValues((prev) => ({ ...prev, [key]: md }))}
                  placeholder={placeholder}
                  minHeight="7rem"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(key)} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancel(key)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : values[key] ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{values[key]}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isOwn ? `Click Edit to add ${label.toLowerCase()}.` : `No ${label.toLowerCase()} recorded.`}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
