import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function isValidUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });
  if (!isValidUuid(params.id))
    return NextResponse.json({ success: false, error: "معرّف المنتج غير صالح" }, { status: 400 });
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "Supabase مش configuré" }, { status: 503 });
  if (!isValidUuid(params.id))
    return NextResponse.json(
      { success: false, error: "معرّف المنتج غير صالح — خاصو يكون UUID صحيح" },
      { status: 400 }
    );

  try {
    const body = await req.json();
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    const { extra_images, ...productData } = body as {
      extra_images?: string[];
      [key: string]: unknown;
    };

    // Slug conflict guard
    if (typeof productData.slug === "string") {
      const { data: slugConflict } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productData.slug)
        .neq("id", params.id)
        .maybeSingle();
      if (slugConflict)
        return NextResponse.json(
          { success: false, error: "هاد الرابط مستعمل من قبل، بدل Slug ديال المنتج" },
          { status: 400 }
        );
    }

    const { error } = await supabase
      .from("products")
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) {
      if (error.message.includes("products_slug_key") || error.message.includes("unique constraint"))
        return NextResponse.json(
          { success: false, error: "هاد الرابط مستعمل من قبل، بدل Slug ديال المنتج" },
          { status: 400 }
        );
      console.error("[PUT /api/admin/products/[id]]", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Replace gallery images: delete all existing, re-insert the full list
    let imageError: string | undefined;
    if (Array.isArray(extra_images)) {
      console.log("[PUT] replacing product_images for", params.id, "— new count:", extra_images.length);

      const { error: delErr } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", params.id);
      if (delErr)
        console.error("[PUT] delete product_images error:", delErr.message);

      const imageRows = extra_images
        .filter((url: string) => typeof url === "string" && url.trim().length > 0)
        .slice(0, 7)
        .map((url: string, i: number) => ({
          product_id: params.id,
          image_url: url,
          alt_text: String(productData.title ?? ""),
          sort_order: i + 1,
          image_type: "gallery",
        }));
      if (imageRows.length > 0) {
        const { error: imgErr } = await supabase.from("product_images").insert(imageRows);
        if (imgErr) {
          console.error("[PUT] product_images insert error:", imgErr.message);
          imageError = imgErr.message;
        } else {
          console.log("[PUT] inserted", imageRows.length, "product_images rows");
        }
      }
    }

    const slug = typeof productData.slug === "string" ? productData.slug : "";
    revalidatePath("/products", "page");
    revalidatePath("/", "layout");
    if (slug) revalidatePath(`/products/${slug}`, "page");
    revalidatePath(`/admin/products/${params.id}`, "page");
    return NextResponse.json({ success: true, imageError });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "Supabase مش configuré" }, { status: 503 });
  if (!isValidUuid(params.id))
    return NextResponse.json({ success: false, error: "معرّف المنتج غير صالح" }, { status: 400 });
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
