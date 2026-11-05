
-- 1) Revoga EXECUTE público das funções SECURITY DEFINER.
-- Elas continuam sendo usadas pelas políticas RLS (rodam como o owner),
-- mas não devem ser invocáveis diretamente pela API.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Torna política de INSERT de order_items menos permissiva:
-- exige que o pedido referenciado realmente exista.
DROP POLICY IF EXISTS "items insert public" ON public.order_items;
CREATE POLICY "items insert public" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

-- 3) Política de INSERT em orders: garante que totais batem (mínimo de sanity check)
DROP POLICY IF EXISTS "orders insert public" ON public.orders;
CREATE POLICY "orders insert public" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (subtotal >= 0 AND total >= 0 AND delivery_fee >= 0);
