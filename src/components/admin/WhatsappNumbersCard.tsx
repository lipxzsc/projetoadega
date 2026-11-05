/**
 * Cadastro de números de WhatsApp que recebem pedidos.
 * Cada número pode ser pausado (switch) sem precisar excluir.
 * Segurança: escrita protegida por RLS (somente admin).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_QUERY_KEY } from "@/lib/whatsapp-numbers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const ADMIN_KEY = ["whatsapp-numbers-admin"];

export function WhatsappNumbersCard() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");

  const list = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () =>
      (await supabase.from("store_whatsapp_numbers").select("*").order("sort_order").order("created_at")).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ADMIN_KEY });
    qc.invalidateQueries({ queryKey: WHATSAPP_QUERY_KEY });
  };

  const add = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) return toast.error("Informe DDD + número (ex: 49999998888)");
    const { error } = await supabase.from("store_whatsapp_numbers").insert({
      label: label.trim().slice(0, 40) || "Atendimento",
      phone: digits,
      sort_order: list.data?.length ?? 0,
    });
    if (error) return toast.error(error.message);
    setLabel("");
    setPhone("");
    toast.success("Número adicionado");
    refresh();
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("store_whatsapp_numbers").update({ is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(is_active ? "Número ativado" : "Número pausado");
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este número?")) return;
    const { error } = await supabase.from("store_whatsapp_numbers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const firstActive = list.data?.find((n) => n.is_active)?.id;

  return (
    <Card className="max-w-xl space-y-4 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <p className="font-semibold">WhatsApp que recebem pedidos</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Os pedidos vão para o primeiro número ativo da lista. Pause um número para ele parar de receber temporariamente.
      </p>

      <div className="space-y-2">
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum número cadastrado.</p>}
        {list.data?.map((n) => (
          <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {n.label}
                {n.id === firstActive && <span className="ml-2 text-xs text-primary">• recebendo agora</span>}
              </p>
              <p className="text-xs text-muted-foreground">{n.phone}{!n.is_active && " — pausado"}</p>
            </div>
            <Switch checked={n.is_active} onCheckedChange={(v) => toggle(n.id, v)} aria-label="Ativar número" />
            <Button size="icon" variant="ghost" onClick={() => remove(n.id)} aria-label="Excluir número">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome (ex: Balcão)" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="49999998888" inputMode="tel" />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
      </div>
    </Card>
  );
}
