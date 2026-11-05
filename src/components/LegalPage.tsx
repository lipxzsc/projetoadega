/**
 * Casca visual reaproveitada pelas páginas legais
 * (Termos, Privacidade e Cancelamento).
 * Mantém tipografia legível, botão de voltar e o rodapé com CNPJ.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/SiteFooter";
import { BottomNav } from "@/components/BottomNav";

export function LegalPage({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black uppercase tracking-tight">{titulo}</h1>
            <p className="text-[11px] text-muted-foreground">Atualizado em {atualizadoEm}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
        {children}
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

/** Bloco/seção numerada dos documentos legais. */
export function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2 [&_a]:text-primary [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
      <h2 className="text-base font-black uppercase tracking-tight text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}
