export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { Order } from "@/types";

/**
 * ADMIN-ONLY reconciliation endpoint. Supabase is the single source of truth.
 *
 * GET  /api/admin/reconcile
 *   DRY RUN - reads database + Google Sheet, classifies every order using the
 *   shared rules in lib/order-validation.ts, and returns:
 *     - a full reconciliation summary (dashboard metrics)
 *     - the classified list of orders missing from the sheet (with reasons)
 *     - sheet rows whose ID does not exist in the database
 *   NEVER writes to Google Sheets or Meta.
 *
 * POST /api/admin/reconcile
 *   Body: { order_ids: string[] }  (explicitly selected by the admin)
 *   Syncs ONLY the selected orders to the Google Sheet, idempotently:
 *     - order ID normalized as string (normalizeOrderId)
 *     - whole column A searched before appending
 *     - existing IDs skipped - duplicates are impossible
 *   NEVER sends Meta Purchase/Lead events - backfill is sheet-only.
 */

interface AuditRow {
  order_id: string;
  created_at: string;
  source: string;
  status: string;
  category: string;
  reason: string;
  customer: string;
  has_valid_customer: boolean;
  total: number;
  in_sheet: boolean;
  google_sheet_synced: boolean;
  sheet_status: string | null;
  capi_status: string | null;
  meta_purchase_sent: boolean;
  safe_to_sync: boolean;
}

async function loadAll(): Promise<
  | {
      ok: true;
      orders: Array<Record<string, unknown>>;
      sheetIds: Set<string>;
      sheetOnlyIds: string[];
    }
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

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) return { ok: false, error: error.message, status: 500 };

  const { normalizeOrderId } = await import("@/lib/order-validation");
  const allOrders = (orders ?? []) as Array<Record<string, unknown>>;
  const dbIds = new Set(allOrders.map((o) => normalizeOrderId(o.id)));

  // Sheet IDs (skip header row value and empties)
  const sheetIdsRaw = sheetIdsResult.ids.map((s) => String(s).trim()).filter(Boolean);
  const sheetIds = new Set(sheetIdsRaw.slice(1)); // index 0 = header cell
  const sheetOnlyIds = Array.from(sheetIds).filter((id) => !dbIds.has(id) && id !== "TEST");

  return { ok: true, orders: allOrders, sheetIds, sheetOnlyIds };
}

