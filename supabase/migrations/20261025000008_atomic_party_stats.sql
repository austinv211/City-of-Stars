-- ─────────────────────────────────────────────────────────────────────────────
-- increment_party_stat: atomic, member-callable campaign tallies.
--
-- partyStatsUtils.incrementPartyStat did a read-modify-write of the whole
-- party_stats.stats jsonb from the browser, on every crit, fumble and damage
-- roll. Two defects:
--
--   1. Lost updates. Two rolls at once both read N and both wrote N+1.
--   2. Worse, and not in the plan: party_stats is DM-write only under RLS, so
--      every PLAYER's increment was silently refused. The tallies only ever
--      counted the DM's own rolls -- a player's crit never made it in.
--
-- Fixed with one SECURITY DEFINER function doing an atomic upsert under the
-- row lock that INSERT ... ON CONFLICT DO UPDATE takes. Any campaign member
-- may call it, since players' rolls are exactly what it tallies. Because that
-- widens who can write, it is narrow in what they can write: the keys are an
-- allowlist of the tallies the app keeps, and the amount is bounded.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_party_stat(
  p_campaign_id uuid,
  p_key text,
  p_amount int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_campaign_member(p_campaign_id) THEN
    RAISE EXCEPTION 'increment_party_stat: caller is not a member of this campaign'
      USING ERRCODE = '42501';
  END IF;

  IF p_key NOT IN (
    'total_crits', 'total_fumbles', 'total_damage_dealt',
    'total_hp_lost', 'total_hp_healed', 'monsters_defeated'
  ) THEN
    RAISE EXCEPTION 'increment_party_stat: % is not a campaign tally', p_key
      USING ERRCODE = '22023';
  END IF;

  -- A single roll's damage is well under this; anything larger is not a roll.
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'increment_party_stat: amount % is out of range', p_amount
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.party_stats (campaign_id, stats)
  VALUES (p_campaign_id, jsonb_build_object(p_key, p_amount))
  ON CONFLICT (campaign_id) DO UPDATE
    SET stats = jsonb_set(
          public.party_stats.stats,
          ARRAY[p_key],
          to_jsonb(COALESCE((public.party_stats.stats ->> p_key)::int, 0) + p_amount)
        ),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_party_stat(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_party_stat(uuid, text, int) TO authenticated;
