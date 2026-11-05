/**
 * Números de WhatsApp da loja que recebem pedidos/atendimento.
 *
 * - O admin cadastra quantos números quiser e pode pausar cada um.
 * - O cliente só enxerga os números ATIVOS (garantido pelo RLS no banco).
 * - O pedido vai para o primeiro número ativo (ordem de cadastro);
 *   se nenhum estiver ativo, cai no número antigo das Configurações.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const WHATSAPP_QUERY_KEY = ["store-whatsapp-numbers"] as const;

/** Lista os números ativos, já ordenados. */
export function useActiveWhatsappNumbers() {
  return useQuery({
    queryKey: WHATSAPP_QUERY_KEY,
    queryFn: async () => {
      const { data } = await supabase
        .from("store_whatsapp_numbers")
        .select("id, label, phone")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      return data ?? [];
    },
  });
}

/** Escolhe o número que recebe o pedido (primeiro ativo ou o reserva). */
export function pickOrderPhone(
  numbers: { phone: string }[] | undefined,
  fallback?: string | null,
): string | null {
  const first = numbers?.[0]?.phone;
  const fone = (first ?? fallback ?? "").replace(/\D/g, "");
  return fone || null;
}
