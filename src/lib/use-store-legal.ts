/**
 * Hook com os dados legais/públicos da loja (razão social, CNPJ, contatos).
 * Usado no rodapé e nas páginas de Termos, Privacidade e Cancelamento.
 *
 * Lê a view `store_settings_public`, que expõe apenas as colunas públicas
 * de `store_settings` (a tabela em si não tem leitura anônima — LGPD).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_NAME } from "@/lib/brand";

export interface StoreLegal {
  store_name: string;
  legal_name: string | null;
  cnpj: string | null;
  legal_address: string | null;
  contact_email: string | null;
  dpo_name: string | null;
  dpo_email: string | null;
  whatsapp_admin: string | null;
}

export function useStoreLegal() {
  return useQuery({
    queryKey: ["store-legal"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreLegal | null> => {
      const { data } = await supabase
        .from("store_settings_public")
        .select(
          "store_name, legal_name, cnpj, legal_address, contact_email, dpo_name, dpo_email, whatsapp_admin",
        )
        .eq("id", 1)
        .maybeSingle();
      // A marca pública é centralizada; razão social e contatos ficam intactos.
      return data ? { ...data, store_name: STORE_NAME } as StoreLegal : null;
    },
  });
}
