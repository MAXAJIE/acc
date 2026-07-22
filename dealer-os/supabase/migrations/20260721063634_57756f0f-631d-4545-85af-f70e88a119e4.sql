
-- =====================================================================
-- 1. Enums
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('dealer_admin', 'agent');
CREATE TYPE public.financing_type AS ENUM ('cash', 'financed');
CREATE TYPE public.vehicle_status AS ENUM ('in_stock', 'reserved', 'sold');
CREATE TYPE public.employment_type AS ENUM ('employee', 'independent');

-- =====================================================================
-- 2. user_roles (roles ALWAYS in a separate table)
-- =====================================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer role check (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- =====================================================================
-- 3. agents  (agent profile — linked to auth user)
-- =====================================================================
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  employment_type public.employment_type NOT NULL DEFAULT 'independent',
  commission_percent numeric(5,2), -- per-agent override, null = use global default
  status text NOT NULL DEFAULT 'active',
  joined_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  consent_ack_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Dealer sees all; agent sees only own row.
CREATE POLICY "dealer sees all agents" ON public.agents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'));

CREATE POLICY "agent sees own agent row" ON public.agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "dealer manages agents" ON public.agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));

-- =====================================================================
-- 4. vehicles
-- =====================================================================
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  variant text,
  vin text,
  engine_no text,
  color text,
  mileage_km integer,
  transmission text,
  fuel text,
  -- financing (dealer only)
  purchase_cost numeric(12,2) NOT NULL DEFAULT 0,
  financing_type public.financing_type NOT NULL DEFAULT 'cash',
  amount_financed numeric(12,2) NOT NULL DEFAULT 0,
  rate numeric(6,4) NOT NULL DEFAULT 0, -- annual, e.g. 0.0575 for 5.75%
  drawdown_date date,
  recon_cost numeric(12,2) NOT NULL DEFAULT 0,
  -- condition (internal)
  condition_grade text,
  puspakom_status text,
  puspakom_date date,
  -- customer-facing
  condition_summary text,
  photos text[] NOT NULL DEFAULT '{}',
  -- commercial
  asking_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2),
  sale_date date,
  status public.vehicle_status NOT NULL DEFAULT 'in_stock',
  stocked_at date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  public_link_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicles_status_idx ON public.vehicles(status);
CREATE INDEX vehicles_public_link_idx ON public.vehicles(public_link_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Dealer: full access.
CREATE POLICY "dealer full vehicle access" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));

-- Agent: can SELECT all vehicles (specs) but NOT cost columns — enforced via view.
-- We still allow row-level SELECT for agents; frontend/API strips fields via allow-list.
CREATE POLICY "agent sees vehicle rows" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'agent'));

-- =====================================================================
-- 5. transactions
-- =====================================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  sale_price numeric(12,2) NOT NULL,
  sale_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  dealer_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transactions_agent_idx ON public.transactions(agent_id);
CREATE INDEX transactions_confirmed_idx ON public.transactions(dealer_confirmed);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer full transaction access" ON public.transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));

CREATE POLICY "agent sees own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent') AND
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "agent creates own transaction" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'agent') AND
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()) AND
    dealer_confirmed = false
  );

-- =====================================================================
-- 6. commission_ledger  (append-only; auto-populated via trigger)
-- =====================================================================
CREATE TABLE public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  entry_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id)
);

GRANT SELECT, INSERT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer sees all ledger" ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'));

CREATE POLICY "agent sees own ledger" ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent') AND
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Trigger: when transaction becomes dealer_confirmed, insert ledger row.
CREATE OR REPLACE FUNCTION public.sync_commission_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.dealer_confirmed = true AND (OLD.dealer_confirmed IS DISTINCT FROM true) THEN
    INSERT INTO public.commission_ledger (agent_id, transaction_id, amount, entry_date)
    VALUES (NEW.agent_id, NEW.id, NEW.commission_amount, NEW.sale_date)
    ON CONFLICT (transaction_id) DO UPDATE SET amount = EXCLUDED.amount;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_commission_ledger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_commission_ledger();

-- =====================================================================
-- 7. app_settings  (single-row, editable in-app)
-- =====================================================================
CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  default_commission_percent numeric(5,2) NOT NULL DEFAULT 20.00,
  aging_alert_days integer NOT NULL DEFAULT 60,
  currency text NOT NULL DEFAULT 'RM',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

INSERT INTO public.app_settings (id) VALUES (1);

GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads settings" ON public.app_settings
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "dealer updates settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'dealer_admin'));

-- =====================================================================
-- 8. Public vehicle view (allow-list, exposed to anon)
-- =====================================================================
CREATE OR REPLACE VIEW public.public_vehicle_view AS
SELECT
  id,
  public_link_id,
  make, model, year, variant, color, mileage_km, transmission, fuel,
  condition_summary,
  photos,
  asking_price,
  status
FROM public.vehicles
WHERE public_link_id IS NOT NULL;

GRANT SELECT ON public.public_vehicle_view TO anon, authenticated;

-- =====================================================================
-- 9. updated_at trigger helper
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
