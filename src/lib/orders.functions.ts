/**
 * SERVER FUNCTIONS DE PEDIDOS (executam só no servidor).
 *
 * Por que existe este arquivo?
 * A tabela `orders` guarda dados pessoais (nome, telefone, endereço, GPS).
 * Por isso ela NÃO é mais acessível pela API pública: o navegador nunca fala
 * direto com o banco para criar/ler pedidos. Tudo passa por aqui, onde:
 *   - validamos os dados com zod (defesa contra payloads maliciosos);
 *   - RECALCULAMOS todos os preços a partir do banco (o cliente não consegue
 *     forjar preço, taxa de entrega ou total);
 *   - devolvemos apenas os campos necessários (nada de telefone/GPS na tela
 *     pública de acompanhamento).
 *
 * Para editar regras de preço/entrega, mexa apenas em `createOrder`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TRACKING_ORDER_FIELDS } from "@/lib/tracking-fields";

/* ------------------------------------------------------------------ */
/* Schemas de entrada                                                  */
/* ------------------------------------------------------------------ */

const extraSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(20).default(1),
});

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  extras: z.array(extraSchema).max(10).default([]),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(10).max(20),
  address_street: z.string().trim().min(2).max(120),
  address_number: z.string().trim().min(1).max(15),
  address_complement: z.string().trim().max(120).optional().nullable(),
  address_neighborhood: z.string().trim().min(2).max(80),
  address_reference: z.string().trim().max(160).optional().nullable(),
  payment_method: z.enum(["pix", "cartao", "dinheiro"]),
  change_for: z.number().min(0).max(100000).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  items: z.array(itemSchema).min(1).max(60),
  // Conformidade legal: o pedido só é aceito com aceite dos termos e
  // declaração de maioridade (Lei 13.106/2015 + LGPD art. 8º).
  accept_terms: z.literal(true, { message: "É necessário aceitar os termos." }),
  confirm_age: z.literal(true, { message: "É necessário declarar ter 18 anos ou mais." }),
  consent_version: z.string().trim().max(20),
});

const money = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Criação do pedido                                                   */
/* ------------------------------------------------------------------ */

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Loja precisa estar aberta
    const { data: settings } = await supabaseAdmin
      .from("store_settings").select("is_open, delivery_fee").eq("id", 1).maybeSingle();
    if (settings && settings.is_open === false) {
      throw new Error("A loja está fechada no momento.");
    }

    // 2. Catálogo autoritativo (preços reais, apenas produtos ativos)
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products").select("id, name, price, is_active").eq("is_active", true);
    if (prodErr) throw new Error("Falha ao validar o catálogo.");

    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    // Adicionais (energéticos/gelos) são produtos: casamos pelo nome exibido.
    const byName = new Map((products ?? []).map((p) => [p.name.trim().toLowerCase(), p]));

    // 3. Taxa de entrega vem do bairro cadastrado (nunca do cliente)
    const { data: hood } = await supabaseAdmin
      .from("neighborhoods").select("fee")
      .eq("name", data.address_neighborhood).eq("is_active", true).maybeSingle();
    const deliveryFee = money(Number(hood?.fee ?? settings?.delivery_fee ?? 0));

    // 4. Recalcula cada linha do carrinho
    let subtotal = 0;
    const lines = data.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new Error("Produto indisponível no carrinho.");

      const extras = item.extras.map((extra) => {
        const match = byName.get(extra.name.trim().toLowerCase());
        if (!match) throw new Error(`Adicional indisponível: ${extra.name}`);
        return { name: match.name, price: money(Number(match.price)), quantity: extra.quantity };
      });

      const unitPrice = money(
        Number(product.price) + extras.reduce((a, e) => a + e.price * e.quantity, 0),
      );
      const lineTotal = money(unitPrice * item.quantity);
      subtotal = money(subtotal + lineTotal);

      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: lineTotal,
        combo_details: extras.length > 0 ? extras : null,
      };
    });

    const total = money(subtotal + deliveryFee);

    // 5. Troco: só faz sentido em dinheiro e precisa cobrir o total
    let changeFor: number | null = null;
    if (data.payment_method === "dinheiro" && data.change_for) {
      if (data.change_for < total) throw new Error("Valor para troco menor que o total.");
      changeFor = money(data.change_for);
    }

    // 6. Grava pedido + itens
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        address_street: data.address_street,
        address_number: data.address_number,
        address_complement: data.address_complement ?? null,
        address_neighborhood: data.address_neighborhood,
        address_city: "Lages",
        address_reference: data.address_reference ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        payment_method: data.payment_method,
        change_for: changeFor,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: data.notes ?? null,
        // Prova do consentimento (data/hora do servidor, não do navegador)
        terms_accepted_at: new Date().toISOString(),
        age_confirmed_at: new Date().toISOString(),
        consent_version: data.consent_version,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Não foi possível registrar o pedido.");

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemsErr) {
      // Evita pedido órfão sem itens
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Não foi possível registrar os itens do pedido.");
    }

    // Devolve os valores oficiais para a tela montar a mensagem do WhatsApp
    return { id: order.id, subtotal, deliveryFee, total, change: changeFor ? money(changeFor - total) : 0 };
  });

/* ------------------------------------------------------------------ */
/* Acompanhamento público (só quem tem o link/UUID)                    */
/* ------------------------------------------------------------------ */

export const getOrderTracking = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Projeção pública mínima: nenhum endereço, telefone, nome ou coordenada.
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(TRACKING_ORDER_FIELDS)

      .eq("id", data.id)
      .maybeSingle();
    if (!order) return null;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, product_name, quantity, subtotal, combo_details")
      .eq("order_id", data.id);

    return { order, items: items ?? [] };
  });
