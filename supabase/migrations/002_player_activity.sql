-- Migration 002: player activity + pet metadata + inventory constraints

alter table pets
  add column if not exists feed_count int default 0,
  add column if not exists animation_state text default 'egg_idle';

create table if not exists player_activity (
  user_id uuid primary key references profiles(id) on delete cascade,
  clicks int default 0 not null,
  keystrokes int default 0 not null,
  dev_points_this_hour int default 0 not null,
  hour_started_at timestamptz default now() not null,
  total_play_seconds int default 0 not null,
  daily_missions_completed_days int default 0 not null,
  session_started_at timestamptz default now() not null,
  last_saved timestamptz default now() not null,
  save_version int default 1 not null
);

alter table player_activity enable row level security;

create policy "activity own" on player_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- inventory: one row per item type per user
create unique index if not exists inventory_user_item_unique
  on inventory (user_id, item_type);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into public.profiles (id, username, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    code
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- enable realtime for chat
alter publication supabase_realtime add table messages;
