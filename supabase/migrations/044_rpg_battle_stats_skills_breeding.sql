-- Migration 044: RPG stats, skills, breeding
--
-- Phase 1: rename care columns (hp/mood/dev_points → health/emotion/evolution) and
--          add pet RPG primaries (element_primary/secondary, str/dex/int/con, skill loadout).
-- Phase 2: extend battle_sessions with mp/tp, extend battle_turns with skill_id, and
--          rewrite battle_submit_action / battle_finalize / room-start / challenge RPCs for the
--          new damage formula (Attack / Skill / Item / Defend / Flee).
-- Phase 3: add breed_pets RPC for player-driven egg production.
--
-- The migration is designed to be idempotent-friendly: renames are guarded with IF EXISTS
-- checks, new columns use ADD COLUMN IF NOT EXISTS, and every rewritten function is CREATE
-- OR REPLACE.

-- ---------------------------------------------------------------------------
-- 1. Rename care columns on pets / player_activity
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'hp'
  ) then
    alter table public.pets rename column hp to health;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'mood'
  ) then
    alter table public.pets rename column mood to emotion;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'dev_points'
  ) then
    alter table public.pets rename column dev_points to evolution;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'player_activity' and column_name = 'dev_points_this_hour'
  ) then
    alter table public.player_activity rename column dev_points_this_hour to evolution_this_hour;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Pet RPG columns
-- ---------------------------------------------------------------------------

alter table public.pets
  add column if not exists element_primary text not null default 'neutral',
  add column if not exists element_secondary text null,
  add column if not exists str int not null default 20,
  add column if not exists dex int not null default 20,
  add column if not exists "int" int not null default 20,
  add column if not exists con int not null default 20,
  add column if not exists skill_loadout jsonb null,
  add column if not exists skill_upgrade_points int not null default 0,
  add column if not exists pending_growth_offers jsonb null,
  add column if not exists last_bred_at timestamptz null;

-- ---------------------------------------------------------------------------
-- 3. Battle sessions: MP / TP columns
-- ---------------------------------------------------------------------------

alter table public.battle_sessions
  add column if not exists challenger_mp int not null default 0,
  add column if not exists defender_mp int not null default 0,
  add column if not exists challenger_tp int not null default 0,
  add column if not exists defender_tp int not null default 0;

-- ---------------------------------------------------------------------------
-- 4. Battle turns: skill_id + expanded action check
-- ---------------------------------------------------------------------------

alter table public.battle_turns
  add column if not exists skill_id text null;

alter table public.battle_turns drop constraint if exists battle_turns_action_check;
alter table public.battle_turns add constraint battle_turns_action_check
  check (action in (
    'attack', 'skill', 'item', 'defend', 'flee',
    'bite', 'jump', 'tailwhip', 'shield', 'avoid', 'ultimate'
  ));

-- ---------------------------------------------------------------------------
-- 5. Private helpers (element chart + skill lookup + element base stats)
-- ---------------------------------------------------------------------------

