
REVOKE EXECUTE ON FUNCTION public.log_deposit_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_game_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_winner_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_activity() FROM PUBLIC, anon, authenticated;
