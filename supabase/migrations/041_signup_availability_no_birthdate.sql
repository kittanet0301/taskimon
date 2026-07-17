-- Pre-signup availability checks (email in auth.users, username in profiles).
create or replace function public.check_signup_availability(p_email text, p_username text)
returns table (email_taken boolean, username_taken boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_username text := lower(trim(coalesce(p_username, '')));
begin
  if v_email = '' or v_username = '' then
    raise exception 'Email and username are required';
  end if;

  return query
  select
    exists (
      select 1 from auth.users u where lower(u.email) = v_email
    ),
    exists (
      select 1 from public.profiles p where lower(p.username) = v_username
    );
end;
$$;

revoke all on function public.check_signup_availability(text, text) from public;
grant execute on function public.check_signup_availability(text, text) to anon, authenticated;

-- Keep handle_new_user working without birth_date in metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into public.profiles (id, username, friend_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    code
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
