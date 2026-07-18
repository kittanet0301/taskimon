-- Align pets / player_activity column names with the live schema
-- (health / emotion / evolution). Idempotent for DBs that already renamed.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'hp'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'health'
  ) then
    alter table public.pets rename column hp to health;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'mood'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'emotion'
  ) then
    alter table public.pets rename column mood to emotion;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'dev_points'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'evolution'
  ) then
    alter table public.pets rename column dev_points to evolution;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'player_activity' and column_name = 'dev_points_this_hour'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'player_activity' and column_name = 'evolution_this_hour'
  ) then
    alter table public.player_activity rename column dev_points_this_hour to evolution_this_hour;
  end if;
end $$;

notify pgrst, 'reload schema';
