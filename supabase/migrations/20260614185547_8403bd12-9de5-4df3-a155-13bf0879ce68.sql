
-- 1) Recreate user_vip view with security_invoker
DROP VIEW IF EXISTS public.user_vip;
CREATE VIEW public.user_vip
WITH (security_invoker = true) AS
SELECT
  w.user_id,
  COALESCE((
    SELECT SUM(wt.amount)
    FROM public.wallet_transactions wt
    WHERE wt.user_id = w.user_id
      AND wt.type = 'debit'::txn_type
      AND wt.description ILIKE '%ticket%'
  ), 0) AS lifetime_spend,
  (
    SELECT t.id FROM public.vip_tiers t
    WHERE t.min_spend <= COALESCE((
      SELECT SUM(wt.amount) FROM public.wallet_transactions wt
      WHERE wt.user_id = w.user_id
        AND wt.type = 'debit'::txn_type
        AND wt.description ILIKE '%ticket%'
    ), 0)
    ORDER BY t.min_spend DESC LIMIT 1
  ) AS tier_id
FROM public.wallets w;

GRANT SELECT ON public.user_vip TO authenticated;
GRANT ALL    ON public.user_vip TO service_role;

-- 2) deposit_methods: hide API credentials from non-admins
DROP POLICY IF EXISTS "deposit_methods read auth" ON public.deposit_methods;

-- admins keep full access via existing "deposit_methods admin" policy
CREATE POLICY "deposit_methods admin read"
  ON public.deposit_methods FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.deposit_methods_public
WITH (security_invoker = true) AS
SELECT id, method_name, method_type, account_title, account_number,
       qr_image, instructions, is_active
FROM public.deposit_methods
WHERE is_active = true;

GRANT SELECT ON public.deposit_methods_public TO authenticated, anon;

-- 3) cashback_payouts: explicit admin-only write policies
CREATE POLICY "cashback admin insert" ON public.cashback_payouts
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cashback admin update" ON public.cashback_payouts
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cashback admin delete" ON public.cashback_payouts
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 4) Storage policies
CREATE POLICY "kyc update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR private.has_role(auth.uid(), 'admin'::app_role)
  ))
  WITH CHECK (bucket_id = 'kyc-documents' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR private.has_role(auth.uid(), 'admin'::app_role)
  ));

CREATE POLICY "kyc delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR private.has_role(auth.uid(), 'admin'::app_role)
  ));

CREATE POLICY "profile img update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'profile-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "profile img delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5) Lock down trigger / internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.bump_ticket_on_message()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_progress()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_deposit_activity()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_game_activity()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_activity()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_winner_activity()         FROM PUBLIC, anon, authenticated;
