
-- Fix security definer view -> use security_invoker
DROP VIEW IF EXISTS public.public_vehicle_view;
CREATE VIEW public.public_vehicle_view
WITH (security_invoker = true) AS
SELECT
  id, public_link_id,
  make, model, year, variant, color, mileage_km, transmission, fuel,
  condition_summary, photos, asking_price, status
FROM public.vehicles
WHERE public_link_id IS NOT NULL;
GRANT SELECT ON public.public_vehicle_view TO anon, authenticated;

-- Allow anon to actually SELECT the underlying rows that expose a public_link_id
CREATE POLICY "anon can read published vehicle rows" ON public.vehicles
  FOR SELECT TO anon
  USING (public_link_id IS NOT NULL);

-- Lock down trigger/utility functions: revoke public execute, they're only used internally
REVOKE ALL ON FUNCTION public.sync_commission_ledger() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;

-- Ensure has_role has fixed search_path (it does), and confirm exec grants are minimal.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Anon does not need has_role (public vehicle view uses public_link_id, not roles)
-- (already revoked from public above)
