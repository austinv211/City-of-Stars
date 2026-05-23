import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { Badge } from "@/core/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { CLASSES } from "../../data/dnd2024.constants";
import { finalAbilityScores, deriveStats, passiveScore } from "../../types/character.types";
import type { WizardState } from "../../types/character.types";

const ABILITY_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITIES = [
  "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
] as const;

function mod(score: number) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

interface Props {
  state: WizardState;
  onCommit: () => void;
  loading: boolean;
  error: string | null;
}

export function Step6_Review({ state, onCommit, loading, error }: Props) {
  const final = finalAbilityScores(
    state.baseAbilityScores,
    state.backgroundBonusPrimary,
    state.backgroundBonusSecondary
  );
  const derived = deriveStats(final, 1);
  const passivePerception = passiveScore(
    final,
    derived.proficiencyBonus,
    "Perception",
    state.skillProficiencies.map((skill) => ({ skill, is_expertise: false }))
  );
  const classData = CLASSES.find((c) => c.name === state.characterClass);

  const initials = state.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-border">
          {state.portraitPreviewUrl ? (
            <AvatarImage src={state.portraitPreviewUrl} alt={state.name} className="object-cover" />
          ) : null}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{state.name}</h2>
          <p className="text-muted-foreground">
            {state.species} {state.characterClass}
            {state.subclass ? ` · ${state.subclass}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {state.background}
            {state.alignment ? ` · ${state.alignment}` : ""}
          </p>
        </div>
      </div>

      <Separator />

      {/* Ability scores */}
      <div>
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
          Ability Scores
        </h3>
        <div className="grid grid-cols-6 gap-2 text-center">
          {ABILITIES.map((ability, i) => (
            <div key={ability} className="rounded-lg border bg-card p-2">
              <div className="text-xs text-muted-foreground font-semibold">
                {ABILITY_LABELS[i]}
              </div>
              <div className="text-xl font-bold mt-1">{final[ability]}</div>
              <div className="text-xs text-muted-foreground">{mod(final[ability])}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Method: {state.abilityScoreMethod.replace("_", " ")} · includes +2/{" "}
          +1 from {state.background} background
        </p>
      </div>

      <Separator />

      {/* Derived stats */}
      <div>
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
          Derived Stats
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Prof. Bonus</div>
            <div className="text-lg font-bold">+{derived.proficiencyBonus}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Initiative</div>
            <div className="text-lg font-bold">{mod(final.dexterity)}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Passive Perc.</div>
            <div className="text-lg font-bold">{passivePerception}</div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Proficiencies */}
      <div>
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
          Proficiencies
        </h3>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {state.skillProficiencies.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Saving Throws</p>
            <div className="flex flex-wrap gap-1.5">
              {(classData?.savingThrows ?? []).map((ability) => (
                <Badge key={ability} variant="outline" className="capitalize">
                  {ability}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {state.backstory && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
              Backstory
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {state.backstory}
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button className="w-full" size="lg" onClick={onCommit} disabled={loading}>
        {loading ? "Creating Character…" : "Create Character"}
      </Button>
    </div>
  );
}
