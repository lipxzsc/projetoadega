/**
 * Carrinho do cliente — store global (zustand) com persistência em localStorage.
 *
 * Cada linha do carrinho tem um `lineId` único, permitindo que o mesmo produto
 * apareça duas vezes com combos/adicionais diferentes (ex.: 2 vodkas, uma em
 * combo com Red Bull e outra só com gelo).
 *
 * `add()` faz dedup automático: se já existir uma linha com mesmo produto e
 * mesmos adicionais, soma a quantidade.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartExtra {
  name: string;
  price: number;
}

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  unitPrice: number;          // preço base do produto
  imageUrl?: string | null;
  extras: CartExtra[];        // adicionais do combo
  price: number;              // unitPrice + soma dos extras (preço total da linha por unidade)
  quantity: number;
}

interface NewLine {
  productId: string;
  name: string;
  unitPrice: number;
  imageUrl?: string | null;
  extras?: CartExtra[];
  quantity?: number;
}

/** Assinatura para dedup (mesmo produto + mesmos adicionais → mesma linha). */
const signature = (productId: string, extras: CartExtra[]) =>
  productId + "|" + extras.map((e) => `${e.name}:${e.price}`).sort().join(",");

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

interface CartState {
  items: CartItem[];
  /** Adiciona um item; dedup por produto+extras. */
  add: (line: NewLine) => void;
  remove: (lineId: string) => void;
  setQty: (lineId: string, qty: number) => void;
  clear: () => void;
  getCount: () => number;
  getSubtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: ({ productId, name, unitPrice, imageUrl, extras = [], quantity = 1 }) =>
        set((s) => {
          const price = unitPrice + extras.reduce((a, e) => a + e.price, 0);
          const sig = signature(productId, extras);
          const existing = s.items.find((i) => signature(i.productId, i.extras) === sig);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.lineId === existing.lineId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return {
            items: [
              ...s.items,
              { lineId: newId(), productId, name, unitPrice, imageUrl, extras, price, quantity },
            ],
          };
        }),

      remove: (lineId) =>
        set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),

      setQty: (lineId, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.lineId !== lineId)
            : s.items.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i)),
        })),

      clear: () => set({ items: [] }),

      getCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      getSubtotal: () => get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),
    }),
    { name: "delivery-cart-v2" },
  ),
);
