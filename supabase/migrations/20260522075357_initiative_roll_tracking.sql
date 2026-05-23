
-- Track whether each participant has rolled initiative yet
ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS has_rolled_initiative boolean NOT NULL DEFAULT false;

-- RPC: reorder all participants in an encounter by initiative_score DESC, dex_score DESC
CREATE OR REPLACE FUNCTION public.reorder_initiative(p_encounter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY initiative_score DESC, dex_score DESC NULLS LAST, random()
           ) AS new_order
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
  )
  UPDATE public.encounter_participants ep
  SET initiative_order = r.new_order
  FROM ranked r
  WHERE ep.id = r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_initiative(uuid) TO authenticated;
