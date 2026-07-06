-- Remove direct friend-challenge battle feature (ท้าเพื่อน).
-- Room-based battles (battle_rooms / room_start_duel / battle_submit_action) are kept.

drop function if exists public.battle_create_challenge(uuid);
drop function if exists public.battle_respond(uuid, boolean);
