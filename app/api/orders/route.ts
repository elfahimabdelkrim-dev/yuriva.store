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
        fbclid?: string;
        landing_page?: string;
        referrer?: string;
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
    // event_id is deterministic: purchase_${orderId}
    // This matches the browser pixel event_id fired on the thank-you page,
    // so Meta can deduplicate the CAPI and browser events for the same order.
    const capiEventId = `purchase_${newOrder.id}`;
    const canSendCapi = !!(pixelId && accessToken);

    // Enrich fbc: if client sent fbc use it; else build from fbclid per Meta spec
    const fbclid = metaTracking.fbclid;
    const fbcEnriched =
      metaTracking.fbc ||
      (fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : undefined);

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
          // Merge attribution data into order for Google Sheet row
          const orderWithItems = {
            ...newOrder,
            items,
            purchase_event_id: capiEventId,
            fbclid:       metaTracking.fbclid,
            fbp:          metaTracking.fbp,
            fbc:          fbcEnriched,
            landing_page: metaTracking.landing_page,
            referrer:     metaTracking.referrer,
          } as Order;
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
      (async (): Promise<CapiResultLocal> => {
        if (!canSendCapi) return { ok: true };

        const rawName = String(order.customer_first_name ?? "").trim();
        const rawLast = String(order.customer_last_name  ?? "").trim();

        console.log(
          "[Meta CAPI] Purchase send started",
          "order="        + newOrder.id,
          "event_id="     + capiEventId,
          "value="        + (order.total_amount ?? 0),
          "event_source=" + (metaTracking.event_source_url || "(none)"),
          "has_fbp="      + !!(metaTracking.fbp),
          "has_fbc="      + !!(fbcEnriched),
          "has_fbclid="   + !!(fbclid),
          "has_phone="    + !!(order.phone),
          "has_name="     + !!(rawName),
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
              eventId:        capiEventId,
              orderId:        newOrder.id,
              value:          order.total_amount ?? 0,
              productId:      firstItem?.product_id ?? "",
              productTitle:   firstItem?.product_title ?? "",
              numItems,
              phone:          order.phone,
              firstName:      rawName  || undefined,
              lastName:       rawLast  || undefined,
              city:           order.city,
              clientIp:       getClientIp(req),
              userAgent:      req.headers.get("user-agent") || undefined,
              fbp:            metaTracking.fbp,
              fbc:            fbcEnriched,
              eventSourceUrl: metaTracking.event_source_url || metaTracking.landing_page,
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

    // Google Sheets + attribution status update (non-blocking)
    // purchase_event_id / capi_status columns silently fail if not yet migrated in DB
    supabase
      .from("orders")
      .update({
        google_sheet_synced: sheet.ok,
        google_sheet_error:  sheet.ok ? null : ((sheet as SyncResult).error ?? "sync_failed").slice(0, 200),
        purchase_event_id:   capiEventId,
        capi_status:         canSendCapi ? (capi.ok ? "sent" : "failed") : "skipped",
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
          "order=" + newOrder.id,
          "event_id=" + capiEventId
        );
      } else if (!capi.ok && capi.eventsReceived === 0) {
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

    // ── WhatsApp Admin Notification — fire-and-forget ─────────────────────
    // Runs AFTER response is returned so customer is never blocked.
    // Catches all errors internally — order success is guaranteed.
    const orderForNotify = { ...newOrder } as Order & { id: string };
    const itemsForNotify = [...items];

    // Use setImmediate/Promise to avoid blocking the HTTP response
    Promise.resolve().then(async () => {
      try {
        const { sendWhatsAppOrderNotification } = await import("@/lib/whatsapp-notify");
        const waResult = await withTimeout(
          sendWhatsAppOrderNotification(orderForNotify, itemsForNotify),
          10000,
          { ok: false, error: "wa_timeout" }
        );

        if (waResult.error === "disabled") {
          // Not configured — silent skip
          return;
        }

        const waStatus   = waResult.ok ? "sent" : "failed";
        const waSentAt   = waResult.ok ? new Date().toISOString() : null;
        const waError    = waResult.ok ? null : (waResult.error ?? "unknown").slice(0, 300);

        // Persist notification status (non-blocking, best-effort)
        supabase
          .from("orders")
          .update({
            whatsapp_notify_status:  waStatus,
            whatsapp_notify_error:   waError,
            whatsapp_notify_sent_at: waSentAt,
          })
          .eq("id", newOrder.id)
          .then(() => { /* ignored */ });

      } catch (err) {
        // WhatsApp notify must NEVER break order flow
        console.error("[WA Notify] Top-level error (order still saved)", newOrder.id, String(err).slice(0, 200));
      }
    });

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("[Orders API] Unexpected error:", String(err).slice(0, 300));
    return NextResponse.json({ success: false, error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}
