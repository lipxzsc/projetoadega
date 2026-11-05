/**
 * NAVEGAÇÃO DO PAINEL ADMIN
 * ------------------------------------------------------------------
 * Toda a estrutura de seções vive no array ADMIN_SECTIONS abaixo.
 * Para adicionar/remover/renomear uma aba, edite APENAS esse array.
 *
 * - Desktop (lg+): menu lateral fixo, agrupado por área.
 * - Mobile/tablet: seletor único (dropdown) agrupado — evita faixa
 *   de ícones espremida e sem rótulo.
 */
import {
  BarChart3, Bike, ClipboardList, Clock, Map as MapIcon, ScrollText,
  Settings, Tag, Ticket, Utensils, type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

/** Identificadores das seções (usados como estado da página). */
export type AdminSectionId =
  | "orders" | "hours" | "products" | "categories" | "neighborhoods"
  | "motoboys" | "coupons" | "reports" | "privacy" | "settings";

export type AdminSection = {
  id: AdminSectionId;
  label: string;
  /** Grupo mostrado como título no menu. */
  group: string;
  icon: LucideIcon;
  /** Frase curta que aparece no cabeçalho da seção. */
  hint: string;
};

/** Fonte única de verdade da navegação administrativa. */
export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "orders", label: "Pedidos", group: "Operação", icon: ClipboardList, hint: "Pedidos ativos em tempo real" },
  { id: "hours", label: "Horários", group: "Operação", icon: Clock, hint: "Abertura e fechamento por dia" },
  { id: "products", label: "Produtos", group: "Catálogo", icon: Utensils, hint: "Cadastro e preços" },
  { id: "categories", label: "Categorias", group: "Catálogo", icon: Tag, hint: "Organização do cardápio" },
  { id: "neighborhoods", label: "Bairros", group: "Entrega", icon: MapIcon, hint: "Taxas por bairro de Lages/SC" },
  { id: "motoboys", label: "Motoboys", group: "Entrega", icon: Bike, hint: "Cadastro e ativação de entregadores" },
  { id: "coupons", label: "Cupons", group: "Marketing", icon: Ticket, hint: "Ofertas, descontos e créditos" },
  { id: "reports", label: "Relatórios", group: "Gestão", icon: BarChart3, hint: "Pedidos entregues e exportação" },
  { id: "privacy", label: "LGPD", group: "Gestão", icon: ScrollText, hint: "Solicitações dos titulares de dados" },
  { id: "settings", label: "Config", group: "Gestão", icon: Settings, hint: "Dados da loja e informações legais" },
];

/** Agrupa as seções preservando a ordem de declaração. */
function agrupar(): { group: string; items: AdminSection[] }[] {
  const grupos: { group: string; items: AdminSection[] }[] = [];
  for (const s of ADMIN_SECTIONS) {
    const atual = grupos.find((g) => g.group === s.group);
    if (atual) atual.items.push(s);
    else grupos.push({ group: s.group, items: [s] });
  }
  return grupos;
}

export function findSection(id: AdminSectionId): AdminSection {
  return ADMIN_SECTIONS.find((s) => s.id === id) ?? ADMIN_SECTIONS[0];
}

type Props = {
  value: AdminSectionId;
  onChange: (id: AdminSectionId) => void;
};

/** Menu lateral — visível apenas em telas grandes. */
export function AdminSidebar({ value, onChange }: Props) {
  return (
    <nav className="hidden w-56 shrink-0 lg:block" aria-label="Seções do painel">
      <div className="sticky top-24 space-y-5">
        {agrupar().map(({ group, items }) => (
          <div key={group}>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            <ul className="space-y-1">
              {items.map((s) => {
                const ativo = s.id === value;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onChange(s.id)}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                        ativo
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <s.icon className="size-4 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Seletor compacto — usado em celular/tablet. */
export function AdminSectionSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AdminSectionId)}>
      <SelectTrigger className="w-full lg:hidden" aria-label="Trocar de seção">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {agrupar().map(({ group, items }) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {items.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="inline-flex items-center gap-2">
                  <s.icon className="size-4" /> {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
