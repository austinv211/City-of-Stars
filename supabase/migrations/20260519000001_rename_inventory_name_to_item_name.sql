-- Rename character_inventory.name → item_name to match frontend types and insert code
alter table public.character_inventory rename column name to item_name;
