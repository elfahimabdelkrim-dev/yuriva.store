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
      .select("id, title, slug, main_image, product_images(id, image_url, alt_text, sort_order, image_type)");

    if (id)  productQuery = productQuery.eq("id", id);
    else     productQuery = productQuery.eq("slug", slug!);

    const { data, error } = await productQuery.maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    type RawImage = { id?: string; image_url?: string; alt_text?: string; sort_order?: number; image_type?: string };
    const rawImages: RawImage[] = Array.isArray(data.product_images) ? (data.product_images as RawImage[]) : [];
    const sorted = [...rawImages].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    return NextResponse.json({
      product_id:       data.id,
      title:            data.title,
      slug:             data.slug,
      mainImage:        data.main_image,
      extraImagesCount: rawImages.length,
      finalGalleryCount: rawImages.length + (data.main_image ? 1 : 0),
      extraImages: sorted.map((img) => ({
        image_url:  img.image_url,
        alt_text:   img.alt_text,
        sort_order: img.sort_order,
        image_type: img.image_type,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
