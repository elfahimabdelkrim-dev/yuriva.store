import type { Order, OrderItem, OrderStatus } from "@/types";

function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function createOrder(
  order: Omit<Order, "id" | "created_at" | "updated_at">,
  items: OrderItem[]
): Promise<{ success: boolean; order_id?: string; error?: string }> {
  if (hasSupabase()) {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, items }),
      });
      const data = await res.json();
      if (data.success) return { success: true, order_id: data.order_id };
      return { success: false, error: data.error };
    } catch {
      // fallback to local
    }
  }

  // Static fallback — save to localStorage
  const order_id = `ORD-${Date.now()}`;
  const localOrder = {
    ...order,
    id: order_id,
    items,
    created_at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const existing = JSON.parse(localStorage.getItem("yuriva_orders") || "[]");
    existing.push(localOrder);
    localStorage.setItem("yuriva_orders", JSON.stringify(existing));
  }
  return { success: true, order_id };
}

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  if (hasSupabase()) {
    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.orders) return data.orders;
    } catch {
      // fallback
    }
  }

  // Static fallback
  if (typeof window !== "undefined") {
    const orders = JSON.parse(localStorage.getItem("yuriva_orders") || "[]");
    return orders.filter((o: Order) => o.phone === phone);
  }
  return [];
}

export async function getAllOrders(): Promise<Order[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_status_history(*)")
        .order("created_at", { ascending: false });
      if (!error && data) return data as Order[];
    } catch {
      // fallback
    }
  }
  return [];
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
  changedBy?: string
): Promise<boolean> {
  if (hasSupabase()) {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, changed_by: changedBy }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }
  return false;
}
