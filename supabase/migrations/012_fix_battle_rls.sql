-- Fix battle RLS recursion + use SECURITY DEFINER on RPCs that write data

-- Helper: check room membership without RLS recursion
create or replace function public.is_battle_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from battle_room_members
    where room_id = p_room_id
      and user_id = p_user_id
      and status <> 'left'
  );
$$;

revoke all on function public.is_battle_room_member(uuid, uuid) from public;
grant execute on function public.is_battle_room_member(uuid, uuid) to authenticated;

drop policy if exists "battle_room_members read same room" on battle_room_members;
create policy "battle_room_members read same room"
  on battle_room_members for select
  to authenticated
  using (public.is_battle_room_member(room_id, (select auth.uid())));

drop policy if exists "battle_rooms read member" on battle_rooms;
create policy "battle_rooms read member"
  on battle_rooms for select
  to authenticated
  using (public.is_battle_room_member(id, (select auth.uid())));

-- room_list_public: bypass RLS for public lobby listing
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
security definer
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

-- room_get_members: definer + membership check
create or replace function public.room_get_members(p_room_id uuid)
returns table (
  room_id uuid,
  user_id uuid,
  username text,
  role text,
  status text,
  joined_at timestamptz
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
  if not public.is_battle_room_member(p_room_id, auth.uid())
     and not exists (
       select 1 from battle_rooms r
       where r.id = p_room_id and r.visibility = 'public' and r.status = 'open'
     ) then
    raise exception 'Not allowed to view room members';
  end if;
  return query
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
end;
$$;

-- Mutating RPCs: SECURITY DEFINER so INSERT/UPDATE work without table policies
alter function public.room_create(text) security definer;
alter function public.room_join(text) security definer;
alter function public.room_leave(uuid) security definer;
alter function public.room_forfeit(uuid) security definer;
alter function public.room_start_duel(uuid, uuid) security definer;
alter function public.battle_create_challenge(uuid) security definer;
alter function public.battle_respond(uuid, boolean) security definer;
alter function public.battle_submit_action(uuid, text) security definer;
alter function public.battle_finalize(uuid) security definer;
