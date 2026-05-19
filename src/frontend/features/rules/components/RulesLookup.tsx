import { useEffect, useState } from "react";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import {
  searchRulesGlossary,
  getRulesGlossaryByCategory,
  searchLocalSpells,
  getLocalFeats,
  getClassFeatureDetails,
  type SrdRule,
  type SrdSpell,
  type SrdFeat,
  type SrdFeatureDetail,
} from "@/lib/dnd5eApi";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Condition: "bg-red-500/10 text-red-600 dark:text-red-400",
  Action: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Hazard: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  General: "bg-muted text-muted-foreground",
};

const SCHOOL_COLORS: Record<string, string> = {
  Evocation: "bg-red-500/10 text-red-600 dark:text-red-400",
  Abjuration: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Conjuration: "bg-green-500/10 text-green-600 dark:text-green-400",
  Divination: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Enchantment: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  Illusion: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Necromancy: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  Transmutation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Sub-panels ─────────────────────────────────────────────────────────────

function GlossaryPanel() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const debouncedQuery = useDebounce(query);
  const [results, setResults] = useState<SrdRule[]>([]);
  const [selected, setSelected] = useState<SrdRule | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fn = debouncedQuery.trim()
      ? () => searchRulesGlossary(debouncedQuery)
      : () => getRulesGlossaryByCategory(filter === "all" ? undefined : filter);
    fn().then(setResults).finally(() => setLoading(false));
  }, [debouncedQuery, filter]);

  const categories = ["all", "Condition", "Action", "Hazard", "General"];

  return (
    <div className="flex gap-3 h-[480px]">
      {/* Left — list */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Search rules…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setFilter(c); setQuery(""); }}
              className={cn(
                "text-[10px] rounded-full px-2 py-0.5 border transition-colors",
                filter === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5 border rounded-md p-1">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 italic">Loading…</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 italic">No results</p>
          ) : results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className={cn(
                "w-full text-left rounded px-2 py-1.5 text-xs transition-colors",
                selected?.id === r.id
                  ? "bg-primary/10 font-semibold"
                  : "hover:bg-muted/60"
              )}
            >
              <span className="block truncate">{r.title}</span>
              {r.category !== "General" && (
                <span className={cn("text-[9px] rounded px-1 inline-block mt-0.5", CATEGORY_COLORS[r.category] ?? CATEGORY_COLORS.General)}>
                  {r.category}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right — detail */}
      <div className="flex-1 overflow-y-auto rounded-md border p-4">
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.title}</h3>
              {selected.category !== "General" && (
                <Badge className={cn("text-[10px] shrink-0", CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS.General)}>
                  {selected.category}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selected.content}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center mt-16">
            Select a term to read its definition
          </p>
        )}
      </div>
    </div>
  );
}

