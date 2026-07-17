-- Migration 033: Friend gifting — send inventory items to an accepted friend

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  item_type text not null,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table gifts enable row level security;

-- Only readable by the two parties involved; all writes happen through send_gift() below.
create policy "gifts read involved" on gifts
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create index if not exists gifts_recipient_idx on gifts (recipient_id, created_at desc);
create index if not exists gifts_sender_idx on gifts (sender_id, created_at desc);

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

  insert into inventory (user_id, item_type, quantity)
  values (p_recipient_id, p_item_type, p_quantity)
  on conflict (user_id, item_type)
  do update set quantity = inventory.quantity + excluded.quantity;

  insert into gifts (sender_id, recipient_id, item_type, quantity)
  values (uid, p_recipient_id, p_item_type, p_quantity);

  return result;
end;
$$;

revoke all on function public.send_gift(uuid, text, int) from public;
grant execute on function public.send_gift(uuid, text, int) to authenticated;
