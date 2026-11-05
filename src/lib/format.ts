/**
 * Helpers de formatação compartilhados.
 * Mantenha funções puras aqui (sem dependência de React).
 */

/** Formata número como BRL (R$ 12,90). */
export const formatBRL = (value: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

/** Remove qualquer caractere não numérico de um telefone. */
export const onlyDigits = (s: string): string => (s || "").replace(/\D+/g, "");

/**
 * Normaliza um telefone para formato internacional whatsApp (com 55 BR se vier sem).
 * Aceita: "11999998888" → "5511999998888"
 */
export const normalizeWhatsApp = (phone: string): string => {
  const d = onlyDigits(phone);
  if (!d) return "";
  if (d.startsWith("55")) return d;
  return `55${d}`;
};

/** Monta link wa.me com mensagem pré-preenchida. */
export const waLink = (phone: string, message: string): string =>
  `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(message)}`;

/** Link do Google Maps para coordenadas + endereço. */
export const mapsLink = (opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string;
}): string => {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.address || "")}`;
};

/** Formata data/hora curta pt-BR. */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Rótulo amigável de status do pedido. */
export const STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  pronto: "Pronto",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};
