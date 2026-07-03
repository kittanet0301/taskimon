-- Fix: Supabase blocks DELETE without WHERE clause

create or replace function public.reset_all_game_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from battles where true;
  delete from pets where true;
  delete from inventory where true;
  delete from mission_progress where true;
  delete from player_activity where true;
end;
$$;

revoke all on function public.reset_all_game_data() from public;
grant execute on function public.reset_all_game_data() to authenticated;
