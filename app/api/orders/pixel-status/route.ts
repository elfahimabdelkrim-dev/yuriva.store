import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/pixel-status
 * Body: { order_id: string }
 *
 * DB-backed idempotency for the BROWSER Meta Pixel Purchase event.
 * The thank-you page calls this BEFORE firing fbq('track','Purchase').
 *
 * Atomically claims pixel_status='fired' for the order:
 *   - should_fire=true  → this is the first claim, browser must fire Purchase
 *   - should_fire=false → already fired before (refresh / another device /
 *                         incognito / direct URL open) OR order doesn't exist
 *
 * This protects against every localStorage bypass: cleared storage, new
 * device, incognito, shared thank-you links, and fabricated order IDs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { order_id?: unknown };
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";

    if (!orderId || orderId.length > 64) {
      return NextResponse.json({ success: false, error: "invalid order_id" }, { status: 400 });
    }

    // No Supabase → cannot verify; allow fire (localStorage still guards refresh)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, should_fire: true, mode: "no_db" });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    // pixel_status column may not be in generated types yet (added via migration)
    const sb = supabase as any; // eslint-disable-line

    // Atomic claim: only the FIRST caller flips pixel_status to 'fired'
    const { data: claimRows, error: claimErr } = await sb
      .from("orders")
      .update({ pixel_status: "fired" })
      .eq("id", orderId)
      .or("pixel_status.is.null,pixel_status.neq.fired")
      .select("id");

    if (claimErr) {
      // pixel_status column missing (migration pending) — fall back to a pure
      // existence check so the pixel still works; localStorage guards refresh.
      console.warn("[Pixel Status] claim unavailable (run DB migration):", String(claimErr.message).slice(0, 120));
      const { data: found } = await sb
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .limit(1);
      const exists = (found?.length ?? 0) > 0;
      console.log(`[META_BROWSER_PURCHASE] fallback-check order_id=${orderId} exists=${exists}`);
      return NextResponse.json({ success: true, should_fire: exists, mode: "migration_pending" });
    }

    const shouldFire = (claimRows?.length ?? 0) > 0;
    if (shouldFire) {
      console.log(`[META_BROWSER_PURCHASE] claimed order_id=${orderId} — browser will fire Purchase once`);
    } else {
      console.log(`[META_PURCHASE_ALREADY_SENT] browser claim rejected order_id=${orderId} (already fired or order not found)`);
    }

    return NextResponse.json({ success: true, should_fire: shouldFire });
  } catch (err) {
    console.error("[Pixel Status] Error:", String(err).slice(0, 200));
    // On unexpected error, allow fire — losing dedup once is better than losing the conversion
    return NextResponse.json({ success: true, should_fire: true, mode: "error_fallback" });
  }
}
