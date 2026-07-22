CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  doc_number text,
  doc_date date,
  title text NOT NULL,
  customer_name text,
  vehicle_ref text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealer update documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dealer_admin') OR created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'dealer_admin') OR created_by = auth.uid());
CREATE POLICY "dealer delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dealer_admin') OR created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.transaction_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_documents TO authenticated;
GRANT ALL ON public.transaction_documents TO service_role;
ALTER TABLE public.transaction_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read tx docs" ON public.transaction_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed link tx docs" ON public.transaction_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authed unlink tx docs" ON public.transaction_documents FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tx_docs_tx ON public.transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_docs_doc ON public.transaction_documents(document_id);