export async function GET() {
  const auth = await (await import("@/lib/admin-auth")).requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const loaded = await loadAll();
    if (!loaded.ok) {
      return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
    }

    const {
      classifyOrder, classificationReason, isValidOperationalOrder,
      isMetaPurchaseEligible, hasValidCustomer, normalizeOrderId,
    } = await import("@/lib/order-validation");

    const rows: AuditRow[] = loaded.orders.map((raw) => {
      const o = raw as unknown as Order;
      const id = normalizeOrderId(o.id);
      const inSheet = loaded.sheetIds.has(id);
      const category = classifyOrder(o);
      const validOp = isValidOperationalOrder(o);
      return {
        order_id:            id,
        created_at:          String(raw.created_at ?? ""),
        source:              String(raw.source ?? "direct"),
        status:              String(raw.status ?? ""),
        category,
        reason:              classificationReason(o),
        customer:            `${o.customer_first_name ?? ""} ${o.customer_last_name ?? ""}`.trim(),
        has_valid_customer:  hasValidCustomer(o),
        total:               Number(raw.total_amount ?? 0),
        in_sheet:            inSheet,
        google_sheet_synced: raw.google_sheet_synced === true,
        sheet_status:        (raw.sheet_status as string) ?? null,
        capi_status:         (raw.capi_status as string) ?? null,
        meta_purchase_sent:  raw.meta_purchase_sent === true,
        safe_to_sync:        !inSheet && validOp,
      };
    });

    const missing = rows.filter((r) => !r.in_sheet);
    const count = (arr: AuditRow[], f: (r: AuditRow) => boolean) => arr.filter(f).length;

    const summary = {
      total_db_orders:        rows.length,
      valid_real_orders:      count(rows, (r) => r.category === "real_cod"),
      whatsapp_leads:         count(rows, (r) => r.category === "whatsapp_lead"),
      test_orders:            count(rows, (r) => r.category === "test"),
      admin_orders:           count(rows, (r) => r.category === "admin"),
      cancelled_orders:       count(rows, (r) => r.category === "cancelled"),
      invalid_orders:         count(rows, (r) => r.category === "invalid"),
      missing_from_sheet:     missing.length,
      sheet_only_rows:        loaded.sheetOnlyIds.length,
      pixel_eligible:         loaded.orders.filter((raw) => isMetaPurchaseEligible(raw as unknown as Order)).length,
      capi_sent:              count(rows, (r) => r.capi_status === "sent" || r.meta_purchase_sent),
      capi_failed:            count(rows, (r) => r.capi_status === "failed"),
      capi_pending:           count(rows, (r) => !r.capi_status || r.capi_status === "pending" || r.capi_status === "processing"),
      capi_skipped:           count(rows, (r) => r.capi_status === "skipped"),
      sheet_synced:           count(rows, (r) => r.in_sheet),
      sheet_failed:           count(rows, (r) => !r.in_sheet && r.sheet_status === "failed"),
      safe_to_sync:           count(missing, (r) => r.safe_to_sync),
      missing_oldest:         missing.length > 0 ? missing[0].created_at : null,
      missing_newest:         missing.length > 0 ? missing[missing.length - 1].created_at : null,
      missing_by_category: {
        real_cod:      count(missing, (r) => r.category === "real_cod"),
        whatsapp_lead: count(missing, (r) => r.category === "whatsapp_lead"),
        test:          count(missing, (r) => r.category === "test"),
        admin:         count(missing, (r) => r.category === "admin"),
        cancelled:     count(missing, (r) => r.category === "cancelled"),
        invalid:       count(missing, (r) => r.category === "invalid"),
      },
    };

    console.log(`[Reconcile] DRY RUN db=${summary.total_db_orders} missing=${summary.missing_from_sheet} safe=${summary.safe_to_sync} sheet_only=${summary.sheet_only_rows}`);

    return NextResponse.json({
      success: true,
      dry_run: true,
      summary,
      missing,
      sheet_only_ids: loaded.sheetOnlyIds,
    });
  } catch (err) {
    console.error("[Reconcile] GET error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await (await import("@/lib/admin-auth")).requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({})) as { order_ids?: unknown };
    const requestedIds = Array.isArray(body.order_ids)
      ? body.order_ids.map((x) => String(x).trim()).filter(Boolean).slice(0, 500)
      : [];

    if (requestedIds.length === 0) {
      return NextResponse.json({ success: false, error: "order_ids required - nothing is synced automatically" }, { status: 400 });
    }

    const loaded = await loadAll();
    if (!loaded.ok) {
      return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
    }

    const { normalizeOrderId } = await import("@/lib/order-validation");
    const { syncOrderToSheet } = await import("@/lib/google-sheets");
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const sb = supabase as any; // eslint-disable-line

    const byId = new Map(loaded.orders.map((o) => [normalizeOrderId(o.id), o]));

    let synced = 0;
    let skippedExisting = 0;
    let notFound = 0;
    let failed = 0;
    const failures: Array<{ order_id: string; error: string }> = [];

    for (const id of requestedIds) {
      const raw = byId.get(id);
      if (!raw) { notFound++; continue; }

      // Dedup guard #1: whole ID column was read in loadAll
      if (loaded.sheetIds.has(id)) { skippedExisting++; continue; }

      const items = Array.isArray(raw.order_items) ? raw.order_items : [];
      const order = { ...raw, items } as unknown as Order;

      try {
        console.log(`[GOOGLE_SHEET_SYNC_STARTED] order_id=${id} (reconcile backfill - NO Meta events)`);
        // Dedup guard #2: syncOrderToSheet re-reads column A and skips existing
        const result = await syncOrderToSheet(order);

        await supabase
          .from("orders")
          .update({
            google_sheet_synced: result.ok,
            google_sheet_error:  result.ok ? null : (result.error ?? "sync_failed").slice(0, 200),
          })
          .eq("id", id);

        sb.from("orders")
          .update({
            sheet_status:    result.ok ? "synced" : "failed",
            sheet_error:     result.ok ? null : (result.error ?? "sync_failed").slice(0, 200),
            sheet_synced_at: result.ok ? new Date().toISOString() : null,
          })
          .eq("id", id)
          .then(() => { /* best-effort */ });

        if (result.ok) {
          synced++;
          console.log(`[GOOGLE_SHEET_SYNC_SUCCESS] order_id=${id} (reconcile backfill)`);
        } else {
          failed++;
          console.error(`[GOOGLE_SHEET_SYNC_FAILED] order_id=${id} stage=${result.stage} error=${result.error}`);
          failures.push({ order_id: id, error: (result.error ?? "unknown").slice(0, 200) });
        }
      } catch (err) {
        failed++;
        const msg = String(err).slice(0, 200);
        console.error(`[GOOGLE_SHEET_SYNC_FAILED] order_id=${id} exception=${msg}`);
        failures.push({ order_id: id, error: msg });
      }

      await new Promise((r) => setTimeout(r, 300)); // Sheets API rate limit
    }

    console.log(`[Reconcile] backfill done synced=${synced} skipped=${skippedExisting} not_found=${notFound} failed=${failed} (Meta NOT touched)`);

    return NextResponse.json({
      success: true,
      requested: requestedIds.length,
      synced,
      skipped_existing: skippedExisting,
      not_found: notFound,
      failed,
      failures: failures.length > 0 ? failures : undefined,
      meta_events_sent: 0, // backfill NEVER touches Meta
    });
  } catch (err) {
    console.error("[Reconcile] POST error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}
