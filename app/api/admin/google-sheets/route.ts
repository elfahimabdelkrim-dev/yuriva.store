import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient().from("google_sheets_settings").select("*").limit(1).single();
    const hasKey = !!(process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL);
    return NextResponse.json({ success: true, data, hasKey });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data: existing } = await sb.from("google_sheets_settings").select("id").limit(1).single();
    if (existing) {
      await sb.from("google_sheets_settings").update({ ...body, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await sb.from("google_sheets_settings").insert(body);
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
// POST = test connection
export async function POST(req: NextRequest) {
  const { sheet_id } = await req.json();
  if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL)
    return NextResponse.json({ success: false, error: "GOOGLE_PRIVATE_KEY أو GOOGLE_CLIENT_EMAIL ما موجودينش فـ .env" });
  try {
    const { syncOrderToSheet } = await import("@/lib/google-sheets");
    // Test with a dummy minimal object
    const ok = await syncOrderToSheet({ id: "TEST", customer_first_name: "اختبار", customer_last_name: "", phone: "0600000000", city: "الدار البيضاء", address: "اختبار", total_amount: 0, status: "جديد", items: [], created_at: new Date().toISOString() } as never);
    return NextResponse.json({ success: ok, sheet_id });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) });
  }
}
