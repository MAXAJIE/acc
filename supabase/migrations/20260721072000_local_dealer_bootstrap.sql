-- Optional manual SQL copy of supabase/migrations/20260721072000_local_dealer_bootstrap.sql.
-- Prefer `supabase db push`; paste this file in the SQL editor only if you are not using migrations.

CREATE OR REPLACE FUNCTION public.claim_first_dealer_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  LOCK TABLE public.user_roles IN EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'dealer_admin'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'dealer_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_first_dealer_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_dealer_admin() TO authenticated;

DROP POLICY IF EXISTS "dealer grants agent roles" ON public.user_roles;

CREATE POLICY "dealer grants agent roles"
  ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    role = 'agent'
    AND public.has_role(auth.uid(), 'dealer_admin')
  );
