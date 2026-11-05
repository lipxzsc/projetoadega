/**
 * Bottom-sheet de detalhe do produto.
 *
 * - Se o produto pertence a uma categoria do tipo `distilled`, oferece o
 *   modo "Combo": cliente escolhe energéticos (categoria energy_drink) e
 *   um gelo (categoria ice) — o preço é somado em tempo real.
 * - Para produtos comuns, mostra apenas quantidade + adicionar.
 *
 * Responsivo: ocupa a tela inteira no mobile, modal central no desktop.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Sparkles, Utensils } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartExtra } from "@/lib/cart-store";
import { formatBRL } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
  kind: string;
}

interface Props {
  product: Product | null;
  categoryKind?: string;          // kind da categoria do produto (food/distilled/...)
  onClose: () => void;
}

export function ProductSheet({ product, categoryKind, onClose }: Props) {
  const isMobile = useIsMobile();
  const add = useCart((s) => s.add);

  const [qty, setQty] = useState(1);
  const [comboMode, setComboMode] = useState(false);                  // só destilados
  const [energyIds, setEnergyIds] = useState<Record<string, number>>({}); // id → qty
  const [iceId, setIceId] = useState<string | null>(null);

  const isDistilled = categoryKind === "distilled";

  // Reseta estado a cada produto aberto
  useEffect(() => {
    setQty(1);
    setComboMode(false);
    setEnergyIds({});
    setIceId(null);
  }, [product?.id]);

  // Busca opções de combo (energéticos + gelos) — só carrega quando precisa
  const combos = useQuery({
    enabled: !!product && isDistilled,
    queryKey: ["combo-options"],
    queryFn: async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("id, name, kind").in("kind", ["energy_drink", "ice"]),
        supabase.from("products").select("*").eq("is_active", true),
      ]);
      const catList = (cats ?? []) as Category[];
      const energyCatIds = catList.filter((c) => c.kind === "energy_drink").map((c) => c.id);
      const iceCatIds    = catList.filter((c) => c.kind === "ice").map((c) => c.id);
      const list = (prods ?? []) as Product[];
      return {
        energies: list.filter((p) => p.category_id && energyCatIds.includes(p.category_id)),
        ices:     list.filter((p) => p.category_id && iceCatIds.includes(p.category_id)),
      };
    },
  });

  /** Calcula extras escolhidos no combo. */
  const extras: CartExtra[] = useMemo(() => {
    if (!isDistilled || !comboMode || !combos.data) return [];
    const out: CartExtra[] = [];
    for (const e of combos.data.energies) {
      const q = energyIds[e.id] ?? 0;
      for (let i = 0; i < q; i++) out.push({ name: e.name, price: Number(e.price) });
    }
    if (iceId) {
      const ice = combos.data.ices.find((i) => i.id === iceId);
      if (ice) out.push({ name: ice.name, price: Number(ice.price) });
    }
    return out;
  }, [isDistilled, comboMode, combos.data, energyIds, iceId]);

  if (!product) return null;

  const unitPrice = Number(product.price);
  const extrasTotal = extras.reduce((a, e) => a + e.price, 0);
  const lineTotal = (unitPrice + extrasTotal) * qty;

  // Validação: combo precisa de pelo menos 1 energético e 1 gelo
  const energyCount = Object.values(energyIds).reduce((a, n) => a + n, 0);
  const comboValid = !comboMode || (energyCount >= 1 && !!iceId);

  const handleAdd = () => {
    add({
      productId: product.id,
      name: comboMode ? `${product.name} (combo)` : product.name,
      unitPrice,
      imageUrl: product.image_url,
      extras,
      quantity: qty,
    });
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={
          isMobile
            ? "h-[92vh] max-w-full rounded-t-3xl rounded-b-none p-0 sm:rounded-3xl"
            : "max-w-lg p-0"
        }
      >
        <div className="flex h-full max-h-[92vh] flex-col">
          {/* Imagem */}
          <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-t-3xl bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <Utensils className="size-10" />
              </div>
            )}
          </div>

          {/* Conteúdo rolável */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div>
              <h2 className="text-xl font-bold">{product.name}</h2>
              {product.description && (
                <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              )}
              <p className="mt-2 text-lg font-bold text-primary">{formatBRL(unitPrice)}</p>
            </div>

            {/* Toggle combo (somente destilados) */}
            {isDistilled && (
              <section className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Como deseja?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceCard
                    active={!comboMode}
                    title="Só a bebida"
                    desc="Sem adicionais"
                    onClick={() => setComboMode(false)}
                  />
                  <ChoiceCard
                    active={comboMode}
                    title="Monte um combo"
                    desc="+ energético e gelo"
                    icon={<Sparkles className="size-4" />}
                    onClick={() => setComboMode(true)}
                  />
                </div>
              </section>
            )}

            {/* Combo builder */}
            {isDistilled && comboMode && (
              <>
                {/* Energéticos */}
                <section className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Energéticos <span className="text-xs normal-case text-muted-foreground">(escolha 1 ou mais)</span>
                  </p>
                  {combos.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
                  {(combos.data?.energies ?? []).length === 0 && !combos.isLoading && (
                    <p className="text-xs text-muted-foreground">Nenhum energético cadastrado.</p>
                  )}
                  <div className="space-y-2">
                    {(combos.data?.energies ?? []).map((e) => {
                      const q = energyIds[e.id] ?? 0;
                      return (
                        <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{e.name}</p>
                            <p className="text-xs text-primary">+ {formatBRL(Number(e.price))}</p>
                          </div>
                          <QtyStepper
                            value={q}
                            onChange={(n) => setEnergyIds((m) => ({ ...m, [e.id]: Math.max(0, n) }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Gelo */}
                <section className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Gelo <span className="text-xs normal-case text-muted-foreground">(escolha 1)</span>
                  </p>
                  {(combos.data?.ices ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma opção de gelo cadastrada.</p>
                  )}
                  <div className="space-y-2">
                    {(combos.data?.ices ?? []).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setIceId(g.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                          iceId === g.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-primary">+ {formatBRL(Number(g.price))}</p>
                        </div>
                        {iceId === g.id && <Badge variant="outline" className="border-primary text-primary">Selecionado</Badge>}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Rodapé fixo: quantidade + adicionar */}
          <div className="flex items-center gap-3 border-t border-border bg-card/80 p-4 backdrop-blur">
            <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} />
            <Button
              className="ml-auto flex-1 font-bold"
              size="lg"
              disabled={!comboValid}
              onClick={handleAdd}
            >
              {comboValid
                ? `Adicionar · ${formatBRL(lineTotal)}`
                : "Escolha energético e gelo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- helpers visuais ----------------- */

function ChoiceCard({
  active, title, desc, icon, onClick,
}: { active: boolean; title: string; desc: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-secondary">
      <button type="button" onClick={() => onChange(value - 1)} className="grid size-9 place-items-center text-muted-foreground hover:text-primary">
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center text-sm font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="grid size-9 place-items-center text-muted-foreground hover:text-primary">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
