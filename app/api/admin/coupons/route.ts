import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient().from("coupons").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ success: true, data: data || [] });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data, error } = await createAdminClient().from("coupons").insert({ ...body, code: body.code.toUpperCase() }).select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
