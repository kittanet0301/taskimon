-- Include battle rooms/sessions in system-wide game reset

create or replace function public.reset_all_game_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_rec record;
  pet_id uuid;
  species text;
  element text;
  gender text;
  pet_name text;
  daily_reset timestamptz;
  weekly_reset timestamptz;
  now_ts timestamptz := now();
begin
  delete from battle_sessions where true;
  delete from battle_rooms where true;
  delete from battles where true;
  delete from pets where true;
  delete from inventory where true;
  delete from mission_progress where true;
  delete from player_activity where true;

  daily_reset := date_trunc('day', now_ts) + interval '1 day';
  weekly_reset := date_trunc('week', now_ts) + interval '1 week';

  for profile_rec in select id from profiles loop
    if random() < 0.1 then
      species := 'mythic';
    else
      species := (array['mamono', 'avian', 'aquatic'])[1 + floor(random() * 3)::int];
    end if;

    case species
      when 'mamono' then element := (array['earth', 'neutral'])[1 + floor(random() * 2)::int];
      when 'avian' then element := (array['wind', 'neutral'])[1 + floor(random() * 2)::int];
      when 'aquatic' then element := (array['water', 'neutral'])[1 + floor(random() * 2)::int];
      when 'mythic' then element := (array['fire', 'wind'])[1 + floor(random() * 2)::int];
    end case;

    gender := case when random() < 0.5 then 'male' else 'female' end;

    pet_name := case species
      when 'mamono' then 'โมโน'
      when 'avian' then 'ปีกน้อย'
      when 'aquatic' then 'บับเบิ้ล'
      when 'mythic' then 'มิธิ'
    end;

    pet_id := gen_random_uuid();

    insert into pets (
      id, owner_id, name, species, element, gender, stage,
      hp, mood, dev_points, is_active, animation_state, feed_count, created_at
    ) values (
      pet_id, profile_rec.id, pet_name, species, element, gender, 'egg',
      100, 80, 0, true, 'egg_idle', 0, now_ts
    );

    insert into inventory (user_id, item_type, quantity) values
      (profile_rec.id, 'food_basic', 2),
      (profile_rec.id, 'water', 2),
      (profile_rec.id, 'medicine', 1);

    insert into mission_progress (user_id, mission_id, progress, completed, reset_at) values
      (profile_rec.id, 'daily_type_500', 0, false, daily_reset),
      (profile_rec.id, 'daily_click_200', 0, false, daily_reset),
      (profile_rec.id, 'daily_feed_3', 0, false, daily_reset),
      (profile_rec.id, 'daily_play_1h', 0, false, daily_reset),
      (profile_rec.id, 'weekly_dev_100', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_daily_5', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_hatch_1', 0, false, weekly_reset);

    insert into player_activity (
      user_id, clicks, keystrokes, dev_points_this_hour, hour_started_at,
      total_play_seconds, daily_missions_completed_days, session_started_at, last_saved, save_version
    ) values (
      profile_rec.id, 0, 0, 0, now_ts, 0, 0, now_ts, now_ts, 1
    );
  end loop;
end;
$$;

revoke all on function public.reset_all_game_data() from public;
grant execute on function public.reset_all_game_data() to authenticated;
