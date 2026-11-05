/**
 * HOME / CARDÁPIO — visível para qualquer visitante (sem login).
 *
 * Estrutura (estilo app de delivery noturno):
 *  1. Cabeçalho com a marca da loja + atalho Admin.
 *  2. Banner "herói" com status da loja e CTA "Monte seu combo".
 *  3. Busca por nome.
 *  4. Faixa de categorias em blocos com ícone.
 *  5. Uma SEÇÃO por categoria, com os produtos daquela categoria.
 *  6. Barra de navegação inferior fixa.
 *
 * Nenhum dado sensível é lido aqui: apenas catálogo público
 * (produtos/categorias/configurações da loja).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, Search, ShieldCheck, Sparkles, Utensils } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STORE_NAME, STORE_ARTWORK, STORE_ICON, brandMeta } from "@/lib/brand";
import { formatBRL } from "@/lib/format";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductSheet } from "@/components/ProductSheet";
import { getCategoryIcon } from "@/lib/category-icons";
import { horarioDeHoje, lojaAberta, type StoreHourRow } from "@/lib/store-open";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: brandMeta("Bebidas, conveniência e combos em Lages", "Bebidas, gelos, snacks e combos personalizados da Subzero Delivery em Lages/SC. Peça e acompanhe sua entrega."),
  }),
});

interface Category {
  id: string; name: string; icon?: string | null; kind: string; is_active: boolean; sort_order: number;
}
interface Product {
  id: string; name: string; description?: string | null; price: number;
  image_url?: string | null; category_id?: string | null; is_active: boolean;
}

function HomePage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openProduct, setOpenProduct] = useState<Product | null>(null);

  const settings = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => (await supabase.from("store_settings_public").select("*").eq("id", 1).maybeSingle()).data,
    refetchInterval: 60_000, // reflete rapidamente o abre/fecha feito no admin
  });

  // Horários de atendimento por dia da semana (público).
  const hours = useQuery({
    queryKey: ["store-hours"],
    queryFn: async () =>
      ((await supabase.from("store_hours").select("weekday, opens_at, closes_at, is_closed")).data ??
        []) as StoreHourRow[],
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      return (data ?? []) as Product[];
    },
  });

  // Fechada = interruptor manual desligado OU fora do horário cadastrado.
  const isClosed = !!settings.data && !lojaAberta(settings.data.is_open, hours.data);
  const textoHorario = horarioDeHoje(hours.data);
  const lista = products.data ?? [];

  /** Mapa categoria → kind (usado para decidir se abre o montador de combo). */
  const kindByCat = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories.data ?? []) m.set(c.id, c.kind);
    return m;
  }, [categories.data]);

  /**
   * Agrupa os produtos por categoria, já aplicando busca e filtro de chip.
   * Categorias sem produtos visíveis simplesmente não aparecem.
   */
  const secoes = useMemo(() => {
    const busca = query.trim().toLowerCase();
    return (categories.data ?? [])
      .filter((c) => !activeCat || c.id === activeCat)
      .map((c) => ({
        categoria: c,
        produtos: lista.filter(
          (p) => p.category_id === c.id && (!busca || p.name.toLowerCase().includes(busca)),
        ),
      }))
      .filter((s) => s.produtos.length > 0);
  }, [categories.data, lista, activeCat, query]);

  const carregando = products.isLoading || categories.isLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ---------- Cabeçalho ---------- */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={STORE_ICON} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
            <div className="min-w-0">
            <p className="font-display text-lg font-bold uppercase sm:text-xl">{STORE_NAME}</p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Lages/SC · entrega rápida
            </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link
            to="/auth"
            className="shrink-0 text-muted-foreground"
          >
            <ShieldCheck className="size-3.5" /> Admin
          </Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* ---------- Banner herói ---------- */}
        <section className="store-cover relative -mx-4 border-b border-primary/30 px-4 pb-6 pt-8 text-center">
          <img src={STORE_ARTWORK} alt="Subzero Delivery — logo azul com cubo de gelo e raio" fetchPriority="high" width={1186} height={280} className="mx-auto h-24 w-full max-w-lg object-contain sm:h-36" />
          <div className="mt-1 flex items-center justify-center gap-3">
          <span
            className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase ${
              isClosed ? "text-muted-foreground" : "text-success"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {isClosed ? "Fechada no momento" : "Aberta agora"}
          </span>
          <span className="text-[11px] text-muted-foreground">Lages / SC</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold uppercase sm:text-5xl">Subzero <span className="text-primary">Delivery</span></h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Bebidas geladas, conveniência e o combo do seu jeito.
          </p>
          <Button asChild size="lg" className="mt-4 h-11 font-bold"><Link
            to="/combo"
          >
            <Sparkles className="size-4" /> Monte seu combo <ArrowRight className="size-4" />
          </Link></Button>
        </section>

        {/* ---------- Busca ---------- */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar produto"
            className="h-12 rounded-lg pl-10"
          />
        </div>

        {/* ---------- Categorias ---------- */}
        <section className="mt-6">
          <h3 className="text-lg font-black uppercase tracking-tight">Categorias</h3>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            <CategoryTile label="Tudo" Icon={Utensils} active={!activeCat} onClick={() => setActiveCat(null)} />
            {(categories.data ?? []).map((c) => (
              <CategoryTile
                key={c.id}
                label={c.name}
                Icon={getCategoryIcon(c.icon)}
                active={activeCat === c.id}
                onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
              />
            ))}
          </div>
        </section>

        {/* ---------- Aviso de loja fechada ---------- */}
        {isClosed && (
          <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            A loja está fechada agora. Você pode navegar, mas não é possível finalizar o pedido.
            {textoHorario && <span className="mt-1 block font-semibold">Atendimento hoje: {textoHorario}</span>}
          </div>
        )}

        {/* ---------- Seções por categoria ---------- */}
        {carregando && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-card" />
            ))}
          </div>
        )}

        {!carregando && secoes.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {lista.length === 0 ? (
              <>Nenhum produto cadastrado ainda. Acesse a área <Link to="/auth" className="text-primary underline">Admin</Link>.</>
            ) : (
              "Nada encontrado para essa busca."
            )}
          </div>
        )}

        {secoes.map(({ categoria, produtos }) => {
          const Icon = getCategoryIcon(categoria.icon);
          return (
            <section key={categoria.id} className="mt-8">
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                <h3 className="truncate text-lg font-black uppercase tracking-tight">{categoria.name}</h3>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{produtos.length} itens</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {produtos.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    combo={kindByCat.get(p.category_id ?? "") === "distilled"}
                    disabled={!!isClosed}
                    onClick={() => setOpenProduct(p)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <SiteFooter />
      <BottomNav />

      <ProductSheet
        product={openProduct}
        categoryKind={openProduct ? kindByCat.get(openProduct.category_id ?? "") : undefined}
        onClose={() => setOpenProduct(null)}
      />
    </div>
  );
}

/** Bloco quadrado da faixa de categorias. */
function CategoryTile({
  label, Icon, active, onClick,
}: { label: string; Icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost"
      type="button"
      onClick={onClick}
      className={`flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-2 whitespace-normal rounded-lg border transition-all active:scale-95 ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/50"
      }`}
    >
      <Icon className="size-6" />
      <span
        className={`px-1 text-center text-[10px] font-black uppercase leading-tight ${
           active ? "text-primary" : "text-foreground"
        }`}
      >
        {label}
      </span>
    </Button>
  );
}

/** Card de produto. */
function ProductCard({
  product, combo, disabled, onClick,
}: { product: Product; combo: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost"
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className="group flex h-auto flex-col items-stretch gap-0 overflow-hidden whitespace-normal rounded-lg border border-border bg-card p-0 text-left transition-all hover:border-primary/60 active:scale-[0.98] disabled:opacity-60"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Utensils className="size-7" />
          </div>
        )}
        {combo && (
          <span className="absolute left-2 top-2 rounded-full bg-neon px-2 py-0.5 text-[10px] font-black uppercase text-neon-foreground">
            Combo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h4 className="line-clamp-2 text-sm font-bold">{product.name}</h4>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        )}
        <p className="mt-auto pt-2 text-base font-black text-primary">{formatBRL(Number(product.price))}</p>
      </div>
    </Button>
  );
}
