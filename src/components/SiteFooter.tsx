/**
 * RODAPÉ LEGAL — obrigatório para comércio eletrônico.
 *
 * Decreto 7.962/2013 (Lei do E-commerce) art. 2º: o site precisa exibir de
 * forma clara e ostensiva o nome empresarial, o CNPJ e o endereço físico e
 * eletrônico do fornecedor. Aqui também ficam os links de Termos de Uso,
 * Política de Privacidade e Política de Cancelamento/Troca, o aviso 18+ e o
 * contato do encarregado de dados (LGPD art. 41).
 */
import { Link } from "@tanstack/react-router";
import { Building2, Mail, ShieldCheck } from "lucide-react";

import { formatCNPJ } from "@/lib/legal";
import { useStoreLegal } from "@/lib/use-store-legal";
import { STORE_NAME } from "@/lib/brand";

export function SiteFooter() {
  const { data } = useStoreLegal();

  return (
    <footer className="mt-10 border-t border-border bg-card/40 px-4 py-8 text-xs text-muted-foreground">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Identificação do fornecedor */}
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-bold uppercase tracking-wide text-foreground">
            <Building2 className="size-4 text-primary" />
            {data?.legal_name || STORE_NAME}
          </p>
          {data?.cnpj && <p>CNPJ: {formatCNPJ(data.cnpj)}</p>}
          {data?.legal_address && <p>{data.legal_address}</p>}
          {data?.contact_email && (
            <p className="flex items-center gap-1">
              <Mail className="size-3" /> {data.contact_email}
            </p>
          )}
          {!data?.cnpj && (
            <p className="italic">
              Cadastre CNPJ, razão social e endereço em Admin → Configurações.
            </p>
          )}
        </div>

        {/* Documentos legais */}
        <nav className="flex flex-wrap gap-x-4 gap-y-2 font-semibold text-foreground">
          <Link to="/termos" className="hover:text-primary">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-primary">Política de Privacidade</Link>
          <Link to="/cancelamento" className="hover:text-primary">Cancelamento e Trocas</Link>
        </nav>

        {/* Encarregado de dados (LGPD art. 41) */}
        {(data?.dpo_name || data?.dpo_email) && (
          <p className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-primary" />
            Encarregado de dados (DPO): {data?.dpo_name}
            {data?.dpo_email ? ` — ${data.dpo_email}` : ""}
          </p>
        )}

        {/* Avisos obrigatórios de bebida alcoólica */}
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <p className="font-bold text-foreground">Venda proibida para menores de 18 anos.</p>
          <p>
            Lei 13.106/2015. A entrega pode ser recusada sem devolução do valor caso não haja
            maior de idade com documento no local. Aproveite a vida, beba com moderação.
            Se beber, não dirija.
          </p>
        </div>

        <p>© {new Date().getFullYear()} {STORE_NAME}. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
