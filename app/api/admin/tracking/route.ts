import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient().from("tracking_settings").select("*").limit(1).single();
    return NextResponse.json({ success: true, data });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data: existing } = await sb.from("tracking_settings").select("id").limit(1).single();
    if (existing) {
      await sb.from("tracking_settings").update({ ...body, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await sb.from("tracking_settings").insert(body);
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
