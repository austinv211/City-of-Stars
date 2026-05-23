import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import { Badge } from "@/core/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Plus, Trash2, Package, Search, Loader2, Gem } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { searchEquipment, getEquipment } from "@/lib/dnd5eApi";
import type { DndEquipmentSummary } from "@/lib/dnd5eApi";
import type { CharacterInventoryItem } from "../types/character.types";
import { carryingCapacity } from "../data/rules2024";

const ATTUNEMENT_LIMIT = 3;

interface Props {
  characterId: string;
  items: CharacterInventoryItem[];
  onRefresh: () => void;
  strengthScore?: number;
  size?: string;
}

interface NewItem {
  item_name: string;
  quantity: number;
  description: string;
  weight: string;
}

interface CampaignItem {
  id: string;
  item_name: string;
  description: string | null;
  weight: number | null;
}

const BLANK: NewItem = { item_name: "", quantity: 1, description: "", weight: "" };

export function InventoryPanel({ characterId, items, onRefresh, strengthScore = 10, size = "Medium" }: Props) {
  const { campaign } = useCampaign();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewItem>(BLANK);
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [dndResults, setDndResults] = useState<DndEquipmentSummary[]>([]);
  const [campaignResults, setCampaignResults] = useState<CampaignItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDndResults([]);
      setCampaignResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) {
      setDndResults([]);
      setCampaignResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(searchQuery), 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  async function runSearch(q: string) {
    setSearching(true);
    const [dnd, camp] = await Promise.all([
      searchEquipment(q),
      campaign
        ? supabase
            .from("campaign_items")
            .select("id, item_name, description, weight")
            .eq("campaign_id", campaign.id)
            .ilike("item_name", `%${q}%`)
            .limit(10)
            .then(({ data }) => (data as CampaignItem[]) ?? [])
        : Promise.resolve([]),
    ]);
    setDndResults(dnd.slice(0, 10));
    setCampaignResults(camp);
    setSearching(false);
  }

  async function selectDndItem(summary: DndEquipmentSummary) {
    const detail = await getEquipment(summary.index);
    setForm({
      item_name: summary.name,
      quantity: 1,
      description: detail?.desc?.join(" ") ?? "",
      weight: detail?.weight != null ? String(detail.weight) : "",
    });
    setSearchQuery("");
    setDndResults([]);
    setCampaignResults([]);
  }

  function selectCampaignItem(item: CampaignItem) {
    setForm({
      item_name: item.item_name,
      quantity: 1,
      description: item.description ?? "",
      weight: item.weight != null ? String(item.weight) : "",
    });
    setSearchQuery("");
    setDndResults([]);
    setCampaignResults([]);
  }

  async function addItem() {
    if (!form.item_name.trim()) return;
    setSaving(true);
    await supabase.from("character_inventory").insert({
      character_id: characterId,
      item_name: form.item_name.trim(),
      quantity: form.quantity,
      description: form.description || null,
      weight: form.weight ? Number(form.weight) : null,
      is_equipped: false,
    });
    // Save to campaign shared catalogue so others can find it
    if (campaign) {
      try {
        await supabase
          .from("campaign_items")
          .upsert(
            {
              campaign_id: campaign.id,
              item_name: form.item_name.trim(),
              description: form.description || null,
              weight: form.weight ? Number(form.weight) : null,
            },
            { onConflict: "campaign_id,item_name", ignoreDuplicates: true }
          );
      } catch {
        // best-effort catalogue save
      }
    }
    setSaving(false);
    setOpen(false);
    setForm(BLANK);
    onRefresh();
  }

  async function removeItem(id: string) {
    await supabase.from("character_inventory").delete().eq("id", id);
    onRefresh();
  }

  async function toggleEquipped(item: CharacterInventoryItem) {
    await supabase
      .from("character_inventory")
      .update({ is_equipped: !item.is_equipped })
      .eq("id", item.id);
    onRefresh();
  }

  async function toggleAttuned(item: CharacterInventoryItem) {
    if (!item.is_attuned && attunedCount >= ATTUNEMENT_LIMIT) return;
    await supabase
      .from("character_inventory")
      .update({ is_attuned: !item.is_attuned })
      .eq("id", item.id);
    onRefresh();
  }

  const hasResults = dndResults.length > 0 || campaignResults.length > 0;
  const attunedCount = items.filter((i) => i.is_attuned).length;
  const totalWeight = items.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
  const capacity = carryingCapacity(strengthScore, size);
  const overEncumbered = totalWeight > capacity;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Inventory
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Gem className="h-3 w-3 text-secondary" />
          Attunement <span className={`font-semibold ${attunedCount >= ATTUNEMENT_LIMIT ? "text-secondary" : "text-foreground"}`}>{attunedCount}/{ATTUNEMENT_LIMIT}</span>
        </span>
        <span className="text-muted-foreground">
          Carry{" "}
          <span className={`font-semibold ${overEncumbered ? "text-destructive" : "text-foreground"}`}>
            {totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(1)}
          </span>
          /{capacity} lb
          {overEncumbered && <span className="text-destructive"> · over capacity (Speed ≤ 5 ft)</span>}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Package className="h-8 w-8 opacity-40" />
          <p className="text-xs">No items yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50"
            >
              <button
                onClick={() => toggleEquipped(item)}
                className={`h-2 w-2 rounded-full shrink-0 border ${
                  item.is_equipped ? "bg-primary border-primary" : "border-muted-foreground"
                }`}
                title={item.is_equipped ? "Equipped" : "Unequipped"}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{item.item_name}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {item.description}
                  </span>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">×{item.quantity}</Badge>
              {item.weight != null && (
                <span className="text-xs text-muted-foreground shrink-0">{item.weight} lb</span>
              )}
              <button
                type="button"
                onClick={() => toggleAttuned(item)}
                disabled={!item.is_attuned && attunedCount >= ATTUNEMENT_LIMIT}
                title={
                  item.is_attuned
                    ? "Attuned — click to unattune"
                    : attunedCount >= ATTUNEMENT_LIMIT
                      ? "Attunement slots full (3)"
                      : "Attune this item"
                }
                className={`shrink-0 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  item.is_attuned ? "text-secondary hover:text-secondary/70" : "text-muted-foreground/40 hover:text-secondary"
                }`}
              >
                <Gem className="h-3.5 w-3.5" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[88vh]">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
          <Tabs defaultValue="search">
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">
                <Search className="h-3 w-3 mr-1.5" />
                Search
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-3 mt-3">
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search D&D items or campaign items…"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {hasResults && (
                <div className="rounded-md bg-secondary divide-y divide-border/30 max-h-52 overflow-y-auto">
                  {campaignResults.length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        Campaign Items
                      </p>
                      {campaignResults.map((item) => (
                        <button
                          key={item.id}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                          onClick={() => selectCampaignItem(item)}
                        >
                          <p className="text-sm font-medium">{item.item_name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                  {dndResults.length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        D&D 5e (2024)
                      </p>
                      {dndResults.map((item) => (
                        <button
                          key={item.index}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                          onClick={() => selectDndItem(item)}
                        >
                          <p className="text-sm font-medium">{item.name}</p>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {form.item_name && (
                <div className="rounded-md p-3 space-y-3 bg-secondary">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selected: {form.item_name}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Weight (lb)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label>Item Name</Label>
                <Input
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. Tactical Vest"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Weight (lb)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addItem} disabled={saving || !form.item_name.trim()}>
              {saving ? "Adding…" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
