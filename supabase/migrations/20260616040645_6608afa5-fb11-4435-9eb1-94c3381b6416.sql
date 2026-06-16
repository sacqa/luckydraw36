
-- =========== ACTIVATE DEPOSIT METHODS ============
UPDATE public.deposit_methods SET is_active = true WHERE method_name IN ('Easypaisa','JazzCash','Bank Transfer');

-- =========== SPIN WHEEL OPTIONS ============
CREATE TABLE IF NOT EXISTS public.spin_wheel_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  reward_amount numeric NOT NULL CHECK (reward_amount >= 0),
  weight integer NOT NULL DEFAULT 1 CHECK (weight > 0),
  color text NOT NULL DEFAULT '#ff6b35',
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.spin_wheel_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.spin_wheel_options TO authenticated;
GRANT ALL ON public.spin_wheel_options TO service_role;

ALTER TABLE public.spin_wheel_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spin_wheel_options public read" ON public.spin_wheel_options FOR SELECT USING (true);
CREATE POLICY "spin_wheel_options admin write" ON public.spin_wheel_options
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults if empty
INSERT INTO public.spin_wheel_options (label, reward_amount, weight, color, position)
SELECT * FROM (VALUES
  ('PKR 5',   5,   30, '#ff6b35', 0),
  ('PKR 10',  10,  25, '#f7931e', 1),
  ('PKR 25',  25,  18, '#fbbf24', 2),
  ('PKR 50',  50,  12, '#e84393', 3),
  ('PKR 100', 100, 8,  '#6c5ce7', 4),
  ('PKR 250', 250, 4,  '#22d3ee', 5),
  ('PKR 500', 500, 2,  '#10b981', 6),
  ('JACKPOT PKR 1000', 1000, 1, '#ef4444', 7)
) AS v(label, reward_amount, weight, color, position)
WHERE NOT EXISTS (SELECT 1 FROM public.spin_wheel_options);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_spin_wheel_options_updated ON public.spin_wheel_options;
CREATE TRIGGER trg_spin_wheel_options_updated BEFORE UPDATE ON public.spin_wheel_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Rewrite claim_daily_spin to use the table
CREATE OR REPLACE FUNCTION public.claim_daily_spin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_prog record;
  v_reward numeric;
  v_label text;
  v_bonus numeric := 0;
  v_new_streak integer;
  v_now timestamptz := now();
  v_hours numeric;
  v_total_weight integer;
  v_pick integer;
  v_running integer := 0;
  v_opt record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.user_progress(user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_prog FROM public.user_progress WHERE user_id = v_user FOR UPDATE;

  IF v_prog.last_claim_at IS NOT NULL THEN
    v_hours := EXTRACT(EPOCH FROM (v_now - v_prog.last_claim_at)) / 3600.0;
    IF v_hours < 24 THEN RAISE EXCEPTION 'Next spin available in % hours', round(24 - v_hours, 1); END IF;
    v_new_streak := CASE WHEN v_hours < 48 THEN v_prog.streak + 1 ELSE 1 END;
  ELSE
    v_new_streak := 1;
  END IF;

  SELECT COALESCE(SUM(weight),0) INTO v_total_weight FROM public.spin_wheel_options WHERE is_active = true;
  IF v_total_weight = 0 THEN RAISE EXCEPTION 'Spin wheel is not configured'; END IF;

  v_pick := 1 + floor(random() * v_total_weight)::int;
  FOR v_opt IN SELECT * FROM public.spin_wheel_options WHERE is_active = true ORDER BY position, id LOOP
    v_running := v_running + v_opt.weight;
    IF v_pick <= v_running THEN
      v_reward := v_opt.reward_amount;
      v_label := v_opt.label;
      EXIT;
    END IF;
  END LOOP;

  IF v_new_streak = 3  THEN v_bonus := 25;  END IF;
  IF v_new_streak = 7  THEN v_bonus := 100; END IF;
  IF v_new_streak = 14 THEN v_bonus := 250; END IF;
  IF v_new_streak = 30 THEN v_bonus := 1000; END IF;

  UPDATE public.user_progress
    SET streak = v_new_streak, best_streak = GREATEST(best_streak, v_new_streak),
        last_claim_at = v_now, total_claimed = total_claimed + v_reward + v_bonus,
        xp = xp + (v_reward + v_bonus)::int, updated_at = v_now
    WHERE user_id = v_user;

  UPDATE public.wallets SET balance = balance + v_reward + v_bonus, updated_at = v_now WHERE user_id = v_user;
  INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
    VALUES (v_user, v_reward + v_bonus, 'credit',
      CASE WHEN v_bonus > 0
        THEN format('Daily spin %s + day-%s streak bonus PKR %s', v_label, v_new_streak, v_bonus)
        ELSE format('Daily spin: %s', v_label) END,
      'daily-spin');

  RETURN jsonb_build_object('ok', true, 'reward', v_reward, 'label', v_label,
    'bonus', v_bonus, 'streak', v_new_streak, 'total_credited', v_reward + v_bonus);
END $function$;

-- =========== HOMEPAGE SECTIONS ============
ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom';

-- Seed common sections so admin sees content
INSERT INTO public.homepage_sections (section_key, kind, title, subtitle, body, position, is_active, config)
SELECT * FROM (VALUES
  ('hero',       'hero',       'Win Big with LUCKDROP Pakistan',  'From PKR 5. Daily draws. Instant wins.', 'Join thousands winning iPhones, Honda 70s, gold and cash every day.', 0, true, '{}'::jsonb),
  ('jackpot',    'jackpot',    'Live Jackpot',                     'Grows every minute',                       NULL, 1, true, '{"amount": 5000000}'::jsonb),
  ('draws',      'draws_grid', 'Today''s active draws',            'Pick a prize and grab your ticket',        NULL, 2, true, '{}'::jsonb),
  ('winners',    'winners',    'Recent winners',                   'Real people. Real prizes.',                NULL, 3, true, '{}'::jsonb),
  ('how_it_works','how_it_works','How it works',                   '3 steps to win',                           NULL, 4, true, '{}'::jsonb),
  ('faq',        'faq',        'Frequently asked',                 'Everything you need to know',              NULL, 5, true, '{}'::jsonb)
) AS v(section_key, kind, title, subtitle, body, position, is_active, config)
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections);

