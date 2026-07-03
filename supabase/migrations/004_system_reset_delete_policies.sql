-- Global game-data wipe for "ล้างระบบ" (keeps profiles, friendships, messages)

create or replace function public.reset_all_game_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from battles;
  delete from pets;
  delete from inventory;
  delete from mission_progress;
  delete from player_activity;
end;
$$;

revoke all on function public.reset_all_game_data() from public;
grant execute on function public.reset_all_game_data() to authenticated;
