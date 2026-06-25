export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Order } from "@/types";

/**
 * POST /api/admin/google-sheets/sync-all
 *
 * Syncs all un-synced orders to Google Sheets.
 * An order is considered un-synced when google_sheet_synced IS NULL or false.
 * Already-synced orders (google_sheet_synced = true) are skipped.
 *
 * Returns: { success, synced, failed, skipped, total }
 */
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Supabase غير مهيأ" }, { status: 503 });
  }

  try {
    const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");

    if (!isConfigured()) {
      return NextResponse.json(
        { success: false, error: "Google Sheets غير مهيأ — تحقق من GOOGLE_PRIVATE_KEY و GOOGLE_SERVICE_ACCOUNT_EMAIL و GOOGLE_SHEET_ID" },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Fetch all un-synced orders with their items
    // Un-synced = synced is NULL or explicitly false
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .or("google_sheet_synced.is.null,google_sheet_synced.eq.false")
      .order("created_at", { ascending: true })
      .limit(200); // safety cap — never process more than 200 at once

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, synced: 0, failed: 0, skipped: 0, total: 0 });
    }

    let synced = 0;
    let failed = 0;

    for (const rawOrder of orders) {
      // Map order_items join to the items array expected by syncOrderToSheet
      const items = Array.isArray(rawOrder.order_items) ? rawOrder.order_items : [];
      const order: Order = { ...rawOrder, items };

      try {
        const ok = await syncOrderToSheet(order);

        await supabase
          .from("orders")
          .update({
            google_sheet_synced: ok,
            google_sheet_error: ok ? null : "sync_failed_on_bulk",
          })
          .eq("id", rawOrder.id);

        if (ok) {
          synced++;
          console.log(`[Sheets sync-all] Synced order ${rawOrder.id}`);
        } else {
          failed++;
          console.error(`[Sheets sync-all] Failed order ${rawOrder.id}`);
        }
      } catch (err) {
        failed++;
        console.error(`[Sheets sync-all] Exception for order ${rawOrder.id}:`, err);
        await supabase
          .from("orders")
          .update({
            google_sheet_synced: false,
            google_sheet_error: String(err).slice(0, 200),
          })
          .eq("id", rawOrder.id)
          .then(() => {/* ignore */});
      }

      // Small delay between requests to avoid Sheets API rate limits
      await new Promise((r) => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: orders.length,
    });
  } catch (err) {
    console.error("[Sheets sync-all] Unexpected error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
