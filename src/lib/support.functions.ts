/**
 * ATENDIMENTO AO CLIENTE — chat do site (server functions).
 *
 * Segurança:
 *  - O navegador NUNCA fala direto com a tabela `support_messages`
 *    (ela não tem permissão para anônimos). Tudo passa por aqui.
 *  - O acesso à conversa é feito pelo ID do pedido (UUID secreto do link).
 *  - Toda entrada é validada com zod e o texto tem tamanho limitado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Um pedido só pode ter uma quantidade razoável de mensagens (anti-flood). */
const MAX_MENSAGENS = 200;

const idSchema = z.object({ orderId: z.string().uuid() });

const envioSchema = z.object({
  orderId: z.string().uuid(),
  body: z.string().trim().min(1, "Escreva uma mensagem").max(500, "Mensagem muito longa"),
});

/** Lista as mensagens de um pedido (cliente e loja). */
export const listSupportMessages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("support_messages")
      .select("id, sender, body, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true })
      .limit(MAX_MENSAGENS);
    return rows ?? [];
  });

/** Envia uma mensagem do cliente. */
export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => envioSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // O pedido precisa existir — evita criar conversas soltas com IDs inventados.
    const { data: pedido } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!pedido) throw new Error("Pedido não encontrado");

    // Anti-flood simples: recusa se a conversa já estourou o limite.
    const { count } = await supabaseAdmin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("order_id", data.orderId);
    if ((count ?? 0) >= MAX_MENSAGENS) throw new Error("Limite de mensagens atingido");

    const { error } = await supabaseAdmin.from("support_messages").insert({
      order_id: data.orderId,
      sender: "customer",
      body: data.body,
    });
    if (error) throw new Error("Não foi possível enviar a mensagem");
    return { ok: true };
  });
