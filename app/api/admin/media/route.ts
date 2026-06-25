import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data: files, error } = await sb.storage.from("product-images").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    const { data: { publicUrl: baseUrl } } = sb.storage.from("product-images").getPublicUrl("");
    const items = (files || []).filter(f => f.name !== ".emptyFolderPlaceholder").map(f => ({
      id: f.id, name: f.name,
      url: `${baseUrl.replace(/\/$/, "")}/${f.name}`,
      size: f.metadata?.size, created_at: f.created_at,
    }));
    return NextResponse.json({ success: true, data: items });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { fileName } = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { error } = await createAdminClient().storage.from("product-images").remove([fileName]);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: "خطأ" }, { status: 500 }); }
}
