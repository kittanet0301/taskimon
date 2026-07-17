-- Fix claim_pending_gifts: avoid RETURNS TABLE names colliding with inventory columns
-- (ON CONFLICT (user_id, item_type) was ambiguous with OUT param item_type).

drop function if exists public.claim_pending_gifts(uuid);

create function public.claim_pending_gifts(p_gift_id uuid default null)
returns table (
  claimed_id uuid,
  claimed_sender_id uuid,
  claimed_sender_name text,
  claimed_item_type text,
  claimed_quantity int,
  claimed_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  v_sender_name text;
  v_updated int;
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
    update inventory inv
    set quantity = inv.quantity + r.gift_quantity
    where inv.user_id = uid
      and inv.item_type = r.gift_item_type;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      insert into inventory (user_id, item_type, quantity)
      values (uid, r.gift_item_type, r.gift_quantity);
    end if;

    update gifts
    set claimed_at = now()
    where gifts.id = r.gift_id;

    select coalesce(p.username, '???') into v_sender_name
    from profiles p
    where p.id = r.gift_sender_id;

    claimed_id := r.gift_id;
    claimed_sender_id := r.gift_sender_id;
    claimed_sender_name := coalesce(v_sender_name, '???');
    claimed_item_type := r.gift_item_type;
    claimed_quantity := r.gift_quantity;
    claimed_created_at := r.gift_created_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.claim_pending_gifts(uuid) from public;
grant execute on function public.claim_pending_gifts(uuid) to authenticated;
