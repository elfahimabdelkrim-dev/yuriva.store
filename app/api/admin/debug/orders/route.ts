import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/debug/orders
 * Returns last 20 orders with attribution + tracking fields for debugging.
 */
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Cast to any — new attribution columns may not be in generated Supabase types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ordersRaw, error } = await (supabase as any)
      .from("orders")
      .select(
        "id, source, total_amount, google_sheet_synced, purchase_event_id, " +
        "capi_status, pixel_status, fbclid, fbp, fbc, " +
        "utm_source, utm_campaign, landing_page, referrer, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: (error as { message: string }).message },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = (ordersRaw ?? []) as any[];

    const rows = orders.map((o) => ({
      order_id:            o.id                  ?? null,
      source:              o.source              ?? "direct",
      total:               o.total_amount        ?? 0,
      google_sheet_synced: o.google_sheet_synced ?? false,
      purchase_event_id:   o.purchase_event_id   ?? null,
      capi_status:         o.capi_status         ?? null,
      pixel_status:        o.pixel_status        ?? null,
      has_fbclid:          !!(o.fbclid),
      has_fbp:             !!(o.fbp),
      has_fbc:             !!(o.fbc),
      utm_source:          o.utm_source          ?? null,
      utm_campaign:        o.utm_campaign        ?? null,
      landing_page:        o.landing_page        ?? null,
      referrer:            o.referrer            ?? null,
      created_at:          o.created_at          ?? null,
    }));

    return NextResponse.json({ orders: rows, count: rows.length });
  } catch (err) {
    console.error("[Debug Orders] Error:", String(err).slice(0, 300));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
