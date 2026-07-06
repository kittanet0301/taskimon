-- Migration 022: DB audit — drop legacy battle challenge, dino-era pets, chat cleanup, indexes

-- ---------------------------------------------------------------------------
-- 1. Drop deprecated friend-challenge RPCs (replaced by battle rooms)
-- ---------------------------------------------------------------------------

drop function if exists public.battle_create_challenge(uuid);
drop function if exists public.battle_respond(uuid, boolean);

-- ---------------------------------------------------------------------------
-- 2. Normalize pets for dino character era
-- ---------------------------------------------------------------------------

update public.pets set species = 'mono' where species = 'mamono';
update public.pets set species = 'doux' where species = 'avian';
update public.pets set species = 'kira' where species = 'aquatic';
update public.pets set species = 'loki' where species = 'mythic';
update public.pets set species = 'cole'
where species not in (
  'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita'
);

update public.pets set element = 'none';

alter table public.pets alter column element set default 'none';

alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets add constraint pets_species_check check (
  species in ('cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita')
);

alter table public.pets drop constraint if exists pets_element_check;
alter table public.pets add constraint pets_element_check check (element = 'none');

alter table public.pets drop constraint if exists pets_gender_check;
alter table public.pets add constraint pets_gender_check check (gender in ('male', 'female'));

alter table public.pets drop constraint if exists pets_stage_check;
alter table public.pets add constraint pets_stage_check check (stage in ('egg', 'baby', 'adult'));

-- ---------------------------------------------------------------------------
-- 3. Chat rooms: delete rows on leave (not status=left), purge stale rows
-- ---------------------------------------------------------------------------

delete from public.chat_room_members where status = 'left';

create or replace function public.chat_room_leave(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.chat_room_positions
  where room_id = p_room_id and user_id = uid;

  delete from public.chat_room_members
  where room_id = p_room_id and user_id = uid;
end;
$$;

revoke all on function public.chat_room_leave(uuid) from public;
grant execute on function public.chat_room_leave(uuid) to authenticated;

create or replace function public.chat_room_leave_all()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.chat_room_positions where user_id = uid;
  delete from public.chat_room_members where user_id = uid;
end;
$$;

revoke all on function public.chat_room_leave_all() from public;
grant execute on function public.chat_room_leave_all() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. System reset: dino bootstrap + chat room wipe
-- ---------------------------------------------------------------------------

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
  gender text;
  pet_name text;
  daily_reset timestamptz;
  weekly_reset timestamptz;
  now_ts timestamptz := now();
  dino_species text[] := array[
    'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita'
  ];
begin
  delete from public.chat_room_positions where true;
  delete from public.chat_room_messages where true;
  delete from public.chat_room_members where true;

  delete from public.battle_sessions where true;
  delete from public.battle_rooms where true;
  delete from public.battles where true;
  delete from public.pets where true;
  delete from public.inventory where true;
  delete from public.mission_progress where true;
  delete from public.player_activity where true;

  daily_reset := date_trunc('day', now_ts) + interval '1 day';
  weekly_reset := date_trunc('week', now_ts) + interval '1 week';

  for profile_rec in select id from public.profiles loop
    species := dino_species[1 + floor(random() * array_length(dino_species, 1))::int];
    gender := case when random() < 0.5 then 'male' else 'female' end;
    pet_name := initcap(species);

    pet_id := gen_random_uuid();

    insert into public.pets (
      id, owner_id, name, species, element, gender, stage,
      hp, mood, dev_points, is_active, animation_state, feed_count, created_at
    ) values (
      pet_id, profile_rec.id, pet_name, species, 'none', gender, 'egg',
      100, 80, 0, true, 'egg_idle', 0, now_ts
    );

    insert into public.inventory (user_id, item_type, quantity) values
      (profile_rec.id, 'food_basic', 2),
      (profile_rec.id, 'water', 2),
      (profile_rec.id, 'medicine', 1);

    insert into public.mission_progress (user_id, mission_id, progress, completed, reset_at) values
      (profile_rec.id, 'daily_type_500', 0, false, daily_reset),
      (profile_rec.id, 'daily_click_200', 0, false, daily_reset),
      (profile_rec.id, 'daily_feed_3', 0, false, daily_reset),
      (profile_rec.id, 'daily_play_1h', 0, false, daily_reset),
      (profile_rec.id, 'weekly_dev_100', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_daily_5', 0, false, weekly_reset),
      (profile_rec.id, 'weekly_hatch_1', 0, false, weekly_reset);

    insert into public.player_activity (
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

-- ---------------------------------------------------------------------------
-- 5. Performance indexes (FK columns used in joins/filters)
-- ---------------------------------------------------------------------------

create index if not exists pets_owner_id_idx on public.pets (owner_id);
create index if not exists pets_owner_active_idx on public.pets (owner_id) where is_active = true;

create index if not exists friendships_friend_id_idx on public.friendships (friend_id);

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_receiver_id_idx on public.messages (receiver_id);

create index if not exists chat_room_members_user_id_idx on public.chat_room_members (user_id);
create index if not exists chat_room_members_active_idx on public.chat_room_members (room_id) where status = 'active';

create index if not exists chat_room_messages_sender_id_idx on public.chat_room_messages (sender_id);
create index if not exists chat_room_positions_user_id_idx on public.chat_room_positions (user_id);

create index if not exists battle_rooms_host_user_id_idx on public.battle_rooms (host_user_id);
create index if not exists battle_rooms_active_session_id_idx on public.battle_rooms (active_session_id);

create index if not exists battle_sessions_challenger_pet_id_idx on public.battle_sessions (challenger_pet_id);
create index if not exists battle_sessions_defender_pet_id_idx on public.battle_sessions (defender_pet_id);
create index if not exists battle_sessions_turn_user_id_idx on public.battle_sessions (turn_user_id);
create index if not exists battle_sessions_winner_user_id_idx on public.battle_sessions (winner_user_id);
create index if not exists battle_sessions_fled_user_id_idx on public.battle_sessions (fled_user_id);

create index if not exists battle_turns_actor_user_id_idx on public.battle_turns (actor_user_id);

create index if not exists battles_challenger_pet_id_idx on public.battles (challenger_pet_id);
create index if not exists battles_defender_pet_id_idx on public.battles (defender_pet_id);
create index if not exists battles_winner_pet_id_idx on public.battles (winner_pet_id);

-- ---------------------------------------------------------------------------
-- 6. Legacy tables kept for compatibility:
--    battles  — old battle log archive (clearGameData still references)
--    messages — friend DM API (UI uses chat rooms; table kept for data/history)
-- ---------------------------------------------------------------------------

comment on table public.battles is 'Legacy battle log; active battles use battle_sessions.';
comment on table public.messages is 'Legacy friend DM; lobby chat uses chat_room_messages.';
