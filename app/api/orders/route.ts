import { NextRequest, NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types";

/** Race a promise against a timeout — returns fallback on timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Get client IP from standard proxy headers */
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

    // ── Google Sheets sync ─────────────────────────────────────────────────
    try {
      const { isConfigured, syncOrderToSheet } = await import("@/lib/google-sheets");
      type SyncResult = { ok: boolean; error?: string; stage?: string };

      if (isConfigured()) {
        const orderWithItems = { ...newOrder, items } as Order;
        const fallback: SyncResult = { ok: false, error: "timeout", stage: "timeout" };
        const result = await withTimeout(syncOrderToSheet(orderWithItems), 8000, fallback);

        await supabase
          .from("orders")
          .update({
            google_sheet_synced: result.ok,
            google_sheet_error: result.ok ? null : (result.error ?? "sync_failed_on_create").slice(0, 200),
          })
          .eq("id", newOrder.id);

        if (!result.ok) {
          console.error("[Google Sheets] Failed to sync order", newOrder.id, "stage=", result.stage, result.error);
        } else {
          console.log("[Google Sheets] Order", newOrder.id, "synced successfully");
        }
      } else {
        console.log("[Google Sheets] Not configured — skipping sync for order", newOrder.id);
      }
    } catch (sheetErr) {
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

    // ── Meta CAPI Purchase ─────────────────────────────────────────────────
    // Runs server-side — access token never reaches the browser.
    // A failure here NEVER blocks or changes the order response.
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (pixelId && accessToken && metaTracking.event_id) {
      const firstItem = items[0];
      const numItems = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

      // Fire and forget with timeout — don't await in the response path
      void (async () => {
        try {
          const { sendCapiPurchase } = await import("@/lib/meta-capi");
          const result = await withTimeout(
            sendCapiPurchase({
              pixelId,
              accessToken,
              testEventCode: process.env.META_TEST_EVENT_CODE,
              eventId: metaTracking.event_id!,
              orderId: newOrder.id,
              value: order.total_amount ?? 0,
              productId: firstItem?.product_id ?? "",
              productTitle: firstItem?.product_title ?? "",
              numItems,
              phone: order.phone,
              city: order.city,
              clientIp: getClientIp(req),
              userAgent: req.headers.get("user-agent") || undefined,
              fbp: metaTracking.fbp,
              fbc: metaTracking.fbc,
              eventSourceUrl: metaTracking.event_source_url,
            }),
            6000,
            { ok: false, error: "capi_timeout" }
          );
          if (!result.ok) {
            // Safe log — sendCapiPurchase already redacts the token
            console.error("[Meta CAPI] Purchase failed for order", newOrder.id, ":", result.error);
          } else {
            console.log("[Meta CAPI] Purchase sent for order", newOrder.id, "eventId=", metaTracking.event_id);
          }
        } catch (capiErr) {
          console.error("[Meta CAPI] Exception for order", newOrder.id, ":", String(capiErr).slice(0, 200));
        }
      })();
    } else if (pixelId && !accessToken) {
      console.log("[Meta CAPI] META_ACCESS_TOKEN not set — skipping CAPI for order", newOrder.id);
    }

    return NextResponse.json({ success: true, order_id: newOrder.id });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ success: false, error: "server error" }, { status: 500 });
  }
}
