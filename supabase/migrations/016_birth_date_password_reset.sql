-- Birth date on profiles + password reset to DDMMYYYY via email lookup

alter table profiles
  add column if not exists birth_date date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  code text;
  birth text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  birth := new.raw_user_meta_data->>'birth_date';
  insert into public.profiles (id, username, friend_code, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    code,
    case when birth ~ '^\d{4}-\d{2}-\d{2}$' then birth::date else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.reset_password_by_birthdate(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_birth_date date;
  v_password text;
begin
  if p_email is null or trim(p_email) = '' then
    return;
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if v_user_id is null then
    return;
  end if;

  select birth_date into v_birth_date
  from public.profiles
  where id = v_user_id;

  if v_birth_date is null then
    raise exception 'บัญชีนี้ยังไม่มีวันเกิด — ติดต่อผู้ดูแลระบบ';
  end if;

  v_password := to_char(v_birth_date, 'DDMMYYYY');

  update auth.users
  set
    encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = v_user_id;
end;
$$;

revoke all on function public.reset_password_by_birthdate(text) from public;
grant execute on function public.reset_password_by_birthdate(text) to anon, authenticated;
