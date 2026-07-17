import { NextRequest, NextResponse } from "next/server";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/pixel-status
 * Body: { order_id: string }
 *
 * DB-backed idempotency + eligibility gate for the BROWSER Meta Pixel
 * Purchase event. The thank-you page calls this BEFORE firing
 * fbq('track','Purchase', ..., { eventID: purchase_<order_id> }).
 *
 * Uses the SHARED eligibility rules (lib/order-validation.ts):
 *   - order must exist and be Meta-Purchase eligible
 *     (valid operational COD order - not whatsapp lead / test / admin)
 *   - atomic claim of pixel_status='fired' - only the FIRST caller fires
 *
 * should_fire=false for: already fired, not eligible, or order not found.
 * This protects against localStorage bypasses (other device, incognito,
 * cleared storage, shared links) and fabricated order IDs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { order_id?: unknown };
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";

    if (!orderId || orderId.length > 64) {
      return NextResponse.json({ success: false, error: "invalid order_id" }, { status: 400 });
    }

    // No Supabase -> cannot verify; allow fire (localStorage still guards refresh)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, should_fire: true, mode: "no_db" });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const { isMetaPurchaseEligible } = await import("@/lib/order-validation");
    const supabase = createAdminClient();
    // pixel_status column may not be in generated types yet (added via migration)
    const sb = supabase as any; // eslint-disable-line

    // 1) Eligibility check using the shared rules
    const { data: found } = await sb
      .from("orders")
      .select("id, source, status, customer_first_name, customer_last_name, phone")
      .eq("id", orderId)
      .limit(1);

    const orderRow = (found?.[0] ?? null) as Order | null;
    if (!orderRow) {
      console.log(`[META_BROWSER_PURCHASE] rejected order_id=${orderId} reason=not_found`);
      return NextResponse.json({ success: true, should_fire: false, reason: "not_found" });
    }
    if (!isMetaPurchaseEligible(orderRow)) {
      console.log(`[META_BROWSER_PURCHASE] rejected order_id=${orderId} reason=not_eligible source=${orderRow.source ?? "?"}`);
      return NextResponse.json({ success: true, should_fire: false, reason: "not_eligible" });
    }

    // 2) Atomic claim: only the FIRST caller flips pixel_status to 'fired'
    const { data: claimRows, error: claimErr } = await sb
      .from("orders")
      .update({ pixel_status: "fired" })
      .eq("id", orderId)
      .or("pixel_status.is.null,pixel_status.neq.fired")
      .select("id");

    if (claimErr) {
      // pixel_status column missing (migration pending) - order exists and is
      // eligible, so allow fire; localStorage guards same-browser refresh.
      console.warn("[Pixel Status] claim unavailable (run DB migration):", String(claimErr.message).slice(0, 120));
      return NextResponse.json({ success: true, should_fire: true, mode: "migration_pending" });
    }

    const shouldFire = (claimRows?.length ?? 0) > 0;
    if (shouldFire) {
      console.log(`[META_BROWSER_PURCHASE] claimed order_id=${orderId} - browser will fire Purchase once`);
    } else {
      console.log(`[META_PURCHASE_ALREADY_SENT] browser claim rejected order_id=${orderId} (already fired)`);
    }

    return NextResponse.json({ success: true, should_fire: shouldFire });
  } catch (err) {
    console.error("[Pixel Status] Error:", String(err).slice(0, 200));
    // On unexpected error, allow fire - losing dedup once is better than losing the conversion
    return NextResponse.json({ success: true, should_fire: true, mode: "error_fallback" });
  }
}
