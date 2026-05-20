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
  Condition: "bg-[hsl(var(--ctp-red)/0.15)] text-[hsl(var(--ctp-red))] border-[hsl(var(--ctp-red)/0.3)]",
  Action:    "bg-[hsl(var(--ctp-blue)/0.15)] text-[hsl(var(--ctp-blue))] border-[hsl(var(--ctp-blue)/0.3)]",
  Hazard:    "bg-[hsl(var(--ctp-peach)/0.15)] text-[hsl(var(--ctp-peach))] border-[hsl(var(--ctp-peach)/0.3)]",
  General:   "bg-[hsl(var(--ctp-overlay0)/0.2)] text-[hsl(var(--ctp-subtext0))] border-border",
};

const SCHOOL_COLORS: Record<string, string> = {
  Evocation:     "bg-[hsl(var(--ctp-red)/0.15)] text-[hsl(var(--ctp-red))] border-[hsl(var(--ctp-red)/0.3)]",
  Abjuration:    "bg-[hsl(var(--ctp-blue)/0.15)] text-[hsl(var(--ctp-blue))] border-[hsl(var(--ctp-blue)/0.3)]",
  Conjuration:   "bg-[hsl(var(--ctp-green)/0.15)] text-[hsl(var(--ctp-green))] border-[hsl(var(--ctp-green)/0.3)]",
  Divination:    "bg-[hsl(var(--ctp-lavender)/0.15)] text-[hsl(var(--ctp-lavender))] border-[hsl(var(--ctp-lavender)/0.3)]",
  Enchantment:   "bg-[hsl(var(--ctp-pink)/0.15)] text-[hsl(var(--ctp-pink))] border-[hsl(var(--ctp-pink)/0.3)]",
  Illusion:      "bg-[hsl(var(--ctp-mauve)/0.15)] text-[hsl(var(--ctp-mauve))] border-[hsl(var(--ctp-mauve)/0.3)]",
  Necromancy:    "bg-[hsl(var(--ctp-overlay1)/0.25)] text-[hsl(var(--ctp-subtext1))] border-[hsl(var(--ctp-overlay0)/0.4)]",
  Transmutation: "bg-[hsl(var(--ctp-yellow)/0.15)] text-[hsl(var(--ctp-yellow))] border-[hsl(var(--ctp-yellow)/0.3)]",
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Renders plain text where _keyword_ spans are highlighted in the primary color.
function RulesText({ text }: { text: string }) {
  const parts = text.split(/(_[^_\n]+_)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("_") && part.endsWith("_") && part.length > 2 ? (
          <span
            key={i}
            className="text-[hsl(var(--primary))] font-semibold not-italic"
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

// Shared panel wrappers
const listPanelCls =
  "flex-1 overflow-y-auto space-y-0.5 rounded-lg border border-border/60 bg-card/50 p-1.5";
const detailPanelCls =
  "flex-1 overflow-y-auto rounded-lg border border-border bg-background p-5";
const searchInputCls =
  "h-9 text-sm bg-card border-border focus-visible:ring-1 focus-visible:ring-[hsl(var(--ctp-lavender))]";

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
    <div className="flex gap-4 h-[520px]">
      {/* Left — list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Search rules…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={searchInputCls}
        />
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setFilter(c); setQuery(""); }}
              className={cn(
                "text-[10px] rounded-full px-2.5 py-0.5 border transition-colors",
                filter === c
                  ? "border-[hsl(var(--ctp-lavender))] text-[hsl(var(--ctp-lavender))]"
                  : "border-border text-muted-foreground hover:border-[hsl(var(--primary)/0.5)] hover:text-foreground"
              )}
              style={
                filter === c
                  ? { background: "linear-gradient(90deg, hsl(var(--ctp-mauve) / 0.25), hsl(var(--ctp-lavender) / 0.14))" }
                  : undefined
              }
            >
              {c}
            </button>
          ))}
        </div>
        <div className={listPanelCls}>
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
                "w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors",
                selected?.id === r.id
                  ? "font-semibold text-[hsl(var(--ctp-lavender))]"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
              style={
                selected?.id === r.id
                  ? { background: "linear-gradient(90deg, hsl(var(--ctp-mauve) / 0.25), hsl(var(--ctp-lavender) / 0.12))" }
                  : undefined
              }
            >
              <span className="block truncate">{r.title}</span>
              {r.category !== "General" && (
                <span className={cn("text-[9px] rounded px-1.5 inline-block mt-0.5 border", CATEGORY_COLORS[r.category] ?? CATEGORY_COLORS.General)}>
                  {r.category}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right — detail */}
      <div className={detailPanelCls}>
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.title}</h3>
              {selected.category !== "General" && (
                <Badge className={cn("text-[10px] shrink-0 border", CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS.General)}>
                  {selected.category}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              <RulesText text={selected.content} />
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
    <div className="flex gap-4 h-[520px]">
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Search spells…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className={searchInputCls}
        />
        <div className={listPanelCls}>
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
                "w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors",
                selected?.index === s.index
                  ? "font-semibold text-[hsl(var(--ctp-lavender))]"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
              style={
                selected?.index === s.index
                  ? { background: "linear-gradient(90deg, hsl(var(--ctp-mauve) / 0.25), hsl(var(--ctp-lavender) / 0.12))" }
                  : undefined
              }
            >
              <span className="block truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {levelLabel(s.level)}{s.school ? ` · ${s.school}` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={detailPanelCls}>
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.name}</h3>
              {selected.school && (
                <Badge className={cn("text-[10px] shrink-0 border", SCHOOL_COLORS[selected.school] ?? "bg-muted/50 text-muted-foreground border-border")}>
                  {selected.school}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">
              {levelLabel(selected.level)}
              {selected.ritual && " · Ritual"}
              {selected.concentration && " · Concentration"}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-card/60 rounded-lg border border-border p-3">
              {selected.casting_time && <><span className="text-muted-foreground">Casting Time</span><span>{selected.casting_time}</span></>}
              {selected.range_text   && <><span className="text-muted-foreground">Range</span><span>{selected.range_text}</span></>}
              {selected.duration     && <><span className="text-muted-foreground">Duration</span><span>{selected.duration}</span></>}
              {selected.components   && <><span className="text-muted-foreground">Components</span><span>{selected.components.join(", ")}</span></>}
              {selected.damage_type  && <><span className="text-muted-foreground">Damage</span><span className="capitalize">{selected.damage_dice ? `${selected.damage_dice} ` : ""}{selected.damage_type}</span></>}
            </div>
            {selected.classes && selected.classes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.classes.map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            )}
            {selected.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border pt-3">
                <RulesText text={selected.description} />
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
    <div className="flex gap-4 h-[520px]">
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <select
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {CLASSES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <div className={listPanelCls}>
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
                "w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors",
                selected?.feature_name === f.feature_name
                  ? "font-semibold text-[hsl(var(--ctp-lavender))]"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
              style={
                selected?.feature_name === f.feature_name
                  ? { background: "linear-gradient(90deg, hsl(var(--ctp-mauve) / 0.25), hsl(var(--ctp-lavender) / 0.12))" }
                  : undefined
              }
            >
              <span className="block truncate">{f.feature_name}</span>
              {f.level && (
                <span className="text-[10px] text-muted-foreground">Level {f.level}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={detailPanelCls}>
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{selected.feature_name}</h3>
              {selected.level && (
                <Badge variant="secondary" className="text-[10px]">Level {selected.level}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              <RulesText text={selected.description} />
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
    <div className="flex gap-4 h-[520px]">
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Filter feats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={searchInputCls}
        />
        <div className={listPanelCls}>
          {loading ? (
            <p className="text-xs text-muted-foreground p-2 italic">Loading…</p>
          ) : Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1">
                {cat}
              </p>
              {items.map((f) => (
                <button
                  key={f.index}
                  type="button"
                  onClick={() => setSelected(f)}
                  className={cn(
                    "w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    selected?.index === f.index
                      ? "font-semibold text-[hsl(var(--ctp-lavender))]"
                      : "hover:bg-muted/60 text-foreground/80"
                  )}
                  style={
                    selected?.index === f.index
                      ? { background: "linear-gradient(90deg, hsl(var(--ctp-mauve) / 0.25), hsl(var(--ctp-lavender) / 0.12))" }
                      : undefined
                  }
                >
                  {f.name}
                  {f.prerequisite && (
                    <span className="block text-[10px] text-[hsl(var(--ctp-peach))] truncate">
                      Req: {f.prerequisite}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={detailPanelCls}>
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{selected.name}</h3>
              {selected.category && (
                <Badge variant="outline" className="text-[10px] shrink-0">{selected.category}</Badge>
              )}
            </div>
            {selected.prerequisite && (
              <p className="text-xs text-[hsl(var(--ctp-peach))] font-medium">
                Prerequisite: {selected.prerequisite}
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border pt-3">
              <RulesText text={selected.description} />
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-background border-border">
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
