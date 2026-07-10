ALTER TABLE public.player_activity
  ADD COLUMN IF NOT EXISTS minigame_state jsonb NOT NULL DEFAULT '{"day":null,"itemsEarnedToday":{},"bestScores":{}}'::jsonb;
