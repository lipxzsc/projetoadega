/**
 * MONTE SEU COMBO.
 *
 * O cliente escolhe QUANTIDADES livremente em cada etapa:
 *   Destilados → Energéticos → Refrigerantes → Gelos → Copos (300/500/750ml)
 *
 * As etapas são montadas a partir do "kind" das categorias cadastradas pelo
 * restaurante (ver src/lib/category-icons.ts), então tudo é editável no admin
 * sem mexer no código.
 *
 * O combo entra no carrinho como UMA linha:
 *   - produto base  = primeiro destilado escolhido (ou o primeiro item, se não houver destilado)
 *   - adicionais    = todas as demais unidades escolhidas
 * No checkout, o servidor recalcula cada preço pelo banco — o valor exibido
 * aqui é apenas uma prévia para o cliente.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Sparkles, Utensils } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { formatBRL } from "@/lib/format";
import { COMBO_STEPS, getCategoryIcon } from "@/lib/category-icons";
import { useCart, type CartExtra } from "@/lib/cart-store";

import { brandMeta } from "@/lib/brand";

export const Route = createFileRoute("/combo")({
  component: ComboPage,
  head: () => ({
    meta: brandMeta("Monte seu combo", "Escolha bebidas, gelos e copos e monte seu combo com entrega em Lages pela Subzero Delivery."),
  }),
});

interface Produto {
  id: string; name: string; price: number; image_url?: string | null; category_id?: string | null;
}

function ComboPage() {
  const navigate = useNavigate();
  const add = useCart((s) => s.add);

  /** quantidades escolhidas: id do produto → quantidade */
  const [qtds, setQtds] = useState<Record<string, number>>({});

  /** Mostra o aviso "combo no carrinho" com as duas opções de continuidade. */
  const [confirmado, setConfirmado] = useState(false);

  const dados = useQuery({
    queryKey: ["combo-catalogo"],
    queryFn: async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("id, name, kind, icon").eq("is_active", true).order("sort_order"),
        supabase.from("products").select("id, name, price, image_url, category_id").eq("is_active", true).order("name"),
      ]);
      return { cats: cats ?? [], prods: (prods ?? []) as Produto[] };
    },
  });

  /** Etapas do combo já com os produtos de cada kind. */
  const etapas = useMemo(() => {
    const cats = dados.data?.cats ?? [];
    const prods = dados.data?.prods ?? [];
    return COMBO_STEPS.map((step) => {
      const categorias = cats.filter((c) => c.kind === step.kind);
      const ids = new Set(categorias.map((c) => c.id));
      return {
        ...step,
        icone: getCategoryIcon(categorias[0]?.icon),
        produtos: prods.filter((p) => p.category_id && ids.has(p.category_id)),
      };
    }).filter((s) => s.produtos.length > 0);
  }, [dados.data]);

  /** Lista plana de itens escolhidos (com preço), usada no resumo e no carrinho. */
  const escolhidos = useMemo(() => {
    const prods = dados.data?.prods ?? [];
    return prods
      .map((p) => ({ produto: p, quantidade: qtds[p.id] ?? 0 }))
      .filter((x) => x.quantidade > 0);
  }, [dados.data, qtds]);

  const total = escolhidos.reduce((a, x) => a + Number(x.produto.price) * x.quantidade, 0);
  const totalItens = escolhidos.reduce((a, x) => a + x.quantidade, 0);

  const mudarQtd = (id: string, delta: number) =>
    setQtds((m) => ({ ...m, [id]: Math.max(0, (m[id] ?? 0) + delta) }));

  /** Envia o combo montado para o carrinho como uma única linha. */
  const adicionarAoCarrinho = () => {
    if (escolhidos.length === 0) return;

    // Base preferencial: um destilado. Caso não haja, usa o primeiro item.
    const idsDestilados = new Set(
      etapas.find((e) => e.kind === "distilled")?.produtos.map((p) => p.id) ?? [],
    );
    const base = escolhidos.find((x) => idsDestilados.has(x.produto.id)) ?? escolhidos[0];
    if (!base) return;

    // Todas as demais unidades viram "adicionais" da linha.
    const extras: CartExtra[] = [];
    for (const item of escolhidos) {
      const unidades = item.produto.id === base.produto.id ? item.quantidade - 1 : item.quantidade;
      for (let i = 0; i < unidades; i++) {
        extras.push({ name: item.produto.name, price: Number(item.produto.price) });
      }
    }

    add({
      productId: base.produto.id,
      name: `Combo: ${base.produto.name}`,
      unitPrice: Number(base.produto.price),
      imageUrl: base.produto.image_url,
      extras,
      quantity: 1,
    });

    toast.success("Combo adicionado ao carrinho!");
    setQtds({});
    // O combo fica pronto no carrinho: o cliente decide se finaliza ou continua comprando.
    setConfirmado(true);
  };

  return (
    <div className="grid-bg min-h-screen bg-background pb-44">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black uppercase tracking-tight">Monte seu combo</h1>
            <p className="truncate text-[11px] text-muted-foreground">Escolha as quantidades de cada item</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {dados.isLoading && (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-card" />
            ))}
          </div>
        )}

        {!dados.isLoading && etapas.length === 0 && (
          <p className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            A adega ainda não cadastrou itens de combo.
          </p>
        )}

        {etapas.map((etapa, idx) => (
          <section key={etapa.kind} className="mt-6">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
                <etapa.icone className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-black uppercase tracking-tight">
                  {idx + 1}. {etapa.title}
                </h2>
                <p className="truncate text-[11px] text-muted-foreground">{etapa.hint}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {etapa.produtos.map((p) => {
                const q = qtds[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                      q > 0 ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} loading="lazy" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <Utensils className="size-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.name}</p>
                      <p className="text-xs font-semibold text-primary">{formatBRL(Number(p.price))}</p>
                    </div>
                    <Stepper value={q} onChange={(d) => mudarQtd(p.id, d)} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Resumo fixo do combo */}
      {totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] uppercase text-muted-foreground">
                {totalItens} {totalItens === 1 ? "item" : "itens"} no combo
              </p>
              <p className="text-lg font-black text-primary">{formatBRL(total)}</p>
            </div>
            <Button onClick={adicionarAoCarrinho} className="shrink-0 rounded-full font-black uppercase">
              <Sparkles className="mr-1 size-4" /> Adicionar
            </Button>
          </div>
        </div>
      )}

      {/* Combo pronto no carrinho: continuar comprando ou finalizar */}
      <Dialog open={confirmado} onOpenChange={setConfirmado}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black uppercase">
              Combo no carrinho!
            </DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">
            Seu combo está guardado. Você pode adicionar mais itens ou finalizar a compra agora.
          </p>
          <div className="mt-2 grid gap-2">
            <Button
              onClick={() => navigate({ to: "/checkout" })}
              className="rounded-full font-black uppercase"
            >
              Finalizar compra
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/" })}
              className="rounded-full font-bold uppercase"
            >
              Adicionar mais itens
            </Button>
            <Button variant="ghost" onClick={() => setConfirmado(false)} className="rounded-full">
              Continuar montando
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

/** Seletor de quantidade (− valor +). */
function Stepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background p-1">
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value === 0}
        aria-label="Diminuir"
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label="Aumentar"
        className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
