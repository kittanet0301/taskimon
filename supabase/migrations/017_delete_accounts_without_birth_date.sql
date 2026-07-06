-- One-time cleanup: remove accounts that have no birth_date on file.
-- Requires migration 016 (birth_date column). All existing rows have null birth_date until re-registered.

delete from auth.users u
where exists (
  select 1 from public.profiles p
  where p.id = u.id and p.birth_date is null
)
or not exists (
  select 1 from public.profiles p where p.id = u.id
);
