import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient().from("delivery_zones").select("*").order("city");
    return NextResponse.json({ success: true, data: data || [] });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const zones = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    for (const z of zones) {
      const { id, ...rest } = z;
      if (id) { await sb.from("delivery_zones").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id); }
      else { await sb.from("delivery_zones").upsert(rest, { onConflict: "city" }); }
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
