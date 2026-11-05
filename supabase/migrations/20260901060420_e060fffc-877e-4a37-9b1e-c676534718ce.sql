-- 1) Dados legais obrigatórios da loja (CNPJ, razão social, contato, encarregado LGPD)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS legal_name    TEXT,
  ADD COLUMN IF NOT EXISTS cnpj          TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS dpo_name      TEXT,
  ADD COLUMN IF NOT EXISTS dpo_email     TEXT;

-- 2) Prova de consentimento por pedido (LGPD art. 8 e venda 18+)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS terms_accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_confirmed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version     TEXT;

-- 3) Solicitações do titular de dados (acesso/correção/exclusão) — LGPD art. 18
CREATE TABLE IF NOT EXISTS public.data_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL CHECK (kind IN ('acesso','correcao','exclusao','portabilidade','revogacao')),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','concluido')),
  handled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Somente a administração lê/gerencia; a criação é feita por server function (service_role).
GRANT SELECT, UPDATE, DELETE ON public.data_requests TO authenticated;
GRANT ALL ON public.data_requests TO service_role;

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_requests admin manage" ON public.data_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_data_requests_updated
  BEFORE UPDATE ON public.data_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_data_requests_status ON public.data_requests (status, created_at DESC);