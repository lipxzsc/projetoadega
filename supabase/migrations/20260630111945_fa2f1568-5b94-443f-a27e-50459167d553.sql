
-- Adiciona "kind" às categorias para distinguir destilados/energéticos/gelos
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'food';
COMMENT ON COLUMN public.categories.kind IS 'food | distilled | energy_drink | ice';

-- Detalhes do combo no item do pedido (lista de adicionais escolhidos)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS combo_details JSONB;

-- Tabela de bairros com taxa de entrega configurável (Lages/SC)
CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.neighborhoods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neighborhoods TO authenticated;
GRANT ALL ON public.neighborhoods TO service_role;

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bairros: leitura pública"
  ON public.neighborhoods FOR SELECT
  USING (TRUE);

CREATE POLICY "Bairros: admin gerencia"
  ON public.neighborhoods FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_neighborhoods_updated_at
  BEFORE UPDATE ON public.neighborhoods
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Semear bairros principais de Lages/SC com taxa exemplo
INSERT INTO public.neighborhoods (name, fee) VALUES
  ('Centro', 5.00),
  ('Coral', 7.00),
  ('Habitação', 8.00),
  ('Guarujá', 8.00),
  ('São Cristóvão', 9.00),
  ('Universitário', 7.00),
  ('Brusque', 10.00),
  ('Frei Rogério', 8.00),
  ('Conta Dinheiro', 9.00),
  ('Petrópolis', 10.00),
  ('Penha', 11.00),
  ('Sagrado Coração', 9.00),
  ('Santa Mônica', 10.00),
  ('Várzea', 11.00),
  ('Copacabana', 12.00)
ON CONFLICT (name) DO NOTHING;
