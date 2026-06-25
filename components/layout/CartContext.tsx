"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem } from "@/types";
import {
  getCart,
  addToCart as addItem,
  removeFromCart as removeItem,
  updateQuantity as updateQty,
  clearCart as clearAll,
  getCartTotal,
  getCartCount,
} from "@/lib/cart";

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  count: 0,
  total: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    const updated = addItem(item);
    setItems([...updated]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    const updated = removeItem(id);
    setItems([...updated]);
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    const updated = updateQty(id, qty);
    setItems([...updated]);
  }, []);

  const clearCart = useCallback(() => {
    clearAll();
    setItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        count: getCartCount(items),
        total: getCartTotal(items),
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
