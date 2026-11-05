/**
 * ACOMPANHAMENTO DO PEDIDO — público, acessível só com o UUID do pedido.
 *
 * Segurança: os dados vêm de uma SERVER FUNCTION que devolve apenas o
 * necessário (status, itens e valores) — endereço, telefone, nome completo e
 * coordenadas ficam restritos à administração. A tela atualiza por polling.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, ChefHat, Circle, PackageCheck, Truck } from "lucide-react";
import { getOrderTracking } from "@/lib/orders.functions";
import { formatBRL, formatDateTime, PAYMENT_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { brandMeta } from "@/lib/brand";

export const Route = createFileRoute("/pedido/$id")({
  component: TrackingPage,
  head: () => ({ meta: brandMeta("Acompanhar pedido", "Acompanhe o preparo e a entrega do seu pedido na Subzero Delivery.") }),
});

// Etapas do progresso (visual didático) — cada uma com mensagem amigável
const STEPS = [
  { key: "recebido",     label: "Pedido recebido",   icon: Circle,        msg: "Recebemos seu pedido! Em instantes a adega vai começar a separar." },
  { key: "preparando",   label: "A adega aceitou e começou a preparar", icon: ChefHat, msg: "Seu pedido está sendo preparado com carinho 👨‍🍳" },
  { key: "pronto",       label: "Pronto",            icon: PackageCheck,  msg: "Pedido pronto! Aguardando motoboy retirar." },
  { key: "saiu_entrega", label: "Saiu para entrega", icon: Truck,         msg: "Saiu para entrega! Chegará em breve 🛵" },
  { key: "entregue",     label: "Pedido chegou",     icon: CheckCircle2,  msg: "Entregue! Bom apetite 🎉" },
];


function TrackingPage() {
  const { id } = Route.useParams();
  const fetchTracking = useServerFn(getOrderTracking);

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchTracking({ data: { id } }),
    refetchInterval: 10000, // atualização automática do andamento
  });

  const order = query.data?.order;
  const items = query.data?.items ?? [];


  if (query.isLoading) return <Center>Carregando pedido…</Center>;
  if (!order) return <Center>Pedido não encontrado.</Center>;

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link to="/" className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">Pedido #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Mensagem amigável do status atual */}
        {order.status !== "cancelado" && currentStepIdx >= 0 && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center">
            <p className="text-base font-semibold text-primary">
              {STEPS[currentStepIdx].msg}
            </p>
          </section>
        )}

        {/* Linha do tempo */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Acompanhe seu pedido
          </h2>

          <ol className="space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentStepIdx && order.status !== "cancelado";
              const active = idx === currentStepIdx && order.status !== "cancelado";
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <div
                    className={`grid size-9 place-items-center rounded-full border transition-colors ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                    } ${active ? "animate-pulse" : ""}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          {order.status === "cancelado" && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Este pedido foi cancelado.
            </p>
          )}
        </section>

        {/* Itens */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens</h2>
          <div className="rounded-2xl border border-border bg-card">
            {items.map((i, idx) => (
              <div
                key={i.id}
                className={`flex items-center justify-between p-3 ${idx > 0 ? "border-t border-border" : ""}`}
              >
                <span className="text-sm">{i.quantity}x {i.product_name}</span>
                <span className="text-sm font-medium">{formatBRL(Number(i.subtotal))}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Resumo financeiro */}
        <section className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <Row label="Subtotal" value={formatBRL(Number(order.subtotal))} />
          <Row label="Entrega" value={formatBRL(Number(order.delivery_fee))} />
          <Row label="Pagamento" value={PAYMENT_LABEL[order.payment_method]} />
          <div className="border-t border-border pt-2">
            <Row label={<span className="font-bold">Total</span>} value={<span className="font-bold text-primary">{formatBRL(Number(order.total))}</span>} />
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Guarde este link para acompanhar — ele atualiza sozinho.
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
