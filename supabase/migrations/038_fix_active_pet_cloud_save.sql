-- Fix cloud save: minigame_state was never applied remotely (player_activity upsert 400).
ALTER TABLE public.player_activity
  ADD COLUMN IF NOT EXISTS minigame_state jsonb NOT NULL DEFAULT '{"day":null,"itemsEarnedToday":{},"bestScores":{}}'::jsonb;

-- Pets UPDATE needs WITH CHECK so PostgREST upserts can rewrite is_active.
DROP POLICY IF EXISTS "pets update own" ON public.pets;
CREATE POLICY "pets update own"
  ON public.pets FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

-- Atomic switch of the main/playing pet (avoids pets_one_active_per_owner races).
CREATE OR REPLACE FUNCTION public.set_active_pet(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = uid
  ) THEN
    RAISE EXCEPTION 'Pet not found';
  END IF;

  UPDATE public.pets
  SET is_active = false
  WHERE owner_id = uid AND is_active = true AND id <> p_pet_id;

  UPDATE public.pets
  SET is_active = true
  WHERE id = p_pet_id AND owner_id = uid;

  UPDATE public.player_activity
  SET active_pet_id = p_pet_id,
      last_saved = now()
  WHERE user_id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_pet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_pet(uuid) TO authenticated;
