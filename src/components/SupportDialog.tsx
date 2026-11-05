/**
 * ATENDIMENTO AO CLIENTE.
 *
 * O cliente escolhe o canal:
 *  1) WhatsApp da loja (abre o app do WhatsApp)
 *  2) Chat aqui no site (mensagens ligadas ao último pedido)
 *
 * O chat do site só aparece quando existe um pedido neste aparelho,
 * porque a conversa é vinculada ao pedido (é assim que a loja identifica
 * quem está falando, sem exigir cadastro/login do cliente).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { pickOrderPhone, useActiveWhatsappNumbers } from "@/lib/whatsapp-numbers";
import { listSupportMessages, sendSupportMessage } from "@/lib/support.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** ID do último pedido feito neste aparelho (habilita o chat do site). */
  orderId: string | null;
}

export function SupportDialog({ open, onOpenChange, orderId }: Props) {
  const [canal, setCanal] = useState<"escolha" | "site">("escolha");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimDaLista = useRef<HTMLDivElement>(null);

  const carregar = useServerFn(listSupportMessages);
  const enviar = useServerFn(sendSupportMessage);

  // Telefone do WhatsApp da loja (dado público das configurações).
  // ATENÇÃO: chave de cache própria — não pode colidir com ["store-settings"],
  // que guarda o registro completo (inclusive is_open) usado na home/checkout.
  const zapNumbers = useActiveWhatsappNumbers();
  const settings = useQuery({
    queryKey: ["store-contact"],
    queryFn: async () =>
      (await supabase.from("store_settings_public").select("whatsapp_admin, store_name").eq("id", 1).maybeSingle()).data,
  });

  // Conversa do site — atualiza a cada 8s enquanto o chat estiver aberto.
  const mensagens = useQuery({
    enabled: open && canal === "site" && !!orderId,
    queryKey: ["support", orderId],
    queryFn: async () => (orderId ? await carregar({ data: { orderId } }) : []),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!open) setCanal("escolha");
  }, [open]);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.data?.length]);

  /** Abre o WhatsApp da loja com uma mensagem inicial. */
  const abrirWhatsApp = () => {
    const fone = pickOrderPhone(zapNumbers.data, settings.data?.whatsapp_admin) ?? "";
    if (!fone) {
      toast.error("A loja ainda não cadastrou um WhatsApp de atendimento");
      return;
    }
    const msg = orderId
      ? `Olá! Preciso de ajuda com o pedido #${orderId.slice(0, 8)}`
      : "Olá! Preciso de ajuda com um pedido";
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const enviarMensagem = async () => {
    if (!orderId || !texto.trim()) return;
    setEnviando(true);
    try {
      await enviar({ data: { orderId, body: texto.trim() } });
      setTexto("");
      await mensagens.refetch();
    } catch {
      toast.error("Não foi possível enviar sua mensagem");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" /> Atendimento
          </DialogTitle>
        </DialogHeader>

        {canal === "escolha" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Como você prefere falar com a gente?</p>

            <button
              type="button"
              onClick={abrirWhatsApp}
              className="w-full rounded-2xl border border-success/40 bg-success/10 p-4 text-left transition-colors hover:border-success"
            >
              <p className="font-bold text-success">Falar pelo WhatsApp</p>
              <p className="text-xs text-muted-foreground">Resposta direto no seu celular</p>
            </button>

            <button
              type="button"
              onClick={() => (orderId ? setCanal("site") : toast.info("Faça um pedido para abrir o chat do site"))}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-50"
              disabled={!orderId}
            >
              <p className="font-bold">Conversar aqui no site</p>
              <p className="text-xs text-muted-foreground">
                {orderId ? "Chat ligado ao seu último pedido" : "Disponível após o primeiro pedido"}
              </p>
            </button>
          </div>
        )}

        {canal === "site" && (
          <div className="flex h-80 flex-col gap-3">
            <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3">
              {mensagens.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
              {mensagens.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Envie sua dúvida — a loja responde por aqui.
                </p>
              )}
              {(mensagens.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "customer"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.body}
                </div>
              ))}
              <div ref={fimDaLista} />
            </div>

            <div className="flex gap-2">
              <Input
                value={texto}
                maxLength={500}
                placeholder="Escreva sua mensagem…"
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
              />
              <Button onClick={enviarMensagem} disabled={enviando || !texto.trim()} size="icon">
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
