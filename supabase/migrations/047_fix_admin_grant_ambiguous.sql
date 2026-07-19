-- Fix admin_grant_item: param name item_type collided with inventory.item_type
-- in ON CONFLICT (user_id, item_type) — same class of bug as 036_fix_claim_gifts_ambiguous.
-- Also rename admin_grant_gems params for consistency and avoid future collisions.

drop function if exists public.admin_grant_gems(uuid, int);
drop function if exists public.admin_grant_item(uuid, text, int);

create function public.admin_grant_gems(p_target_id uuid, p_amount int)
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
  if p_target_id is null then
    raise exception 'target required';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'amount required';
  end if;

  insert into public.player_activity (user_id, gems)
  values (p_target_id, greatest(0, p_amount))
  on conflict (user_id) do update
  set gems = greatest(0, coalesce(public.player_activity.gems, 0) + excluded.gems)
  returning public.player_activity.gems into next_gems;

  return next_gems;
end;
$$;

revoke all on function public.admin_grant_gems(uuid, int) from public;
grant execute on function public.admin_grant_gems(uuid, int) to authenticated;

create function public.admin_grant_item(p_target_id uuid, p_item_type text, p_qty int)
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
  if p_target_id is null then
    raise exception 'target required';
  end if;
  if p_item_type is null or p_item_type not in (
    'food_basic', 'food_premium', 'medicine', 'water', 'toy',
    'dev_vitamin', 'battle_shield', 'breed_nest', 'skill_forget'
  ) then
    raise exception 'invalid item_type';
  end if;
  safe_qty := greatest(1, coalesce(p_qty, 1));

  insert into public.inventory as inv (user_id, item_type, quantity)
  values (p_target_id, p_item_type, safe_qty)
  on conflict (user_id, item_type) do update
  set quantity = inv.quantity + excluded.quantity
  returning inv.quantity into next_qty;

  return next_qty;
end;
$$;

revoke all on function public.admin_grant_item(uuid, text, int) from public;
grant execute on function public.admin_grant_item(uuid, text, int) to authenticated;
