-- Temporary: force pure (single) elements on breed_pets.
-- Mirror client FORCE_PURE_ELEMENTS in src/shared/elements.ts.
-- Revert by restoring pure_chance 0.60 / dual roll when dual types ship.

create or replace function public.breed_pets(p_pet_a uuid, p_pet_b uuid)
returns pets
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pet_a pets;
  pet_b pets;
  active_count int;
  slot_limit int;
  cooldown interval := interval '6 hours';
  now_ts timestamptz := now();
  chosen_species text;
  parent_a_pure boolean;
  parent_b_pure boolean;
  pure_chance numeric := 1.00; -- FORCE_PURE_ELEMENTS temporary
  is_pure boolean;
  primary_pool text[];
  secondary_pool text[];
  child_primary text;
  child_secondary text;
  base_a_str int; base_a_dex int; base_a_int int; base_a_con int;
  base_b_str int; base_b_dex int; base_b_int int; base_b_con int;
  child_str int;
  child_dex int;
  child_int int;
  child_con int;
  new_pet_id uuid := gen_random_uuid();
  child_name text;
  new_pet pets;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_pet_a is null or p_pet_b is null or p_pet_a = p_pet_b then
    raise exception 'Two distinct pets required';
  end if;

  select * into pet_a from public.pets where id = p_pet_a and owner_id = uid for update;
  if pet_a.id is null then
    raise exception 'Pet A not found';
  end if;
  select * into pet_b from public.pets where id = p_pet_b and owner_id = uid for update;
  if pet_b.id is null then
    raise exception 'Pet B not found';
  end if;

  if pet_a.stage <> 'adult' or pet_b.stage <> 'adult' then
    raise exception 'Both pets must be adult';
  end if;
  if pet_a.gender = pet_b.gender then
    raise exception 'Pets must have different genders';
  end if;

  if pet_a.last_bred_at is not null and pet_a.last_bred_at + cooldown > now_ts then
    raise exception 'Pet A still on breeding cooldown';
  end if;
  if pet_b.last_bred_at is not null and pet_b.last_bred_at + cooldown > now_ts then
    raise exception 'Pet B still on breeding cooldown';
  end if;

  -- Free slot check
  select count(*)::int into active_count from public.pets where owner_id = uid;
  select coalesce(pet_slot_limit, 5) into slot_limit
    from public.player_activity where user_id = uid;
  if slot_limit is null then
    slot_limit := 5;
  end if;
  if active_count >= slot_limit then
    raise exception 'No free pet slot (%/%)', active_count, slot_limit;
  end if;

  -- Consume 1 breed_nest
  if not exists (
    select 1 from public.inventory
    where user_id = uid and item_type = 'breed_nest' and quantity > 0
  ) then
    raise exception 'Need a Breed nest item';
  end if;
  update public.inventory
  set quantity = quantity - 1
  where user_id = uid and item_type = 'breed_nest' and quantity > 0;
  delete from public.inventory
  where user_id = uid and item_type = 'breed_nest' and quantity <= 0;

  -- Species 50/50 from parents
  chosen_species := case when random() < 0.5 then pet_a.species else pet_b.species end;

  parent_a_pure := (pet_a.element_secondary is null);
  parent_b_pure := (pet_b.element_secondary is null);
  if parent_a_pure and parent_b_pure and pet_a.element_primary = pet_b.element_primary then
    pure_chance := pure_chance + 0.05;
  end if;

  primary_pool := array[
    coalesce(pet_a.element_primary, 'neutral'),
    coalesce(pet_b.element_primary, 'neutral')
  ];
  secondary_pool := array[]::text[];
  if pet_a.element_secondary is not null then
    secondary_pool := secondary_pool || pet_a.element_secondary;
  end if;
  if pet_b.element_secondary is not null then
    secondary_pool := secondary_pool || pet_b.element_secondary;
  end if;

  child_primary := primary_pool[1 + floor(random() * array_length(primary_pool, 1))::int];
  is_pure := true; -- FORCE_PURE_ELEMENTS temporary (was: random() < pure_chance)
  if is_pure then
    child_secondary := null;
  else
    -- Prefer a parent's secondary; else pick the *other* parent's primary.
    if array_length(secondary_pool, 1) is not null and array_length(secondary_pool, 1) > 0 then
      child_secondary := secondary_pool[1 + floor(random() * array_length(secondary_pool, 1))::int];
    else
      child_secondary := case
        when child_primary = coalesce(pet_a.element_primary, 'neutral') then coalesce(pet_b.element_primary, 'neutral')
        else coalesce(pet_a.element_primary, 'neutral')
      end;
    end if;
    if child_secondary = child_primary then
      child_secondary := null;
    end if;
  end if;

  -- Base primaries from element table (average of two if dual)
  select s.str, s.dex, s."int", s.con
    into base_a_str, base_a_dex, base_a_int, base_a_con
    from public._rpg_element_base_stats(child_primary) s;
  if child_secondary is null then
    child_str := base_a_str;
    child_dex := base_a_dex;
    child_int := base_a_int;
    child_con := base_a_con;
  else
    select s.str, s.dex, s."int", s.con
      into base_b_str, base_b_dex, base_b_int, base_b_con
      from public._rpg_element_base_stats(child_secondary) s;
    child_str := greatest(1, round((base_a_str + base_b_str) / 2.0)::int);
    child_dex := greatest(1, round((base_a_dex + base_b_dex) / 2.0)::int);
    child_int := greatest(1, round((base_a_int + base_b_int) / 2.0)::int);
    child_con := greatest(1, round((base_a_con + base_b_con) / 2.0)::int);
  end if;

  child_name := initcap(chosen_species);

  insert into public.pets (
    id, owner_id, name, species, gender, stage,
    health, emotion, evolution,
    element_primary, element_secondary,
    str, dex, "int", con,
    skill_loadout, skill_upgrade_points,
    is_active, animation_state, feed_count, created_at
  ) values (
    new_pet_id, uid, child_name, chosen_species,
    case when random() < 0.5 then 'male' else 'female' end,
    'egg',
    100, 80, 0,
    child_primary, child_secondary,
    child_str, child_dex, child_int, child_con,
    null, 0,
    false, 'egg_idle', 0, now_ts
  ) returning * into new_pet;

  update public.pets set last_bred_at = now_ts where id in (p_pet_a, p_pet_b);

  return new_pet;
end;
$$;

revoke all on function public.breed_pets(uuid, uuid) from public;
grant execute on function public.breed_pets(uuid, uuid) to authenticated;
