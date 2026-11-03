-- ─────────────────────────────────────────────────────────────────────────────
-- encounter_participants.nickname: what the table calls this creature.
--
-- `name` stays the stat block's name ("Goblin"), which the DM still needs; a
-- nickname ("Grizzle the One-Eared") is what players see. Set per monster in
-- a template or live during a fight. Players can't change it: it isn't in
-- pin_player_participant_columns' player-writable list.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS nickname text
    CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 1 AND 60);
