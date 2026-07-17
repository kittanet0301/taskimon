-- Migration 035: Pending gifts — recipient claims in Item Bag instead of auto-credit

alter table public.gifts
  add column if not exists claimed_at timestamptz;

-- Past gifts were already (attempted) credited; don't show them as claimable again.
update public.gifts
set claimed_at = created_at
where claimed_at is null;

create index if not exists gifts_pending_recipient_idx
  on public.gifts (recipient_id, created_at desc)
  where claimed_at is null;

-- Send only deducts sender inventory + logs an unclaimed gift (no recipient inventory credit).
create or replace function public.send_gift(p_recipient_id uuid, p_item_type text, p_quantity int)
returns inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  are_friends boolean;
  sender_qty int;
  result inventory;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_recipient_id is null or p_recipient_id = uid then
    raise exception 'Invalid recipient';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_item_type not in (
    'food_basic', 'food_premium', 'medicine', 'water', 'toy', 'dev_vitamin', 'battle_shield'
  ) then
    raise exception 'Invalid item type';
  end if;

  select exists (
    select 1 from friendships
    where status = 'accepted'
      and (
        (user_id = uid and friend_id = p_recipient_id)
        or (user_id = p_recipient_id and friend_id = uid)
      )
  ) into are_friends;

  if not are_friends then
    raise exception 'You can only send gifts to friends';
  end if;

  select quantity into sender_qty
  from inventory
  where user_id = uid and item_type = p_item_type
  for update;

  if sender_qty is null or sender_qty < p_quantity then
    raise exception 'Not enough items to send';
  end if;

  update inventory
  set quantity = sender_qty - p_quantity
  where user_id = uid and item_type = p_item_type
  returning * into result;

  insert into gifts (sender_id, recipient_id, item_type, quantity)
  values (uid, p_recipient_id, p_item_type, p_quantity);

  return result;
end;
$$;

revoke all on function public.send_gift(uuid, text, int) from public;
grant execute on function public.send_gift(uuid, text, int) to authenticated;

-- Pending gifts for the signed-in recipient (with sender display name).
create or replace function public.list_pending_gifts()
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  item_type text,
  quantity int,
  created_at timestamptz
)
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

  return query
  select
    g.id,
    g.sender_id,
    coalesce(p.username, '???')::text as sender_name,
    g.item_type,
    g.quantity,
    g.created_at
  from gifts g
  left join profiles p on p.id = g.sender_id
  where g.recipient_id = uid
    and g.claimed_at is null
  order by g.created_at asc;
end;
$$;

revoke all on function public.list_pending_gifts() from public;
grant execute on function public.list_pending_gifts() to authenticated;

-- Claim all (or one) pending gifts into the recipient inventory.
create or replace function public.claim_pending_gifts(p_gift_id uuid default null)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  item_type text,
  quantity int,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  v_sender_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  for r in
    select g.id as gift_id,
           g.sender_id as gift_sender_id,
           g.item_type as gift_item_type,
           g.quantity as gift_quantity,
           g.created_at as gift_created_at
    from gifts g
    where g.recipient_id = uid
      and g.claimed_at is null
      and (p_gift_id is null or g.id = p_gift_id)
    order by g.created_at asc
    for update
  loop
    insert into inventory as inv (user_id, item_type, quantity)
    values (uid, r.gift_item_type, r.gift_quantity)
    on conflict (user_id, item_type)
    do update set quantity = inv.quantity + excluded.quantity;

    update gifts
    set claimed_at = now()
    where gifts.id = r.gift_id;

    select coalesce(p.username, '???') into v_sender_name
    from profiles p
    where p.id = r.gift_sender_id;

    id := r.gift_id;
    sender_id := r.gift_sender_id;
    sender_name := coalesce(v_sender_name, '???');
    item_type := r.gift_item_type;
    quantity := r.gift_quantity;
    created_at := r.gift_created_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.claim_pending_gifts(uuid) from public;
grant execute on function public.claim_pending_gifts(uuid) to authenticated;
