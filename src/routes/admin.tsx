/**
 * PAINEL DO ADMIN — abas:
 *  - Pedidos: ativos (não entregues). Após "Confirmar entrega" sai da lista e vai para Relatórios.
 *  - Relatórios: diário / semanal / mensal de pedidos entregues, com download CSV/PDF e exclusão.
 *  - Produtos / Categorias / Motoboys / Config.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, BarChart3, Bike, Camera, ClipboardList, Download, ExternalLink, FileText,
  Loader2, LogOut, MapPin, Package, Pencil, Plus, Tag, Trash2, Map as MapIcon,
  Clock, Ticket, ScrollText,
} from "lucide-react";


import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-admin";
import { formatBRL, formatDateTime, mapsLink, PAYMENT_LABEL, STATUS_LABEL, waLink } from "@/lib/format";
import { downloadCSV, downloadPDF, periodKey, periodLabel, PERIOD_LABEL, ReportPeriod } from "@/lib/reports";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_KINDS, ICON_OPTIONS, KIND_LABEL, getCategoryIcon } from "@/lib/category-icons";
import { WEEKDAY_LABELS, shortTime, type StoreHourRow } from "@/lib/store-open";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminSidebar, AdminSectionSelect, findSection, type AdminSectionId,
} from "@/components/admin/AdminNav";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { brandMeta } from "@/lib/brand";
import { playNewOrderSound } from "@/lib/order-sound";
import { WhatsappNumbersCard } from "@/components/admin/WhatsappNumbersCard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminPage,
  head: () => ({ meta: brandMeta("Painel administrativo", "Gestão da Subzero Delivery: pedidos, produtos e entregas.") }),
});

function AdminPage() {
  const navigate = useNavigate();
  const { loading, isAdmin } = useIsAdmin();

  // Seção atualmente aberta (substitui as abas espremidas do topo)
  const [section, setSection] = useState<AdminSectionId>("orders");
  const atual = findSection(section);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/auth" });
  }, [loading, isAdmin, navigate]);

  if (loading) return <Center>Verificando acesso…</Center>;
  if (!isAdmin) return <Center>Acesso restrito.</Center>;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Barra fixa: voltar, título e sair */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-primary" aria-label="Voltar ao site">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-base font-bold sm:text-lg">Painel Administrativo</h1>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
        {/* Menu lateral (desktop) */}
        <AdminSidebar value={section} onChange={setSection} />

        <main className="min-w-0 flex-1 space-y-4">
          {/* Cabeçalho da seção + seletor no mobile */}
          <div className="space-y-3">
            <AdminSectionSelect value={section} onChange={setSection} />
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <atual.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{atual.label}</h2>
                <p className="truncate text-xs text-muted-foreground">{atual.hint}</p>
              </div>
            </div>
          </div>

          {/* Conteúdo da seção escolhida */}
          {section === "orders" && <OrdersTab />}
          {section === "hours" && <HoursTab />}
          {section === "products" && <ProductsTab />}
          {section === "categories" && <CategoriesTab />}
          {section === "neighborhoods" && <NeighborhoodsTab />}
          {section === "motoboys" && <MotoboysTab />}
          {section === "coupons" && <CouponsTab />}
          {section === "reports" && <ReportsTab />}
          {section === "privacy" && <PrivacyTab />}
          {section === "settings" && (
            <div className="space-y-4">
              <WhatsappNumbersCard />
              <SettingsTab />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


/* =================== PEDIDOS (ativos) =================== */
function OrdersTab() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      // Mostra apenas pedidos NÃO entregues (entregues vão para Relatórios)
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), motoboys(name, phone)")
        .neq("status", "entregue")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" },
        (payload) => {
          // Pedido novo chegando: toca o alerta sonoro
          if (payload.eventType === "INSERT") {
            playNewOrderSound();
            toast.success("🔔 Novo pedido chegou!");
          }
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  if (orders.isLoading) return <p className="py-12 text-center text-muted-foreground">Carregando…</p>;
  if ((orders.data ?? []).length === 0) return <Empty icon={<ClipboardList />} label="Nenhum pedido ativo" />;

  return (
    <div className="space-y-3">
      {orders.data!.map((o) => <OrderCard key={o.id} order={o} />)}
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const motoboys = useQuery({
    queryKey: ["motoboys-active"],
    queryFn: async () => {
      const { data } = await supabase.from("motoboys").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const changeStatus = async (status: "recebido" | "preparando" | "pronto" | "saiu_entrega" | "entregue" | "cancelado") => {
    setUpdating(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    setUpdating(false);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  /**
   * Apaga definitivamente um pedido cancelado.
   * Remove os itens primeiro (caso a FK não esteja em CASCADE) e depois o pedido.
   */
  const deleteCanceled = async () => {
    if (!confirm("Apagar este pedido cancelado? Esta ação é permanente.")) return;
    setUpdating(true);
    await supabase.from("order_items").delete().eq("order_id", order.id);
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    setUpdating(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido cancelado apagado");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  /**
   * Envia a entrega ao motoboy pelo WhatsApp.
   * A aba é aberta JÁ NO CLIQUE (antes de salvar) — celulares bloqueiam
   * janelas abertas depois de uma espera.
   */
  const assignMotoboy = async (motoboyId: string) => {
    const moto = motoboys.data?.find((m) => m.id === motoboyId);
    if (!moto) return;

    const enderecoTexto = [
      `${order.address_street}, ${order.address_number}`,
      order.address_complement,
      order.address_neighborhood,
      `${order.address_city || "Lages"} - SC`,
    ].filter(Boolean).join(", ");
    const temGps = order.latitude != null && order.longitude != null;
    const troco = order.change_for ? Number(order.change_for) - Number(order.total) : 0;

    const lines = [
      `🛵 *ENTREGA #${order.id.slice(0, 8)}*`,
      ``,
      `👤 *Cliente:* ${order.customer_name}`,
      `📞 *Telefone:* ${order.customer_phone}`,
      ``,
      `📍 *Endereço:* ${order.address_street}, nº ${order.address_number}`,
      order.address_complement && `🏠 *Complemento:* ${order.address_complement}`,
      `🏘️ *Bairro:* ${order.address_neighborhood} - ${order.address_city || "Lages"}/SC`,
      order.address_reference && `🔎 *Referência:* ${order.address_reference}`,
      ``,
      temGps && `🗺️ *Localização exata (GPS):* ${mapsLink({ lat: order.latitude, lng: order.longitude })}`,
      `🧭 *Rota pelo endereço:* https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoTexto)}`,
      ``,
      `*Itens:*`,
      ...(order.order_items ?? []).map((i: any) => `• ${i.quantity}x ${i.product_name}`),
      ``,
      `💳 *Pagamento:* ${PAYMENT_LABEL[order.payment_method]}`,
      order.payment_method === "dinheiro" && order.change_for &&
        `💵 Cliente paga com ${formatBRL(Number(order.change_for))} — *levar troco de ${formatBRL(troco)}*`,
      `💰 *Total a receber:* ${formatBRL(Number(order.total))}`,
    ].filter(Boolean).join("\n");

    const janela = window.open("", "_blank");
    setUpdating(true);
    const { error } = await supabase
      .from("orders")
      .update({ motoboy_id: motoboyId, status: "saiu_entrega" })
      .eq("id", order.id);
    setUpdating(false);
    if (error) { janela?.close(); return toast.error(error.message); }
    qc.invalidateQueries({ queryKey: ["admin-orders"] });

    const link = waLink(moto.phone, lines);
    if (janela && !janela.closed) janela.location.href = link;
    else window.location.href = link;
    toast.success(`Pedido enviado para ${moto.name}`);
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">#{order.id.slice(0, 8)} · {order.customer_name}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="font-bold text-primary">{formatBRL(Number(order.total))}</span>
        </div>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>📞 {order.customer_phone}</p>
        <p>💳 {PAYMENT_LABEL[order.payment_method]}{order.change_for ? ` (troco p/ ${formatBRL(Number(order.change_for))})` : ""}</p>
        <p className="sm:col-span-2">
          📍 {order.address_street}, {order.address_number}
          {order.address_complement && ` — ${order.address_complement}`} · {order.address_neighborhood} - {order.address_city}
        </p>
        {order.address_reference && <p className="sm:col-span-2">📝 {order.address_reference}</p>}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Ver itens ({order.order_items?.length ?? 0})</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {order.order_items?.map((it: any) => (
            <li key={it.id}>{it.quantity}x {it.product_name} — {formatBRL(Number(it.subtotal))}</li>
          ))}
        </ul>
      </details>

      {order.motoboys && (
        <p className="text-xs text-success">🛵 Motoboy: {order.motoboys.name} ({order.motoboys.phone})</p>
      )}

      <div className="flex flex-wrap gap-2">
        {order.status === "recebido" && (
          <Button size="sm" disabled={updating} onClick={() => changeStatus("preparando")}>Aceitar / Preparar</Button>
        )}
        {order.status === "preparando" && (
          <Button size="sm" disabled={updating} onClick={() => changeStatus("pronto")}>Marcar como pronto</Button>
        )}
        {order.status === "pronto" && (
          <Select onValueChange={assignMotoboy} disabled={updating}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]"><SelectValue placeholder="Atribuir motoboy →" /></SelectTrigger>
            <SelectContent>
              {(motoboys.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name} — {m.phone}</SelectItem>
              ))}
              {(motoboys.data ?? []).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Cadastre um motoboy primeiro</div>
              )}
            </SelectContent>
          </Select>
        )}
        {order.status === "saiu_entrega" && (
          <Button size="sm" variant="secondary" disabled={updating} onClick={() => changeStatus("entregue")}>
            Confirmar entrega
          </Button>
        )}
        {order.status !== "cancelado" && order.status !== "entregue" && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={updating} onClick={() => changeStatus("cancelado")}>Cancelar</Button>
        )}
        {/* Pedidos cancelados podem ser apagados definitivamente do painel */}
        {order.status === "cancelado" && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={updating} onClick={deleteCanceled}>
            🗑️ Excluir pedido
          </Button>
        )}
        {(order.latitude && order.longitude) && (
          <a href={mapsLink({ lat: order.latitude, lng: order.longitude })} target="_blank" rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <MapPin className="size-3" /> Ver no mapa <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  );
}

/* =================== RELATÓRIOS =================== */
function ReportsTab() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<ReportPeriod>("daily");

  const delivered = useQuery({
    queryKey: ["admin-delivered"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "entregue")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Agrupa pedidos pelo período escolhido
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const o of delivered.data ?? []) {
      const key = periodKey(new Date(o.created_at), period);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [delivered.data, period]);

  // Após baixar, exclui os pedidos do grupo (order_items cascateia via FK)
  const deleteGroup = async (orders: any[]) => {
    if (!confirm(`Excluir ${orders.length} pedido(s) deste período? Esta ação é permanente.`)) return;
    const ids = orders.map((o) => o.id);
    // Remove itens primeiro (caso a FK não esteja em CASCADE) e depois os pedidos
    await supabase.from("order_items").delete().in("order_id", ids);
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("Pedidos removidos após exportação");
    qc.invalidateQueries({ queryKey: ["admin-delivered"] });
  };


  const handleDownload = async (orders: any[], key: string, kind: "csv" | "pdf") => {
    const title = `Relatório ${PERIOD_LABEL[period]} — ${periodLabel(key, period)}`;
    const filename = `pedidos_${period}_${key}.${kind}`;
    if (kind === "csv") downloadCSV(orders, filename);
    else downloadPDF(orders, title, filename);
    // Pequeno delay para o download iniciar antes do confirm()
    setTimeout(() => deleteGroup(orders), 300);
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <span className="font-semibold">Pedidos entregues</span>
          <span className="text-xs text-muted-foreground">
            ({delivered.data?.length ?? 0} no total)
          </span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {delivered.isLoading && <p className="py-12 text-center text-muted-foreground">Carregando…</p>}
      {!delivered.isLoading && groups.length === 0 && (
        <Empty icon={<BarChart3 />} label="Nenhum pedido entregue ainda" />
      )}

      <div className="space-y-3">
        {groups.map(([key, list]) => {
          const total = list.reduce((s, o) => s + Number(o.total), 0);
          return (
            <Card key={key} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{periodLabel(key, period)}</p>
                  <p className="text-xs text-muted-foreground">
                    {list.length} pedido(s) · {formatBRL(total)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(list, key, "csv")} className="gap-1">
                    <Download className="size-4" /> CSV
                  </Button>
                  <Button size="sm" onClick={() => handleDownload(list, key, "pdf")} className="gap-1">
                    <FileText className="size-4" /> PDF
                  </Button>
                </div>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Ver pedidos</summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {list.map((o) => (
                    <li key={o.id}>
                      #{o.id.slice(0, 8)} · {o.customer_name} · {formatBRL(Number(o.total))}
                    </li>
                  ))}
                </ul>
              </details>
              <p className="text-[11px] text-muted-foreground">
                ⚠ Após baixar o arquivo, os pedidos deste período serão excluídos.
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* =================== PRODUTOS =================== */
function ProductsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").order("name");
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    toast.success("Produto excluído");
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus className="size-4" /> Novo produto</Button>

      {products.isLoading && <p className="py-8 text-center text-muted-foreground">Carregando…</p>}
      {!products.isLoading && (products.data ?? []).length === 0 && <Empty icon={<Package />} label="Nenhum produto" />}

      <div className="grid gap-2">
        {(products.data ?? []).map((p) => (
          <Card key={p.id} className="flex min-w-0 items-center gap-3 p-3">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="size-14 rounded-lg object-cover" />
            ) : (
              <div className="grid size-14 place-items-center rounded-lg bg-muted text-muted-foreground"><Package className="size-5" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.categories?.name ?? "Sem categoria"} · {formatBRL(Number(p.price))} · {p.is_active ? "Ativo" : "Inativo"}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="size-4" /></Button>
          </Card>
        ))}
      </div>

      <ProductDialog
        open={open} onOpenChange={setOpen} initial={editing} categories={categories.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-products"] })}
      />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, initial, categories, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial: any | null; categories: any[]; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", price: "", image_url: "", category_id: "", is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      price: initial?.price?.toString() ?? "",
      image_url: initial?.image_url ?? "",
      category_id: initial?.category_id ?? "",
      is_active: initial?.is_active ?? true,
    });
  }, [initial, open]);

  /** Upload da galeria → bucket privado → URL assinada de longa duração. */
  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem maior que 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw upErr;
      // URL assinada por ~100 anos (bucket privado, leitura via signed URL)
      const { data: signed, error: sErr } = await supabase.storage
        .from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (sErr) throw sErr;
      setForm((f) => ({ ...f, image_url: signed.signedUrl }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return toast.error("Preencha nome e preço");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase.from("products").update(payload).eq("id", initial.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Descrição"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$) *"><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Categoria">
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Upload da galeria + URL manual */}
          <Field label="Imagem do produto">
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="size-16 rounded-lg object-cover" />
              ) : (
                <div className="grid size-16 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Package className="size-5" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  {uploading
                    ? <><Loader2 className="size-4 animate-spin" /> Enviando…</>
                    : <><Camera className="size-4" /> Escolher da galeria</>}
                </Button>
                <Input
                  placeholder="ou cole uma URL https://…"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
            </div>
          </Field>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Produto ativo (visível no cardápio)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =================== CATEGORIAS =================== */
function CategoriesTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  // Estado do formulário de nova/edição de categoria
  const [form, setForm] = useState({ id: "", name: "", icon: "utensils", kind: "food" });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ id: "", name: "", icon: "utensils", kind: "food" });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    const payload = { name: form.name.trim(), icon: form.icon, kind: form.kind };
    const { error } = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    reset();
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  const del = async (id: string) => {
    if (!confirm("Excluir categoria? Produtos vinculados ficarão sem categoria.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };
  const toggle = async (id: string, val: boolean) => {
    await supabase.from("categories").update({ is_active: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div className="space-y-3">
      {/* Form de cadastro/edição */}
      <Card className="space-y-3 p-3">
        <p className="text-sm font-semibold">{form.id ? "Editar categoria" : "Nova categoria"}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_220px]">
          <Input placeholder="Nome (ex: Cervejas)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
            <SelectTrigger><SelectValue placeholder="Ícone" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {ICON_OPTIONS.map((opt) => {
                const I = getCategoryIcon(opt);
                return (
                  <SelectItem key={opt} value={opt}>
                    <span className="inline-flex items-center gap-2"><I className="size-4" /> {opt}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Plus className="size-4" /> {form.id ? "Salvar" : "Adicionar"}
          </Button>
          {form.id && <Button variant="ghost" onClick={reset}>Cancelar</Button>}
        </div>
        <p className="text-xs text-muted-foreground">
          Dica: use o tipo <b>Destilado</b> nas categorias de bebida que devem oferecer combo;
          <b> Energético</b> e <b>Gelo</b> alimentam as opções do combo.
        </p>
      </Card>

      {/* Lista de categorias */}
      <div className="space-y-2">
        {(list.data ?? []).map((c) => {
          const I = getCategoryIcon(c.icon);
          return (
            <Card key={c.id} className="flex min-w-0 items-center gap-3 p-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <I className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{KIND_LABEL[c.kind] ?? c.kind}</p>
              </div>
              <Switch className="shrink-0" checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} />

              <Button variant="ghost" size="icon" onClick={() => setForm({ id: c.id, name: c.name, icon: c.icon ?? "utensils", kind: c.kind ?? "food" })}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="size-4" /></Button>
            </Card>
          );
        })}
        {(list.data ?? []).length === 0 && <Empty icon={<Tag />} label="Sem categorias" />}
      </div>
    </div>
  );
}

/* =================== BAIRROS (Lages/SC) =================== */
function NeighborhoodsTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-neighborhoods"],
    queryFn: async () => (await supabase.from("neighborhoods").select("*").order("name")).data ?? [],
  });

  const [form, setForm] = useState({ id: "", name: "", fee: "" });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ id: "", name: "", fee: "" });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Informe o bairro");
    const fee = Number(form.fee || 0);
    if (fee < 0) return toast.error("Taxa inválida");
    setSaving(true);
    const payload = { name: form.name.trim(), fee };
    const { error } = form.id
      ? await supabase.from("neighborhoods").update(payload).eq("id", form.id)
      : await supabase.from("neighborhoods").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    reset();
    qc.invalidateQueries({ queryKey: ["admin-neighborhoods"] });
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("neighborhoods").update({ is_active: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-neighborhoods"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir este bairro?")) return;
    await supabase.from("neighborhoods").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-neighborhoods"] });
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-3">
        <p className="text-sm font-semibold">{form.id ? "Editar bairro" : "Novo bairro (Lages/SC)"}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <Input placeholder="Nome do bairro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Taxa R$" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{form.id ? "Salvar" : "Adicionar"}</Button>
            {form.id && <Button variant="ghost" onClick={reset}>Cancelar</Button>}
          </div>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {(list.data ?? []).map((n) => (
          <Card key={n.id} className="flex min-w-0 items-center gap-3 p-3">
            <MapPin className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{n.name}</p>
              <p className="text-xs text-muted-foreground">Taxa: {formatBRL(Number(n.fee))}</p>
            </div>
            <Switch className="shrink-0" checked={n.is_active} onCheckedChange={(v) => toggle(n.id, v)} />

            <Button variant="ghost" size="icon" onClick={() => setForm({ id: n.id, name: n.name, fee: String(n.fee) })}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del(n.id)}><Trash2 className="size-4" /></Button>
          </Card>
        ))}
        {(list.data ?? []).length === 0 && <Empty icon={<MapIcon />} label="Sem bairros cadastrados" />}
      </div>
    </div>
  );
}

/* =================== MOTOBOYS =================== */
function MotoboysTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["motoboys"],
    queryFn: async () => (await supabase.from("motoboys").select("*").order("name")).data ?? [],
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim() || !phone.trim()) return toast.error("Nome e telefone obrigatórios");
    setSaving(true);
    const { error } = await supabase.from("motoboys").insert({ name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    setName(""); setPhone("");
    qc.invalidateQueries({ queryKey: ["motoboys"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir motoboy?")) return;
    await supabase.from("motoboys").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["motoboys"] });
  };
  const toggle = async (id: string, v: boolean) => {
    await supabase.from("motoboys").update({ is_active: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["motoboys"] });
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-3">
        <p className="text-sm font-semibold">Cadastrar motoboy</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="WhatsApp (ex: 11999998888)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button onClick={add} disabled={saving}><Plus className="size-4" /> Adicionar</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O número será usado para enviar os dados do pedido via WhatsApp.
        </p>
      </Card>

      <div className="space-y-2">
        {(list.data ?? []).map((m) => (
          <Card key={m.id} className="flex min-w-0 items-center gap-3 p-3">
            <Bike className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.phone}</p>
            </div>
            <Switch className="shrink-0" checked={m.is_active} onCheckedChange={(v) => toggle(m.id, v)} />

            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del(m.id)}><Trash2 className="size-4" /></Button>
          </Card>
        ))}
        {(list.data ?? []).length === 0 && <Empty icon={<Bike />} label="Nenhum motoboy" />}
      </div>
    </div>
  );
}

/* =================== CUPONS / OFERTAS =================== */
/**
 * Cupons são validados SOMENTE no servidor no momento do pedido.
 * Aqui o admin apenas cadastra/edita as regras.
 */
const COUPON_TYPES = [
  { value: "percent", label: "Desconto %" },
  { value: "fixed", label: "Desconto R$" },
  { value: "free_shipping", label: "Frete grátis" },
  { value: "credit", label: "Crédito ao cliente" },
] as const;

type CouponType = (typeof COUPON_TYPES)[number]["value"];

const CUPOM_VAZIO = {
  id: "", code: "", description: "", type: "percent" as CouponType,
  value: "", min_order: "", max_uses: "", expires_at: "",
};

function CouponsTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () =>
      (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState(CUPOM_VAZIO);
  const [saving, setSaving] = useState(false);
  const reset = () => setForm(CUPOM_VAZIO);

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) return toast.error("Informe o código do cupom");
    const valor = Number(form.value || 0);
    if (form.type !== "free_shipping" && valor <= 0) return toast.error("Informe um valor maior que zero");
    if (form.type === "percent" && valor > 100) return toast.error("Percentual não pode passar de 100%");

    setSaving(true);
    const payload = {
      code,
      description: form.description.trim() || null,
      type: form.type,
      value: form.type === "free_shipping" ? 0 : valor,
      min_order: Number(form.min_order || 0),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error } = form.id
      ? await supabase.from("coupons").update(payload).eq("id", form.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Cupom atualizado" : "Cupom criado");
    reset();
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("coupons").update({ is_active: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  /** Texto curto do benefício, para a listagem. */
  const beneficio = (c: { type: string; value: number }) =>
    c.type === "percent" ? `${Number(c.value)}% de desconto`
      : c.type === "fixed" ? `${formatBRL(Number(c.value))} de desconto`
      : c.type === "credit" ? `${formatBRL(Number(c.value))} em crédito`
      : "Frete grátis";

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold">{form.id ? "Editar cupom" : "Novo cupom"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Código">
            <Input placeholder="FESTA10" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Tipo">
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CouponType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUPON_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {form.type !== "free_shipping" && (
            <Field label={form.type === "percent" ? "Percentual (%)" : "Valor (R$)"}>
              <Input type="number" step="0.01" value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
          )}
          <Field label="Pedido mínimo (R$)">
            <Input type="number" step="0.01" value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
          </Field>
          <Field label="Limite de usos (opcional)">
            <Input type="number" value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          </Field>
          <Field label="Validade (opcional)">
            <Input type="date" value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </Field>
        </div>
        <Field label="Descrição (aparece para você)">
          <Textarea rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : form.id ? "Salvar" : "Criar cupom"}
          </Button>
          {form.id && <Button variant="ghost" onClick={reset}>Cancelar</Button>}
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {(list.data ?? []).map((c) => (
          <Card key={c.id} className="flex min-w-0 items-center gap-3 p-3">
            <Ticket className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.code}</p>
              <p className="text-xs text-muted-foreground">
                {beneficio(c)} · mín. {formatBRL(Number(c.min_order))} · usos: {c.used_count}
                {c.max_uses ? `/${c.max_uses}` : ""}
                {c.expires_at ? ` · até ${formatDateTime(c.expires_at)}` : ""}
              </p>
            </div>
            <Switch className="shrink-0" checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} />

            <Button variant="ghost" size="icon" onClick={() => setForm({
              id: c.id, code: c.code, description: c.description ?? "", type: c.type as CouponType,
              value: String(c.value), min_order: String(c.min_order),
              max_uses: c.max_uses ? String(c.max_uses) : "",
              expires_at: c.expires_at ? String(c.expires_at).slice(0, 10) : "",
            })}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del(c.id)}>
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}
        {(list.data ?? []).length === 0 && <Empty icon={<Ticket />} label="Nenhum cupom criado" />}
      </div>
    </div>
  );
}

/* =================== HORÁRIOS DE ATENDIMENTO =================== */
/**
 * Um registro por dia da semana. Se o horário de fechamento for MENOR que o de
 * abertura (ex.: 18:00 → 03:00), a loja atende madrugada adentro.
 * A loja fica aberta apenas se o interruptor manual estiver ligado E o horário bater.
 */
function HoursTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-hours"],
    queryFn: async () =>
      ((await supabase.from("store_hours").select("*").order("weekday")).data ?? []) as (StoreHourRow & { id: string })[],
  });

  const salvar = async (id: string, patch: Partial<StoreHourRow>) => {
    const { error } = await supabase.from("store_hours").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-hours"] });
    qc.invalidateQueries({ queryKey: ["store-hours"] });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        A loja abre automaticamente dentro destes horários. Se o fechamento for antes da abertura
        (ex.: 18:00 às 03:00), o atendimento segue pela madrugada.
      </p>
      {(list.data ?? []).map((h) => (
        <Card key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
          <span className="w-full font-semibold sm:w-24">{WEEKDAY_LABELS[h.weekday]}</span>

          <Input type="time" className="w-28 shrink-0 sm:w-32" defaultValue={shortTime(h.opens_at)}
            disabled={h.is_closed}
            onBlur={(e) => e.target.value && salvar(h.id, { opens_at: `${e.target.value}:00` })} />
          <span className="text-muted-foreground">às</span>
          <Input type="time" className="w-28 shrink-0 sm:w-32" defaultValue={shortTime(h.closes_at)}
            disabled={h.is_closed}
            onBlur={(e) => e.target.value && salvar(h.id, { closes_at: `${e.target.value}:00` })} />
          <div className="ml-auto flex shrink-0 items-center gap-2">

            <Label className="text-xs text-muted-foreground">Atende</Label>
            <Switch checked={!h.is_closed} onCheckedChange={(v) => salvar(h.id, { is_closed: !v })} />
          </div>
        </Card>
      ))}
      {(list.data ?? []).length === 0 && <Empty icon={<Clock />} label="Sem horários cadastrados" />}
    </div>
  );
}

