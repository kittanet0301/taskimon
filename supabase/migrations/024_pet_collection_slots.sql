-- Migration 024: pet collection slots

-- Enforce one active pet per owner
CREATE UNIQUE INDEX IF NOT EXISTS pets_one_active_per_owner
  ON public.pets (owner_id) WHERE is_active = true;

-- Store max collection slot count per user
ALTER TABLE public.player_activity
  ADD COLUMN IF NOT EXISTS pet_slot_limit int NOT NULL DEFAULT 5;

-- ---------------------------------------------------------------------------
-- reset_all_game_data: include new missions + pet_slot_limit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_all_game_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_rec record;
  pet_id uuid;
  species text;
  gender text;
  pet_name text;
  daily_reset timestamptz;
  weekly_reset timestamptz;
  now_ts timestamptz := now();
  dino_species text[] := array[
    'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita'
  ];
BEGIN
  DELETE FROM public.chat_room_positions WHERE true;
  DELETE FROM public.chat_room_messages WHERE true;
  DELETE FROM public.chat_room_members WHERE true;

  DELETE FROM public.battle_sessions WHERE true;
  DELETE FROM public.battle_rooms WHERE true;
  DELETE FROM public.pets WHERE true;
  DELETE FROM public.inventory WHERE true;
  DELETE FROM public.mission_progress WHERE true;
  DELETE FROM public.player_activity WHERE true;

  daily_reset := date_trunc('day', now_ts) + interval '1 day';
  weekly_reset := date_trunc('week', now_ts) + interval '1 week';

  FOR profile_rec IN SELECT id FROM public.profiles LOOP
    species := dino_species[1 + floor(random() * array_length(dino_species, 1))::int];
    gender := CASE WHEN random() < 0.5 THEN 'male' ELSE 'female' END;
    pet_name := initcap(species);

    pet_id := gen_random_uuid();

    INSERT INTO public.pets (
      id, owner_id, name, species, element, gender, stage,
      hp, mood, dev_points, is_active, animation_state, feed_count, created_at
    ) VALUES (
      pet_id, profile_rec.id, pet_name, species, 'none', gender, 'egg',
      100, 80, 0, true, 'egg_idle', 0, now_ts
    );

    INSERT INTO public.inventory (user_id, item_type, quantity) VALUES
      (profile_rec.id, 'food_basic', 2),
      (profile_rec.id, 'water', 2),
      (profile_rec.id, 'medicine', 1);

    INSERT INTO public.mission_progress (user_id, mission_id, progress, completed, reset_at) VALUES
      (profile_rec.id, 'daily_type_500', 0, false, daily_reset),
      (profile_rec.id, 'daily_click_200', 0, false, daily_reset),
      (profile_rec.id, 'daily_feed_3', 0, false, daily_reset),
      (profile_rec.id, 'daily_play_1h', 0, false, daily_reset),
      (profile_rec.id, 'weekly_dev_100', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_daily_5', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_hatch_1', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_slots_5', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_egg_1', 0, false, weekly_reset);

    INSERT INTO public.player_activity (
      user_id, clicks, keystrokes, dev_points_this_hour, hour_started_at,
      total_play_seconds, daily_missions_completed_days, session_started_at, last_saved, save_version,
      pet_slot_limit
    ) VALUES (
      profile_rec.id, 0, 0, 0, now_ts, 0, 0, now_ts, now_ts, 4, 5
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_all_game_data() FROM public;
GRANT EXECUTE ON FUNCTION public.reset_all_game_data() TO authenticated;