-- Attacker element vs defender primary/secondary → multiplier
-- SE 1.5, resist 0.75, else 1.0.
-- Dual defender: SE if attacker strong vs either slot; resist only if weak to both slots.
create or replace function public._rpg_element_mult(
  atk_elem text,
  def_primary text,
  def_secondary text
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  strong_atk text[];
  defs text[];
  d text;
  strong_d text[];
  all_resist boolean := true;
  any_def_present boolean := false;
begin
  strong_atk := case coalesce(atk_elem, 'neutral')
    when 'fire' then array['grass','ice']
    when 'grass' then array['ground']
    when 'ground' then array['electric']
    when 'electric' then array['water']
    when 'water' then array['fire']
    when 'ice' then array['dragon']
    when 'dragon' then array['dark']
    when 'dark' then array['neutral']
    else array[]::text[]
  end;

  defs := array[coalesce(def_primary, 'neutral')];
  if def_secondary is not null and def_secondary <> '' then
    defs := defs || def_secondary;
  end if;

  foreach d in array defs loop
    if d = any(strong_atk) then
      return 1.5;
    end if;
  end loop;

  foreach d in array defs loop
    any_def_present := true;
    strong_d := case d
      when 'fire' then array['grass','ice']
      when 'grass' then array['ground']
      when 'ground' then array['electric']
      when 'electric' then array['water']
      when 'water' then array['fire']
      when 'ice' then array['dragon']
      when 'dragon' then array['dark']
      when 'dark' then array['neutral']
      else array[]::text[]
    end;
    if not (atk_elem = any(strong_d)) then
      all_resist := false;
    end if;
  end loop;

  if any_def_present and all_resist then
    return 0.75;
  end if;
  return 1.0;
end;
$$;

revoke all on function public._rpg_element_mult(text, text, text) from public;

-- Skill lookup: parse `{element}_{slug}` pathId and derive (element, role, power, mp_cost, tp_cost, is_ultimate).
-- Returns null power for unknown paths.
create or replace function public._rpg_skill_info(p_path_id text)
returns table (
  element text,
  role text,
  power int,
  mp_cost int,
  tp_cost int,
  is_ultimate boolean
)
language plpgsql
immutable
set search_path = public
as $$
declare
  sep int;
  el text;
  slug text;
  rl text;
begin
  if p_path_id is null then
    return;
  end if;
  sep := position('_' in p_path_id);
  if sep <= 0 then
    return;
  end if;
  el := substring(p_path_id from 1 for sep - 1);
  slug := substring(p_path_id from sep + 1);

  rl := case slug
    when 'spark_bite' then 'basic'
    when 'leaf_slash' then 'basic'
    when 'pebble_shot' then 'basic'
    when 'static_nibble' then 'basic'
    when 'bubble_jab' then 'basic'
    when 'frost_nip' then 'basic'
    when 'scale_bite' then 'basic'
    when 'shadow_bite' then 'basic'
    when 'plain_strike' then 'basic'

    when 'flame_rush' then 'heavy'
    when 'vine_lash' then 'heavy'
    when 'quake_stomp' then 'heavy'
    when 'volt_dash' then 'heavy'
    when 'surge_rush' then 'heavy'
    when 'glacier_rush' then 'heavy'
    when 'wyrm_rush' then 'heavy'
    when 'night_rush' then 'heavy'
    when 'power_rush' then 'heavy'

    when 'magma_pierce' then 'pierce'
    when 'thorn_pierce' then 'pierce'
    when 'drill_fang' then 'pierce'
    when 'needle_bolt' then 'pierce'
    when 'jet_pierce' then 'pierce'
    when 'icicle_pierce' then 'pierce'
    when 'horn_pierce' then 'pierce'
    when 'umbra_pierce' then 'pierce'
    when 'focus_pierce' then 'pierce'

    when 'inferno_burst' then 'burst'
    when 'bloom_burst' then 'burst'
    when 'boulder_crash' then 'burst'
    when 'thunder_clap' then 'burst'
    when 'tidal_burst' then 'burst'
    when 'blizzard_burst' then 'burst'
    when 'roar_burst' then 'burst'
    when 'void_burst' then 'burst'
    when 'impact_burst' then 'burst'

    when 'heat_guard' then 'guard'
    when 'bark_shield' then 'guard'
    when 'stone_wall' then 'guard'
    when 'shock_armor' then 'guard'
    when 'foam_guard' then 'guard'
    when 'crystal_guard' then 'guard'
    when 'scale_mail' then 'guard'
    when 'cloak_guard' then 'guard'
    when 'guard_stance' then 'guard'

    when 'smoke_step' then 'dodge'
    when 'pollen_dodge' then 'dodge'
    when 'sand_veil' then 'dodge'
    when 'afterimage' then 'dodge'
    when 'mist_step' then 'dodge'
    when 'snow_fade' then 'dodge'
    when 'wing_slip' then 'dodge'
    when 'fade_step' then 'dodge'
    when 'sidestep' then 'dodge'

    when 'kindling' then 'support'
    when 'photosynth' then 'support'
    when 'tectonic_pulse' then 'support'
    when 'charge_up' then 'support'
    when 'undertow' then 'support'
    when 'deep_freeze' then 'support'
    when 'blood_surge' then 'support'
    when 'hex_chant' then 'support'
    when 'rally' then 'support'

    when 'cinder_mark' then 'mark'
    when 'seed_mark' then 'mark'
    when 'fault_line' then 'mark'
    when 'spark_field' then 'mark'
    when 'ripple_mark' then 'mark'
    when 'rime_mark' then 'mark'
    when 'omen_mark' then 'mark'
    when 'curse_mark' then 'mark'
    when 'brand_mark' then 'mark'

    when 'solar_eruption' then 'ultimate'
    when 'overgrowth' then 'ultimate'
    when 'terra_break' then 'ultimate'
    when 'storm_crown' then 'ultimate'
    when 'abyss_roar' then 'ultimate'
    when 'absolute_zero' then 'ultimate'
    when 'elder_wrath' then 'ultimate'
    when 'eclipse_fang' then 'ultimate'
    when 'finishing_blow' then 'ultimate'
    else null
  end;

  if rl is null then
    return;
  end if;

  element := el;
  role := rl;
  is_ultimate := (rl = 'ultimate');
  power := case rl
    when 'basic' then 18
    when 'heavy' then 26
    when 'pierce' then 20
    when 'burst' then 28
    when 'mark' then 12
    when 'ultimate' then 40
    else 0
  end;
  mp_cost := case rl
    when 'basic' then 8
    when 'heavy' then 14
    when 'pierce' then 12
    when 'burst' then 16
    when 'guard' then 10
    when 'dodge' then 8
    when 'support' then 12
    when 'mark' then 10
    else 0
  end;
  tp_cost := case when rl = 'ultimate' then 100 else 0 end;
  return next;
end;
$$;

revoke all on function public._rpg_skill_info(text) from public;

-- Base primaries per element (baby / egg average = 80 total).
create or replace function public._rpg_element_base_stats(p_element text)
returns table(str int, dex int, "int" int, con int)
language sql
immutable
set search_path = public
as $$
  select
    case p_element
      when 'fire' then 28 when 'grass' then 16 when 'ground' then 22
      when 'electric' then 18 when 'water' then 18 when 'ice' then 16
      when 'dragon' then 26 when 'dark' then 20 else 20
    end,
    case p_element
      when 'fire' then 18 when 'grass' then 18 when 'ground' then 12
      when 'electric' then 30 when 'water' then 20 when 'ice' then 16
      when 'dragon' then 16 when 'dark' then 24 else 20
    end,
    case p_element
      when 'fire' then 20 when 'grass' then 22 when 'ground' then 14
      when 'electric' then 22 when 'water' then 24 when 'ice' then 28
      when 'dragon' then 18 when 'dark' then 22 else 20
    end,
    case p_element
      when 'fire' then 14 when 'grass' then 24 when 'ground' then 32
      when 'electric' then 10 when 'water' then 18 when 'ice' then 20
      when 'dragon' then 20 when 'dark' then 14 else 20
    end;
$$;

revoke all on function public._rpg_element_base_stats(text) from public;

-- ---------------------------------------------------------------------------
-- 6. get_user_battle_pet: gate on new care columns (health/emotion ≥ 30)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_battle_pet(p_user_id uuid)
returns pets
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  pet_rec pets;
begin
  select * into pet_rec
  from pets
  where owner_id = p_user_id
    and is_active = true
  limit 1;

  if pet_rec.id is null then
    raise exception 'No active pet';
  end if;

  if pet_rec.stage = 'egg' then
    raise exception 'Pet must be hatched to battle';
  end if;

  if pet_rec.health < 30 then
    raise exception 'Pet health must be at least 30 to battle';
  end if;

  if pet_rec.emotion < 30 then
    raise exception 'Pet emotion must be at least 30 to battle';
  end if;

  return pet_rec;
end;
$$;

revoke all on function public.get_user_battle_pet(uuid) from public;
grant execute on function public.get_user_battle_pet(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. battle_finalize: care columns renamed; don't clobber battle HP → pet.health.
--    Battle HP is derived (40+con*5) so we no longer sync it back onto the pet;
--    only apply care emotion / health deltas for the result.
-- ---------------------------------------------------------------------------

create or replace function public.battle_finalize(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sess battle_sessions;
  c_won boolean;
  d_won boolean;
  c_fled boolean;
  d_fled boolean;
begin
  select * into sess from battle_sessions where id = p_session_id for update;
  if sess.id is null then
    raise exception 'Session not found';
  end if;

  if sess.status not in ('completed', 'fled') then
    return;
  end if;

  c_won := sess.winner_user_id = sess.challenger_user_id;
  d_won := sess.winner_user_id = sess.defender_user_id;
  c_fled := sess.fled_user_id = sess.challenger_user_id;
  d_fled := sess.fled_user_id = sess.defender_user_id;

  if sess.status = 'fled' then
    if c_fled then
      update pets set emotion = greatest(0, least(100, emotion - 3)) where id = sess.challenger_pet_id;
      update pets set emotion = greatest(0, least(100, emotion + 5)) where id = sess.defender_pet_id;
    else
      update pets set emotion = greatest(0, least(100, emotion - 3)) where id = sess.defender_pet_id;
      update pets set emotion = greatest(0, least(100, emotion + 5)) where id = sess.challenger_pet_id;
    end if;
  elsif c_won then
    update pets set emotion = greatest(0, least(100, emotion + 5)) where id = sess.challenger_pet_id;
    update pets set health = greatest(0, least(100, health - 5)) where id = sess.defender_pet_id;
  elsif d_won then
    update pets set emotion = greatest(0, least(100, emotion + 5)) where id = sess.defender_pet_id;
    update pets set health = greatest(0, least(100, health - 5)) where id = sess.challenger_pet_id;
  end if;

  if sess.room_id is not null then
    update battle_room_members
    set status = 'waiting'
    where room_id = sess.room_id
      and user_id in (sess.challenger_user_id, sess.defender_user_id);

    update battle_rooms
    set active_session_id = null
    where id = sess.room_id;
  end if;
end;
$$;

revoke all on function public.battle_finalize(uuid) from public;
grant execute on function public.battle_finalize(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. room_start_duel / battle_create_challenge / battle_respond
--    - Battle HP = 40 + con*5, MP = int*10, TP = 0
--    - Gate on health/emotion ≥ 30 (via get_user_battle_pet)
--    - First turn: higher DEX (tie random)
-- ---------------------------------------------------------------------------

create or replace function public.room_start_duel(p_room_id uuid, p_opponent_user_id uuid)
returns battle_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec battle_rooms;
  host_member battle_room_members;
  opp_member battle_room_members;
  c_pet pets;
  d_pet pets;
  c_max_hp int;
  d_max_hp int;
  c_max_mp int;
  d_max_mp int;
  first_uid uuid;
  new_sess battle_sessions;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into room_rec from battle_rooms where id = p_room_id for update;
  if room_rec.id is null or room_rec.status <> 'open' then
    raise exception 'Room not available';
  end if;

  if room_rec.host_user_id <> uid then
    raise exception 'Only host can start duel';
  end if;

  if room_rec.active_session_id is not null then
    raise exception 'Room already has active duel';
  end if;

  select * into host_member from battle_room_members
  where room_id = p_room_id and user_id = uid and status = 'waiting';
  if host_member.user_id is null then
    raise exception 'Host not ready';
  end if;

  select * into opp_member from battle_room_members
  where room_id = p_room_id and user_id = p_opponent_user_id and status = 'waiting';
  if opp_member.user_id is null then
    raise exception 'Opponent not ready';
  end if;

  if p_opponent_user_id = uid then
    raise exception 'Cannot duel yourself';
  end if;

  c_pet := public.get_user_battle_pet(uid);
  d_pet := public.get_user_battle_pet(p_opponent_user_id);

  c_max_hp := 40 + coalesce(c_pet.con, 20) * 5;
  d_max_hp := 40 + coalesce(d_pet.con, 20) * 5;
  c_max_mp := coalesce(c_pet."int", 20) * 10;
  d_max_mp := coalesce(d_pet."int", 20) * 10;

  if coalesce(c_pet.dex, 20) > coalesce(d_pet.dex, 20) then
    first_uid := uid;
  elsif coalesce(c_pet.dex, 20) < coalesce(d_pet.dex, 20) then
    first_uid := p_opponent_user_id;
  else
    first_uid := case when random() < 0.5 then uid else p_opponent_user_id end;
  end if;

  insert into battle_sessions (
    room_id,
    challenger_user_id, defender_user_id,
    challenger_pet_id, defender_pet_id,
    challenger_hp, defender_hp,
    challenger_hp_start, defender_hp_start,
    challenger_mp, defender_mp,
    challenger_tp, defender_tp,
    challenger_energy, defender_energy,
    status, turn_user_id
  ) values (
    p_room_id,
    uid, p_opponent_user_id,
    c_pet.id, d_pet.id,
    c_max_hp, d_max_hp,
    c_max_hp, d_max_hp,
    c_max_mp, d_max_mp,
    0, 0,
    0, 0,
    'active', first_uid
  ) returning * into new_sess;

  update battle_rooms set active_session_id = new_sess.id where id = p_room_id;

  update battle_room_members set status = 'in_battle'
  where room_id = p_room_id and user_id in (uid, p_opponent_user_id);

  return new_sess;
end;
$$;

revoke all on function public.room_start_duel(uuid, uuid) from public;
grant execute on function public.room_start_duel(uuid, uuid) to authenticated;

create or replace function public.battle_create_challenge(p_defender_user_id uuid)
returns battle_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c_pet pets;
  d_pet pets;
  c_max_hp int;
  d_max_hp int;
  c_max_mp int;
  d_max_mp int;
  new_sess battle_sessions;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_defender_user_id = uid then
    raise exception 'Cannot challenge yourself';
  end if;

  c_pet := public.get_user_battle_pet(uid);
  d_pet := public.get_user_battle_pet(p_defender_user_id);

  c_max_hp := 40 + coalesce(c_pet.con, 20) * 5;
  d_max_hp := 40 + coalesce(d_pet.con, 20) * 5;
  c_max_mp := coalesce(c_pet."int", 20) * 10;
  d_max_mp := coalesce(d_pet."int", 20) * 10;

  insert into battle_sessions (
    challenger_user_id, defender_user_id,
    challenger_pet_id, defender_pet_id,
    challenger_hp, defender_hp,
    challenger_hp_start, defender_hp_start,
    challenger_mp, defender_mp,
    challenger_tp, defender_tp,
    challenger_energy, defender_energy,
    status, expires_at
  ) values (
    uid, p_defender_user_id,
    c_pet.id, d_pet.id,
    c_max_hp, d_max_hp,
    c_max_hp, d_max_hp,
    c_max_mp, d_max_mp,
    0, 0,
    0, 0,
    'pending', now() + interval '7 days'
  ) returning * into new_sess;

  return new_sess;
end;
$$;

revoke all on function public.battle_create_challenge(uuid) from public;
grant execute on function public.battle_create_challenge(uuid) to authenticated;

create or replace function public.battle_respond(p_session_id uuid, p_accept boolean)
returns battle_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess battle_sessions;
  c_pet pets;
  d_pet pets;
  first_uid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into sess from battle_sessions where id = p_session_id for update;

  if sess.id is null then
    raise exception 'Session not found';
  end if;

  if sess.defender_user_id <> uid then
    raise exception 'Only defender can respond';
  end if;

  if sess.status <> 'pending' then
    raise exception 'Session not pending';
  end if;

  if sess.expires_at is not null and sess.expires_at < now() then
    update battle_sessions set status = 'expired' where id = p_session_id;
    raise exception 'Challenge expired';
  end if;

  if not p_accept then
    update battle_sessions set status = 'declined' where id = p_session_id
    returning * into sess;
    return sess;
  end if;

  d_pet := public.get_user_battle_pet(uid);
  select * into c_pet from pets where id = sess.challenger_pet_id;

  if coalesce(c_pet.dex, 20) > coalesce(d_pet.dex, 20) then
    first_uid := sess.challenger_user_id;
  elsif coalesce(c_pet.dex, 20) < coalesce(d_pet.dex, 20) then
    first_uid := sess.defender_user_id;
  else
    first_uid := case when random() < 0.5 then sess.challenger_user_id else sess.defender_user_id end;
  end if;

  update battle_sessions
  set status = 'active', turn_user_id = first_uid
  where id = p_session_id
  returning * into sess;

  return sess;
end;
$$;

revoke all on function public.battle_respond(uuid, boolean) from public;
grant execute on function public.battle_respond(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. battle_submit_action (RPG rewrite)
--    Accepts: 'attack', 'defend', 'flee', 'skill:<pathId>', 'item:battle_shield'
--    Damage: round(power * (atkStat / max(DEF,1)) * elementMult * pureBonus * rand(0.9..1.1))
--            atkStat = STR for basic attack; round((STR+INT)/2) for skills
--            DEF = CON. Defend applies 0.5 to next incoming attack.
--            item:battle_shield applies extra 0.5 reduction and consumes 1 from inventory.
--    EVA = clamp(0.05 + DEX * 0.003, 0.05, 0.35) — miss chance after damage calc.
--    TP gain: attack 15–30, skill 10–25, defend 10–20 (cap 100).
--    Ultimate skills spend TP=100; other skills spend MP per role.
--    Guard/dodge/support (power 0) grant defending or eva boost for one turn (no damage).
-- ---------------------------------------------------------------------------

create or replace function public.battle_submit_action(p_session_id uuid, p_action text)
returns battle_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess battle_sessions;
  is_challenger boolean;

  action_kind text;         -- 'attack' | 'skill' | 'item' | 'defend' | 'flee'
  action_arg text;          -- payload after ':' (skill pathId or item type)
  colon_pos int;

  actor_pet pets;
  opp_pet pets;
  actor_name text;
  opp_name text;

  opp_defending boolean;
  opp_avoiding boolean;

  actor_hp int;
  actor_mp int;
  actor_tp int;
  opp_hp int;

  -- Skill lookup
  skill_element text;
  skill_role text;
  skill_power int;
  skill_mp int;
  skill_tp int;
  skill_is_ult boolean;

  atk_element text;
  actor_pure boolean;
  atk_stat int;
  def_stat int;
  power int;
  elem_mult numeric;
  pure_mult numeric;
  random_factor numeric;
  raw_dmg numeric;
  dmg int := 0;

  eva numeric;
  dodged boolean := false;

  shield_item boolean := false;
  tp_gain int := 0;
  new_tp int;
  new_mp int;

  msg text;
  winner uuid;
  winner_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  colon_pos := position(':' in coalesce(p_action, ''));
  if colon_pos > 0 then
    action_kind := substring(p_action from 1 for colon_pos - 1);
    action_arg := substring(p_action from colon_pos + 1);
  else
    action_kind := p_action;
    action_arg := null;
  end if;

  if action_kind not in ('attack', 'defend', 'flee', 'skill', 'item') then
    raise exception 'Invalid action';
  end if;

  select * into sess from battle_sessions where id = p_session_id for update;

  if sess.id is null then
    raise exception 'Session not found';
  end if;

  if sess.status <> 'active' then
    raise exception 'Session not active';
  end if;

  if sess.turn_user_id <> uid then
    raise exception 'Not your turn';
  end if;

  is_challenger := uid = sess.challenger_user_id;

  if is_challenger then
    select * into actor_pet from pets where id = sess.challenger_pet_id;
    select * into opp_pet from pets where id = sess.defender_pet_id;
    opp_defending := sess.defender_defending;
    opp_avoiding := sess.defender_avoiding;
    actor_hp := sess.challenger_hp;
    actor_mp := sess.challenger_mp;
    actor_tp := sess.challenger_tp;
    opp_hp := sess.defender_hp;
  else
    select * into actor_pet from pets where id = sess.defender_pet_id;
    select * into opp_pet from pets where id = sess.challenger_pet_id;
    opp_defending := sess.challenger_defending;
    opp_avoiding := sess.challenger_avoiding;
    actor_hp := sess.defender_hp;
    actor_mp := sess.defender_mp;
    actor_tp := sess.defender_tp;
    opp_hp := sess.challenger_hp;
  end if;

  actor_name := coalesce(actor_pet.name, 'Pet');
  opp_name := coalesce(opp_pet.name, 'Opponent');
  actor_pure := (actor_pet.element_secondary is null);

  -- --------------------------------------------------------------
  -- FLEE
  -- --------------------------------------------------------------
  if action_kind = 'flee' then
    update battle_sessions
    set
      status = 'fled',
      fled_user_id = uid,
      winner_user_id = case when is_challenger then sess.defender_user_id else sess.challenger_user_id end
    where id = p_session_id
    returning * into sess;

    msg := actor_name || ' หลบหนีจากการต่อสู้';
    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'flee', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );

    if sess.winner_user_id = sess.challenger_user_id then
      select name into winner_name from pets where id = sess.challenger_pet_id;
    else
      select name into winner_name from pets where id = sess.defender_pet_id;
    end if;
    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, sess.winner_user_id, 'attack', 0,
      sess.challenger_hp, sess.defender_hp, 'ผู้ชนะ: ' || coalesce(winner_name, '')
    );

    perform public.battle_finalize(p_session_id);
    return sess;
  end if;

  -- --------------------------------------------------------------
  -- DEFEND (free stance, no MP cost, small TP gain, ends turn)
  -- --------------------------------------------------------------
  if action_kind = 'defend' then
    tp_gain := 10 + floor(random() * 11)::int;   -- 10..20
    new_tp := least(100, actor_tp + tp_gain);

    if is_challenger then
      update battle_sessions
      set
        challenger_defending = true,
        challenger_avoiding = false,
        challenger_tp = new_tp,
        challenger_energy = new_tp,
        turn_user_id = sess.defender_user_id
      where id = p_session_id returning * into sess;
    else
      update battle_sessions
      set
        defender_defending = true,
        defender_avoiding = false,
        defender_tp = new_tp,
        defender_energy = new_tp,
        turn_user_id = sess.challenger_user_id
      where id = p_session_id returning * into sess;
    end if;

    msg := actor_name || ' ตั้งท่าป้องกัน (+' || tp_gain || '% TP)';
    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'defend', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );
    return sess;
  end if;

  -- --------------------------------------------------------------
  -- ITEM (only 'battle_shield' supported — consumes 1 from inventory
  -- and stacks a 0.5 reduction on the actor for the next incoming turn,
  -- same behaviour as defending but expressed through inventory)
  -- --------------------------------------------------------------
  if action_kind = 'item' then
    if action_arg is null or action_arg = '' then
      raise exception 'Item required';
    end if;
    if action_arg <> 'battle_shield' then
      raise exception 'Unsupported item';
    end if;
    if not exists (
      select 1 from public.inventory
      where user_id = uid and item_type = 'battle_shield' and quantity > 0
    ) then
      raise exception 'Need a Battle shield item';
    end if;
    update public.inventory
    set quantity = quantity - 1
    where user_id = uid and item_type = 'battle_shield' and quantity > 0;
    delete from public.inventory
    where user_id = uid and item_type = 'battle_shield' and quantity <= 0;

    tp_gain := 10 + floor(random() * 11)::int;
    new_tp := least(100, actor_tp + tp_gain);

    if is_challenger then
      update battle_sessions
      set
        challenger_defending = true,
        challenger_avoiding = false,
        challenger_tp = new_tp,
        challenger_energy = new_tp,
        turn_user_id = sess.defender_user_id
      where id = p_session_id returning * into sess;
    else
      update battle_sessions
      set
        defender_defending = true,
        defender_avoiding = false,
        defender_tp = new_tp,
        defender_energy = new_tp,
        turn_user_id = sess.challenger_user_id
      where id = p_session_id returning * into sess;
    end if;

    msg := actor_name || ' ใช้ Battle shield (+' || tp_gain || '% TP)';
    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'item', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );
    return sess;
  end if;

  -- --------------------------------------------------------------
  -- ATTACK / SKILL — compute damage
  -- --------------------------------------------------------------
  if action_kind = 'skill' then
    if action_arg is null or action_arg = '' then
      raise exception 'Skill required';
    end if;

    -- Loadout membership check (loadout may be null before hatch).
    if actor_pet.skill_loadout is null then
      raise exception 'Pet has no skill loadout';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(coalesce(actor_pet.skill_loadout->'slots', '[]'::jsonb)) as slot
      where slot->>'pathId' = action_arg
    ) then
      raise exception 'Skill not in loadout';
    end if;

    select s.element, s.role, s.power, s.mp_cost, s.tp_cost, s.is_ultimate
      into skill_element, skill_role, skill_power, skill_mp, skill_tp, skill_is_ult
      from public._rpg_skill_info(action_arg) s;
    if not found or skill_role is null then
      raise exception 'Unknown skill';
    end if;

    -- Cost check
    if skill_is_ult then
      if actor_tp < 100 then
        raise exception 'Ultimate not ready (need 100 TP)';
      end if;
      new_tp := 0;
      new_mp := actor_mp;
    else
      if actor_mp < skill_mp then
        raise exception 'Not enough MP';
      end if;
      new_mp := actor_mp - skill_mp;
      tp_gain := 10 + floor(random() * 16)::int;   -- 10..25
      new_tp := least(100, actor_tp + tp_gain);
    end if;

    atk_element := skill_element;
    power := skill_power;
    atk_stat := round((coalesce(actor_pet.str, 20) + coalesce(actor_pet."int", 20)) / 2.0)::int;

    -- Guard skill → set defending, no damage, end turn.
    if skill_role = 'guard' then
      if is_challenger then
        update battle_sessions
        set
          challenger_defending = true,
          challenger_avoiding = false,
          challenger_mp = new_mp,
          challenger_tp = new_tp,
          challenger_energy = new_tp,
          turn_user_id = sess.defender_user_id
        where id = p_session_id returning * into sess;
      else
        update battle_sessions
        set
          defender_defending = true,
          defender_avoiding = false,
          defender_mp = new_mp,
          defender_tp = new_tp,
          defender_energy = new_tp,
          turn_user_id = sess.challenger_user_id
        where id = p_session_id returning * into sess;
      end if;

      msg := actor_name || ' ใช้สกิลป้องกัน ' || action_arg;
      insert into battle_turns (
        session_id, actor_user_id, action, damage, skill_id,
        challenger_hp_after, defender_hp_after, message
      ) values (
        p_session_id, uid, 'skill', 0, action_arg,
        sess.challenger_hp, sess.defender_hp, msg
      );
      return sess;
    end if;

    -- Dodge skill → set avoiding, no damage, end turn.
    if skill_role = 'dodge' then
      if is_challenger then
        update battle_sessions
        set
          challenger_avoiding = true,
          challenger_defending = false,
          challenger_mp = new_mp,
          challenger_tp = new_tp,
          challenger_energy = new_tp,
          turn_user_id = sess.defender_user_id
        where id = p_session_id returning * into sess;
      else
        update battle_sessions
        set
          defender_avoiding = true,
          defender_defending = false,
          defender_mp = new_mp,
          defender_tp = new_tp,
          defender_energy = new_tp,
          turn_user_id = sess.challenger_user_id
        where id = p_session_id returning * into sess;
      end if;

      msg := actor_name || ' ใช้สกิลหลบ ' || action_arg;
      insert into battle_turns (
        session_id, actor_user_id, action, damage, skill_id,
        challenger_hp_after, defender_hp_after, message
      ) values (
        p_session_id, uid, 'skill', 0, action_arg,
        sess.challenger_hp, sess.defender_hp, msg
      );
      return sess;
    end if;

    -- Support skill (power 0) → no damage, but consumes cost / gains TP.
    if skill_role = 'support' then
      if is_challenger then
        update battle_sessions
        set
          challenger_mp = new_mp,
          challenger_tp = new_tp,
          challenger_energy = new_tp,
          turn_user_id = sess.defender_user_id
        where id = p_session_id returning * into sess;
      else
        update battle_sessions
        set
          defender_mp = new_mp,
          defender_tp = new_tp,
          defender_energy = new_tp,
          turn_user_id = sess.challenger_user_id
        where id = p_session_id returning * into sess;
      end if;

      msg := actor_name || ' ใช้สกิลเสริม ' || action_arg;
      insert into battle_turns (
        session_id, actor_user_id, action, damage, skill_id,
        challenger_hp_after, defender_hp_after, message
      ) values (
        p_session_id, uid, 'skill', 0, action_arg,
        sess.challenger_hp, sess.defender_hp, msg
      );
      return sess;
    end if;

  else
    -- Basic attack
    atk_element := coalesce(actor_pet.element_primary, 'neutral');
    power := 20;                                                       -- BASE_ATTACK_POWER
    atk_stat := coalesce(actor_pet.str, 20);
    tp_gain := 15 + floor(random() * 16)::int;                         -- 15..30
    new_tp := least(100, actor_tp + tp_gain);
    new_mp := actor_mp;
  end if;

  -- Damage formula
  def_stat := greatest(1, coalesce(opp_pet.con, 20));
  elem_mult := public._rpg_element_mult(
    atk_element,
    coalesce(opp_pet.element_primary, 'neutral'),
    opp_pet.element_secondary
  );
  pure_mult := case when actor_pure then 1.25 else 1.0 end;
  random_factor := 0.9 + random() * 0.2;
  raw_dmg := power * (atk_stat::numeric / def_stat) * elem_mult * pure_mult * random_factor;
  dmg := greatest(0, round(raw_dmg)::int);

  -- Miss chance (EVA) applied post-calc.
  eva := greatest(0.05, least(0.35, 0.05 + coalesce(opp_pet.dex, 20) * 0.003));
  if random() < eva then
    dodged := true;
    dmg := 0;
  end if;

  -- Legacy "avoid" stance stacks with EVA (35% dodge like the old system).
  if not dodged and opp_avoiding then
    if random() < 0.35 then
      dodged := true;
      dmg := 0;
    end if;
  end if;

  -- Defender's shield reduction
  if not dodged and opp_defending then
    dmg := round(dmg * 0.5)::int;
  end if;

  -- Persist and pass turn
  if is_challenger then
    update battle_sessions
    set
      defender_hp = greatest(0, sess.defender_hp - dmg),
      challenger_mp = new_mp,
      challenger_tp = new_tp,
      challenger_energy = new_tp,
      defender_defending = false,
      defender_avoiding = false,
      turn_user_id = sess.defender_user_id
    where id = p_session_id
    returning * into sess;
  else
    update battle_sessions
    set
      challenger_hp = greatest(0, sess.challenger_hp - dmg),
      defender_mp = new_mp,
      defender_tp = new_tp,
      defender_energy = new_tp,
      challenger_defending = false,
      challenger_avoiding = false,
      turn_user_id = sess.challenger_user_id
    where id = p_session_id
    returning * into sess;
  end if;

  if dodged then
    msg := opp_name || ' หลบการโจมตีของ ' || actor_name || ' ได้สำเร็จ!';
  elsif action_kind = 'skill' then
    msg := actor_name || ' ใช้สกิล ' || action_arg || ' -' || dmg || ' HP';
  else
    msg := actor_name || ' โจมตี ' || opp_name || ' -' || dmg || ' HP (+' || tp_gain || '% TP)';
  end if;

  insert into battle_turns (
    session_id, actor_user_id, action, damage, skill_id,
    challenger_hp_after, defender_hp_after, message
  ) values (
    p_session_id, uid,
    case when action_kind = 'skill' then 'skill' else 'attack' end,
    dmg,
    case when action_kind = 'skill' then action_arg else null end,
    sess.challenger_hp, sess.defender_hp, msg
  );

  if sess.challenger_hp <= 0 or sess.defender_hp <= 0 then
    if sess.challenger_hp <= 0 and sess.defender_hp <= 0 then
      winner := case when random() < 0.5 then sess.challenger_user_id else sess.defender_user_id end;
    elsif sess.defender_hp <= 0 then
      winner := sess.challenger_user_id;
    else
      winner := sess.defender_user_id;
    end if;

    update battle_sessions
    set status = 'completed', winner_user_id = winner
    where id = p_session_id
    returning * into sess;

    if winner = sess.challenger_user_id then
      select name into winner_name from pets where id = sess.challenger_pet_id;
    else
      select name into winner_name from pets where id = sess.defender_pet_id;
    end if;
    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, winner, 'attack', 0,
      sess.challenger_hp, sess.defender_hp, 'ผู้ชนะ: ' || coalesce(winner_name, '')
    );

    perform public.battle_finalize(p_session_id);
  end if;

  return sess;
