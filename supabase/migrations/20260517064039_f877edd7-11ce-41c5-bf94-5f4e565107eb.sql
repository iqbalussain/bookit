
-- Helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generic per-user table macro is not possible in plain SQL; define each.

-- companies
CREATE TABLE public.companies (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.companies FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- clients
CREATE TABLE public.clients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'customer',
  contact_person TEXT,
  payment_terms_days INTEGER,
  tax_registration_number TEXT,
  credit_limit NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clients_user ON public.clients(user_id);

-- items
CREATE TABLE public.items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  rate NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC,
  stock NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC,
  vat_applicable BOOLEAN NOT NULL DEFAULT false,
  vat_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.items FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_items_user ON public.items(user_id);

-- salesmen
CREATE TABLE public.salesmen (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.salesmen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.salesmen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.salesmen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.salesmen FOR DELETE USING (auth.uid() = user_id);

-- projects
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  vendor_id TEXT,
  name TEXT NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  lpo_number TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  valuation_completed BOOLEAN NOT NULL DEFAULT false,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_invoiced_amount NUMERIC NOT NULL DEFAULT 0,
  total_invoiced_percentage NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_percentage NUMERIC NOT NULL DEFAULT 0,
  total_payment_received NUMERIC NOT NULL DEFAULT 0,
  linked_invoice_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.projects FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- quotations
CREATE TABLE public.quotations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  number TEXT NOT NULL,
  client_id TEXT,
  salesman_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  net_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  converted_invoice_id TEXT,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.quotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.quotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.quotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.quotations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_quotations_user ON public.quotations(user_id);

-- invoices
CREATE TABLE public.invoices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  number TEXT NOT NULL,
  client_id TEXT,
  salesman_id TEXT,
  quotation_id TEXT,
  invoice_type TEXT DEFAULT 'normal',
  project_id TEXT,
  project_name TEXT,
  lpo_number TEXT,
  project_total_value NUMERIC,
  total_percentage NUMERIC,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  subtotal NUMERIC,
  vat_total NUMERIC,
  project_summary JSONB,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  net_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT,
  due_date DATE,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.invoices FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

-- purchase_invoices
CREATE TABLE public.purchase_invoices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  number TEXT NOT NULL,
  vendor_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  net_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.purchase_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.purchase_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.purchase_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.purchase_invoices FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_pinv_updated BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payments
CREATE TABLE public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  invoice_id TEXT,
  invoice_type TEXT NOT NULL DEFAULT 'sales',
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- accounts (chart of accounts)
CREATE TABLE public.accounts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  kind TEXT NOT NULL,
  parent_id TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- vouchers
CREATE TABLE public.vouchers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  number TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  narration TEXT,
  method TEXT,
  reference TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.vouchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.vouchers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.vouchers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.vouchers FOR DELETE USING (auth.uid() = user_id);

-- journal_entries (double entry)
CREATE TABLE public.journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key TEXT,
  reversal_of TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_journal_idem ON public.journal_entries(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- audit_log
CREATE TABLE public.audit_log (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  type TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  value NUMERIC,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.audit_log FOR DELETE USING (auth.uid() = user_id);

-- business_settings (one per user, optionally per company)
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_number TEXT,
  theme TEXT,
  vat_enabled BOOLEAN NOT NULL DEFAULT false,
  default_vat_percentage NUMERIC NOT NULL DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  signature TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.business_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.business_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.business_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.business_settings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_bsettings_updated BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX idx_bsettings_user_company ON public.business_settings(user_id, COALESCE(company_id, ''));
