"use client";
import type { CartItem } from "@/types";

const CART_KEY = "yuriva_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart();
  // Check if same product+size+color exists
  const existingIndex = cart.findIndex(
    (i) =>
      i.product_id === item.product_id &&
      i.size === item.size &&
      i.color?.name === item.color?.name &&
      JSON.stringify(i.pack_colors) === JSON.stringify(item.pack_colors)
  );
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(itemId: string): CartItem[] {
  const cart = getCart().filter((i) => i.id !== itemId);
  saveCart(cart);
  return cart;
}

export function updateQuantity(itemId: string, quantity: number): CartItem[] {
  const cart = getCart().map((i) =>
    i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
  );
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
