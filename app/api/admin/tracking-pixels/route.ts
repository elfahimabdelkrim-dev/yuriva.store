import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_PIXELS = 100;

/** Pixel ID must be digits only, 10-20 chars */
function validatePid(id: string): string | null {
  const clean = id.trim();
  if (!/^\d+$/.test(clean))             return "Pixel ID يجب أن يحتوي على أرقام فقط";
  if (clean.length < 10 || clean.length > 20) return "Pixel ID يجب بين 10 و 20 رقم";
  return null;
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("tracking_pixels")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ pixels: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  try {
    const body = await req.json() as {
      provider?: string;
      label?: string;
      pixel_id?: string;
      is_active?: boolean;
      bulk?: string[];
    };

    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    // Current count
    const { count: rawCount, error: countErr } = await sb
      .from("tracking_pixels")
      .select("*", { count: "exact", head: true });
    if (countErr) throw countErr;
    const currentCount = rawCount ?? 0;

    // ── Bulk insert ──────────────────────────────────────────────────────────
    if (Array.isArray(body.bulk)) {
      const toAdd = body.bulk.map((s) => s.trim()).filter(Boolean);
      if (toAdd.length === 0)
        return NextResponse.json({ error: "لا يوجد Pixels للإضافة" }, { status: 400 });

      const remaining = MAX_PIXELS - currentCount;
      if (remaining <= 0)
        return NextResponse.json(
          { error: "وصلتي للحد الأقصى ديال 100 Pixel", remaining: 0 },
          { status: 400 }
        );

      // Validate IDs
      const validIds: string[]  = [];
      const invalidLines: string[] = [];
      const seen = new Set<string>();

      for (const id of toAdd) {
        if (seen.has(id)) { invalidLines.push(`${id}: مكرر`); continue; }
        seen.add(id);
        const err = validatePid(id);
        if (err) { invalidLines.push(`${id}: ${err}`); continue; }
        validIds.push(id);
      }

      // Cap at remaining slots
      const sliced = validIds.slice(0, remaining);
      if (sliced.length < validIds.length)
        invalidLines.push(`${validIds.length - sliced.length} تجاوزت الحد`);

      if (sliced.length === 0)
        return NextResponse.json(
          { error: "لا يوجد Pixels صالحة للإضافة", skipped_invalid: invalidLines },
          { status: 400 }
        );

      // Dedupe against DB
      const { data: existing } = await sb
        .from("tracking_pixels")
        .select("pixel_id")
        .in("pixel_id", sliced);
      const dbExisting = new Set((existing ?? []).map((r: { pixel_id: string }) => r.pixel_id));
      const dupIds  = sliced.filter((id) => dbExisting.has(id));
      const newIds  = sliced.filter((id) => !dbExisting.has(id));

      if (newIds.length === 0)
        return NextResponse.json(
          { error: "هاد Pixel موجود من قبل", duplicates: dupIds },
          { status: 400 }
        );

      const rows = newIds.map((id, i) => ({
        provider: "meta",
        label: `Pixel ${currentCount + i + 1}`,
        pixel_id: id,
        is_active: true,
      }));

      const { data: inserted, error: insErr } = await sb
        .from("tracking_pixels")
        .insert(rows)
        .select();
      if (insErr) throw insErr;

      return NextResponse.json({
        pixels: inserted,
        skipped_duplicates: dupIds,
        skipped_invalid: invalidLines,
      });
    }

    // ── Single insert ────────────────────────────────────────────────────────
    const { provider = "meta", label, pixel_id, is_active = true } = body;

    if (!label?.trim())    return NextResponse.json({ error: "التسمية مطلوبة" }, { status: 400 });
    if (!pixel_id?.trim()) return NextResponse.json({ error: "Pixel ID مطلوب" }, { status: 400 });

    const pidErr = validatePid(pixel_id);
    if (pidErr) return NextResponse.json({ error: pidErr }, { status: 400 });

    if (currentCount >= MAX_PIXELS)
      return NextResponse.json({ error: "وصلتي للحد الأقصى ديال 100 Pixel" }, { status: 400 });

    // Duplicate check
    const { data: dup } = await sb
      .from("tracking_pixels")
      .select("id")
      .eq("pixel_id", pixel_id.trim())
      .maybeSingle();
    if (dup)
      return NextResponse.json({ error: "هاد Pixel موجود من قبل" }, { status: 400 });

    const { data: row, error: insErr } = await sb
      .from("tracking_pixels")
      .insert({ provider, label: label.trim(), pixel_id: pixel_id.trim(), is_active })
      .select()
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ pixel: row });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}
