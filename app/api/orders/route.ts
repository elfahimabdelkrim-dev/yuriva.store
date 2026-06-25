import { NextRequest, NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { order, items } = await req.json() as { order: Omit<Order, "id">, items: OrderItem[] };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Static fallback — generate local ID
      const order_id = `ORD-${Date.now()}`;
      return NextResponse.json({ success: true, order_id });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Check duplicate
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("orders")
      .select("id")
      .eq("phone", order.phone)
      .gte("created_at", since)
      .limit(1);

    const is_duplicate = (recent?.length || 0) > 0;

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from("blacklist")
      .select("id")
      .eq("phone", order.phone)
      .limit(1);

    const is_blacklisted = (blacklisted?.length || 0) > 0;

    // Insert order
    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({ ...order, is_duplicate, is_blacklisted })
      .select()
      .single();

    if (error || !newOrder) {
      return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }

    // Insert items
    if (items.length > 0) {
      await supabase.from("order_items").insert(
        items.map((item) => ({ ...item, order_id: newOrder.id }))
      );
    }

    // Initial status history
    await supabase.from("order_status_history").insert({
      order_id: newOrder.id,
      old_status: "جديد",
      new_status: "جديد",
      note: "طلب جديد",
      changed_by: "system",
    });

    // Sync to Google Sheets (fire-and-forget, non-blocking)
    try {
      const { syncOrderToSheet } = await import("@/lib/google-sheets");
      void syncOrderToSheet({ ...newOrder, items });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}