end;
$$;

revoke all on function public.battle_submit_action(uuid, text) from public;
grant execute on function public.battle_submit_action(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. breed_pets
-- ---------------------------------------------------------------------------

create or replace function public.breed_pets(p_pet_a uuid, p_pet_b uuid)
returns pets
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pet_a pets;
  pet_b pets;
  active_count int;
  slot_limit int;
  cooldown interval := interval '6 hours';
  now_ts timestamptz := now();
  chosen_species text;
  parent_a_pure boolean;
  parent_b_pure boolean;
  pure_chance numeric := 0.60;
  is_pure boolean;
  primary_pool text[];
  secondary_pool text[];
  child_primary text;
  child_secondary text;
  base_a_str int; base_a_dex int; base_a_int int; base_a_con int;
  base_b_str int; base_b_dex int; base_b_int int; base_b_con int;
  child_str int;
  child_dex int;
  child_int int;
  child_con int;
  new_pet_id uuid := gen_random_uuid();
  child_name text;
  new_pet pets;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_pet_a is null or p_pet_b is null or p_pet_a = p_pet_b then
    raise exception 'Two distinct pets required';
  end if;

  select * into pet_a from public.pets where id = p_pet_a and owner_id = uid for update;
  if pet_a.id is null then
    raise exception 'Pet A not found';
  end if;
  select * into pet_b from public.pets where id = p_pet_b and owner_id = uid for update;
  if pet_b.id is null then
    raise exception 'Pet B not found';
  end if;

  if pet_a.stage <> 'adult' or pet_b.stage <> 'adult' then
    raise exception 'Both pets must be adult';
  end if;
  if pet_a.gender = pet_b.gender then
    raise exception 'Pets must have different genders';
  end if;

  if pet_a.last_bred_at is not null and pet_a.last_bred_at + cooldown > now_ts then
    raise exception 'Pet A still on breeding cooldown';
  end if;
  if pet_b.last_bred_at is not null and pet_b.last_bred_at + cooldown > now_ts then
    raise exception 'Pet B still on breeding cooldown';
  end if;

  -- Free slot check
  select count(*)::int into active_count from public.pets where owner_id = uid;
  select coalesce(pet_slot_limit, 5) into slot_limit
    from public.player_activity where user_id = uid;
  if slot_limit is null then
    slot_limit := 5;
  end if;
  if active_count >= slot_limit then
    raise exception 'No free pet slot (%/%)', active_count, slot_limit;
  end if;

  -- Consume 1 breed_nest
  if not exists (
    select 1 from public.inventory
    where user_id = uid and item_type = 'breed_nest' and quantity > 0
  ) then
    raise exception 'Need a Breed nest item';
  end if;
  update public.inventory
  set quantity = quantity - 1
  where user_id = uid and item_type = 'breed_nest' and quantity > 0;
  delete from public.inventory
  where user_id = uid and item_type = 'breed_nest' and quantity <= 0;

  -- Species 50/50 from parents
  chosen_species := case when random() < 0.5 then pet_a.species else pet_b.species end;

  parent_a_pure := (pet_a.element_secondary is null);
  parent_b_pure := (pet_b.element_secondary is null);
  if parent_a_pure and parent_b_pure and pet_a.element_primary = pet_b.element_primary then
    pure_chance := pure_chance + 0.05;
  end if;

  primary_pool := array[
    coalesce(pet_a.element_primary, 'neutral'),
    coalesce(pet_b.element_primary, 'neutral')
  ];
  secondary_pool := array[]::text[];
  if pet_a.element_secondary is not null then
    secondary_pool := secondary_pool || pet_a.element_secondary;
  end if;
  if pet_b.element_secondary is not null then
    secondary_pool := secondary_pool || pet_b.element_secondary;
  end if;

  child_primary := primary_pool[1 + floor(random() * array_length(primary_pool, 1))::int];
  is_pure := random() < pure_chance;
  if is_pure then
    child_secondary := null;
  else
    -- Prefer a parent's secondary; else pick the *other* parent's primary.
    if array_length(secondary_pool, 1) is not null and array_length(secondary_pool, 1) > 0 then
      child_secondary := secondary_pool[1 + floor(random() * array_length(secondary_pool, 1))::int];
    else
      child_secondary := case
        when child_primary = coalesce(pet_a.element_primary, 'neutral') then coalesce(pet_b.element_primary, 'neutral')
        else coalesce(pet_a.element_primary, 'neutral')
      end;
    end if;
    if child_secondary = child_primary then
      child_secondary := null;
    end if;
  end if;

  -- Base primaries from element table (average of two if dual)
  select s.str, s.dex, s."int", s.con
    into base_a_str, base_a_dex, base_a_int, base_a_con
    from public._rpg_element_base_stats(child_primary) s;
  if child_secondary is null then
    child_str := base_a_str;
    child_dex := base_a_dex;
    child_int := base_a_int;
    child_con := base_a_con;
  else
    select s.str, s.dex, s."int", s.con
      into base_b_str, base_b_dex, base_b_int, base_b_con
      from public._rpg_element_base_stats(child_secondary) s;
    child_str := greatest(1, round((base_a_str + base_b_str) / 2.0)::int);
    child_dex := greatest(1, round((base_a_dex + base_b_dex) / 2.0)::int);
    child_int := greatest(1, round((base_a_int + base_b_int) / 2.0)::int);
    child_con := greatest(1, round((base_a_con + base_b_con) / 2.0)::int);
  end if;

  child_name := initcap(chosen_species);

  insert into public.pets (
    id, owner_id, name, species, gender, stage,
    health, emotion, evolution,
    element_primary, element_secondary,
    str, dex, "int", con,
    skill_loadout, skill_upgrade_points,
    is_active, animation_state, feed_count, created_at
  ) values (
    new_pet_id, uid, child_name, chosen_species,
    case when random() < 0.5 then 'male' else 'female' end,
    'egg',
    100, 80, 0,
    child_primary, child_secondary,
    child_str, child_dex, child_int, child_con,
    null, 0,
    false, 'egg_idle', 0, now_ts
  ) returning * into new_pet;

  update public.pets set last_bred_at = now_ts where id in (p_pet_a, p_pet_b);

  return new_pet;
end;
$$;

revoke all on function public.breed_pets(uuid, uuid) from public;
grant execute on function public.breed_pets(uuid, uuid) to authenticated;
