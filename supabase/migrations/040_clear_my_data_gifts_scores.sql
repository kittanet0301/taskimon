-- Allow Clear My Data to remove gifts and minigame scores for the signed-in user.

drop policy if exists "gifts delete involved" on public.gifts;
create policy "gifts delete involved"
  on public.gifts for delete
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists "minigame_scores delete own" on public.minigame_scores;
create policy "minigame_scores delete own"
  on public.minigame_scores for delete
  to authenticated
  using ((select auth.uid()) = user_id);
