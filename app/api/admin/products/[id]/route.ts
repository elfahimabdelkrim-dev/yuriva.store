import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/** Returns true only if value matches the standard UUID v4 format */
function isValidUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  }
  if (!isValidUuid(params.id)) {
    return NextResponse.json({ success: false, error: "معرّف المنتج غير صالح" }, { status: 400 });
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*), product_reviews(*), product_faqs(*)")
      .eq("id", params.id)
      .maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ success: false, error: "المنتج غير موجود" }, { status: 404 });
    return NextResponse.json({ success: true, product: data });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Supabase مش configuré" }, { status: 503 });
  }

  // Validate UUID before any DB operation — prevents "invalid input syntax for type uuid"
  if (!isValidUuid(params.id)) {
    return NextResponse.json(
      { success: false, error: "معرّف المنتج غير صالح — خاصو يكون UUID صحيح" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // Extract extra_images — not a products column
    const { extra_images, ...productData } = body as {
      extra_images?: string[];
      [key: string]: unknown;
    };

    // Slug conflict guard: if slug is being changed, verify it's not taken by another product
    if (typeof productData.slug === "string") {
      const { data: slugConflict } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productData.slug)
        .neq("id", params.id)
        .maybeSingle();
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: "هاد الرابط مستعمل من قبل، بدل Slug ديال المنتج" },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("products")
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) {
      // Surface duplicate slug error in Darija instead of raw Postgres message
      if (error.message.includes("products_slug_key") || error.message.includes("unique constraint")) {
        return NextResponse.json(
          { success: false, error: "هاد الرابط مستعمل من قبل، بدل Slug ديال المنتج" },
          { status: 400 }
        );
      }
      console.error("[PUT /api/admin/products/[id]] update error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Append any new extra_images — only runs if id is valid UUID (checked above)
    if (Array.isArray(extra_images) && extra_images.length > 0) {
      const imageRows = extra_images
        .filter((url: string) => typeof url === "string" && url.trim().length > 0)
        .map((url: string, i: number) => ({
          product_id: params.id, // safe: validated UUID above
          url,
          alt: String(productData.title ?? ""),
          sort_order: i + 100,
          image_type: "gallery",
        }));
      if (imageRows.length > 0) {
        const { error: imgErr } = await supabase
          .from("product_images")
          .insert(imageRows);
        if (imgErr) {
          console.error("[PUT /api/admin/products/[id]] product_images error:", imgErr.message);
          // Don't fail the whole save — product data was updated successfully
        }
      }
    }

    revalidatePath("/products", "page");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Supabase مش configuré" }, { status: 503 });
  }
  if (!isValidUuid(params.id)) {
    return NextResponse.json({ success: false, error: "معرّف المنتج غير صالح" }, { status: 400 });
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", params.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}
