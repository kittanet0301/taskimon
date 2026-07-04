-- Migration 010: async PvP battle sessions, rooms, turns + RPC

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.battle_element_mult(attacker_elem text, defender_elem text)
returns numeric
language plpgsql
immutable
security invoker
set search_path = public
as $$
begin
  if attacker_elem = 'neutral' or defender_elem = 'neutral' then
    return 1.0;
  end if;
  if (attacker_elem = 'fire' and defender_elem = 'earth')
    or (attacker_elem = 'earth' and defender_elem = 'wind')
    or (attacker_elem = 'wind' and defender_elem = 'water')
    or (attacker_elem = 'water' and defender_elem = 'fire') then
    return 2.0;
  end if;
  if (attacker_elem = 'fire' and defender_elem = 'water')
    or (attacker_elem = 'water' and defender_elem = 'wind')
    or (attacker_elem = 'wind' and defender_elem = 'earth')
    or (attacker_elem = 'earth' and defender_elem = 'fire') then
    return 0.5;
  end if;
  return 1.0;
end;
$$;

revoke all on function public.battle_element_mult(text, text) from public;
grant execute on function public.battle_element_mult(text, text) to authenticated;

create or replace function public.generate_battle_room_code()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  code text;
  tries int := 0;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from battle_rooms where room_code = code);
    tries := tries + 1;
    if tries > 20 then
      raise exception 'Could not generate unique room code';
    end if;
  end loop;
  return code;
end;
$$;

revoke all on function public.generate_battle_room_code() from public;
grant execute on function public.generate_battle_room_code() to authenticated;

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

  if pet_rec.hp < 10 then
    raise exception 'Pet HP must be at least 10 to battle';
  end if;

  return pet_rec;
end;
$$;

revoke all on function public.get_user_battle_pet(uuid) from public;
grant execute on function public.get_user_battle_pet(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists battle_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references profiles(id) on delete cascade,
  room_code text unique not null,
  name text not null,
  visibility text not null default 'public' check (visibility in ('public')),
  status text not null default 'open' check (status in ('open', 'closed')),
  max_members int not null default 8,
  active_session_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists battle_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references battle_rooms(id) on delete set null,
  challenger_user_id uuid not null references profiles(id) on delete cascade,
  defender_user_id uuid not null references profiles(id) on delete cascade,
  challenger_pet_id uuid not null references pets(id) on delete cascade,
  defender_pet_id uuid not null references pets(id) on delete cascade,
  challenger_hp int not null,
  defender_hp int not null,
  challenger_hp_start int not null,
  defender_hp_start int not null,
  challenger_ultimate_used boolean not null default false,
  defender_ultimate_used boolean not null default false,
  challenger_defending boolean not null default false,
  defender_defending boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'declined', 'fled', 'expired')),
  turn_user_id uuid references profiles(id),
  winner_user_id uuid references profiles(id),
  fled_user_id uuid references profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table battle_rooms
  add constraint battle_rooms_active_session_fkey
  foreign key (active_session_id) references battle_sessions(id) on delete set null;

