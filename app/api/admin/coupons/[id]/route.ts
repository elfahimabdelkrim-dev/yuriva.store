import { NextRequest, NextResponse } from "next/server";
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { error } = await createAdminClient().from("coupons").update(body).eq("id", params.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { error } = await createAdminClient().from("coupons").delete().eq("id", params.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
