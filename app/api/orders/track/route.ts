import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ orders: [] });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ orders: [] });
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("phone", phone)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ orders: [] });
    return NextResponse.json({ orders: data || [] });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
