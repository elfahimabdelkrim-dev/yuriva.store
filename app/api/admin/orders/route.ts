import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ orders: [] });
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders").select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ orders: [] });
    return NextResponse.json({ orders: data });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
