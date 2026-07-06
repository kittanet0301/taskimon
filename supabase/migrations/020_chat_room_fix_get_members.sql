-- Fix chat_room_get_members: "character" is a reserved word in PostgreSQL

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