/* =================== CONFIGURAÇÕES =================== */
function SettingsTab() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings-admin"],
    queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [form, setForm] = useState({
    store_name: "", whatsapp_admin: "", delivery_fee: "", is_open: true,
    // Dados legais exibidos no rodapé e nos documentos do site
    legal_name: "", cnpj: "", legal_address: "", contact_email: "", dpo_name: "", dpo_email: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setForm({
        store_name: settings.data.store_name ?? "",
        whatsapp_admin: settings.data.whatsapp_admin ?? "",
        delivery_fee: settings.data.delivery_fee?.toString() ?? "0",
        is_open: settings.data.is_open ?? true,
        legal_name: settings.data.legal_name ?? "",
        cnpj: settings.data.cnpj ?? "",
        legal_address: settings.data.legal_address ?? "",
        contact_email: settings.data.contact_email ?? "",
        dpo_name: settings.data.dpo_name ?? "",
        dpo_email: settings.data.dpo_email ?? "",
      });
    }
  }, [settings.data]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      store_name: form.store_name.trim(),
      whatsapp_admin: form.whatsapp_admin.trim() || null,
      delivery_fee: Number(form.delivery_fee || 0),
      is_open: form.is_open,
      legal_name: form.legal_name.trim() || null,
      cnpj: form.cnpj.replace(/\D/g, "") || null,
      legal_address: form.legal_address.trim() || null,
      contact_email: form.contact_email.trim() || null,
      dpo_name: form.dpo_name.trim() || null,
      dpo_email: form.dpo_email.trim() || null,
    }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings-admin"] });
    qc.invalidateQueries({ queryKey: ["store-settings"] });
    qc.invalidateQueries({ queryKey: ["store-legal"] });
  };

  return (
    <Card className="max-w-xl space-y-4 p-5">
      <Field label="Nome da loja">
        <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
      </Field>
      <Field label="WhatsApp reserva (usado só se nenhum número acima estiver ativo)">
        <Input value={form.whatsapp_admin} onChange={(e) => setForm({ ...form, whatsapp_admin: e.target.value })} placeholder="11999998888" />
      </Field>
      <Field label="Taxa de entrega (R$)">
        <Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
        <Label>Loja aberta (recebendo pedidos)</Label>
      </div>
      {/* Dados legais: obrigatórios no rodapé pelo Decreto 7.962/2013 (e-commerce) */}
      <div className="space-y-4 rounded-2xl border border-border p-4">
        <p className="text-sm font-semibold">Dados legais (aparecem no rodapé do site)</p>
        <Field label="Razão social">
          <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="Bebidas Exemplo LTDA" />
        </Field>
        <Field label="CNPJ">
          <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00000000000000" />
        </Field>
        <Field label="Endereço completo da empresa">
          <Input value={form.legal_address} onChange={(e) => setForm({ ...form, legal_address: e.target.value })} placeholder="Rua Exemplo, 100 — Centro, Lages/SC" />
        </Field>
        <Field label="E-mail de contato ao consumidor">
          <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </Field>
        <Field label="Encarregado de dados / DPO — nome (LGPD art. 41)">
          <Input value={form.dpo_name} onChange={(e) => setForm({ ...form, dpo_name: e.target.value })} />
        </Field>
        <Field label="Encarregado de dados / DPO — e-mail">
          <Input type="email" value={form.dpo_email} onChange={(e) => setForm({ ...form, dpo_email: e.target.value })} />
        </Field>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
      </Button>
    </Card>
  );
}

