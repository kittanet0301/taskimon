-- Migration 023: drop legacy tables, optimize RLS, merge duplicate policies

-- ---------------------------------------------------------------------------
-- 1. Drop legacy tables (replaced by battle_sessions + chat_room_messages)
-- ---------------------------------------------------------------------------

drop table if exists public.messages cascade;
drop table if exists public.battles cascade;

-- ---------------------------------------------------------------------------
-- 2. reset_all_game_data without battles table
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
-- 3. chat_room_get_members — fix ambiguous output columns
-- ---------------------------------------------------------------------------

create or replace function public.chat_room_get_members(p_room_id uuid)
returns table (
  user_id uuid,
  username text,
  pet_character text,
  gender text,
  stage text,
  x double precision,
  y double precision,
  facing text,
  anim text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_chat_room_member(p_room_id, (select auth.uid())) then
    raise exception 'Not a room member';
  end if;

  return query
  select
    m.user_id,
    p.username,
    coalesce(pet.species, 'cole'),
    coalesce(pet.gender, 'male'),
    coalesce(pet.stage, 'adult'),
    coalesce(pos.x, 0.5),
    coalesce(pos.y, 0.55),
    coalesce(pos.facing, 'right'),
    coalesce(pos.anim, 'idle')
  from public.chat_room_members m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select species, gender, stage
    from public.pets
    where owner_id = m.user_id and is_active = true
    limit 1
  ) pet on true
  left join public.chat_room_positions pos
    on pos.room_id = m.room_id and pos.user_id = m.user_id
  where m.room_id = p_room_id
    and m.status = 'active'
  order by m.joined_at;
end;
$$;

revoke all on function public.chat_room_get_members(uuid) from public;
grant execute on function public.chat_room_get_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: (select auth.uid()) + merge duplicate permissive policies
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles insert own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- pets: one SELECT + split write policies
drop policy if exists "pets manage own" on public.pets;
drop policy if exists "pets read all" on public.pets;

create policy "pets read all"
  on public.pets for select
  to authenticated, anon
  using (true);

create policy "pets insert own"
  on public.pets for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "pets update own"
  on public.pets for update
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "pets delete own"
  on public.pets for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- friendships
drop policy if exists "friendships read own" on public.friendships;
drop policy if exists "friendships insert own" on public.friendships;
drop policy if exists "friendships update involved" on public.friendships;

create policy "friendships read own"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = friend_id);

create policy "friendships insert own"
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "friendships update involved"
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = friend_id);

-- inventory
drop policy if exists "inventory own" on public.inventory;

create policy "inventory own"
  on public.inventory for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- mission_progress
drop policy if exists "missions own" on public.mission_progress;

create policy "missions own"
  on public.mission_progress for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- player_activity
drop policy if exists "activity own" on public.player_activity;

create policy "activity own"
  on public.player_activity for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- battle_rooms: merged SELECT
drop policy if exists "battle_rooms read member" on public.battle_rooms;
drop policy if exists "battle_rooms read public open" on public.battle_rooms;

create policy "battle_rooms read"
  on public.battle_rooms for select
  to authenticated
  using (
    public.is_battle_room_member(id, (select auth.uid()))
    or (visibility = 'public' and status = 'open')
  );

-- battle_room_members: merged SELECT
drop policy if exists "battle_room_members read same room" on public.battle_room_members;
drop policy if exists "battle_room_members read public room" on public.battle_room_members;

create policy "battle_room_members read"
  on public.battle_room_members for select
  to authenticated
  using (
    public.is_battle_room_member(room_id, (select auth.uid()))
    or exists (
      select 1 from public.battle_rooms r
      where r.id = battle_room_members.room_id
        and r.visibility = 'public'
        and r.status = 'open'
    )
  );
