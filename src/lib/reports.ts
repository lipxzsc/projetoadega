/**
 * Geração de relatórios (CSV + PDF) para pedidos entregues.
 * Funções puras — recebem a lista de pedidos e produzem download no navegador.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatDateTime, PAYMENT_LABEL } from "./format";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

/** Chave de agrupamento (YYYY-MM-DD para diário, YYYY-Www, YYYY-MM). */
export function periodKey(date: Date, period: ReportPeriod): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  if (period === "monthly") return `${y}-${m}`;
  if (period === "weekly") {
    // ISO week number simplificado
    const first = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - first.getTime()) / 86400000);
    const week = String(Math.ceil((days + first.getDay() + 1) / 7)).padStart(2, "0");
    return `${y}-S${week}`;
  }
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Rótulo legível do período. */
export function periodLabel(key: string, period: ReportPeriod): string {
  if (period === "daily") {
    const [y, m, d] = key.split("-");
    return `${d}/${m}/${y}`;
  }
  if (period === "monthly") {
    const [y, m] = key.split("-");
    return `${m}/${y}`;
  }
  return key.replace("-", " Semana ");
}

/** Dispara download de um arquivo no navegador. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Exporta CSV (separador ;, compatível com Excel pt-BR). */
export function downloadCSV(orders: any[], filename: string) {
  const header = ["#", "Data", "Cliente", "Telefone", "Endereço", "Pagamento", "Subtotal", "Entrega", "Total"];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    formatDateTime(o.created_at),
    o.customer_name,
    o.customer_phone,
    `${o.address_street}, ${o.address_number} - ${o.address_neighborhood}`,
    PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
    Number(o.subtotal).toFixed(2).replace(".", ","),
    Number(o.delivery_fee).toFixed(2).replace(".", ","),
    Number(o.total).toFixed(2).replace(".", ","),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  triggerDownload(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), filename);
}

/** Exporta PDF com cabeçalho, totais e tabela de pedidos. */
export function downloadPDF(orders: any[], title: string, filename: string) {
  const doc = new jsPDF();
  const total = orders.reduce((s, o) => s + Number(o.total), 0);
  const subtotal = orders.reduce((s, o) => s + Number(o.subtotal), 0);
  const fees = orders.reduce((s, o) => s + Number(o.delivery_fee), 0);

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Pedidos: ${orders.length}   ·   Faturamento: ${formatBRL(total)}`, 14, 26);
  doc.text(`Subtotal: ${formatBRL(subtotal)}   ·   Entregas: ${formatBRL(fees)}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [["#", "Data", "Cliente", "Pgto.", "Total"]],
    body: orders.map((o) => [
      o.id.slice(0, 8),
      formatDateTime(o.created_at),
      o.customer_name,
      PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
      formatBRL(Number(o.total)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [205, 165, 80] },
  });

  doc.save(filename);
}
