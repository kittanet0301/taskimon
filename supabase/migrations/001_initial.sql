-- Taskino schema

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  friend_code text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  species text not null,
  element text not null,
  gender text not null,
  stage text default 'egg',
  hp int default 100,
  mood int default 80,
  dev_points int default 0,
  is_active boolean default true,
  hatched_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  challenger_pet_id uuid references pets(id),
  defender_pet_id uuid references pets(id),
  winner_pet_id uuid references pets(id),
  battle_log jsonb,
  created_at timestamptz default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  item_type text not null,
  quantity int default 1
);

create table if not exists mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  mission_id text not null,
  progress int default 0,
  completed boolean default false,
  reset_at timestamptz not null,
  unique(user_id, mission_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table pets enable row level security;
alter table friendships enable row level security;
alter table battles enable row level security;
alter table inventory enable row level security;
alter table mission_progress enable row level security;
alter table messages enable row level security;

create policy "profiles read all" on profiles for select using (true);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

create policy "pets read all" on pets for select using (true);
create policy "pets manage own" on pets for all using (auth.uid() = owner_id);

create policy "friendships read own" on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships insert own" on friendships for insert with check (auth.uid() = user_id);
create policy "friendships update involved" on friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "battles read all" on battles for select using (true);
create policy "battles insert auth" on battles for insert with check (auth.uid() is not null);

create policy "inventory own" on inventory for all using (auth.uid() = user_id);

create policy "missions own" on mission_progress for all using (auth.uid() = user_id);

create policy "messages read own" on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages insert own" on messages for insert with check (auth.uid() = sender_id);
