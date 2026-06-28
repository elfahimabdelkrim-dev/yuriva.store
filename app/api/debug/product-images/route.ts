import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const slug = req.nextUrl.searchParams.get("slug");
  const id   = req.nextUrl.searchParams.get("id");

  if (!slug && !id)
    return NextResponse.json({ error: "Pass ?slug=... or ?id=..." }, { status: 400 });

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    let productQuery = supabase
      .from("products")
      .select("id, title, slug, main_image, product_images(id, url, sort_order, image_type)");

    if (id)   productQuery = productQuery.eq("id", id);
    else      productQuery = productQuery.eq("slug", slug!);

    const { data, error } = await productQuery.maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const rawImages = Array.isArray(data.product_images) ? data.product_images : [];
    const sorted = [...rawImages].sort(
      (a: { sort_order?: number }, b: { sort_order?: number }) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    return NextResponse.json({
      product_id:    data.id,
      title:         data.title,
      slug:          data.slug,
      main_image:    data.main_image,
      gallery_count: rawImages.length,
      total_images:  rawImages.length + (data.main_image ? 1 : 0),
      gallery_images: sorted.map((img: { url?: string; sort_order?: number; image_type?: string }) => ({
        url:        img.url,
        sort_order: img.sort_order,
        image_type: img.image_type,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
