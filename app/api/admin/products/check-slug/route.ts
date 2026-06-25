import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/products/check-slug?slug=x&exclude_id=uuid
 * Returns { available: boolean }
 * Used by ProductForm to validate slug uniqueness before saving.
 * exclude_id: current product id (edit mode) — allows the same slug for itself.
 */
export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ available: true }); // Can't check — allow and let DB decide
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  const excludeId = searchParams.get("exclude_id")?.trim();

  if (!slug) return NextResponse.json({ available: false });

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    let query = sb.from("products").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);

    const { data } = await query.maybeSingle();
    return NextResponse.json(
      { available: !data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ available: true }); // Fail open — let server-side handle it
  }
}
