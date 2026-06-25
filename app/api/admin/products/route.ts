import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { staticProducts } = await import("@/data/products");
    return NextResponse.json({ products: staticProducts });
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Supabase مش configuré" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Extract extra_images before inserting (not a products column)
    const { extra_images, ...productData } = body as { extra_images?: string[]; [key: string]: unknown };

    // Server-side slug dedup: find a unique slug even if client already tried
    if (typeof productData.slug === "string" && productData.slug.length > 0) {
      let slug = productData.slug as string;
      let suffix = 1;
      while (true) {
        const { data: existing } = await supabase
          .from("products").select("id").eq("slug", slug).maybeSingle();
        if (!existing) { productData.slug = slug; break; }
        slug = `${productData.slug}-${suffix}`;
        suffix++;
        if (suffix > 20) { productData.slug = `${productData.slug}-${Date.now()}`; break; }
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // Save extra_images to product_images table
    if (Array.isArray(extra_images) && extra_images.length > 0 && data?.id) {
      const imageRows = extra_images
        .filter((url: string) => typeof url === "string" && url.trim().length > 0)
        .map((url: string, i: number) => ({
          product_id: data.id,
          url,
          alt: String(productData.title ?? ""),
          sort_order: i + 1,
          image_type: "gallery",
        }));
      if (imageRows.length > 0) {
        await supabase.from("product_images").insert(imageRows);
      }
    }

    revalidatePath("/products", "page");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, product: data });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}
