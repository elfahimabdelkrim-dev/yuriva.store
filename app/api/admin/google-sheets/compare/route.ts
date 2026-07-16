export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Order } from "@/types";

interface MissingOrderInfo {
  order_id: string;
  customer: string;
  total: number;
  source: string;
  created_at: string;
}

/**
 * GET /api/admin/google-sheets/compare
 * Compares order IDs in Supabase against column A of the Google Sheet.
 * Returns the list of orders that exist in the database but are MISSING
 * from the sheet - regardless of what google_sheet_synced says.
 *
 * POST /api/admin/google-sheets/compare
 * Syncs ONLY the missing orders found by the same comparison.
 * Existing rows are never duplicated (syncOrderToSheet dedups by column A).
 *
 * BOTH handlers require a valid admin session (Supabase Auth cookie) -
 * they expose customer data and trigger sheet writes.
 */

async function findMissing(): Promise<
  | { ok: true; missing: MissingOrderInfo[]; dbCount: number; sheetCount: number; rawOrders: Array<Record<string, unknown>> }
  | { ok: false; error: string; status: number }
> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const { isConfigured, getSheetOrderIds } = await import("@/lib/google-sheets");
  if (!isConfigured()) {
    return { ok: false, error: "Google Sheets not configured", status: 400 };
  }

  const sheetIdsResult = await getSheetOrderIds();
  if (!sheetIdsResult.ok) {
    return { ok: false, error: "Sheet read failed: " + (sheetIdsResult.error ?? "unknown"), status: 500 };
  }
  const sheetIds = new Set(sheetIdsResult.ids);

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const rawOrders = (orders ?? []) as Array<Record<string, unknown>>;
  const missingRaw = rawOrders.filter((o) => !sheetIds.has(String(o.id ?? "")));

  const missing: MissingOrderInfo[] = missingRaw.map((o) => ({
    order_id:   String(o.id ?? ""),
    customer:   `${o.customer_first_name ?? ""} ${o.customer_last_name ?? ""}`.trim(),
    total:      Number(o.total_amount ?? 0),
    source:     String(o.source ?? "direct"),
    created_at: String(o.created_at ?? ""),
  }));

  return {
    ok: true,
    missing,
    dbCount: rawOrders.length,
    sheetCount: sheetIds.size > 0 ? sheetIds.size - 1 : 0, // minus header row
    rawOrders: missingRaw,
  };
}

export async function GET() {
  // Admin auth REQUIRED - this endpoint exposes customer PII (names, totals)
  const auth = await (await import("@/lib/admin-auth")).requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await findMissing();
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    console.log(`[Sheets compare] db=${result.dbCount} sheet=${result.sheetCount} missing=${result.missing.length}`);

    return NextResponse.json({
      success:       true,
      db_count:      result.dbCount,
      sheet_count:   result.sheetCount,
      missing:       result.missing,
      missing_count: result.missing.length,
    });
  } catch (err) {
    console.error("[Sheets compare] GET error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}

export async function POST() {
  // Admin auth REQUIRED - this endpoint triggers Google Sheets writes
  const auth = await (await import("@/lib/admin-auth")).requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await findMissing();
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    if (result.missing.length === 0) {
      return NextResponse.json({ success: true, synced: 0, failed: 0, missing_count: 0 });
    }

    const { syncOrderToSheet } = await import("@/lib/google-sheets");
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const sb = supabase as any; // eslint-disable-line

    let synced = 0;
    let failed = 0;
    const failures: Array<{ order_id: string; error: string }> = [];

    for (const rawOrder of result.rawOrders) {
      const items = Array.isArray(rawOrder.order_items) ? rawOrder.order_items : [];
      const order = { ...rawOrder, items } as unknown as Order;
      const orderId = String(rawOrder.id ?? "");

      try {
        console.log(`[GOOGLE_SHEET_SYNC_STARTED] order_id=${orderId} (compare resync)`);
        const syncResult = await syncOrderToSheet(order);

        // Legacy columns - always exist
        await supabase
          .from("orders")
          .update({
            google_sheet_synced: syncResult.ok,
            google_sheet_error:  syncResult.ok ? null : (syncResult.error ?? "sync_failed").slice(0, 200),
          })
          .eq("id", orderId);

        // New columns - best-effort (migration may be pending)
        sb.from("orders")
          .update({ google_sheet_synced_at: syncResult.ok ? new Date().toISOString() : null })
          .eq("id", orderId)
          .then(() => { /* ignored */ });

        if (syncResult.ok) {
          synced++;
          console.log(`[GOOGLE_SHEET_SYNC_SUCCESS] order_id=${orderId} (compare resync)`);
        } else {
          failed++;
          console.error(`[GOOGLE_SHEET_SYNC_FAILED] order_id=${orderId} stage=${syncResult.stage} error=${syncResult.error}`);
          failures.push({ order_id: orderId, error: (syncResult.error ?? "unknown").slice(0, 200) });
        }
      } catch (err) {
        failed++;
        const msg = String(err).slice(0, 200);
        console.error(`[GOOGLE_SHEET_SYNC_FAILED] order_id=${orderId} exception=${msg}`);
        failures.push({ order_id: orderId, error: msg });
      }

      // Avoid Google Sheets API rate limits
      await new Promise((r) => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      missing_count: result.missing.length,
      synced,
      failed,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (err) {
    console.error("[Sheets compare] POST error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}
