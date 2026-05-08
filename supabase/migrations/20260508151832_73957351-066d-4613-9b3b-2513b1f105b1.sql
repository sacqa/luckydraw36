CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "profiles self select" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin all" ON public.profiles;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles self read" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin manage" ON public.user_roles;
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallet self" ON public.wallets;
DROP POLICY IF EXISTS "wallet admin manage" ON public.wallets;
CREATE POLICY "wallet self" ON public.wallets FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "wallet admin manage" ON public.wallets FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wt self" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wt admin insert" ON public.wallet_transactions;
CREATE POLICY "wt self" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "wt admin insert" ON public.wallet_transactions FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "games admin write" ON public.games;
CREATE POLICY "games admin write" ON public.games FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tickets self read" ON public.tickets;
DROP POLICY IF EXISTS "tickets admin all" ON public.tickets;
CREATE POLICY "tickets self read" ON public.tickets FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "tickets admin all" ON public.tickets FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "winners admin write" ON public.winners;
CREATE POLICY "winners admin write" ON public.winners FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "deposit_methods admin" ON public.deposit_methods;
CREATE POLICY "deposit_methods admin" ON public.deposit_methods FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "deposits self read" ON public.deposit_requests;
DROP POLICY IF EXISTS "deposits admin update" ON public.deposit_requests;
CREATE POLICY "deposits self read" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "deposits admin update" ON public.deposit_requests FOR UPDATE USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "banners admin write" ON public.banners;
CREATE POLICY "banners admin write" ON public.banners FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifs admin all" ON public.notifications;
CREATE POLICY "notifs admin all" ON public.notifications FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "audit admin read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit admin insert" ON public.audit_logs;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit admin insert" ON public.audit_logs FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ref self" ON public.referrals;
DROP POLICY IF EXISTS "ref admin" ON public.referrals;
CREATE POLICY "ref self" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "ref admin" ON public.referrals FOR ALL USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ds user read own" ON storage.objects;
DROP POLICY IF EXISTS "admin write public buckets" ON storage.objects;
CREATE POLICY "ds user read own" ON storage.objects FOR SELECT USING (
  bucket_id = 'deposit-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1] OR private.has_role(auth.uid(), 'admin'))
);
CREATE POLICY "admin write public buckets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('qr-codes','game-images','banners') AND private.has_role(auth.uid(), 'admin')
);

DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);