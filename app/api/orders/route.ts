import { NextRequest, NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

export const dynamic = "force-dynamic";

/** Race a promise against a timeout — resolves to fallback on timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Extract client IP from Vercel/proxy headers */
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

    // Duplicate check (same phone within last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("orders")
      .select("id")
      .eq("phone", order.phone)
      .gte("created_at", since)
      .limit(1);
    const is_duplicate = (recent?.length || 0) > 0;

    // Blacklist check
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

    // ── Google Sheets sync + Meta CAPI — run in PARALLEL, both awaited ────
    // Running in parallel caps total wait at max(8s, 6s) = 8s instead of 14s.
    // Neither failure blocks the order response.
    const pixelId    = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    const canSendCapi = !!(pixelId && accessToken && metaTracking.event_id);

    type SyncResult = { ok: boolean; error?: string; stage?: string };

    const [sheetResult, capiResult] = await Promise.allSettled([
      // ── Google Sheets ──────────────────────────────────────────────────
      (async (): Promise<SyncResult> => {
        try {
          const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");
          if (!isConfigured()) {
            console.log("[Google Sheets] Not configured — skipping sync for order", newOrder.id);
            return { ok: true };
          }
          const orderWithItems = { ...newOrder, items } as Order;
          const fallback: SyncResult = { ok: false, error: "timeout", stage: "timeout" };
          return withTimeout(syncOrderToSheet(orderWithItems), 8000, fallback);
        } catch (err) {
          return { ok: false, error: String(err).slice(0, 200) };
        }
      })(),

      // ── Meta CAPI Purchase ─────────────────────────────────────────────
      // Runs server-side even when the mobile browser blocks window.fbq.
      // Access token is NEVER logged or returned to the client.
      (async (): Promise<{ ok: boolean; error?: string }> => {
        if (!canSendCapi) return { ok: true }; // nothing to do

        console.log("[Meta CAPI] Purchase send started for order", newOrder.id);
        try {
          const { sendCapiPurchase } = await import("@/lib/meta-capi");
          const firstItem = items[0];
          const numItems  = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

          const result = await withTimeout(
            sendCapiPurchase({
              pixelId:       pixelId!,
              accessToken:   accessToken!,
              testEventCode: process.env.META_TEST_EVENT_CODE,
              eventId:       metaTracking.event_id!,
              orderId:       newOrder.id,
              value:         order.total_amount ?? 0,
              productId:     firstItem?.product_id ?? "",
              productTitle:  firstItem?.product_title ?? "",
              numItems,
              phone:         order.phone,
              city:          order.city,
              clientIp:      getClientIp(req),
              userAgent:     req.headers.get("user-agent") || undefined,
              fbp:           metaTracking.fbp,
              fbc:           metaTracking.fbc,
              eventSourceUrl: metaTracking.event_source_url,
            }),
            6000,
            { ok: false, error: "capi_timeout" }
          );
          return result;
        } catch (err) {
          return { ok: false, error: String(err).slice(0, 200) };
        }
      })(),
    ]);

    // ── Post-parallel: update Supabase + log results ───────────────────────
    const sheet = sheetResult.status === "fulfilled" ? sheetResult.value : { ok: false, error: "rejected" };
    const capi  = capiResult.status  === "fulfilled" ? capiResult.value  : { ok: false, error: "rejected" };

    // Update google_sheet_synced
    supabase
      .from("orders")
      .update({
        google_sheet_synced: sheet.ok,
        google_sheet_error: sheet.ok ? null : ((sheet as SyncResult).error ?? "sync_failed").slice(0, 200),
      })
      .eq("id", newOrder.id)
      .then(() => {/* ignore result */});

    if (!sheet.ok) {
      console.error("[Google Sheets] Failed for order", newOrder.id, ":", (sheet as SyncResult).error);
    } else {
      console.log("[Google Sheets] Order", newOrder.id, "synced successfully");
    }

    if (canSendCapi) {
      if (capi.ok) {
        console.log("[Meta CAPI] Purchase sent successfully for order", newOrder.id, "eventId=", metaTracking.event_id);
      } else {
        console.error("[Meta CAPI] Purchase failed for order", newOrder.id, ":", capi.error);
      }
    } else if (pixelId && !accessToken) {
      console.log("[Meta CAPI] META_ACCESS_TOKEN not set — browser Pixel only for order", newOrder.id);
    }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ success: false, error: "server error" }, { status: 500 });
  }
}
