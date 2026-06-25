import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient().from("hero_slides").select("*").order("sort_order");
    return NextResponse.json({ success: true, data: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data, error } = await createAdminClient().from("hero_slides").insert(body).select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
