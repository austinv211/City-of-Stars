-- ─────────────────────────────────────────────────────────────────────────────
-- dice_rolls.context: what a roll was for, so the log can say what happened.
--
-- Until now a roll carried only a free-text label ("Scimitar Attack"), so the
-- log could not say who was targeted or which ability was used, and anything
-- not in the row (advantage, the dropped die, announced actions) was lost on
-- reload. The jsonb holds the structured part:
--
--   kind        attack | damage | save | check | initiative | death_save |
--               action | other
--   actorId     the participant who rolled
--   targetId    who it was aimed at, if anyone
--   source      { type, name }: the weapon, spell or monster action used
--   advantage, disadvantage, discardedRoll, rolls, actionText, actionCategory
--
-- It references ids and names, never stats: secrets like a monster's AC are
-- looked up at render time by those allowed to see them. Nullable, since
-- older rows and rolls made outside an encounter have none.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.dice_rolls
  ADD COLUMN IF NOT EXISTS context jsonb;
