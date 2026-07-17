-- Durable pointer to the player's currently selected (main) pet.
-- Complements pets.is_active so selection survives refresh even if flag swaps race.
ALTER TABLE public.player_activity
  ADD COLUMN IF NOT EXISTS active_pet_id uuid;

-- Backfill from existing is_active pets
UPDATE public.player_activity pa
SET active_pet_id = p.id
FROM public.pets p
WHERE p.owner_id = pa.user_id
  AND p.is_active = true
  AND pa.active_pet_id IS NULL;
