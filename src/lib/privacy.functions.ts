/**
 * SERVER FUNCTIONS de privacidade (LGPD art. 18).
 *
 * O formulário público de "direitos do titular" NUNCA escreve direto na tabela:
 * o navegador manda os dados para cá, o servidor valida com zod e grava usando
 * a chave privilegiada. Assim a tabela `data_requests` fica invisível para o
 * front-end (nem leitura, nem escrita anônima).
 *
 * Também expomos os dados públicos da loja (CNPJ, razão social, contato do
 * encarregado) — informação obrigatória no rodapé pelo CDC e pela LGPD.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Validação rígida: limites de tamanho evitam abuso e poluição da base. */
const requestSchema = z.object({
  kind: z.enum(["acesso", "correcao", "exclusao", "portabilidade", "revogacao"]),
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const createDataRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("data_requests").insert({
      kind: data.kind,
      name: data.name,
      phone: data.phone,
      email: data.email ? data.email : null,
      message: data.message ? data.message : null,
    });
    // Mensagem genérica: nunca devolvemos detalhes internos do banco ao cliente.
    if (error) throw new Error("Não foi possível registrar sua solicitação. Tente novamente.");

    return { ok: true } as const;
  });
