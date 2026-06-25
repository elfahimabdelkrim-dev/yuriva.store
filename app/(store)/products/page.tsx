import type { Metadata } from "next";
import { getAllProducts, searchProducts } from "@/lib/products";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Link from "next/link";
import { siteConfig } from "@/config/site";
export const dynamic = "force-dynamic";
export const revalidate = 0;


interface Props {
  searchParams: { q?: string; sort?: string };
}

export const metadata: Metadata = {
  title: "جميع المنتجات | YURIVA",
  description: "اكتشف جميع منتجات YURIVA — سراول Para، Shorts، Cargo وباكات. توصيل مجاني والدفع عند الاستلام.",
  alternates: { canonical: `${siteConfig.url}/products` },
};

export default async function ProductsPage({ searchParams }: Props) {
  const { q, sort } = searchParams;

  let products = q
    ? await searchProducts(q)
    : await getAllProducts();

  if (sort === "price-asc")     products = [...products].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);
  else if (sort === "best-sellers") products = [...products].sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));

  const SORT_OPTIONS = [
    { value: "",              label: "الأحدث" },
    { value: "price-asc",    label: "الأرخص" },
    { value: "price-desc",   label: "الأغلى" },
    { value: "best-sellers", label: "الأكثر مبيعاً" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: "جميع المنتجات" }]} className="mb-4" />

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">
            {q ? `نتائج البحث: "${q}"` : "جميع المنتجات"}
          </h1>
          <p className="text-brand-gray text-sm mt-0.5">{products.length} منتج</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <form method="get" action="/products" className="flex">
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="ابحث عن منتج..."
              className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-gold w-44 sm:w-56"
              dir="auto"
            />
            <button type="submit" className="bg-brand-navy text-white px-3 py-2 text-sm font-bold hover:bg-brand-gold transition-colors">
              بحث
            </button>
          </form>
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/products?${q ? `q=${encodeURIComponent(q)}&` : ""}sort=${opt.value}`}
                className={`text-xs px-2.5 py-2 border font-bold transition-colors ${
                  (sort || "") === opt.value
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 bg-brand-light">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-xl font-black text-brand-navy mb-2">ما لقيناش نتائج</p>
          <p className="text-brand-gray mb-4">عاود المحاولة بكلمة أخرى</p>
          <Link href="/products" className="inline-block bg-brand-navy text-white font-bold px-6 py-3">
            شوف كل المنتجات
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
