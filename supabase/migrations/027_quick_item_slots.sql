ALTER TABLE public.player_activity
  ADD COLUMN IF NOT EXISTS quick_item_slots jsonb NOT NULL DEFAULT '[null,null,null,null,null,null]'::jsonb;
