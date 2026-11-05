-- ============ CUPONS / OFERTAS / CRÉDITOS ============
CREATE TYPE public.coupon_type AS ENUM ('percent', 'fixed', 'free_shipping', 'credit');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.coupon_type NOT NULL DEFAULT 'percent',
  value NUMERIC NOT NULL DEFAULT 0,
  min_order NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons admin all" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CLIENTES (agregado por telefone) ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  credits NUMERIC NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers admin all" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ HORÁRIOS DE ATENDIMENTO ============
CREATE TABLE public.store_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday SMALLINT NOT NULL UNIQUE CHECK (weekday BETWEEN 0 AND 6),
  opens_at TIME NOT NULL DEFAULT '18:00',
  closes_at TIME NOT NULL DEFAULT '23:59',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_hours TO authenticated;
GRANT ALL ON public.store_hours TO service_role;
ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hours public read" ON public.store_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "hours admin write" ON public.store_hours FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_hours_updated BEFORE UPDATE ON public.store_hours
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.store_hours (weekday, opens_at, closes_at, is_closed) VALUES
  (0, '18:00', '23:30', false),
  (1, '18:00', '23:30', false),
  (2, '18:00', '23:30', false),
  (3, '18:00', '23:30', false),
  (4, '18:00', '23:59', false),
  (5, '18:00', '23:59', false),
  (6, '18:00', '23:59', false);

-- ============ ATENDIMENTO (CHAT) ============
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'store')),
  body TEXT NOT NULL,
  read_by_store BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_messages_order ON public.support_messages(order_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support admin all" ON public.support_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CUPOM NO PEDIDO ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;

-- ============ AGREGAÇÃO AUTOMÁTICA DE CLIENTES ============
CREATE OR REPLACE FUNCTION public.tg_upsert_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (phone, name, orders_count, total_spent, last_order_at)
  VALUES (NEW.customer_phone, NEW.customer_name, 1, NEW.total, NEW.created_at)
  ON CONFLICT (phone) DO UPDATE SET
    name          = EXCLUDED.name,
    orders_count  = public.customers.orders_count + 1,
    total_spent   = public.customers.total_spent + EXCLUDED.total_spent,
    last_order_at = EXCLUDED.last_order_at,
    updated_at    = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_customer AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_upsert_customer();