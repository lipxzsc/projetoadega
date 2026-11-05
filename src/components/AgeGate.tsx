/**
 * PORTA DE IDADE (18+).
 *
 * A loja vende bebida alcoólica: a venda a menores de 18 anos é PROIBIDA
 * (Lei 13.106/2015, que alterou o art. 243 do ECA, e Lei 9.294/1996, art. 2º).
 * Por isso o cliente precisa declarar que é maior de idade antes de navegar.
 *
 * Guardamos apenas uma flag ("declarou 18+") e a data — sem dado pessoal.
 * A declaração é reforçada no checkout, onde fica registrada junto ao pedido.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAgeConfirmation, saveAgeConfirmation } from "@/lib/legal";

export function AgeGate() {
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false);

  useEffect(() => {
    setPrecisaConfirmar(getAgeConfirmation() === null);
  }, []);

  if (!precisaConfirmar) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação de idade"
      className="fixed inset-0 z-[70] grid place-items-center bg-background/95 p-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <ShieldAlert className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Você tem 18 anos ou mais?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vendemos bebidas alcoólicas. A venda a menores de 18 anos é crime
          (Lei 13.106/2015). Ao continuar, você declara ser maior de idade e concorda com os{" "}
          <Link to="/termos" className="text-primary underline">Termos de Uso</Link> e a{" "}
          <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
        </p>

        <div className="mt-6 grid gap-2">
          <Button
            className="rounded-full font-black uppercase"
            onClick={() => {
              saveAgeConfirmation();
              setPrecisaConfirmar(false);
            }}
          >
            Sim, tenho 18 anos ou mais
          </Button>
          <Button
            variant="outline"
            className="rounded-full font-bold uppercase"
            onClick={() => {
              // Menor de idade: não pode acessar a loja de bebidas.
              window.location.href = "https://www.gov.br/pt-br";
            }}
          >
            Sou menor de 18
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Beba com moderação. Se beber, não dirija.
        </p>
      </div>
    </div>
  );
}
