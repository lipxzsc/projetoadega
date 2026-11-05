/**
 * CHECKOUT — dados obrigatórios do cliente + endereço com GPS + pagamento.
 *
 * Fluxo:
 *  1. Lista os itens do carrinho (incl. adicionais do combo).
 *  2. Coleta nome/telefone do cliente.
 *  3. Bairro vem do select alimentado pela tabela `neighborhoods` (Lages/SC):
 *     a taxa de entrega é definida automaticamente pelo bairro selecionado.
 *  4. Cliente pode capturar GPS (link enviado ao motoboy).
 *  5. Pagamento PIX / Cartão / Dinheiro — se dinheiro e informar valor,
 *     calculamos o troco automaticamente.
 *  6. Cria order + order_items (com `combo_details`), envia resumo ao admin
 *     via WhatsApp e redireciona para a tela de acompanhamento.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, MapPin, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { createOrder } from "@/lib/orders.functions";
import { useCart } from "@/lib/cart-store";
import { LAST_ORDER_KEY } from "@/components/BottomNav";
import { formatBRL, mapsLink, PAYMENT_LABEL, waLink } from "@/lib/format";
import { LEGAL_VERSION, getAgeConfirmation, saveAgeConfirmation } from "@/lib/legal";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandMeta } from "@/lib/brand";
import { useActiveWhatsappNumbers, pickOrderPhone } from "@/lib/whatsapp-numbers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: brandMeta("Finalizar pedido", "Revise seu carrinho e finalize seu pedido na Subzero Delivery.") }),
});

// Validação dos dados do cliente
const schema = z.object({
  customer_name: z.string().trim().min(2, "Informe seu nome").max(80),
  customer_phone: z.string().trim().min(10, "Telefone inválido").max(20),
  address_street: z.string().trim().min(2, "Informe a rua").max(120),
  address_number: z.string().trim().min(1, "Nº").max(15),
  address_complement: z.string().trim().max(120).optional(),
  address_neighborhood: z.string().trim().min(2, "Bairro").max(80),
  address_reference: z.string().trim().max(160).optional(),
  payment_method: z.enum(["pix", "cartao", "dinheiro"]),
});

function CheckoutPage() {
  const navigate = useNavigate();
  const pedidoEnviado = useRef(false); // true após o pedido ser criado com sucesso
  const submitOrder = useServerFn(createOrder); // criação do pedido no servidor
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);


  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_reference: "",
    payment_method: "pix" as "pix" | "cartao" | "dinheiro",
    change_for: "",        // string (input livre)
    notes: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Consentimentos exigidos por lei, registrados junto ao pedido:
   *  - aceite dos Termos de Uso e da Política de Privacidade (LGPD art. 8º);
   *  - declaração de maioridade (Lei 13.106/2015 — venda de álcool 18+).
   * A caixa NÃO vem marcada por padrão: consentimento pré-marcado é inválido.
   */
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteIdade, setAceiteIdade] = useState(false);

  // Se a pessoa já declarou 18+ na entrada do site, sugerimos marcado.
  useEffect(() => {
    if (getAgeConfirmation()) setAceiteIdade(true);
  }, []);

  // Configurações da loja (nome, WhatsApp do admin)
  const settings = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () =>
      (await supabase.from("store_settings_public").select("*").eq("id", 1).maybeSingle()).data,
  });

  // Números de WhatsApp ativos da loja (pedido vai para o primeiro ativo)
  const whatsappNumbers = useActiveWhatsappNumbers();

  // Bairros + taxa (Lages/SC)
  const neighborhoods = useQuery({
    queryKey: ["neighborhoods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("neighborhoods").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  // Taxa vinda do bairro selecionado (fallback: taxa padrão da loja)
  const deliveryFee = useMemo(() => {
    const match = neighborhoods.data?.find((n) => n.name === form.address_neighborhood);
    if (match) return Number(match.fee);
    return Number(settings.data?.delivery_fee ?? 0);
  }, [neighborhoods.data, form.address_neighborhood, settings.data]);

  const total = subtotal + deliveryFee;

  // Troco automático (dinheiro): valor informado − total
  const change = useMemo(() => {
    if (form.payment_method !== "dinheiro") return 0;
    const paid = Number(form.change_for || 0);
    return Math.max(0, paid - total);
  }, [form.payment_method, form.change_for, total]);

  // Redireciona se carrinho vazio
  useEffect(() => {
    // `pedidoEnviado` evita que o carrinho vazio (limpo após o envio) jogue
    // o cliente para a home antes da ida à tela de acompanhamento.
    if (items.length === 0 && !submitting && !pedidoEnviado.current) navigate({ to: "/" });
  }, [items.length, submitting, navigate]);

  /** Captura GPS via API do navegador (gratuito). */
  const captureGPS = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização indisponível neste navegador");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        toast.success("Localização capturada");
      },
      (err) => {
        setGpsLoading(false);
        toast.error("Não foi possível obter localização", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (items.length === 0) return;

    // Bloqueio legal: sem aceite dos termos e sem declaração de 18+ não há pedido.
    if (!aceiteTermos) return toast.error("Aceite os Termos de Uso e a Política de Privacidade");
    if (!aceiteIdade) return toast.error("É obrigatório declarar que você tem 18 anos ou mais");

    // Se dinheiro: valor informado deve cobrir o total
    if (form.payment_method === "dinheiro" && form.change_for && Number(form.change_for) < total) {
      toast.error("Valor para troco menor que o total");
      return;
    }

    /**
     * Encaminhamento via WhatsApp: a janela PRECISA abrir no clique do
     * cliente (iPhones/Android bloqueiam aberturas fora do toque). Abrimos
     * uma aba em branco agora e, quando o pedido terminar de salvar,
     * apontamos essa aba para o wa.me com a mensagem pronta.
     */
    const waWindow = window.open("about:blank", "_blank");

    setSubmitting(true);
    try {
      /**
       * O pedido é criado por uma SERVER FUNCTION.
       * O navegador envia apenas IDs e quantidades — preços, taxa de entrega e
       * total são recalculados no servidor a partir do banco (à prova de fraude).
       */
      const result = await submitOrder({
        data: {
          ...parsed.data,
          address_complement: form.address_complement || null,
          address_reference: form.address_reference || null,
          change_for:
            form.payment_method === "dinheiro" && form.change_for ? Number(form.change_for) : null,
          notes: form.notes || null,
          accept_terms: true as const,
          confirm_age: true as const,
          consent_version: LEGAL_VERSION,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            extras: i.extras.map((x) => ({ name: x.name, quantity: 1 })),
          })),
        },
      });

      pedidoEnviado.current = true;
      saveAgeConfirmation(); // guarda só a flag de maioridade (sem dado pessoal)

      /**
       * Monta a mensagem do pedido e aponta a aba aberta no clique para o
       * WhatsApp da loja. O cliente ainda precisa tocar em "enviar" lá —
       * é o WhatsApp quem entrega o pedido à adega.
       */
      const phone = pickOrderPhone(whatsappNumbers.data, settings.data?.whatsapp_admin);
      if (phone && waWindow) {
        const linhas = items.map(
          (i) =>
            `• ${i.quantity}x ${i.name}` +
            (i.extras.length ? ` (+ ${i.extras.map((x) => x.name).join(", ")})` : "") +
            ` — ${formatBRL(i.price * i.quantity)}`,
        );
        const endereco =
          `${form.address_street}, ${form.address_number}` +
          (form.address_complement ? ` — ${form.address_complement}` : "") +
          ` — ${form.address_neighborhood}` +
          (form.address_reference ? ` (ref: ${form.address_reference})` : "");
        const msg = [
          `🧾 *Novo pedido — Subzero Delivery*`,
          ``,
          ...linhas,
          ``,
          `Subtotal: ${formatBRL(subtotal)}`,
          `Entrega (${form.address_neighborhood}): ${formatBRL(deliveryFee)}`,
          `*Total: ${formatBRL(total)}*`,
          `Pagamento: ${PAYMENT_LABEL[form.payment_method]}` +
            (form.payment_method === "dinheiro" && form.change_for
              ? ` (troco para ${formatBRL(Number(form.change_for))} → ${formatBRL(change)})`
              : ""),
          ``,
          `👤 ${form.customer_name} — ${form.customer_phone}`,
          `📍 ${endereco}`,
          coords ? `🛰️ Localização: ${mapsLink({ lat: coords.lat, lng: coords.lng })}` : "",
          form.notes ? `📝 Obs: ${form.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        waWindow.location.href = waLink(phone, msg);
      } else {
        waWindow?.close(); // sem número ativo: fecha a aba em branco
      }

      clear();
      // Guardamos só o ID do pedido (sem dados pessoais) para o atalho
      // "Pedido" da barra inferior e para abrir o chat de atendimento.
      localStorage.setItem(LAST_ORDER_KEY, result.id);
      toast.success("Pedido enviado!");
      navigate({ to: "/pedido/$id", params: { id: result.id } });
    } catch (err: unknown) {
      waWindow?.close(); // falhou: não deixa aba em branco pendurada
      console.error(err);
      toast.error("Erro ao enviar pedido", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link to="/" className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-bold">Finalizar pedido</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Itens */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens</h2>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.lineId} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(i.price)} cada</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-border bg-secondary">
                    <button type="button" onClick={() => setQty(i.lineId, i.quantity - 1)} className="grid size-8 place-items-center text-muted-foreground hover:text-primary">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                    <button type="button" onClick={() => setQty(i.lineId, i.quantity + 1)} className="grid size-8 place-items-center text-muted-foreground hover:text-primary">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(i.lineId)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {i.extras.length > 0 && (
                  <ul className="mt-2 ml-1 space-y-0.5 border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
                    {i.extras.map((e, idx) => (
                      <li key={idx}>+ {e.name} <span className="text-primary">({formatBRL(e.price)})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Cliente */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Seus dados</h2>
          <div className="grid gap-3">
            <Field label="Nome completo *">
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </Field>
            <Field label="WhatsApp / Telefone *">
              <Input type="tel" placeholder="(49) 99999-9999" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} required />
            </Field>
          </div>
        </section>

        {/* Endereço */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Endereço de entrega — Lages/SC</h2>

          <Field label="Bairro *">
            <Select
              value={form.address_neighborhood}
              onValueChange={(v) => setForm({ ...form, address_neighborhood: v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione seu bairro" /></SelectTrigger>
              <SelectContent>
                {(neighborhoods.data ?? []).map((n) => (
                  <SelectItem key={n.id} value={n.name}>
                    {n.name} — {formatBRL(Number(n.fee))}
                  </SelectItem>
                ))}
                {(neighborhoods.data ?? []).length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Sem bairros cadastrados</div>
                )}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="Rua / Logradouro *">
              <Input value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} required />
            </Field>
            <Field label="Número *">
              <Input value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} required />
            </Field>
          </div>
          <Field label="Complemento (apto, bloco, casa…)">
            <Input value={form.address_complement} onChange={(e) => setForm({ ...form, address_complement: e.target.value })} placeholder="Ex: Apto 42, bloco B" />
          </Field>
          <Field label="Ponto de referência (para facilitar a entrega)">
            <Input value={form.address_reference} onChange={(e) => setForm({ ...form, address_reference: e.target.value })} placeholder="Ex: portão azul, ao lado da padaria" />
          </Field>

          {/* GPS */}
          <Button
            type="button"
            variant={coords ? "secondary" : "outline"}
            onClick={captureGPS}
            disabled={gpsLoading}
            className="w-full gap-2"
          >
            {gpsLoading ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
            {coords ? "Localização capturada ✓ (toque para refazer)" : "Capturar minha localização (GPS)"}
          </Button>
          {coords && (
            <p className="text-xs text-muted-foreground">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — o motoboy receberá o link do Google Maps.
            </p>
          )}
        </section>

        {/* Pagamento */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</h2>
          <RadioGroup
            value={form.payment_method}
            onValueChange={(v) => setForm({ ...form, payment_method: v as "pix" | "cartao" | "dinheiro" })}
            className="grid grid-cols-3 gap-2"
          >
            {(["pix", "cartao", "dinheiro"] as const).map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-2xl border p-3 text-center text-sm font-medium transition-colors ${
                  form.payment_method === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                }`}
              >
                <RadioGroupItem value={m} className="sr-only" />
                {PAYMENT_LABEL[m]}
              </label>
            ))}
          </RadioGroup>

          {form.payment_method === "dinheiro" && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
              <Field label={`Vai pagar com quanto? (total ${formatBRL(total)})`}>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.change_for}
                  onChange={(e) => setForm({ ...form, change_for: e.target.value })}
                  placeholder="Ex: 100.00"
                />
              </Field>
              {form.change_for && Number(form.change_for) >= total && (
                <p className="text-sm">
                  Troco a levar:{" "}
                  <span className="font-bold text-primary">{formatBRL(change)}</span>
                </p>
              )}
              {form.change_for && Number(form.change_for) < total && (
                <p className="text-xs text-destructive">Valor menor que o total do pedido.</p>
              )}
            </div>
          )}
        </section>

        {/* Observações */}
        <Field label="Observações">
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Sem cebola, ponto da carne, etc." />
        </Field>

        {/* Resumo + botão */}
        <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <Row label="Subtotal" value={formatBRL(subtotal)} />
          <Row label={`Entrega${form.address_neighborhood ? ` (${form.address_neighborhood})` : ""}`} value={formatBRL(deliveryFee)} />
          <div className="border-t border-border pt-2">
            <Row label={<span className="font-bold">Total</span>} value={<span className="text-lg font-bold text-primary">{formatBRL(total)}</span>} />
          </div>
        </section>

        {/* Consentimentos obrigatórios (LGPD + venda 18+) */}
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {/* Sem <label> em volta: o texto tem links e o clique não deve alternar a caixa */}
          <div className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
            <Checkbox
              checked={aceiteIdade}
              onCheckedChange={(v) => setAceiteIdade(v === true)}
              aria-label="Declaro ter 18 anos ou mais"
              className="mt-0.5"
            />
            <span>
              Declaro que <strong className="text-foreground">tenho 18 anos ou mais</strong> e sei que
              a entrega de bebida alcoólica exige documento com foto (Lei 13.106/2015).
            </span>
          </div>

          <div className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
            <Checkbox
              checked={aceiteTermos}
              onCheckedChange={(v) => setAceiteTermos(v === true)}
              aria-label="Aceito os termos e a política de privacidade"
              className="mt-0.5"
            />
            <span>
              Li e aceito os{" "}
              <Link to="/termos" className="text-primary underline">Termos de Uso</Link>, a{" "}
              <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>{" "}
              e a <Link to="/cancelamento" className="text-primary underline">Política de Cancelamento</Link>.
              Autorizo o uso do meu nome, telefone e endereço apenas para preparar e entregar este
              pedido, inclusive o repasse ao entregador.
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Não pedimos CPF nem dados de cartão. Você pode solicitar acesso ou exclusão dos seus
            dados a qualquer momento na Política de Privacidade.
          </p>
        </section>

        <Button type="submit" size="lg" disabled={submitting || !aceiteTermos || !aceiteIdade} className="w-full font-bold">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : `Enviar pedido · ${formatBRL(total)}`}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
