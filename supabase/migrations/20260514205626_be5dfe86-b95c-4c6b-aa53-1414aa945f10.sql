
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  account_title text NOT NULL,
  account_number text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wd self insert" ON public.withdrawal_requests;
CREATE POLICY "wd self insert" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wd self read" ON public.withdrawal_requests;
CREATE POLICY "wd self read" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "wd admin update" ON public.withdrawal_requests;
CREATE POLICY "wd admin update" ON public.withdrawal_requests
  FOR UPDATE USING (private.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_wd_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wd_status ON public.withdrawal_requests(status);

-- Prevent duplicate deposit txns
CREATE UNIQUE INDEX IF NOT EXISTS uniq_deposit_txn
  ON public.deposit_requests(payment_method, transaction_id);

-- Request withdrawal: hold funds immediately
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_method text, p_title text, p_number text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount < 200 THEN
    RAISE EXCEPTION 'Minimum withdrawal is PKR 200';
  END IF;
  IF coalesce(p_method,'') = '' OR coalesce(p_title,'') = '' OR coalesce(p_number,'') = '' THEN
    RAISE EXCEPTION 'Payment details are required';
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF coalesce(v_balance,0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have PKR %', coalesce(v_balance,0);
  END IF;

  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = v_user;

  INSERT INTO public.withdrawal_requests(user_id, amount, payment_method, account_title, account_number)
    VALUES (v_user, p_amount, p_method, p_title, p_number)
    RETURNING id INTO v_id;

  INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
    VALUES (v_user, p_amount, 'debit', format('Withdrawal request to %s', p_method), v_id::text);

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

-- Admin approve/reject withdrawal
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_id uuid, p_approve boolean, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_req record;
BEGIN
  IF NOT private.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  IF p_approve THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved', processed_by = v_admin, processed_at = now(), admin_notes = p_notes
      WHERE id = p_id;
    INSERT INTO public.notifications(user_id, title, body)
      VALUES (v_req.user_id, 'Withdrawal approved',
        format('Your PKR %s withdrawal has been sent to %s.', v_req.amount, v_req.payment_method));
  ELSE
    -- refund
    UPDATE public.wallets SET balance = balance + v_req.amount, updated_at = now()
      WHERE user_id = v_req.user_id;
    INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
      VALUES (v_req.user_id, v_req.amount, 'credit',
        format('Withdrawal refund (rejected%s)', CASE WHEN p_notes IS NULL THEN '' ELSE ': ' || p_notes END),
        p_id::text);
    UPDATE public.withdrawal_requests
      SET status = 'rejected', processed_by = v_admin, processed_at = now(), admin_notes = p_notes
      WHERE id = p_id;
    INSERT INTO public.notifications(user_id, title, body)
      VALUES (v_req.user_id, 'Withdrawal rejected',
        format('Your PKR %s withdrawal was rejected. Funds returned to your wallet.', v_req.amount));
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;