-- Reorder helper
CREATE OR REPLACE FUNCTION public.reorder_homepage_section(p_id uuid, p_direction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pos integer;
  v_other_id uuid;
  v_other_pos integer;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT position INTO v_pos FROM public.homepage_sections WHERE id = p_id;
  IF v_pos IS NULL THEN RETURN; END IF;
  IF p_direction = 'up' THEN
    SELECT id, position INTO v_other_id, v_other_pos FROM public.homepage_sections
      WHERE position < v_pos ORDER BY position DESC LIMIT 1;
  ELSE
    SELECT id, position INTO v_other_id, v_other_pos FROM public.homepage_sections
      WHERE position > v_pos ORDER BY position ASC LIMIT 1;
  END IF;
  IF v_other_id IS NULL THEN RETURN; END IF;
  UPDATE public.homepage_sections SET position = v_other_pos, updated_at = now() WHERE id = p_id;
  UPDATE public.homepage_sections SET position = v_pos,       updated_at = now() WHERE id = v_other_id;
END $$;

-- =========== REFERRAL CODE AT SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  v_referrer uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, referral_code)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name',''),
          NEW.phone,
          NEW.email,
          v_ref_code);
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = v_ref_code AND id <> NEW.id LIMIT 1;
    IF v_referrer IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, code)
      VALUES (v_referrer, NEW.id, v_ref_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- =========== KYC THRESHOLD HELPER ============
CREATE OR REPLACE FUNCTION public.kyc_required_threshold()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 5000::numeric $$;

GRANT EXECUTE ON FUNCTION public.kyc_required_threshold() TO anon, authenticated;
