-- 1) store_settings: remove a leitura pública ampla (USING true) que expunha e-mails.
--    Os dados legalmente públicos (CDC/LGPD: razão social, CNPJ, contato, DPO)
--    passam a ser expostos por uma view explícita com apenas as colunas seguras.
DROP POLICY IF EXISTS "settings public read" ON public.store_settings;
REVOKE SELECT ON public.store_settings FROM anon;

CREATE OR REPLACE VIEW public.store_settings_public
WITH (security_invoker = false) AS
SELECT
  id,
  store_name,
  whatsapp_admin,
  delivery_fee,
  is_open,
  legal_name,
  cnpj,
  legal_address,
  contact_email,
  dpo_name,
  dpo_email
FROM public.store_settings;

GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- 2) neighborhoods: leitura pública passa a cobrir apenas bairros ativos.
DROP POLICY IF EXISTS "Bairros: leitura pública" ON public.neighborhoods;
CREATE POLICY "Bairros: leitura pública de ativos"
  ON public.neighborhoods FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) storage: remove a leitura pública irrestrita do bucket product-images.
--    O bucket é privado e o app já usa URLs assinadas; o acesso fica restrito
--    a administradores autenticados.
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;

DROP POLICY IF EXISTS "Admins manage product images" ON storage.objects;
CREATE POLICY "Admins manage product images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
