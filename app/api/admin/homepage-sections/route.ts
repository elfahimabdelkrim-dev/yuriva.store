import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Columns allowed in PUT payload for homepage_sections.
 * extra_data requires: ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
 */
const ALLOWED = [
  "section_key", "title", "subtitle", "label", "image_url", "bg_color",
  "button_text", "button_link", "is_active", "sort_order", "extra_data",
];

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient()
      .from("homepage_sections")
      .select("*")
      .order("sort_order");
    return NextResponse.json({ success: true, data: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[homepage-sections GET]", e);
    return NextResponse.json({ success: false, error: "\u062e\u0637\u0623" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  try {
    const body = await req.json() as Record<string, unknown>[];
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    const errors: string[] = [];
    for (const section of body) {
      const { id, created_at: _ca, updated_at: _ua, ...raw } = section as Record<string, unknown>;

      // Only send columns that actually exist in the table
      const safe: Record<string, unknown> = {};
      for (const key of ALLOWED) {
        if (key in raw) safe[key] = raw[key];
      }

      // Normalize: empty string → null for nullable URL/color columns
      // This ensures deleted images are stored as NULL (not empty string) in Supabase
      if (safe.image_url === "") safe.image_url = null;
      if (safe.bg_color === "") safe.bg_color = null;

      if (id) {
        // Known row — update by id (always correct, never duplicates)
        const { error } = await sb
          .from("homepage_sections")
          .update(safe)
          .eq("id", String(id));
        if (error) {
          console.error("[homepage-sections PUT] update error:", JSON.stringify(error));
          errors.push(error.message);
        }
      } else if (safe.section_key) {
        // No id yet — check if a row already exists by section_key before inserting
        // (avoids duplicate rows when there is no UNIQUE constraint on section_key)
        const { data: existing } = await sb
          .from("homepage_sections")
          .select("id")
          .eq("section_key", String(safe.section_key))
          .maybeSingle();

        if (existing?.id) {
          // Row exists — update it
          const { error } = await sb
            .from("homepage_sections")
            .update(safe)
            .eq("id", existing.id);
          if (error) {
            console.error("[homepage-sections PUT] update-by-key error:", JSON.stringify(error));
            errors.push(error.message);
          }
        } else {
          // Row does not exist — insert fresh
          const { error } = await sb.from("homepage_sections").insert(safe);
          if (error) {
            console.error("[homepage-sections PUT] insert error:", JSON.stringify(error));
            errors.push(error.message);
          }
        }
      }
    }
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0] }, { status: 500 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[homepage-sections PUT]", e);
    return NextResponse.json({ success: false, error: "\u062e\u0637\u0623" }, { status: 500 });
  }
}
