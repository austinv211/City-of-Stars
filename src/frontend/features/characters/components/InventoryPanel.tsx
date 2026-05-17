import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import { Badge } from "@/core/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Plus, Trash2, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CharacterInventoryItem } from "../types/character.types";

interface Props {
  characterId: string;
  items: CharacterInventoryItem[];
  onRefresh: () => void;
}

interface NewItem {
  item_name: string;
  quantity: number;
  description: string;
  weight: string;
}

const BLANK: NewItem = { item_name: "", quantity: 1, description: "", weight: "" };

export function InventoryPanel({ characterId, items, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewItem>(BLANK);
  const [saving, setSaving] = useState(false);

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
                  item.is_equipped
                    ? "bg-primary border-primary"
                    : "border-muted-foreground"
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
              <Badge variant="outline" className="text-xs shrink-0">
                ×{item.quantity}
              </Badge>
              {item.weight != null && (
                <span className="text-xs text-muted-foreground shrink-0">{item.weight} lb</span>
              )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item Name</Label>
              <Input
                value={form.item_name}
                onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                placeholder="e.g. Longsword"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={saving || !form.item_name.trim()}>
              {saving ? "Adding…" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
