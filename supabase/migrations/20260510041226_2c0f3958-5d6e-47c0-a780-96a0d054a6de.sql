
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS notify_until timestamptz;

CREATE OR REPLACE FUNCTION public.purchase_ticket(p_game_id uuid, p_qty int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_game record;
  v_balance numeric;
  v_existing int;
  v_total numeric;
  v_ids uuid[] := '{}';
  v_id uuid;
  i int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 3 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 3';
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.status <> 'live' THEN RAISE EXCEPTION 'Game is not live'; END IF;
  IF v_game.filled_slots + p_qty > v_game.total_slots THEN
    RAISE EXCEPTION 'Not enough slots available';
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.tickets
    WHERE game_id = p_game_id AND user_id = v_user;
  IF v_existing + p_qty > 3 THEN
    RAISE EXCEPTION 'Maximum 3 tickets per game (you already have %)', v_existing;
  END IF;

  v_total := v_game.entry_fee * p_qty;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Need PKR %, have PKR %', v_total, COALESCE(v_balance,0);
  END IF;

  UPDATE public.wallets
    SET balance = balance - v_total, updated_at = now()
    WHERE user_id = v_user;

  FOR i IN 1..p_qty LOOP
    INSERT INTO public.tickets (game_id, user_id)
      VALUES (p_game_id, v_user)
      RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
  END LOOP;

  UPDATE public.games
    SET filled_slots = filled_slots + p_qty
    WHERE id = p_game_id;

  INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
    VALUES (v_user, v_total, 'debit',
      format('%s ticket(s) for %s', p_qty, v_game.title), p_game_id::text);

  RETURN jsonb_build_object('ok', true, 'tickets', v_ids, 'charged', v_total);
END $$;

GRANT EXECUTE ON FUNCTION public.purchase_ticket(uuid, int) TO authenticated;
