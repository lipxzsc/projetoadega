/**
 * BARRA DE NAVEGAÇÃO INFERIOR (estilo app).
 *
 * Fica fixa no rodapé em todas as telas do cliente.
 *  - Início     → cardápio
 *  - Combo      → montador de combo
 *  - Carrinho   → checkout (com selo de quantidade)
 *  - Pedido     → acompanhamento do último pedido (guardado no navegador)
 *  - Atendimento→ escolha entre WhatsApp ou chat do site
 *
 * Segurança/privacidade: guardamos apenas o ID do último pedido no
 * localStorage — nenhum dado pessoal do cliente é persistido no navegador.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Sparkles, ShoppingCart, ClipboardList, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { SupportDialog } from "@/components/SupportDialog";

/** Chave usada para lembrar o último pedido feito neste aparelho. */
export const LAST_ORDER_KEY = "ultimo-pedido";

export function BottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  // localStorage só pode ser lido depois da hidratação (SSR não tem window).
  useEffect(() => {
    setLastOrder(localStorage.getItem(LAST_ORDER_KEY));
  }, [pathname]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
          <NavItem to="/" label="Início" Icon={Home} active={isActive("/")} />
          <NavItem to="/combo" label="Combo" Icon={Sparkles} active={isActive("/combo")} />
          <NavItem to="/checkout" label="Carrinho" Icon={ShoppingCart} active={isActive("/checkout")} badge={count} />
          <NavItem
            label="Pedido"
            Icon={ClipboardList}
            active={isActive("/pedido")}
            onClick={() =>
              lastOrder
                ? navigate({ to: "/pedido/$id", params: { id: lastOrder } })
                : navigate({ to: "/" })
            }
            disabled={!lastOrder}
          />
          <NavItem label="Ajuda" Icon={MessageCircle} active={supportOpen} onClick={() => setSupportOpen(true)} />
        </div>
      </nav>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} orderId={lastOrder} />
    </>
  );
}

/** Item individual da barra — vira link ou botão conforme o uso. */
function NavItem({
  to, label, Icon, active, badge, onClick, disabled,
}: {
  to?: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span className="relative">
        <Icon className="size-5" />
        {!!badge && badge > 0 && (
          <span className="absolute -right-2.5 -top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </>
  );

  const cls = `flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
  } ${disabled ? "opacity-40" : ""}`;

  if (to) {
    return (
      <Link to={to} className={cls} aria-current={active ? "page" : undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {content}
    </button>
  );
}
