export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Order } from "@/types";

interface FailureDetail {
  order_id: string;
  customer: string;
  error: string;
  stage: string;
}

interface SyncAllResult {
  success: boolean;
  synced: number;
  failed: number;
  total: number;
  failures?: FailureDetail[];
  error?: string;
}

/**
 * POST /api/admin/google-sheets/sync-all
 *
 * Syncs all un-synced orders (google_sheet_synced IS NULL or false) to Google Sheets.
 * Already-synced orders (google_sheet_synced = true) are skipped — no duplicates.
 * Returns per-order failure details for admin display.
 */
export async function POST(): Promise<NextResponse<SyncAllResult>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, synced: 0, failed: 0, total: 0, error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");

    if (!isConfigured()) {
      return NextResponse.json(
        {
          success: false, synced: 0, failed: 0, total: 0,
          error: "Google Sheets not configured — check GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SHEET_ID",
        },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Fetch un-synced orders with their items (skip already-synced ones)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .or("google_sheet_synced.is.null,google_sheet_synced.eq.false")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ success: false, synced: 0, failed: 0, total: 0, error: error.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, synced: 0, failed: 0, total: 0 });
    }

    let synced = 0;
    let failed = 0;
    const failures: FailureDetail[] = [];

    for (const rawOrder of orders) {
      const items = Array.isArray(rawOrder.order_items) ? rawOrder.order_items : [];
      const order: Order = { ...rawOrder, items };
      const customerName = `${rawOrder.customer_first_name ?? ""} ${rawOrder.customer_last_name ?? ""}`.trim();

      try {
        const result = await syncOrderToSheet(order);

        await supabase
          .from("orders")
          .update({
            google_sheet_synced: result.ok,
            google_sheet_error: result.ok ? null : (result.error ?? "sync_failed").slice(0, 200),
          })
          .eq("id", rawOrder.id);

        if (result.ok) {
          synced++;
          console.log(`[Sheets sync-all] Synced order ${rawOrder.id}`);
        } else {
          failed++;
          const safeError = (result.error ?? "unknown error").slice(0, 200);
          console.error(`[Sheets sync-all] Failed order ${rawOrder.id}: stage=${result.stage} error=${safeError}`);
          failures.push({
            order_id: rawOrder.id,
            customer: customerName,
            error: safeError,
            stage: result.stage ?? "unknown",
          });
        }
      } catch (err) {
        failed++;
        const safeError = String(err).slice(0, 200);
        console.error(`[Sheets sync-all] Exception for order ${rawOrder.id}:`, safeError);
        failures.push({
          order_id: rawOrder.id,
          customer: customerName,
          error: safeError,
          stage: "exception",
        });
        await supabase
          .from("orders")
          .update({ google_sheet_synced: false, google_sheet_error: safeError })
          .eq("id", rawOrder.id)
          .then(() => { /* ignore */ });
      }

      // Small delay between requests to avoid Sheets API rate limits
      await new Promise((r) => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: orders.length,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (err) {
    console.error("[Sheets sync-all] Unexpected error:", err);
    return NextResponse.json({ success: false, synced: 0, failed: 0, total: 0, error: String(err).slice(0, 300) }, { status: 500 });
  }
}