create table if not exists battle_room_members (
  room_id uuid not null references battle_rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  status text not null default 'waiting' check (status in ('waiting', 'in_battle', 'left')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists battle_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references battle_sessions(id) on delete cascade,
  actor_user_id uuid not null references profiles(id) on delete cascade,
  action text not null check (action in ('attack', 'ultimate', 'defend', 'flee')),
  damage int not null default 0,
  challenger_hp_after int not null,
  defender_hp_after int not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists battle_sessions_challenger_idx on battle_sessions (challenger_user_id);
create index if not exists battle_sessions_defender_idx on battle_sessions (defender_user_id);
create index if not exists battle_sessions_room_idx on battle_sessions (room_id);
create index if not exists battle_sessions_status_idx on battle_sessions (status);
create index if not exists battle_turns_session_idx on battle_turns (session_id);
create index if not exists battle_room_members_user_idx on battle_room_members (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table battle_rooms enable row level security;
alter table battle_room_members enable row level security;
alter table battle_sessions enable row level security;
alter table battle_turns enable row level security;

create policy "battle_rooms read public open"
  on battle_rooms for select
  to authenticated
  using (visibility = 'public' and status = 'open');

create policy "battle_rooms read member"
  on battle_rooms for select
  to authenticated
  using (
    exists (
      select 1 from battle_room_members m
      where m.room_id = battle_rooms.id
        and m.user_id = (select auth.uid())
        and m.status <> 'left'
    )
  );

create policy "battle_room_members read public room"
  on battle_room_members for select
  to authenticated
  using (
    exists (
      select 1 from battle_rooms r
      where r.id = battle_room_members.room_id
        and r.visibility = 'public'
        and r.status = 'open'
    )
  );

create policy "battle_room_members read same room"
  on battle_room_members for select
  to authenticated
  using (
    exists (
      select 1 from battle_room_members mine
      where mine.room_id = battle_room_members.room_id
        and mine.user_id = (select auth.uid())
        and mine.status <> 'left'
    )
  );

create policy "battle_sessions read participants"
  on battle_sessions for select
  to authenticated
  using (
    (select auth.uid()) in (challenger_user_id, defender_user_id)
  );

create policy "battle_turns read participants"
  on battle_turns for select
  to authenticated
  using (
    exists (
      select 1 from battle_sessions s
      where s.id = battle_turns.session_id
        and (select auth.uid()) in (s.challenger_user_id, s.defender_user_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Internal finalize (called from submit / forfeit)
-- ---------------------------------------------------------------------------

create or replace function public.battle_finalize(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  sess battle_sessions;
  c_pet pets;
  d_pet pets;
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

  select * into c_pet from pets where id = sess.challenger_pet_id for update;
  select * into d_pet from pets where id = sess.defender_pet_id for update;

  c_won := sess.winner_user_id = sess.challenger_user_id;
  d_won := sess.winner_user_id = sess.defender_user_id;
  c_fled := sess.fled_user_id = sess.challenger_user_id;
  d_fled := sess.fled_user_id = sess.defender_user_id;

  update pets set hp = greatest(0, least(100, sess.challenger_hp)) where id = sess.challenger_pet_id;
  update pets set hp = greatest(0, least(100, sess.defender_hp)) where id = sess.defender_pet_id;

  if sess.status = 'fled' then
    if c_fled then
      update pets set mood = greatest(0, least(100, mood - 3)) where id = sess.challenger_pet_id;
      update pets set mood = greatest(0, least(100, mood + 5)) where id = sess.defender_pet_id;
    else
      update pets set mood = greatest(0, least(100, mood - 3)) where id = sess.defender_pet_id;
      update pets set mood = greatest(0, least(100, mood + 5)) where id = sess.challenger_pet_id;
    end if;
  elsif c_won then
    update pets set mood = greatest(0, least(100, mood + 5)) where id = sess.challenger_pet_id;
    update pets set hp = greatest(0, least(100, hp - 5)) where id = sess.defender_pet_id;
  elsif d_won then
    update pets set mood = greatest(0, least(100, mood + 5)) where id = sess.defender_pet_id;
    update pets set hp = greatest(0, least(100, hp - 5)) where id = sess.challenger_pet_id;
  end if;

  insert into battles (challenger_pet_id, defender_pet_id, winner_pet_id, battle_log)
  values (
    sess.challenger_pet_id,
    sess.defender_pet_id,
    case
      when sess.winner_user_id = sess.challenger_user_id then sess.challenger_pet_id
      when sess.winner_user_id = sess.defender_user_id then sess.defender_pet_id
      else null
    end,
    coalesce(
      (select jsonb_agg(message order by created_at) from battle_turns where session_id = sess.id),
      '[]'::jsonb
    )
  );

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
-- Room RPCs
-- ---------------------------------------------------------------------------

create or replace function public.room_create(p_name text default null)
returns battle_rooms
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof profiles;
  new_room battle_rooms;
  room_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.get_user_battle_pet(uid);

  select * into prof from profiles where id = uid;

  room_name := coalesce(nullif(trim(p_name), ''), 'ห้องของ ' || coalesce(prof.username, 'ผู้เล่น'));

  insert into battle_rooms (host_user_id, room_code, name, expires_at)
  values (uid, public.generate_battle_room_code(), room_name, now() + interval '30 minutes')
  returning * into new_room;

  insert into battle_room_members (room_id, user_id, role, status)
  values (new_room.id, uid, 'host', 'waiting');

  return new_room;
end;
$$;

revoke all on function public.room_create(text) from public;
grant execute on function public.room_create(text) to authenticated;

create or replace function public.room_join(p_room_code text)
returns battle_rooms
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec battle_rooms;
  member_count int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.get_user_battle_pet(uid);

  select * into room_rec
  from battle_rooms
  where room_code = upper(trim(p_room_code))
    and status = 'open'
    and visibility = 'public';

  if room_rec.id is null then
    raise exception 'Room not found';
  end if;

  if room_rec.expires_at is not null and room_rec.expires_at < now() then
    update battle_rooms set status = 'closed' where id = room_rec.id;
    raise exception 'Room expired';
  end if;

  select count(*) into member_count
  from battle_room_members
  where room_id = room_rec.id and status <> 'left';

  if member_count >= room_rec.max_members then
    raise exception 'Room is full';
  end if;

  insert into battle_room_members (room_id, user_id, role, status)
  values (room_rec.id, uid, 'member', 'waiting')
  on conflict (room_id, user_id) do update
    set status = 'waiting', joined_at = now()
    where battle_room_members.status = 'left';

  update battle_rooms set expires_at = now() + interval '30 minutes' where id = room_rec.id;

  return room_rec;
end;
$$;

revoke all on function public.room_join(text) from public;
grant execute on function public.room_join(text) to authenticated;

create or replace function public.room_leave(p_room_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec battle_rooms;
  member_rec battle_room_members;
  new_host uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into room_rec from battle_rooms where id = p_room_id for update;
  if room_rec.id is null then
    raise exception 'Room not found';
  end if;

  select * into member_rec
  from battle_room_members
  where room_id = p_room_id and user_id = uid;

  if member_rec.user_id is null or member_rec.status = 'left' then
    raise exception 'Not a room member';
  end if;

  if member_rec.status = 'in_battle' and room_rec.active_session_id is not null then
    perform public.room_forfeit(p_room_id);
    return;
  end if;

  update battle_room_members set status = 'left' where room_id = p_room_id and user_id = uid;

  if room_rec.host_user_id = uid then
    select user_id into new_host
    from battle_room_members
    where room_id = p_room_id and status = 'waiting' and user_id <> uid
    order by joined_at
    limit 1;

    if new_host is null then
      update battle_rooms set status = 'closed' where id = p_room_id;
    else
      update battle_rooms set host_user_id = new_host where id = p_room_id;
      update battle_room_members set role = 'host' where room_id = p_room_id and user_id = new_host;
    end if;
  end if;
end;
$$;

revoke all on function public.room_leave(uuid) from public;
grant execute on function public.room_leave(uuid) to authenticated;

create or replace function public.room_forfeit(p_room_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec battle_rooms;
  sess_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into room_rec from battle_rooms where id = p_room_id for update;
  if room_rec.id is null then
    raise exception 'Room not found';
  end if;

  sess_id := room_rec.active_session_id;

  if sess_id is not null then
    perform public.battle_submit_action(sess_id, 'flee');
  end if;

  perform public.room_leave(p_room_id);
end;
$$;

revoke all on function public.room_forfeit(uuid) from public;
grant execute on function public.room_forfeit(uuid) to authenticated;

create or replace function public.room_list_public()
returns table (
  id uuid,
  room_code text,
  name text,
  host_username text,
  member_count bigint,
  waiting_count bigint,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.room_code,
    r.name,
    p.username as host_username,
    count(m.*) filter (where m.status <> 'left') as member_count,
    count(m.*) filter (where m.status = 'waiting') as waiting_count,
    r.created_at
  from battle_rooms r
  join profiles p on p.id = r.host_user_id
  left join battle_room_members m on m.room_id = r.id
  where r.status = 'open'
    and r.visibility = 'public'
    and (r.expires_at is null or r.expires_at > now())
  group by r.id, p.username
  order by r.created_at desc;
$$;

revoke all on function public.room_list_public() from public;
grant execute on function public.room_list_public() to authenticated;

create or replace function public.room_get_members(p_room_id uuid)
returns table (
  room_id uuid,
  user_id uuid,
  username text,
  role text,
  status text,
  joined_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.room_id,
    m.user_id,
    p.username,
    m.role,
    m.status,
    m.joined_at
  from battle_room_members m
  join profiles p on p.id = m.user_id
  where m.room_id = p_room_id
    and m.status <> 'left'
  order by m.joined_at;
$$;

revoke all on function public.room_get_members(uuid) from public;
grant execute on function public.room_get_members(uuid) to authenticated;

create or replace function public.room_start_duel(p_room_id uuid, p_opponent_user_id uuid)
returns battle_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec battle_rooms;
  host_member battle_room_members;
  opp_member battle_room_members;
  c_pet pets;
  d_pet pets;
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

  insert into battle_sessions (
    room_id,
    challenger_user_id, defender_user_id,
    challenger_pet_id, defender_pet_id,
    challenger_hp, defender_hp,
    challenger_hp_start, defender_hp_start,
    status, turn_user_id
  ) values (
    p_room_id,
    uid, p_opponent_user_id,
    c_pet.id, d_pet.id,
    c_pet.hp, d_pet.hp,
    c_pet.hp, d_pet.hp,
    'active', uid
  ) returning * into new_sess;

  update battle_rooms set active_session_id = new_sess.id where id = p_room_id;

  update battle_room_members set status = 'in_battle'
  where room_id = p_room_id and user_id in (uid, p_opponent_user_id);

  return new_sess;
end;
$$;

revoke all on function public.room_start_duel(uuid, uuid) from public;
grant execute on function public.room_start_duel(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Battle RPCs
-- ---------------------------------------------------------------------------

create or replace function public.battle_create_challenge(p_defender_user_id uuid)
returns battle_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c_pet pets;
  d_pet pets;
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

  insert into battle_sessions (
    challenger_user_id, defender_user_id,
    challenger_pet_id, defender_pet_id,
    challenger_hp, defender_hp,
    challenger_hp_start, defender_hp_start,
    status, expires_at
  ) values (
    uid, p_defender_user_id,
    c_pet.id, d_pet.id,
    c_pet.hp, d_pet.hp,
    c_pet.hp, d_pet.hp,
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
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess battle_sessions;
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

  perform public.get_user_battle_pet(uid);

  update battle_sessions
  set status = 'active', turn_user_id = sess.challenger_user_id
  where id = p_session_id
  returning * into sess;

  return sess;
end;
$$;

revoke all on function public.battle_respond(uuid, boolean) from public;
grant execute on function public.battle_respond(uuid, boolean) to authenticated;

create or replace function public.battle_submit_action(p_session_id uuid, p_action text)
returns battle_sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess battle_sessions;
  is_challenger boolean;
  actor_elem text;
  opp_elem text;
  actor_name text;
  opp_name text;
  base_dmg int;
  random_factor numeric;
  elem_mult numeric;
  dmg int;
  effective_action text;
  msg text;
  winner uuid;
  opp_defending boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_action not in ('attack', 'ultimate', 'defend', 'flee') then
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
    select element, name into actor_elem, actor_name from pets where id = sess.challenger_pet_id;
    select element, name into opp_elem, opp_name from pets where id = sess.defender_pet_id;
    opp_defending := sess.defender_defending;
  else
    select element, name into actor_elem, actor_name from pets where id = sess.defender_pet_id;
    select element, name into opp_elem, opp_name from pets where id = sess.challenger_pet_id;
    opp_defending := sess.challenger_defending;
  end if;

  if p_action = 'flee' then
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

    perform public.battle_finalize(p_session_id);
    return sess;
  end if;

  if p_action = 'defend' then
    if is_challenger then
      update battle_sessions
      set challenger_defending = true, turn_user_id = sess.defender_user_id
      where id = p_session_id returning * into sess;
    else
      update battle_sessions
      set defender_defending = true, turn_user_id = sess.challenger_user_id
      where id = p_session_id returning * into sess;
    end if;

    msg := actor_name || ' ตั้งท่าป้องกัน';

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'defend', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );

    return sess;
  end if;

  effective_action := p_action;

  if p_action = 'ultimate' then
    if is_challenger and sess.challenger_ultimate_used then
      effective_action := 'attack';
    elsif not is_challenger and sess.defender_ultimate_used then
      effective_action := 'attack';
    end if;
  end if;

  base_dmg := case when effective_action = 'ultimate' then 30 else 15 end;
  random_factor := 0.9 + random() * 0.2;
  elem_mult := public.battle_element_mult(actor_elem, opp_elem);
  dmg := round(base_dmg * elem_mult * random_factor)::int;

  if opp_defending then
    dmg := round(dmg * 0.5)::int;
  end if;

  if is_challenger then
    update battle_sessions
    set
      defender_hp = greatest(0, sess.defender_hp - dmg),
      challenger_ultimate_used = challenger_ultimate_used or (p_action = 'ultimate' and effective_action = 'ultimate'),
      defender_defending = false,
      turn_user_id = sess.defender_user_id
    where id = p_session_id
    returning * into sess;
  else
    update battle_sessions
    set
      challenger_hp = greatest(0, sess.challenger_hp - dmg),
      defender_ultimate_used = defender_ultimate_used or (p_action = 'ultimate' and effective_action = 'ultimate'),
      challenger_defending = false,
      turn_user_id = sess.challenger_user_id
    where id = p_session_id
    returning * into sess;
  end if;

  if p_action = 'ultimate' and effective_action = 'attack' then
    msg := actor_name || ' ใช้ท่าไม้ตายไม่ได้แล้ว — โจมตี ' || opp_name || ' -' || dmg || ' HP';
  elsif effective_action = 'ultimate' then
    msg := actor_name || ' ใช้ท่าไม้ตาย ' || opp_name || ' -' || dmg || ' HP';
  else
    msg := actor_name || ' โจมตี ' || opp_name || ' -' || dmg || ' HP';
  end if;

  insert into battle_turns (
    session_id, actor_user_id, action, damage,
    challenger_hp_after, defender_hp_after, message
  ) values (
    p_session_id, uid, p_action, dmg,
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

    perform public.battle_finalize(p_session_id);
  end if;

  return sess;
end;
$$;

revoke all on function public.battle_submit_action(uuid, text) from public;
grant execute on function public.battle_submit_action(uuid, text) to authenticated;

create or replace function public.battle_list_for_user()
returns setof battle_sessions
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from battle_sessions
  where (select auth.uid()) in (challenger_user_id, defender_user_id)
  order by created_at desc;
$$;

revoke all on function public.battle_list_for_user() from public;
grant execute on function public.battle_list_for_user() to authenticated;

create or replace function public.battle_get_turns(p_session_id uuid)
returns setof battle_turns
language sql
stable
security invoker
set search_path = public
as $$
  select t.*
  from battle_turns t
  join battle_sessions s on s.id = t.session_id
  where t.session_id = p_session_id
    and (select auth.uid()) in (s.challenger_user_id, s.defender_user_id)
  order by t.created_at;
$$;

revoke all on function public.battle_get_turns(uuid) from public;
grant execute on function public.battle_get_turns(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table battle_sessions;
alter publication supabase_realtime add table battle_room_members;
alter publication supabase_realtime add table battle_rooms;
