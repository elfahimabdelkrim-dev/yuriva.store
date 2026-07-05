import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function validatePid(id: string): string | null {
  const clean = id.trim();
  if (!/^\d+$/.test(clean))             return "Pixel ID يجب أن يحتوي على أرقام فقط";
  if (clean.length < 10 || clean.length > 20) return "Pixel ID يجب بين 10 و 20 رقم";
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const body = await req.json() as {
      provider?: string;
      label?: string;
      pixel_id?: string;
      is_active?: boolean;
    };

    // Validate new pixel_id if provided
    if (body.pixel_id !== undefined) {
      const err = validatePid(String(body.pixel_id));
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body.provider  !== undefined) update.provider  = body.provider;
    if (body.label     !== undefined) update.label     = String(body.label).trim();
    if (body.pixel_id  !== undefined) update.pixel_id  = String(body.pixel_id).trim();
    if (body.is_active !== undefined) update.is_active = body.is_active;

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });

    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    // Duplicate pixel_id check (skip self)
    if (update.pixel_id) {
      const { data: dup } = await sb
        .from("tracking_pixels")
        .select("id")
        .eq("pixel_id", update.pixel_id as string)
        .neq("id", id)
        .maybeSingle();
      if (dup)
        return NextResponse.json({ error: "هاد Pixel موجود من قبل" }, { status: 400 });
    }

    const { data, error } = await sb
      .from("tracking_pixels")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ pixel: data });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { error } = await sb
      .from("tracking_pixels")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}
