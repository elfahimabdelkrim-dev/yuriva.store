import type { Metadata } from "next";
import ProductForm from "@/components/admin/ProductForm";
import { staticProducts } from "@/data/products";
import { mapProduct } from "@/lib/products";
import type { Product } from "@/types";

export const metadata: Metadata = { title: "بدل المنتج | YURIVA Admin" };

function isValidUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  let product: Product | undefined;

  // Try Supabase first if id is a valid UUID and Supabase is connected
  if (isValidUuid(params.id) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_reviews(*), product_faqs(*)")
        .eq("id", params.id)
        .maybeSingle();
      if (!error && data) {
        product = mapProduct(data as Record<string, unknown>);
      }
    } catch (e) {
      console.error("[EditProductPage] Supabase load failed:", e);
    }
  }

  // Fall back to static products
  if (!product) {
    product = staticProducts.find((p) => p.id === params.id);
  }

  const title = product
    ? `بدل: ${product.title}`
    : isValidUuid(params.id)
    ? "منتج YURIVA"
    : "بدل المنتج";

  return (
    <div>
      <h1 className="text-2xl font-black text-brand-navy mb-6">{title}</h1>
      {!product && !isValidUuid(params.id) && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          هاد المنتج ما وجدناهش. ممكن تحذف أو UUID ما صالحش.
        </div>
      )}
      <ProductForm product={product} />
    </div>
  );
}
