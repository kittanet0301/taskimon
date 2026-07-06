-- Migration 019: lobby chat rooms with position sync + floating messages

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.chat_rooms (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  max_members int not null default 30,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists chat_room_messages_room_created_idx
  on public.chat_room_messages (room_id, created_at desc);

create table if not exists public.chat_room_positions (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  x double precision not null default 0.5 check (x >= 0 and x <= 1),
  y double precision not null default 0.5 check (y >= 0 and y <= 1),
  facing text not null default 'right' check (facing in ('left', 'right')),
  anim text not null default 'idle' check (anim in ('idle', 'walk', 'jump')),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Seed 4 test rooms
insert into public.chat_rooms (id, slug, name) values
  ('a0000000-0000-4000-8000-000000000001', 'plaza', 'Plaza'),
  ('a0000000-0000-4000-8000-000000000002', 'park', 'Park'),
  ('a0000000-0000-4000-8000-000000000003', 'beach', 'Beach'),
  ('a0000000-0000-4000-8000-000000000004', 'cave', 'Cave')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.chat_room_members;
alter publication supabase_realtime add table public.chat_room_messages;
alter publication supabase_realtime add table public.chat_room_positions;

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

create or replace function public.is_chat_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id
      and user_id = p_user_id
      and status = 'active'
  );
$$;

revoke all on function public.is_chat_room_member(uuid, uuid) from public;
grant execute on function public.is_chat_room_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_room_messages enable row level security;
alter table public.chat_room_positions enable row level security;

create policy "chat_rooms read authenticated"
  on public.chat_rooms for select
  to authenticated
  using (true);

create policy "chat_room_members read same room"
  on public.chat_room_members for select
  to authenticated
  using (public.is_chat_room_member(room_id, (select auth.uid())));

create policy "chat_room_messages read same room"
  on public.chat_room_messages for select
  to authenticated
  using (public.is_chat_room_member(room_id, (select auth.uid())));

create policy "chat_room_positions read same room"
  on public.chat_room_positions for select
  to authenticated
  using (public.is_chat_room_member(room_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.chat_room_list()
returns table (
  id uuid,
  slug text,
  name text,
  max_members int,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.slug,
    r.name,
    r.max_members,
    count(m.*) filter (where m.status = 'active') as member_count
  from public.chat_rooms r
  left join public.chat_room_members m on m.room_id = r.id
  group by r.id
  order by r.slug;
$$;

revoke all on function public.chat_room_list() from public;
grant execute on function public.chat_room_list() to authenticated;

create or replace function public.chat_room_join(p_room_id uuid)
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room_rec public.chat_rooms;
  member_count int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into room_rec from public.chat_rooms where id = p_room_id;
  if not found then
    raise exception 'Room not found';
  end if;

  select count(*)::int into member_count
  from public.chat_room_members
  where room_id = p_room_id and status = 'active';

  if member_count >= room_rec.max_members then
    raise exception 'Room is full';
  end if;

  insert into public.chat_room_members (room_id, user_id, status, joined_at)
  values (p_room_id, uid, 'active', now())
  on conflict (room_id, user_id) do update
    set status = 'active', joined_at = now();

  insert into public.chat_room_positions (room_id, user_id, x, y, facing, anim, updated_at)
  values (p_room_id, uid, 0.2 + random() * 0.6, 0.55, 'right', 'idle', now())
  on conflict (room_id, user_id) do update
    set updated_at = now();

  return room_rec;
end;
$$;

revoke all on function public.chat_room_join(uuid) from public;
grant execute on function public.chat_room_join(uuid) to authenticated;

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

  update public.chat_room_members
  set status = 'left'
  where room_id = p_room_id and user_id = uid;

  delete from public.chat_room_positions
  where room_id = p_room_id and user_id = uid;
end;
$$;

revoke all on function public.chat_room_leave(uuid) from public;
grant execute on function public.chat_room_leave(uuid) to authenticated;

create or replace function public.chat_room_send(p_room_id uuid, p_content text)
returns public.chat_room_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  msg public.chat_room_messages;
  trimmed text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_chat_room_member(p_room_id, uid) then
    raise exception 'Not a room member';
  end if;

  trimmed := trim(p_content);
  if char_length(trimmed) = 0 or char_length(trimmed) > 200 then
    raise exception 'Invalid message length';
  end if;

  insert into public.chat_room_messages (room_id, sender_id, content)
  values (p_room_id, uid, trimmed)
  returning * into msg;

  return msg;
end;
$$;

revoke all on function public.chat_room_send(uuid, text) from public;
grant execute on function public.chat_room_send(uuid, text) to authenticated;

create or replace function public.chat_room_update_position(
  p_room_id uuid,
  p_x double precision,
  p_y double precision,
  p_facing text,
  p_anim text
)
returns public.chat_room_positions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pos public.chat_room_positions;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_chat_room_member(p_room_id, uid) then
    raise exception 'Not a room member';
  end if;

  insert into public.chat_room_positions (room_id, user_id, x, y, facing, anim, updated_at)
  values (
    p_room_id,
    uid,
    greatest(0, least(1, p_x)),
    greatest(0, least(1, p_y)),
    case when p_facing = 'left' then 'left' else 'right' end,
    case when p_anim in ('idle', 'walk', 'jump') then p_anim else 'idle' end,
    now()
  )
  on conflict (room_id, user_id) do update
    set x = excluded.x,
        y = excluded.y,
        facing = excluded.facing,
        anim = excluded.anim,
        updated_at = now()
  returning * into pos;

  return pos;
end;
$$;

revoke all on function public.chat_room_update_position(uuid, double precision, double precision, text, text) from public;
grant execute on function public.chat_room_update_position(uuid, double precision, double precision, text, text) to authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_chat_room_member(p_room_id, auth.uid()) then
    raise exception 'Not a room member';
  end if;

  return query
  select
    m.user_id,
    p.username,
    coalesce(pet.species, 'cole') as pet_character,
    coalesce(pet.gender, 'male') as gender,
    coalesce(pet.stage, 'adult') as stage,
    coalesce(pos.x, 0.5) as x,
    coalesce(pos.y, 0.55) as y,
    coalesce(pos.facing, 'right') as facing,
    coalesce(pos.anim, 'idle') as anim
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
