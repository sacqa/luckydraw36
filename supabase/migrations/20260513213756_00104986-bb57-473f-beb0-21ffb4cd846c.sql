
-- Progress / streak tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id uuid PRIMARY KEY,
  streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_claim_at timestamptz,
  xp integer NOT NULL DEFAULT 0,
  total_claimed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress self read" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "progress admin manage" ON public.user_progress
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Bootstrap progress row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_progress(user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_profile_created_progress ON public.profiles;
CREATE TRIGGER on_profile_created_progress
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_progress();

-- Backfill for existing users
INSERT INTO public.user_progress(user_id)
  SELECT id FROM public.profiles
  ON CONFLICT (user_id) DO NOTHING;

-- Daily spin RPC
CREATE OR REPLACE FUNCTION public.claim_daily_spin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prog record;
  v_reward numeric;
  v_bonus numeric := 0;
  v_new_streak integer;
  v_now timestamptz := now();
  v_hours numeric;
  v_rewards numeric[] := ARRAY[5,10,15,25,50,75,100,150,250,500];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.user_progress(user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_prog FROM public.user_progress WHERE user_id = v_user FOR UPDATE;

  IF v_prog.last_claim_at IS NOT NULL THEN
    v_hours := EXTRACT(EPOCH FROM (v_now - v_prog.last_claim_at)) / 3600.0;
    IF v_hours < 24 THEN
      RAISE EXCEPTION 'Next spin available in % hours', round(24 - v_hours, 1);
    END IF;
    -- streak: keep if claimed within 48h, else reset
    IF v_hours < 48 THEN
      v_new_streak := v_prog.streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;
  ELSE
    v_new_streak := 1;
  END IF;

  v_reward := v_rewards[1 + floor(random() * array_length(v_rewards, 1))::int];

  -- Streak milestone bonuses
  IF v_new_streak = 3  THEN v_bonus := 25;  END IF;
  IF v_new_streak = 7  THEN v_bonus := 100; END IF;
  IF v_new_streak = 14 THEN v_bonus := 250; END IF;
  IF v_new_streak = 30 THEN v_bonus := 1000;END IF;

  UPDATE public.user_progress
    SET streak = v_new_streak,
        best_streak = GREATEST(best_streak, v_new_streak),
        last_claim_at = v_now,
        total_claimed = total_claimed + v_reward + v_bonus,
        xp = xp + (v_reward + v_bonus)::int,
        updated_at = v_now
    WHERE user_id = v_user;

  UPDATE public.wallets
    SET balance = balance + v_reward + v_bonus, updated_at = v_now
    WHERE user_id = v_user;

  INSERT INTO public.wallet_transactions(user_id, amount, type, description, reference)
    VALUES (v_user, v_reward + v_bonus, 'credit',
      CASE WHEN v_bonus > 0
        THEN format('Daily spin PKR %s + day-%s streak bonus PKR %s', v_reward, v_new_streak, v_bonus)
        ELSE format('Daily spin reward PKR %s', v_reward)
      END,
      'daily-spin');

  RETURN jsonb_build_object(
    'ok', true,
    'reward', v_reward,
    'bonus', v_bonus,
    'streak', v_new_streak,
    'total_credited', v_reward + v_bonus
  );
END $$;

-- Allow wallet_transactions self-insert ONLY via this RPC (security definer bypasses RLS),
-- so no policy change is needed. The RPC enforces authentication.
