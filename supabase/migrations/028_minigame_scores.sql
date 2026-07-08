-- Minigame leaderboard scores (best distance/score per user per game)

create table if not exists public.minigame_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  best_score int not null default 0 check (best_score >= 0),
  achieved_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists minigame_scores_leaderboard_idx
  on public.minigame_scores (game_id, best_score desc);

alter table public.minigame_scores enable row level security;

drop policy if exists "minigame_scores read all" on public.minigame_scores;
create policy "minigame_scores read all"
  on public.minigame_scores for select
  using (true);

drop policy if exists "minigame_scores insert own" on public.minigame_scores;
create policy "minigame_scores insert own"
  on public.minigame_scores for insert
  with check (auth.uid() = user_id);

drop policy if exists "minigame_scores update own" on public.minigame_scores;
create policy "minigame_scores update own"
  on public.minigame_scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.get_minigame_leaderboard(
  p_game_id text,
  p_limit int default 50
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  best_score int,
  achieved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by ms.best_score desc, ms.achieved_at asc) as rank,
    ms.user_id,
    p.username,
    ms.best_score,
    ms.achieved_at
  from public.minigame_scores ms
  join public.profiles p on p.id = ms.user_id
  where ms.game_id = p_game_id
  order by ms.best_score desc, ms.achieved_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.get_minigame_leaderboard(text, int) to anon, authenticated;

create or replace function public.upsert_minigame_score(
  p_game_id text,
  p_score int
)
returns public.minigame_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.minigame_scores;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.minigame_scores (user_id, game_id, best_score, achieved_at)
  values (uid, p_game_id, greatest(0, p_score), now())
  on conflict (user_id, game_id) do update
    set best_score = greatest(public.minigame_scores.best_score, excluded.best_score),
        achieved_at = case
          when excluded.best_score > public.minigame_scores.best_score then now()
          else public.minigame_scores.achieved_at
        end
  returning * into row;

  return row;
end;
$$;

grant execute on function public.upsert_minigame_score(text, int) to authenticated;
