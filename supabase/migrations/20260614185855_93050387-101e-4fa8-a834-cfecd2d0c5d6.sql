
CREATE TABLE IF NOT EXISTS public.responsible_gaming_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_spend_limit numeric,
  weekly_spend_limit numeric,
  self_excluded_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsible_gaming_limits TO authenticated;
GRANT ALL ON public.responsible_gaming_limits TO service_role;

ALTER TABLE public.responsible_gaming_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rg self read" ON public.responsible_gaming_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rg self upsert" ON public.responsible_gaming_limits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rg self update" ON public.responsible_gaming_limits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update purchase_ticket to enforce limits
CREATE OR REPLACE FUNCTION public.purchase_ticket(p_game_id uuid, p_qty integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_game record;
  v_balance numeric;
  v_existing int;
  v_total numeric;
  v_ids uuid[] := '{}';
  v_id uuid;
  i int;
  v_limits record;
  v_spent_today numeric;
  v_spent_week numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 3 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 3';
  END IF;

  SELECT * INTO v_limits FROM public.responsible_gaming_limits WHERE user_id = v_user;
  IF v_limits.self_excluded_until IS NOT NULL AND v_limits.self_excluded_until > now() THEN
    RAISE EXCEPTION 'Self-exclusion active until %', to_char(v_limits.self_excluded_until, 'YYYY-MM-DD HH24:MI');
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

  IF v_limits.daily_spend_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount),0) INTO v_spent_today FROM public.wallet_transactions
      WHERE user_id=v_user AND type='debit' AND description ILIKE '%ticket%'
        AND created_at > now() - interval '24 hours';
    IF v_spent_today + v_total > v_limits.daily_spend_limit THEN
      RAISE EXCEPTION 'Daily spending limit reached (PKR %). You spent PKR % today.',
        v_limits.daily_spend_limit, v_spent_today;
    END IF;
  END IF;

  IF v_limits.weekly_spend_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount),0) INTO v_spent_week FROM public.wallet_transactions
      WHERE user_id=v_user AND type='debit' AND description ILIKE '%ticket%'
        AND created_at > now() - interval '7 days';
    IF v_spent_week + v_total > v_limits.weekly_spend_limit THEN
      RAISE EXCEPTION 'Weekly spending limit reached (PKR %). You spent PKR % this week.',
        v_limits.weekly_spend_limit, v_spent_week;
    END IF;
  END IF;

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
END $function$;
