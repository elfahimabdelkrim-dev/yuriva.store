import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public endpoint — returns only the safe fields needed by the frontend.
 * No tokens, no secrets. Used as a fallback if server-side fetch fails.
 */
export async function GET() {
  // Env fallback (used when DB is not configured)
  const envFallback = [
    process.env.NEXT_PUBLIC_META_PIXEL_ID
      ? { provider: "meta", label: "Main Pixel",   pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID,  is_active: true }
      : null,
    process.env.NEXT_PUBLIC_META_PIXEL_ID_2
      ? { provider: "meta", label: "Second Pixel", pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID_2, is_active: true }
      : null,
  ].filter(Boolean);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: true, data: envFallback });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("tracking_pixels")
      .select("provider, label, pixel_id, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // If DB is empty, fall back to env vars
    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, data: envFallback });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[tracking-pixels GET]", e);
    return NextResponse.json({ success: true, data: envFallback });
  }
}
