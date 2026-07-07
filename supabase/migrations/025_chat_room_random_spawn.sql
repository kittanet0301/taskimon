-- Random spawn position and facing each time a user joins a chat room

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
  values (
    p_room_id,
    uid,
    0.06 + random() * 0.88,
    0.62,
    case when random() < 0.5 then 'left' else 'right' end,
    'idle',
    now()
  )
  on conflict (room_id, user_id) do update
    set
      x = excluded.x,
      y = excluded.y,
      facing = excluded.facing,
      anim = 'idle',
      updated_at = now();

  return room_rec;
end;
$$;

revoke all on function public.chat_room_join(uuid) from public;
grant execute on function public.chat_room_join(uuid) to authenticated;
