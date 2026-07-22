CREATE TABLE IF NOT EXISTS public.financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency text NOT NULL DEFAULT 'RM',
  revenue numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0,
  rent numeric NOT NULL DEFAULT 0,
  salaries numeric NOT NULL DEFAULT 0,
  marketing numeric NOT NULL DEFAULT 0,
  utilities numeric NOT NULL DEFAULT 0,
  other_opex numeric NOT NULL DEFAULT 0,
  other_income numeric NOT NULL DEFAULT 0,
  other_expenses numeric NOT NULL DEFAULT 0,
  cash_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_reports TO authenticated;
GRANT ALL ON public.financial_reports TO service_role;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer read reports" ON public.financial_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'dealer_admin'));
CREATE POLICY "dealer write reports" ON public.financial_reports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));
CREATE POLICY "dealer update reports" ON public.financial_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dealer_admin')) WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));
CREATE POLICY "dealer delete reports" ON public.financial_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dealer_admin'));
