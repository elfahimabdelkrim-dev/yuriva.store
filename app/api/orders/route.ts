import { NextRequest, NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      order: Omit<Order, "id">;
      items: OrderItem[];
      meta?: {
        event_id?: string;
        fbp?: string;
        fbc?: string;
        event_source_url?: string;
      };
    };

    const { order, items } = body;
    const metaTracking = body.meta ?? {};

    // ── Supabase ───────────────────────────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, order_id: `ORD-${Date.now()}` });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("orders")
      .select("id")
      .eq("phone", order.phone)
      .gte("created_at", since)
      .limit(1);
    const is_duplicate = (recent?.length || 0) > 0;

    const { data: blacklisted } = await supabase
      .from("blacklist")
      .select("id")
      .eq("phone", order.phone)
      .limit(1);
    const is_blacklisted = (blacklisted?.length || 0) > 0;

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({ ...order, is_duplicate, is_blacklisted, google_sheet_synced: false })
      .select()
      .single();

    if (error || !newOrder) {
      return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }

    if (items.length > 0) {
      await supabase.from("order_items").insert(
        items.map((item) => ({ ...item, order_id: newOrder.id }))
      );
    }

    await supabase.from("order_status_history").insert({
      order_id: newOrder.id,
      old_status: "new",
      new_status: "new",
      note: "new order",
      changed_by: "system",
    });

    // ── Google Sheets + Meta CAPI — parallel, both awaited ────────────────
    const pixelId     = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    const canSendCapi = !!(pixelId && accessToken && metaTracking.event_id);

    type SyncResult = { ok: boolean; error?: string; stage?: string };
    type CapiResultLocal = {
      ok: boolean;
      eventsReceived?: number;
      messages?: string[];
      fbtrace_id?: string;
      error?: string;
    };

    const [sheetResult, capiResult] = await Promise.allSettled([
      // ── Google Sheets ──────────────────────────────────────────────────
      (async (): Promise<SyncResult> => {
        try {
          const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");
          if (!isConfigured()) {
            console.log("[Google Sheets] Not configured — skipping order", newOrder.id);
            return { ok: true };
          }
          const orderWithItems = { ...newOrder, items } as Order;
          return withTimeout<SyncResult>(
            syncOrderToSheet(orderWithItems),
            8000,
            { ok: false, error: "timeout", stage: "timeout" }
          );
        } catch (err) {
          return { ok: false, error: String(err).slice(0, 200) };
        }
      })(),

      // ── Meta CAPI Purchase ─────────────────────────────────────────────
      // Server-side — fires even when mobile browser blocks window.fbq.
      // IMPORTANT: testEventCode is NOT passed for real orders.
      //   Including test_event_code routes events to Test Events ONLY
      //   and prevents them from appearing in normal Vue d'ensemble.
      (async (): Promise<CapiResultLocal> => {
        if (!canSendCapi) return { ok: true };

        console.log(
          "[Meta CAPI] Purchase send started",
          "order="        + newOrder.id,
          "event_id="     + metaTracking.event_id,
          "value="        + (order.total_amount ?? 0),
          "event_source=" + (metaTracking.event_source_url || "(none)"),
          "has_fbp="      + !!(metaTracking.fbp),
          "has_fbc="      + !!(metaTracking.fbc),
          "has_phone="    + !!(order.phone),
          "has_ip="       + !!(getClientIp(req))
        );

        try {
          const { sendCapiPurchase } = await import("@/lib/meta-capi");
          const firstItem = items[0];
          const numItems  = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

          return withTimeout<CapiResultLocal>(
            sendCapiPurchase({
              pixelId,
              accessToken,
              // NO testEventCode here — real orders must appear in Vue d'ensemble
              eventId:        metaTracking.event_id!,
              orderId:        newOrder.id,
              value:          order.total_amount ?? 0,
              productId:      firstItem?.product_id ?? "",
              productTitle:   firstItem?.product_title ?? "",
              numItems,
              phone:          order.phone,
              city:           order.city,
              clientIp:       getClientIp(req),
              userAgent:      req.headers.get("user-agent") || undefined,
              fbp:            metaTracking.fbp,
              fbc:            metaTracking.fbc,
              eventSourceUrl: metaTracking.event_source_url,
            }),
            6000,
            { ok: false, error: "capi_timeout" }
          );
        } catch (err) {
          return { ok: false, error: String(err).slice(0, 200) };
        }
      })(),
    ]);

    // ── Log results + update Supabase ──────────────────────────────────────
    const sheet = sheetResult.status === "fulfilled"
      ? sheetResult.value
      : { ok: false, error: "promise_rejected" } as SyncResult;

    const capi = capiResult.status === "fulfilled"
      ? capiResult.value
      : { ok: false, error: "promise_rejected" } as CapiResultLocal;

    // Google Sheets status update (non-blocking)
    supabase
      .from("orders")
      .update({
        google_sheet_synced: sheet.ok,
        google_sheet_error:  sheet.ok ? null : ((sheet as SyncResult).error ?? "sync_failed").slice(0, 200),
      })
      .eq("id", newOrder.id)
      .then(() => { /* intentionally ignored */ });

    if (!sheet.ok) {
      console.error("[Google Sheets] Failed for order", newOrder.id, ":", (sheet as SyncResult).error);
    } else {
      console.log("[Google Sheets] Order", newOrder.id, "synced OK");
    }

    if (canSendCapi) {
      if (capi.ok && (capi.eventsReceived ?? 0) >= 1) {
        console.log(
          "[Meta CAPI] Purchase accepted by Meta",
          "events_received=" + capi.eventsReceived,
          "fbtrace_id=" + (capi.fbtrace_id ?? "n/a"),
          "order=" + newOrder.id
        );
      } else if (!capi.ok && capi.eventsReceived === 0) {
        // HTTP 200 but Meta rejected the event (e.g. duplicate, bad data)
        console.warn(
          "[Meta CAPI] Purchase rejected by Meta",
          "events_received=0",
          "order=" + newOrder.id,
          "messages=" + JSON.stringify(capi.messages ?? [])
        );
      } else if (!capi.ok) {
        console.error(
          "[Meta CAPI] Purchase failed",
          "order=" + newOrder.id,
          "error=" + (capi.error ?? "unknown")
        );
      }
    } else if (pixelId && !accessToken) {
      console.log("[Meta CAPI] META_ACCESS_TOKEN not set — browser Pixel only for order", newOrder.id);
    }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("[Orders] Unexpected error:", err);
    return NextResponse.json({ success: false, error: "server error" }, { status: 500 });
  }
}
