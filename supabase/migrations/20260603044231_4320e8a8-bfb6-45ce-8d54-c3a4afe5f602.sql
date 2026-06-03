
-- ============== VIP TIERS ==============
CREATE TABLE public.vip_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  min_spend numeric NOT NULL DEFAULT 0,
  cashback_pct numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#888',
  icon text NOT NULL DEFAULT '🥉',
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.vip_tiers TO anon, authenticated;
GRANT ALL ON public.vip_tiers TO service_role;
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vip read all" ON public.vip_tiers FOR SELECT USING (true);
CREATE POLICY "vip admin write" ON public.vip_tiers FOR ALL USING (private.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.vip_tiers(id,name,min_spend,cashback_pct,color,icon,perks,sort_order) VALUES
 ('bronze','Bronze',0,1,'#cd7f32','🥉','["1% weekly cashback","Standard support"]'::jsonb,1),
 ('silver','Silver',500,2,'#c0c0c0','🥈','["2% weekly cashback","Faster support","Silver badge"]'::jsonb,2),
 ('gold','Gold',2500,4,'#ffd700','🥇','["4% weekly cashback","Priority support","Gold badge","Exclusive games"]'::jsonb,3),
 ('platinum','Platinum',10000,6,'#e5e4e2','💎','["6% weekly cashback","VIP support","Platinum badge","Early access","Birthday bonus"]'::jsonb,4),
 ('diamond','Diamond',50000,10,'#b9f2ff','💠','["10% weekly cashback","Dedicated manager","Diamond badge","All perks","Custom games"]'::jsonb,5);

-- VIP view
CREATE OR REPLACE VIEW public.user_vip AS
SELECT
  w.user_id,
  COALESCE((SELECT SUM(amount) FROM public.wallet_transactions wt
            WHERE wt.user_id = w.user_id AND wt.type = 'debit'
              AND wt.description ILIKE '%ticket%'), 0) AS lifetime_spend,
  (SELECT t.id FROM public.vip_tiers t
   WHERE t.min_spend <= COALESCE((SELECT SUM(amount) FROM public.wallet_transactions wt
                                  WHERE wt.user_id = w.user_id AND wt.type='debit'
                                    AND wt.description ILIKE '%ticket%'),0)
   ORDER BY t.min_spend DESC LIMIT 1) AS tier_id
FROM public.wallets w;
GRANT SELECT ON public.user_vip TO authenticated, service_role;

-- ============== CASHBACK ==============
CREATE TABLE public.cashback_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  net_loss numeric NOT NULL,
  pct numeric NOT NULL,
  tier_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cashback_payouts TO authenticated;
GRANT ALL ON public.cashback_payouts TO service_role;
ALTER TABLE public.cashback_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback self" ON public.cashback_payouts FOR SELECT
  USING (auth.uid()=user_id OR private.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.claim_weekly_cashback()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_spend numeric;
  v_credit numeric;
  v_net numeric;
  v_tier record;
  v_amount numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT MAX(created_at) INTO v_last FROM public.cashback_payouts WHERE user_id=v_user;
  IF v_last IS NOT NULL AND v_last > now() - interval '7 days' THEN
    RAISE EXCEPTION 'Next cashback available in % days',
      round(EXTRACT(EPOCH FROM (v_last + interval '7 days' - now()))/86400.0, 1);
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_spend FROM public.wallet_transactions
    WHERE user_id=v_user AND type='debit' AND description ILIKE '%ticket%'
      AND created_at > now() - interval '7 days';
  SELECT COALESCE(SUM(amount),0) INTO v_credit FROM public.wallet_transactions
    WHERE user_id=v_user AND type='credit' AND (description ILIKE '%won%' OR description ILIKE '%prize%')
      AND created_at > now() - interval '7 days';
  v_net := v_spend - v_credit;
  IF v_net <= 0 THEN RAISE EXCEPTION 'No net losses this week — no cashback to claim'; END IF;

  SELECT t.* INTO v_tier FROM public.vip_tiers t
    WHERE t.min_spend <= (SELECT lifetime_spend FROM public.user_vip WHERE user_id=v_user)
    ORDER BY t.min_spend DESC LIMIT 1;

  v_amount := round(v_net * v_tier.cashback_pct / 100.0, 2);
  IF v_amount < 1 THEN RAISE EXCEPTION 'Cashback amount too small (< PKR 1)'; END IF;

  UPDATE public.wallets SET balance = balance + v_amount, updated_at=now() WHERE user_id=v_user;
  INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
    VALUES (v_user, v_amount, 'credit', format('Weekly %s cashback (%s%%)', v_tier.name, v_tier.cashback_pct), 'cashback');
  INSERT INTO public.cashback_payouts(user_id, amount, net_loss, pct, tier_id)
    VALUES (v_user, v_amount, v_net, v_tier.cashback_pct, v_tier.id);

  RETURN jsonb_build_object('ok',true,'amount',v_amount,'tier',v_tier.name,'pct',v_tier.cashback_pct);
END $$;

-- ============== SUPPORT TICKETS ==============
CREATE TYPE support_status AS ENUM ('open','pending','resolved','closed');
CREATE TYPE support_priority AS ENUM ('low','normal','high','urgent');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status support_status NOT NULL DEFAULT 'open',
  priority support_priority NOT NULL DEFAULT 'normal',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets self read" ON public.support_tickets FOR SELECT
  USING (auth.uid()=user_id OR private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tickets self insert" ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid()=user_id);
CREATE POLICY "tickets admin update" ON public.support_tickets FOR UPDATE
  USING (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs read" ON public.support_messages FOR SELECT
  USING (
    private.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id AND t.user_id=auth.uid())
  );
CREATE POLICY "msgs insert" ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid()=author_id AND (
      private.has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id AND t.user_id=auth.uid())
    )
  );

CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, last_message_at DESC);

-- bump ticket on new message
CREATE OR REPLACE FUNCTION public.bump_ticket_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.support_tickets
    SET last_message_at = now(),
        status = CASE
          WHEN NEW.is_admin AND status='open' THEN 'pending'::support_status
          WHEN NOT NEW.is_admin AND status='pending' THEN 'open'::support_status
          ELSE status END
    WHERE id = NEW.ticket_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bump_ticket AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_on_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- ============== KYC ==============
CREATE TYPE kyc_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  cnic_number text NOT NULL,
  cnic_front_url text NOT NULL,
  cnic_back_url text NOT NULL,
  selfie_url text NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc self read" ON public.kyc_submissions FOR SELECT
  USING (auth.uid()=user_id OR private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "kyc self insert" ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid()=user_id);
CREATE POLICY "kyc self update pending" ON public.kyc_submissions FOR UPDATE
  USING (auth.uid()=user_id AND status='pending');
CREATE POLICY "kyc admin update" ON public.kyc_submissions FOR UPDATE
  USING (private.has_role(auth.uid(),'admin'::app_role));

-- storage policies for kyc-documents bucket (bucket created via tool separately)
CREATE POLICY "kyc upload own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc read own" ON storage.objects FOR SELECT
  USING (bucket_id='kyc-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR private.has_role(auth.uid(),'admin'::app_role)
  ));
