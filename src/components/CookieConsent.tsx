/**
 * Banner de consentimento de cookies (LGPD art. 8º e art. 9º).
 *
 * - Aparece só na primeira visita (ou quando a versão dos textos muda).
 * - Oferece escolha real: "Aceitar todos" x "Somente essenciais" — sem isso
 *   o consentimento não é válido (não pode ser forçado).
 * - Guarda apenas a escolha (flag + data) no localStorage, nunca dados pessoais.
 * - Nenhum script de medição é carregado antes do aceite.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCookieChoice, saveCookieChoice } from "@/lib/legal";

export function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  // Só decide depois da hidratação (evita divergência entre servidor e navegador).
  useEffect(() => {
    setVisivel(getCookieChoice() === null);
  }, []);

  if (!visivel) return null;

  const decidir = (analytics: boolean) => {
    saveCookieChoice(analytics);
    setVisivel(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/98 p-4 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Usamos cookies <strong className="text-foreground">essenciais</strong> para o carrinho e a
            segurança do site (não dá para desligar) e, com a sua permissão, cookies de{" "}
            <strong className="text-foreground">medição</strong> para melhorar a loja. Você pode mudar
            de ideia a qualquer momento. Saiba mais na{" "}
            <Link to="/privacidade" className="text-primary underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="rounded-full" onClick={() => decidir(false)}>
            Somente essenciais
          </Button>
          <Button className="rounded-full font-bold" onClick={() => decidir(true)}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