/* =================== PRIVACIDADE (LGPD) =================== */
/**
 * Solicitações dos titulares (acesso, correção, exclusão…), LGPD art. 18.
 * O prazo legal de resposta é de 15 dias — destacamos os pedidos em atraso.
 */
function PrivacyTab() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-data-requests"],
    queryFn: async () =>
      (await supabase.from("data_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const marcar = async (id: string, status: string) => {
    const { error } = await supabase
      .from("data_requests")
      .update({ status, handled_at: status === "concluido" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-data-requests"] });
  };

  const diasCorridos = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pedidos de titulares de dados. A LGPD dá <strong>15 dias</strong> para responder — os itens
        em vermelho passaram do prazo.
      </p>
      {(list.data ?? []).map((r) => (
        <Card key={r.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase text-primary">
              {r.kind}
            </span>
            <span className={`text-xs ${diasCorridos(r.created_at) > 15 && r.status !== "concluido" ? "font-bold text-destructive" : "text-muted-foreground"}`}>
              {formatDateTime(r.created_at)} · {diasCorridos(r.created_at)} dia(s)
            </span>
            <span className="ml-auto text-xs uppercase text-muted-foreground">{r.status}</span>
          </div>
          <p className="text-sm font-semibold">{r.name} — {r.phone}{r.email ? ` · ${r.email}` : ""}</p>
          {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => marcar(r.id, "em_andamento")}>Em andamento</Button>
            <Button size="sm" onClick={() => marcar(r.id, "concluido")}>Concluir</Button>
          </div>
        </Card>
      ))}
      {(list.data ?? []).length === 0 && <Empty icon={<ScrollText />} label="Nenhuma solicitação de privacidade" />}
    </div>
  );
}

/* =================== HELPERS =================== */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">{children}</div>;
}
function Empty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-muted">{icon}</div>
      {label}
    </div>
  );
}

void DialogTrigger;
