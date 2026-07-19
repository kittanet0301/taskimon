-- 046: profiles.role (user | admin) + admin RPCs
-- Assign admin manually, e.g.:
--   update public.profiles set role = 'admin' where username = 'YOUR_NAME';

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Block authenticated clients from changing role; allow SQL editor (auth.uid() is null).
create or replace function public.profiles_lock_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is null then
      return new;
    end if;
    raise exception 'profiles.role cannot be changed by clients';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role
  before update of role on public.profiles
  for each row
  execute function public.profiles_lock_role();

-- Ensure signup trigger never inserts admin (role defaults to 'user').
-- handle_new_user already omits role → default applies.

create or replace function public.admin_list_players()
returns table (
  id uuid,
  username text,
  friend_code text,
  role text,
  gems int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return query
  select
    p.id,
    p.username,
    p.friend_code,
    p.role,
    coalesce(a.gems, 0)::int as gems
  from public.profiles p
  left join public.player_activity a on a.user_id = p.id
  order by p.username asc;
end;
$$;

revoke all on function public.admin_list_players() from public;
grant execute on function public.admin_list_players() to authenticated;

create or replace function public.admin_grant_gems(target_id uuid, amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_gems int;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if target_id is null then
    raise exception 'target required';
  end if;
  if amount is null or amount = 0 then
    raise exception 'amount required';
  end if;

  insert into public.player_activity (user_id, gems)
  values (target_id, greatest(0, amount))
  on conflict (user_id) do update
  set gems = greatest(0, coalesce(public.player_activity.gems, 0) + excluded.gems)
  returning public.player_activity.gems into next_gems;

  return next_gems;
end;
$$;

revoke all on function public.admin_grant_gems(uuid, int) from public;
grant execute on function public.admin_grant_gems(uuid, int) to authenticated;

create or replace function public.admin_grant_item(target_id uuid, item_type text, qty int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_qty int;
  safe_qty int;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if target_id is null then
    raise exception 'target required';
  end if;
  if item_type is null or item_type not in (
    'food_basic', 'food_premium', 'medicine', 'water', 'toy',
    'dev_vitamin', 'battle_shield', 'breed_nest', 'skill_forget'
  ) then
    raise exception 'invalid item_type';
  end if;
  safe_qty := greatest(1, coalesce(qty, 1));

  insert into public.inventory (user_id, item_type, quantity)
  values (target_id, item_type, safe_qty)
  on conflict (user_id, item_type) do update
  set quantity = public.inventory.quantity + excluded.quantity
  returning public.inventory.quantity into next_qty;

  return next_qty;
end;
$$;

revoke all on function public.admin_grant_item(uuid, text, int) from public;
grant execute on function public.admin_grant_item(uuid, text, int) to authenticated;

create or replace function public.admin_clear_user_data(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if target_id is null then
    raise exception 'target required';
  end if;
  if target_id = auth.uid() then
    raise exception 'use clear my data for yourself';
  end if;

  delete from public.pets where owner_id = target_id;
  delete from public.inventory where user_id = target_id;
  delete from public.mission_progress where user_id = target_id;
  delete from public.player_activity where user_id = target_id;
  delete from public.gifts where sender_id = target_id or recipient_id = target_id;
  delete from public.minigame_scores where user_id = target_id;

  -- Bootstrap empty activity so next login can hydrate cleanly
  insert into public.player_activity (user_id, gems)
  values (target_id, 0)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.admin_clear_user_data(uuid) from public;
grant execute on function public.admin_clear_user_data(uuid) to authenticated;
