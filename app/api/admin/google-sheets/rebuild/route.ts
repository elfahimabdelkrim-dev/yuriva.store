export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Order } from "@/types";

interface RebuildApiResult {
  success: boolean;
  total?: number;
  trackingTab?: boolean;
  error?: string;
}

/**
 * POST /api/admin/google-sheets/rebuild
 *
 * Reads ALL orders from Supabase (with items), clears the main Google Sheet,
 * writes clean 14-column headers (A:N), then rewrites all orders sorted by
 * created_at. Tracking data is written to a separate "Tracking" tab if any
 * orders have attribution fields.
 *
 * This replaces any messy / shifted rows with a perfectly clean sheet.
 */
export async function POST(): Promise<NextResponse<RebuildApiResult>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { success: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const { isConfigured, rebuildSheetFromOrders } = await import("@/lib/google-sheets");

    if (!isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets not configured — check GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SHEET_ID",
        },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Fetch ALL orders (not just unsynced) with their items
    const { data: rawOrders, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const orders: Order[] = (rawOrders ?? []).map((rawOrder) => ({
      ...rawOrder,
      items: Array.isArray(rawOrder.order_items) ? rawOrder.order_items : [],
    }));

    console.log(`[Sheets rebuild] fetched ${orders.length} orders from Supabase`);

    const result = await rebuildSheetFromOrders(orders);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success:     true,
      total:       result.total,
      trackingTab: result.trackingTab,
    });
  } catch (err) {
    console.error("[Sheets rebuild] Unexpected error:", String(err).slice(0, 300));
    return NextResponse.json({ success: false, error: String(err).slice(0, 300) }, { status: 500 });
  }
}
