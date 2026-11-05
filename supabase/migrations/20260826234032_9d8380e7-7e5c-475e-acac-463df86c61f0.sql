-- 1. Remove acesso público direto a pedidos (vazamento de dados pessoais)
DROP POLICY IF EXISTS "orders read public by id" ON public.orders;
DROP POLICY IF EXISTS "orders insert public" ON public.orders;
DROP POLICY IF EXISTS "items read public" ON public.order_items;
DROP POLICY IF EXISTS "items insert public" ON public.order_items;

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;

-- Admin (autenticado) mantém acesso total; servidor usa service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

CREATE POLICY "orders admin read" ON public.orders
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "orders admin insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Controle de tentativas de login (anti brute force) — só o servidor acessa
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,          -- hash sha256 do e-mail (não guardamos o e-mail)
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_lookup
  ON public.login_attempts (identifier, created_at DESC);

GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhum cliente (anon/authenticated) consegue ler ou gravar.