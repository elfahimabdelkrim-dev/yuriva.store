import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@/types";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: "Supabase non configuré" }, { status: 503 });
    }
    const { status, note, changed_by } = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    const { data: current } = await supabase.from("orders").select("status").eq("id", params.id).single();
    const old_status = current?.status as OrderStatus || "جديد";

    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", params.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    await supabase.from("order_status_history").insert({ order_id: params.id, old_status, new_status: status, note, changed_by: changed_by || "admin" });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}
