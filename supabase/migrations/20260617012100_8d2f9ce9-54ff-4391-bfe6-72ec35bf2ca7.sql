-- Activate deposit methods and allow authenticated users to read active ones
UPDATE public.deposit_methods SET is_active = true WHERE method_name IN ('Easypaisa','JazzCash');

-- Add SELECT policy so authenticated users can see active deposit methods directly (the view depends on this)
DROP POLICY IF EXISTS "Authenticated can view active deposit methods" ON public.deposit_methods;
CREATE POLICY "Authenticated can view active deposit methods"
ON public.deposit_methods FOR SELECT TO authenticated
USING (is_active = true);