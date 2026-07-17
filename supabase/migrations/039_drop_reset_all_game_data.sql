-- Remove system-wide reset RPC (feature removed from app).
DROP FUNCTION IF EXISTS public.reset_all_game_data();
