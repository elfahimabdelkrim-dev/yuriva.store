import { NextRequest, NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

/** Race a promise against a timeout — returns fallback on timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const { order, items } = await req.json() as { order: Omit<Order, "id">; items: OrderItem[] };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const order_id = `ORD-${Date.now()}`;
      return NextResponse.json({ success: true, order_id });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Check duplicate (same phone within last 24h)
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
      .insert({ ...order, is_duplicate, is_blacklisted, google_sheet_synced: false })
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
      old_status: "new",
      new_status: "new",
      note: "new order",
      changed_by: "system",
    });

    // Google Sheets sync
    // Awaited with an 8-second timeout so Vercel serverless does not cut it off.
    // Result is written back to the orders row so failed syncs can be retried later.
    try {
      const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");

      if (isConfigured()) {
        const orderWithItems = { ...newOrder, items } as Order;
        const synced = await withTimeout(syncOrderToSheet(orderWithItems), 8000, false);

        await supabase
          .from("orders")
          .update({
            google_sheet_synced: synced,
            google_sheet_error: synced ? null : "sync_failed_on_create",
          })
          .eq("id", newOrder.id);

        if (!synced) {
          console.error("[Google Sheets] Failed to sync order", newOrder.id, "on creation");
        } else {
          console.log("[Google Sheets] Order", newOrder.id, "synced successfully");
        }
      } else {
        console.log("[Google Sheets] Not configured — skipping sync for order", newOrder.id);
      }
    } catch (sheetErr) {
      // Sheets errors must never block the order response
      console.error("[Google Sheets] Exception during sync for order", newOrder.id, sheetErr);
      supabase
        .from("orders")
        .update({
          google_sheet_synced: false,
          google_sheet_error: String(sheetErr).slice(0, 200),
        })
        .eq("id", newOrder.id)
        .then(() => { /* ignore */ });
    }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ success: false, error: "server error" }, { status: 500 });
  }
}
