/**
 * Cart store — Zustand-based, persisted to localStorage.
 * Integrates with Shopify Storefront API for checkout.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createShopifyCart,
  addLineToShopifyCart,
  updateShopifyCartLine,
  removeLineFromShopifyCart,
} from "@/lib/shopify";

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  price: number;
  currency: string;
  image: string;
  quantity: number;
  lineId?: string; // Shopify cart line ID
}

interface CartState {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  syncing: boolean;

  addItem: (item: Omit<CartItem, "quantity" | "lineId">) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  getCheckoutUrl: () => string | null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      syncing: false,

      addItem: async (item) => {
        const state = get();
        const existing = state.items.find((i) => i.variantId === item.variantId);

        if (existing) {
          // Update quantity
          const newQty = existing.quantity + 1;
          set({ items: state.items.map((i) => i.variantId === item.variantId ? { ...i, quantity: newQty } : i) });
          if (state.cartId && existing.lineId) {
            await updateShopifyCartLine(state.cartId, existing.lineId, newQty);
          }
        } else {
          // Add new item
          const newItem: CartItem = { ...item, quantity: 1 };

          if (!state.cartId) {
            // Create new Shopify cart
            const result = await createShopifyCart({ variantId: item.variantId, quantity: 1 });
            if (result) {
              newItem.lineId = result.lineId;
              set({ items: [...state.items, newItem], cartId: result.cartId, checkoutUrl: result.checkoutUrl });
            } else {
              set({ items: [...state.items, newItem] });
            }
          } else {
            // Add to existing cart
            const result = await addLineToShopifyCart(state.cartId, { variantId: item.variantId, quantity: 1 });
            if (result.cartNotFound) {
              // Cart expired — create new
              const newCart = await createShopifyCart({ variantId: item.variantId, quantity: 1 });
              if (newCart) {
                newItem.lineId = newCart.lineId;
                set({ items: [newItem], cartId: newCart.cartId, checkoutUrl: newCart.checkoutUrl });
              }
            } else if (result.success) {
              newItem.lineId = result.lineId;
              set({ items: [...state.items, newItem] });
            } else {
              set({ items: [...state.items, newItem] });
            }
          }
        }
      },

      removeItem: async (variantId) => {
        const state = get();
        const item = state.items.find((i) => i.variantId === variantId);
        if (item?.lineId && state.cartId) {
          await removeLineFromShopifyCart(state.cartId, item.lineId);
        }
        set({ items: state.items.filter((i) => i.variantId !== variantId) });
      },

      updateQuantity: async (variantId, quantity) => {
        const state = get();
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        const item = state.items.find((i) => i.variantId === variantId);
        if (item?.lineId && state.cartId) {
          await updateShopifyCartLine(state.cartId, item.lineId, quantity);
        }
        set({ items: state.items.map((i) => i.variantId === variantId ? { ...i, quantity } : i) });
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),

      getCheckoutUrl: () => get().checkoutUrl,
    }),
    { name: "ccd-cart" }
  )
);
