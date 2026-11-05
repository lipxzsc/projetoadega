/**
 * Registro de ícones para categorias.
 * Para adicionar um novo ícone: importe do lucide-react e adicione ao mapa.
 * O admin escolhe o nome do ícone (string) ao cadastrar/editar a categoria.
 */
import {
  Beer, Wine, GlassWater, Coffee, CupSoda, Martini,
  Pizza, Sandwich, Beef, IceCream, Cookie, Salad, Soup,
  Utensils, Drumstick, Fish, Apple, Cake, Candy, Croissant,
  Snowflake, Zap, Flame, Star, type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  beer: Beer,
  wine: Wine,
  glasswater: GlassWater,
  coffee: Coffee,
  cupsoda: CupSoda,
  martini: Martini,
  pizza: Pizza,
  sandwich: Sandwich,
  beef: Beef,
  icecream: IceCream,
  cookie: Cookie,
  salad: Salad,
  soup: Soup,
  utensils: Utensils,
  drumstick: Drumstick,
  fish: Fish,
  apple: Apple,
  cake: Cake,
  candy: Candy,
  croissant: Croissant,
  snowflake: Snowflake,
  zap: Zap,
  flame: Flame,
  star: Star,
};

/** Pega o componente do ícone pelo nome, com fallback para Utensils. */
export const getCategoryIcon = (name?: string | null): LucideIcon =>
  CATEGORY_ICONS[(name ?? "").toLowerCase()] ?? Utensils;

/** Lista para o seletor do admin. */
export const ICON_OPTIONS = Object.keys(CATEGORY_ICONS).sort();

/**
 * Tipos de categoria (kind).
 * O "kind" define como a categoria se comporta no montador de combo:
 * cada kind vira uma etapa do combo (menos "food", que é venda avulsa).
 */
export const CATEGORY_KINDS = [
  { value: "food",         label: "Comida / Outros" },
  { value: "distilled",    label: "Destilado (base do combo)" },
  { value: "energy_drink", label: "Energético (combo)" },
  { value: "soft_drink",   label: "Refrigerante (combo)" },
  { value: "ice",          label: "Gelo (combo)" },
  { value: "cups",         label: "Copos descartáveis (combo)" },
] as const;

/** Kinds que aparecem como etapas no montador de combo, na ordem exibida. */
export const COMBO_STEPS = [
  { kind: "distilled",    title: "Destilados",     hint: "A base do seu combo" },
  { kind: "energy_drink", title: "Energéticos",    hint: "Para misturar" },
  { kind: "soft_drink",   title: "Refrigerantes",  hint: "Para misturar" },
  { kind: "ice",          title: "Gelos",          hint: "Normal 3kg ou saborizado" },
  { kind: "cups",         title: "Copos",          hint: "300ml, 500ml ou 750ml" },
] as const;

export const KIND_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_KINDS.map((k) => [k.value, k.label]),
);
