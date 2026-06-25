import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data, error } = await sb.from("store_settings").select("*").limit(1).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[settings GET]", e);
    return NextResponse.json({ success: false, error: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062e\u0627\u062f\u0645" }, { status: 500 });
  }
}

/** Exact columns that exist in store_settings table. Anything else is silently dropped. */
const ALLOWED_FIELDS = [
  "store_name", "logo_url", "whatsapp_number",
  "facebook_url", "instagram_url", "tiktok_url",
  "announcement_text", "announcement_active",
  "default_seo_title", "default_seo_description", "default_og_image",
  "delivery_text", "return_policy_text", "footer_text",
  "header_bg_color", "header_bg_image", "header_text_color", "header_accent_color",
  "footer_bg_color", "footer_bg_image", "footer_text_color", "footer_accent_color",
  // Announcement bar styling (requires SQL migration to add these columns)
  "announcement_bg_color", "announcement_text_color", "announcement_link_text", "announcement_link_url",
];

export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json() as Record<string, unknown>;

    // Only send columns that actually exist in store_settings
    // Unknown fields (e.g. "email") cause Postgres "column does not exist" errors
    const updateBody: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updateBody[key] = body[key];
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    const { data: existing } = await sb
      .from("store_settings")
      .select("id")
      .limit(1)
      .single();

    if (existing?.id) {
      const { error } = await sb
        .from("store_settings")
        .update(updateBody)
        .eq("id", existing.id);
      if (error) {
        console.error("[settings PUT] update error:", JSON.stringify(error));
        throw error;
      }
    } else {
      const { error } = await sb.from("store_settings").insert(updateBody);
      if (error) {
        console.error("[settings PUT] insert error:", JSON.stringify(error));
        throw error;
      }
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[settings PUT] caught:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062e\u0627\u062f\u0645: " + msg },
      { status: 500 }
    );
  }
}
