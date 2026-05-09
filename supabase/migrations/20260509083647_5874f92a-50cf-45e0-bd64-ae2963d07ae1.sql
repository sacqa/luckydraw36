
-- 1. profiles.email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p SET email = u.email
FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

-- update handle_new_user to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.phone, NEW.email);
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

-- 2. Add FKs to profiles for PostgREST embedding
DO $$ BEGIN
  ALTER TABLE public.deposit_requests
    ADD CONSTRAINT deposit_requests_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.winners
    ADD CONSTRAINT winners_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. deposit_methods extra fields
ALTER TABLE public.deposit_methods
  ADD COLUMN IF NOT EXISTS api_endpoint text,
  ADD COLUMN IF NOT EXISTS api_key text,
  ADD COLUMN IF NOT EXISTS api_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS method_type text NOT NULL DEFAULT 'manual';

-- 4. homepage_sections
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text,
  subtitle text,
  body text,
  image_url text,
  link_url text,
  link_label text,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage read all" ON public.homepage_sections;
CREATE POLICY "homepage read all" ON public.homepage_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "homepage admin write" ON public.homepage_sections;
CREATE POLICY "homepage admin write" ON public.homepage_sections
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert their own audit log entry (for activity recording on user actions like deposit submission)
DROP POLICY IF EXISTS "audit self insert" ON public.audit_logs;
CREATE POLICY "audit self insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- 5. Triggers to auto-record activity
CREATE OR REPLACE FUNCTION public.log_deposit_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(actor_id, action, meta)
    VALUES (NEW.user_id, 'deposit.submitted',
      jsonb_build_object('deposit_id', NEW.id, 'amount', NEW.amount, 'method', NEW.payment_method, 'txn', NEW.transaction_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    INSERT INTO public.audit_logs(actor_id, action, meta)
    VALUES (COALESCE(NEW.approved_by, auth.uid()),
      'deposit.' || NEW.status,
      jsonb_build_object('deposit_id', NEW.id, 'amount', NEW.amount, 'user_id', NEW.user_id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deposits_activity ON public.deposit_requests;
CREATE TRIGGER deposits_activity
AFTER INSERT OR UPDATE ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.log_deposit_activity();

CREATE OR REPLACE FUNCTION public.log_game_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, action, meta)
  VALUES (auth.uid(), 'game.created',
    jsonb_build_object('game_id', NEW.id, 'title', NEW.title, 'prize', NEW.prize_value));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS games_activity ON public.games;
CREATE TRIGGER games_activity
AFTER INSERT ON public.games
FOR EACH ROW EXECUTE FUNCTION public.log_game_activity();

CREATE OR REPLACE FUNCTION public.log_winner_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id, action, meta)
  VALUES (auth.uid(), 'winner.drawn',
    jsonb_build_object('game_id', NEW.game_id, 'user_id', NEW.user_id, 'prize', NEW.prize_value));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS winners_activity ON public.winners;
CREATE TRIGGER winners_activity
AFTER INSERT ON public.winners
FOR EACH ROW EXECUTE FUNCTION public.log_winner_activity();

CREATE OR REPLACE FUNCTION public.log_role_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(actor_id, action, meta)
    VALUES (auth.uid(), 'role.granted', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(actor_id, action, meta)
    VALUES (auth.uid(), 'role.revoked', jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS roles_activity ON public.user_roles;
CREATE TRIGGER roles_activity
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_activity();
