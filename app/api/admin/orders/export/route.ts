import { NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient()
      .from("orders").select("*").order("created_at", { ascending: false });
    const rows = (data || []).map((o: Record<string, unknown>) =>
      [o.id, o.created_at, o.customer_first_name, o.customer_last_name, o.phone, o.city, o.address, o.total_amount, o.status, o.notes || ""].join(",")
    );
    const csv = ["ID,التاريخ,الاسم,النسب,الهاتف,المدينة,العنوان,المجموع,الحالة,ملاحظات", ...rows].join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=orders.csv" }
    });
  } catch { return NextResponse.json({ error: "خطأ" }, { status: 500 }); }
}
