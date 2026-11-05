CREATE TABLE public.store_whatsapp_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Atendimento',
  phone text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_whatsapp_phone_digits CHECK (phone ~ '^[0-9]{10,13}$')
);
GRANT SELECT ON public.store_whatsapp_numbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_whatsapp_numbers TO authenticated;
GRANT ALL ON public.store_whatsapp_numbers TO service_role;
ALTER TABLE public.store_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp public read active" ON public.store_whatsapp_numbers FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "whatsapp admin write" ON public.store_whatsapp_numbers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_whatsapp_updated BEFORE UPDATE ON public.store_whatsapp_numbers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.store_whatsapp_numbers (label, phone)
  SELECT 'Principal', regexp_replace(whatsapp_admin, '\D', '', 'g') FROM public.store_settings
  WHERE id = 1 AND regexp_replace(coalesce(whatsapp_admin,''), '\D', '', 'g') ~ '^[0-9]{10,13}$';