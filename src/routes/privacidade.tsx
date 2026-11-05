/**
 * POLÍTICA DE PRIVACIDADE (LGPD — Lei 13.709/2018).
 *
 * Explica quais dados coletamos, por quê, com quem compartilhamos, por quanto
 * tempo guardamos e como o titular exerce seus direitos (art. 18). O formulário
 * de solicitação envia os dados para uma SERVER FUNCTION — o navegador não
 * escreve direto no banco.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LegalPage, Bloco } from "@/components/LegalPage";
import { LEGAL_VERSION, DATA_REQUEST_KINDS, formatCNPJ, type DataRequestKind } from "@/lib/legal";
import { useStoreLegal } from "@/lib/use-store-legal";
import { createDataRequest } from "@/lib/privacy.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { brandMeta } from "@/lib/brand";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: brandMeta("Política de Privacidade", "Saiba como a Subzero Delivery trata seus dados e como exercer seus direitos conforme a LGPD."),
  }),
});

function PrivacidadePage() {
  const { data } = useStoreLegal();
  const loja = data?.legal_name || data?.store_name || "a loja";

  return (
    <LegalPage titulo="Política de Privacidade" atualizadoEm={LEGAL_VERSION}>
      <Bloco titulo="1. Controlador dos dados">
        <p>
          <strong>{loja}</strong>
          {data?.cnpj ? ` — CNPJ ${formatCNPJ(data.cnpj)}` : ""}
          {data?.legal_address ? `, ${data.legal_address}` : ""}, é a controladora dos dados
          tratados neste site (LGPD art. 5º, VI).
          {data?.dpo_name || data?.dpo_email ? (
            <> Encarregado de dados (DPO): {data?.dpo_name} {data?.dpo_email ? `— ${data.dpo_email}` : ""}.</>
          ) : null}
        </p>
      </Bloco>

      <Bloco titulo="2. Quais dados coletamos e por quê">
        <ul>
          <li><strong>Nome e telefone/WhatsApp</strong> — identificar você e falar sobre o pedido. Base legal: execução de contrato (art. 7º, V).</li>
          <li><strong>Endereço, complemento e ponto de referência</strong> — entregar no lugar certo. Base legal: execução de contrato.</li>
          <li><strong>Localização por GPS (opcional)</strong> — só se você tocar em "usar minha localização"; serve para orientar o entregador. Base legal: consentimento (art. 7º, I), revogável a qualquer momento.</li>
          <li><strong>Itens, valores e forma de pagamento</strong> — processar o pedido e cumprir obrigações fiscais (art. 7º, II).</li>
          <li><strong>Declaração de idade (18+)</strong> — cumprir a lei que proíbe venda de álcool a menores (art. 7º, II).</li>
          <li><strong>Mensagens do atendimento</strong> — resolver o seu chamado.</li>
          <li><strong>Registros técnicos de segurança</strong> — tentativas de login são guardadas de forma <em>criptografada (hash)</em> para bloquear ataques de força bruta (art. 7º, IX e Marco Civil da Internet).</li>
        </ul>
        <p>
          <strong>Não coletamos</strong> CPF, RG, dados de cartão de crédito, dados bancários nem
          dados sensíveis (art. 5º, II). O pagamento com cartão acontece na maquininha do
          entregador, fora deste site.
        </p>
      </Bloco>

      <Bloco titulo="3. Menores de idade">
        <p>
          O site não se destina a menores de 18 anos e não coletamos intencionalmente dados de
          crianças e adolescentes (LGPD art. 14). Identificado esse cadastro, os dados são
          excluídos e o pedido cancelado.
        </p>
      </Bloco>

      <Bloco titulo="4. Com quem compartilhamos">
        <ul>
          <li><strong>Entregador (motoboy)</strong> — recebe apenas nome, telefone, endereço e, se você autorizou, o link da localização, somente enquanto durar a entrega.</li>
          <li><strong>WhatsApp/Meta</strong> — se o resumo do pedido for enviado por WhatsApp, aplica-se também a política de privacidade da Meta.</li>
          <li><strong>Provedor de nuvem</strong> que hospeda o site e o banco de dados, sob contrato e com acesso restrito.</li>
          <li><strong>Autoridades</strong>, quando houver obrigação legal ou ordem judicial.</li>
        </ul>
        <p>Nunca vendemos seus dados nem enviamos publicidade sem a sua autorização.</p>
      </Bloco>

      <Bloco titulo="5. Segurança">
        <p>
          Os dados pessoais ficam apenas no servidor, protegidos por regras de acesso por linha
          (RLS) e visíveis somente à administração autenticada da loja. O site trafega em HTTPS,
          os preços e taxas são recalculados no servidor e há limite de tentativas de login para
          conter ataques (LGPD art. 46). A tela de acompanhamento do pedido nunca exibe telefone,
          nome completo ou coordenadas.
        </p>
      </Bloco>

      <Bloco titulo="6. Por quanto tempo guardamos">
        <ul>
          <li>Pedidos e dados de entrega: até 5 anos, prazo de reclamação do consumidor (CDC art. 27 e Código Civil art. 206).</li>
          <li>Mensagens de atendimento: 12 meses.</li>
          <li>Registros de segurança/login: 6 meses (Marco Civil da Internet, art. 15).</li>
          <li>Escolha de cookies: 12 meses, no seu próprio navegador.</li>
        </ul>
      </Bloco>

      <Bloco titulo="7. Cookies">
        <p>
          Usamos armazenamento local <strong>essencial</strong> (carrinho, pedido atual, escolha de
          cookies e confirmação de idade) — sem ele o site não funciona. Cookies de medição só são
          ativados se você aceitar no banner, e a escolha pode ser refeita limpando os dados do
          site no navegador.
        </p>
      </Bloco>

      <Bloco titulo="8. Seus direitos (LGPD art. 18)">
        <p>
          Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade,
          exclusão, informação sobre compartilhamentos e revogação do consentimento. Respondemos em
          até 15 dias. Use o formulário abaixo — ele vai direto para a administração da loja.
        </p>
        <FormularioTitular />
        <p className="mt-3">
          Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados) em
          gov.br/anpd.
        </p>
      </Bloco>
    </LegalPage>
  );
}

/** Formulário de direitos do titular — envia para a server function. */
function FormularioTitular() {
  const enviar = useServerFn(createDataRequest);
  const [form, setForm] = useState({
    kind: "acesso" as DataRequestKind,
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await enviar({ data: form });
      setEnviado(true);
      toast.success("Solicitação registrada! Responderemos em até 15 dias.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <p className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
        Recebemos sua solicitação. A loja entrará em contato pelo telefone informado em até 15 dias.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1">
        <Label className="text-xs">O que você deseja?</Label>
        <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DataRequestKind })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATA_REQUEST_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input required maxLength={80} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone usado nos pedidos *</Label>
          <Input required type="tel" maxLength={20} value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">E-mail (opcional)</Label>
        <Input type="email" maxLength={120} value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Detalhes (opcional)</Label>
        <Textarea rows={3} maxLength={1000} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <Button type="submit" disabled={enviando} className="rounded-full font-bold">
        {enviando ? <Loader2 className="size-4 animate-spin" /> : "Enviar solicitação"}
      </Button>
    </form>
  );
}
