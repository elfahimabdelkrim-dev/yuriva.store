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

    // -- Supabase -----------------------------------------------------------
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

    console.log(`[ORDER_CREATED] order_id=${newOrder.id} source=${order.source ?? "direct"} total=${order.total_amount ?? 0}`);
    if (is_duplicate) {
      // Order is still created (flagged is_duplicate) - logged for visibility
      console.warn(`[DUPLICATE_ORDER_BLOCKED] order_id=${newOrder.id} phone_repeat_within_24h=true (order saved, flagged is_duplicate)`);
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

    // -- Google Sheets + Meta CAPI - parallel, both awaited ------------------
    const pixelId     = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    // event_id is deterministic: purchase_${orderId}
    // This matches the browser pixel eventID fired on the thank-you page,
    // so Meta deduplicates the CAPI and browser events for the same order.
    const capiEventId = `purchase_${newOrder.id}`;

    // Shared eligibility rules - lib/order-validation.ts is the single source
    // of truth for what counts as a purchase vs a lead vs test/admin.
    const { isMetaPurchaseEligible, isWhatsAppLead: isWaLead } = await import("@/lib/order-validation");
    const fullOrder      = { ...newOrder, items } as Order;
    const purchaseEligible = isMetaPurchaseEligible(fullOrder);
    const whatsappLead     = isWaLead(fullOrder);
    const canSendCapi      = !!(pixelId && accessToken) && purchaseEligible;

    if (!purchaseEligible && pixelId && accessToken) {
      console.log(`[Meta CAPI] Purchase SKIPPED (not eligible) order_id=${newOrder.id} source=${order.source} whatsapp_lead=${whatsappLead}`);
    }

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
      skipped?: boolean;
    };

    // New idempotency/tracking columns may not exist until the DB migration runs.
    // All updates touching them are best-effort and separated from legacy updates.
    const sb = supabase as any; // eslint-disable-line

    let sheetRetryCount = 0;

    const [sheetResult, capiResult] = await Promise.allSettled([
      // -- Google Sheets -----------------------------------------------------
      (async (): Promise<SyncResult> => {
        try {
          const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");
          if (!isConfigured()) {
            console.log("[Google Sheets] Not configured - skipping order", newOrder.id);
            return { ok: true };
          }
          console.log(`[GOOGLE_SHEET_SYNC_STARTED] order_id=${newOrder.id}`);
          // sheet_status: pending -> processing (best-effort, column may not exist yet)
          sb.from("orders").update({ sheet_status: "processing" }).eq("id", newOrder.id).then(() => {});
          // Merge attribution data into order for the sync layer
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

          let result = await withTimeout<SyncResult>(
            syncOrderToSheet(orderWithItems),
            8000,
            { ok: false, error: "timeout", stage: "timeout" }
          );

          // One automatic retry for fast (non-timeout) failures - e.g. transient
          // network/auth errors. Timeout failures are left to sync-all/compare
          // to keep the request within serverless limits.
          if (!result.ok && result.stage !== "timeout") {
            sheetRetryCount = 1;
            console.warn(`[Google Sheets] first attempt failed (stage=${result.stage}) - retrying once order_id=${newOrder.id}`);
            result = await withTimeout<SyncResult>(
              syncOrderToSheet(orderWithItems),
              5000,
              { ok: false, error: "timeout", stage: "timeout_retry" }
            );
          }
          return result;
        } catch (err) {
          return { ok: false, error: String(err).slice(0, 200) };
        }
      })(),

      // -- Meta CAPI Purchase --------------------------------------------------
      // Server-side - fires even when mobile browser blocks window.fbq.
      // IMPORTANT: testEventCode is NOT passed for real orders.
      (async (): Promise<CapiResultLocal> => {
        if (!canSendCapi) return { ok: true, skipped: true };

        // -- Backend idempotency claim - state machine -------------------------
        // capi_status flow: pending(null) -> processing -> sent | failed
        // Atomic claim: move pending/failed -> processing. Rows already in
        // 'processing' or 'sent' (or with meta_purchase_sent=true) are NOT
        // claimable - prevents concurrent duplicate sends.
        // meta_purchase_sent is set to true ONLY after Meta accepts the event.
        try {
          const { data: claimRows, error: claimErr } = await sb
            .from("orders")
            .update({ capi_status: "processing", capi_attempts: Number(newOrder.capi_attempts ?? 0) + 1 })
            .eq("id", newOrder.id)
            .or("capi_status.is.null,capi_status.eq.pending,capi_status.eq.failed")
            .or("meta_purchase_sent.is.null,meta_purchase_sent.eq.false")
            .select("id");

          if (claimErr) {
            // Column missing (migration pending) - proceed; order was just inserted
            console.warn("[Meta CAPI] idempotency claim unavailable (run DB migration):", String(claimErr.message).slice(0, 120));
          } else if (!claimRows || claimRows.length === 0) {
            console.log(`[META_PURCHASE_ALREADY_SENT] order_id=${newOrder.id} - already sent or processing, server Purchase skipped`);
            return { ok: true, skipped: true };
          }
        } catch { /* best-effort - proceed */ }

        // Persist final outcome of the CAPI send (best-effort - columns may
        // not exist until the DB migration runs).
        const persistCapiOutcome = (result: CapiResultLocal): void => {
          try {
            if (result.ok) {
              sb.from("orders")
                .update({
                  capi_status:           "sent",
                  meta_purchase_sent:    true,
                  meta_purchase_sent_at: new Date().toISOString(),
                  meta_purchase_error:   null,
                })
                .eq("id", newOrder.id)
                .then(() => { /* ignored */ });
            } else {
              // failed -> meta_purchase_sent stays false -> a later retry is allowed
              sb.from("orders")
                .update({
                  capi_status:         "failed",
                  meta_purchase_sent:  false,
                  meta_purchase_error: (result.error ?? "unknown").slice(0, 300),
                })
                .eq("id", newOrder.id)
                .then(() => { /* ignored */ });
            }
          } catch { /* best-effort */ }
        };

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

          const capiSendResult = await withTimeout<CapiResultLocal>(
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
          persistCapiOutcome(capiSendResult);
          return capiSendResult;
        } catch (err) {
          const failResult: CapiResultLocal = { ok: false, error: String(err).slice(0, 200) };
          persistCapiOutcome(failResult);
          return failResult;
        }
      })(),
    ]);

    // -- Log results + update Supabase -----------------------------------------
    const sheet = sheetResult.status === "fulfilled"
      ? sheetResult.value
      : { ok: false, error: "promise_rejected" } as SyncResult;

    const capi = capiResult.status === "fulfilled"
      ? capiResult.value
      : { ok: false, error: "promise_rejected" } as CapiResultLocal;

    // 1) Legacy columns update - MUST always succeed (columns exist since v1)
    supabase
      .from("orders")
      .update({
        google_sheet_synced: sheet.ok,
        google_sheet_error:  sheet.ok ? null : ((sheet as SyncResult).error ?? "sync_failed").slice(0, 200),
      })
      .eq("id", newOrder.id)
      .then(() => { /* intentionally ignored */ });

    // 2) New tracking columns update - best-effort, separate call so a missing
    //    column NEVER breaks the legacy google_sheet_synced update above.
    //    CAPI outcome fields (capi_status/meta_purchase_*) are NOT touched here -
    //    they are owned by the state machine inside the CAPI send block.
    sb
      .from("orders")
      .update({
        google_sheet_synced_at:   sheet.ok ? new Date().toISOString() : null,
        google_sheet_retry_count: sheetRetryCount,
        sheet_status:             sheet.ok ? "synced" : "failed",
        sheet_error:              sheet.ok ? null : ((sheet as SyncResult).error ?? "sync_failed").slice(0, 200),
        sheet_attempts:           1 + sheetRetryCount,
        sheet_synced_at:          sheet.ok ? new Date().toISOString() : null,
        purchase_event_id:        capiEventId,
        ...(canSendCapi ? {} : { capi_status: "skipped" }),
      })
      .eq("id", newOrder.id)
      .then(() => { /* best-effort - ignored if migration not yet run */ });

    if (!sheet.ok) {
      console.error(`[GOOGLE_SHEET_SYNC_FAILED] order_id=${newOrder.id} stage=${(sheet as SyncResult).stage} error=${(sheet as SyncResult).error}`);
    } else {
      console.log(`[GOOGLE_SHEET_SYNC_SUCCESS] order_id=${newOrder.id}`);
    }

    if (canSendCapi) {
      if (capi.skipped) {
        // already logged META_PURCHASE_ALREADY_SENT inside the claim block
      } else if (capi.ok && (capi.eventsReceived ?? 0) >= 1) {
        console.log(
          `[META_SERVER_PURCHASE_SENT] order_id=${newOrder.id}`,
          "event_id=" + capiEventId,
          "events_received=" + capi.eventsReceived,
          "fbtrace_id=" + (capi.fbtrace_id ?? "n/a")
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
      console.log("[Meta CAPI] META_ACCESS_TOKEN not set - browser Pixel only for order", newOrder.id);
    }

    // -- CAPI Lead for WhatsApp leads - fire-and-forget, NEVER Purchase ---------
    // event_id = lead_<database_order_id>
    if (whatsappLead && pixelId && accessToken) {
      Promise.resolve().then(async () => {
        try {
          const { sendCapiLead } = await import("@/lib/meta-capi");
          const leadResult = await withTimeout(
            sendCapiLead({
              pixelId,
              accessToken,
              orderId:        newOrder.id,
              phone:          order.phone,
              firstName:      String(order.customer_first_name ?? "").trim() || undefined,
              lastName:       String(order.customer_last_name ?? "").trim() || undefined,
              city:           order.city,
              clientIp:       getClientIp(req),
              userAgent:      req.headers.get("user-agent") || undefined,
              fbp:            metaTracking.fbp,
              fbc:            fbcEnriched,
              eventSourceUrl: metaTracking.event_source_url || metaTracking.landing_page,
            }),
            6000,
            { ok: false, error: "lead_timeout" }
          );
          if (leadResult.ok) {
            console.log(`[Meta CAPI] Lead sent order_id=${newOrder.id} event_id=lead_${newOrder.id}`);
          } else {
            console.warn(`[Meta CAPI] Lead failed order_id=${newOrder.id} error=${leadResult.error ?? "unknown"}`);
          }
        } catch (err) {
          console.warn("[Meta CAPI] Lead top-level error", newOrder.id, String(err).slice(0, 150));
        }
      });
    }

    // -- WhatsApp Admin Notification - fire-and-forget --------------------------
    // Runs AFTER response is returned so customer is never blocked.
    // Catches all errors internally - order success is guaranteed.
    const orderForNotify = { ...newOrder } as Order & { id: string };
    const itemsForNotify = [...items];

    Promise.resolve().then(async () => {
      try {
        const { sendWhatsAppOrderNotification } = await import("@/lib/whatsapp-notify");
        const waResult = await withTimeout(
          sendWhatsAppOrderNotification(orderForNotify, itemsForNotify),
          10000,
          { ok: false, error: "wa_timeout" }
        );

        if (waResult.error === "disabled") {
          return;
        }

        const waStatus   = waResult.ok ? "sent" : "failed";
        const waSentAt   = waResult.ok ? new Date().toISOString() : null;
        const waError    = waResult.ok ? null : (waResult.error ?? "unknown").slice(0, 300);

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
        console.error("[WA Notify] Top-level error (order still saved)", newOrder.id, String(err).slice(0, 200));
      }
    });

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("[Orders API] Unexpected error:", String(err).slice(0, 300));
    return NextResponse.json({ success: false, error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}