function SpellsPanel() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const [results, setResults] = useState<SrdSpell[]>([]);
  const [selected, setSelected] = useState<SrdSpell | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    searchLocalSpells(debouncedQuery).then(setResults).finally(() => setLoading(false));
  }, [debouncedQuery]);

  const levelLabel = (l: number) => l === 0 ? "Cantrip" : `Level ${l}`;

  return (
    <div className="flex gap-3 h-[480px]">
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Search spells…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="h-8 text-sm"
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 border rounded-md p-1">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 italic">Loading…</p>
          ) : !debouncedQuery ? (
            <p className="text-xs text-muted-foreground p-2 italic">Type to search</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 italic">No spells found</p>
          ) : results.map((s) => (
            <button
              key={s.index}
              type="button"
              onClick={() => setSelected(s)}
              className={cn(
                "w-full text-left rounded px-2 py-1.5 text-xs transition-colors",
                selected?.index === s.index ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"
              )}
            >
              <span className="block truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {levelLabel(s.level)}{s.school ? ` · ${s.school}` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border p-4">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.name}</h3>
              {selected.school && (
                <Badge className={cn("text-[10px] shrink-0", SCHOOL_COLORS[selected.school] ?? "bg-muted text-muted-foreground")}>
                  {selected.school}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">
              {levelLabel(selected.level)}
              {selected.ritual && " · Ritual"}
              {selected.concentration && " · Concentration"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {selected.casting_time && <><span className="text-muted-foreground">Casting Time</span><span>{selected.casting_time}</span></>}
              {selected.range_text && <><span className="text-muted-foreground">Range</span><span>{selected.range_text}</span></>}
              {selected.duration && <><span className="text-muted-foreground">Duration</span><span>{selected.duration}</span></>}
              {selected.components && <><span className="text-muted-foreground">Components</span><span>{selected.components.join(", ")}</span></>}
              {selected.damage_type && <><span className="text-muted-foreground">Damage</span><span className="capitalize">{selected.damage_dice ? `${selected.damage_dice} ` : ""}{selected.damage_type}</span></>}
            </div>
            {selected.classes && selected.classes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.classes.map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            )}
            {selected.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t pt-3">
                {selected.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center mt-16">
            Search for a spell to read its details
          </p>
        )}
      </div>
    </div>
  );
}

function ClassFeaturesPanel() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]?.name ?? "Barbarian");
  const [features, setFeatures] = useState<SrdFeatureDetail[]>([]);
  const [selected, setSelected] = useState<SrdFeatureDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    getClassFeatureDetails(selectedClass).then(setFeatures).finally(() => setLoading(false));
  }, [selectedClass]);

  return (
    <div className="flex gap-3 h-[480px]">
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {CLASSES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <div className="flex-1 overflow-y-auto space-y-0.5 border rounded-md p-1">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 italic">Loading…</p>
          ) : features.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 italic">
              Run parse-srd.mjs to load features
            </p>
          ) : features.map((f) => (
            <button
              key={`${f.class_name}-${f.feature_name}-${f.level}`}
              type="button"
              onClick={() => setSelected(f)}
              className={cn(
                "w-full text-left rounded px-2 py-1.5 text-xs transition-colors",
                selected?.feature_name === f.feature_name ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"
              )}
            >
              <span className="block truncate">{f.feature_name}</span>
              {f.level && (
                <span className="text-[10px] text-muted-foreground">Level {f.level}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border p-4">
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{selected.feature_name}</h3>
              {selected.level && (
                <Badge variant="secondary" className="text-[10px]">Level {selected.level}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selected.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center mt-16">
            Select a feature to read its description
          </p>
        )}
      </div>
    </div>
  );
}

function FeatsPanel() {
  const [query, setQuery] = useState("");
  const [feats, setFeats] = useState<SrdFeat[]>([]);
  const [selected, setSelected] = useState<SrdFeat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocalFeats().then(setFeats).finally(() => setLoading(false));
  }, []);

  const filtered = feats.filter(
    (f) =>
      !query ||
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      (f.category ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const byCategory = filtered.reduce<Record<string, SrdFeat[]>>((acc, f) => {
    const cat = f.category ?? "General";
    (acc[cat] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="flex gap-3 h-[480px]">
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Filter feats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 border rounded-md p-1">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 italic">Loading…</p>
          ) : Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-2 pb-0.5">
                {cat}
              </p>
              {items.map((f) => (
                <button
                  key={f.index}
                  type="button"
                  onClick={() => setSelected(f)}
                  className={cn(
                    "w-full text-left rounded px-2 py-1.5 text-xs transition-colors",
                    selected?.index === f.index ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"
                  )}
                >
                  {f.name}
                  {f.prerequisite && (
                    <span className="block text-[10px] text-amber-600 dark:text-amber-400 truncate">
                      Req: {f.prerequisite}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border p-4">
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.name}</h3>
              {selected.category && (
                <Badge variant="outline" className="text-[10px] shrink-0">{selected.category}</Badge>
              )}
            </div>
            {selected.prerequisite && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Prerequisite: {selected.prerequisite}
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t pt-3">
              {selected.description}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center mt-16">
            Select a feat to read its description
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

interface RulesLookupProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "glossary" | "spells" | "features" | "feats";
}

export function RulesLookup({ open, onClose, initialTab = "glossary" }: RulesLookupProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Rules Reference
            <Badge variant="secondary" className="text-xs font-normal">2024 PHB SRD</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
            <TabsTrigger value="spells">Spells</TabsTrigger>
            <TabsTrigger value="features">Class Features</TabsTrigger>
            <TabsTrigger value="feats">Feats</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden pt-3">
            <TabsContent value="glossary" className="h-full mt-0">
              <GlossaryPanel />
            </TabsContent>
            <TabsContent value="spells" className="h-full mt-0">
              <SpellsPanel />
            </TabsContent>
            <TabsContent value="features" className="h-full mt-0">
              <ClassFeaturesPanel />
            </TabsContent>
            <TabsContent value="feats" className="h-full mt-0">
              <FeatsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
