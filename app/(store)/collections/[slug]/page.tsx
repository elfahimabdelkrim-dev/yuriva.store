import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getActiveCategories, staticCategories } from "@/data/categories";
import { getCategoryForCollection } from "@/lib/products";
import { getProductsByCategory, getBestSellers, getNewArrivals, getOffers, getAllProducts } from "@/lib/products";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { JsonLdBreadcrumb } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import type { Product } from "@/types";
export const dynamic = "force-dynamic";
export const revalidate = 0;


interface Props {
  params: { slug: string };
  searchParams: { sort?: string };
}

export async function generateStaticParams() {
  return staticCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = staticCategories.find((c) => c.slug === params.slug) || null;
  const title = category
    ? category.seo_title || `${category.name} | YURIVA`
    : `${params.slug} | YURIVA`;
  return {
    title,
    description: category?.seo_description || category?.description || "",
    alternates: { canonical: `${siteConfig.url}/collections/${params.slug}` },
  };
}

async function getCollectionProducts(slug: string): Promise<Product[]> {
  switch (slug) {
    case "best-sellers": return getBestSellers();
    case "new-arrivals":  return getNewArrivals();
    case "offers":        return getOffers();
    case "packs": {
      const all = await getAllProducts();
      return all.filter(
        (p) =>
          p.is_pack ||
          p.category_id === "packs" ||
          /pack|باك/i.test(p.title + " " + p.slug)
      );
    }
    case "pantalons-para": {
      const byCat = await getProductsByCategory("pantalons-para");
      if (byCat.length > 0) return byCat;
      const all = await getAllProducts();
      return all.filter((p) =>
        /pantalon|para|سراول|srawal/i.test(p.title + " " + p.slug + " " + p.category_id)
      );
    }
    case "shorts-para": {
      const byCat = await getProductsByCategory("shorts-para");
      if (byCat.length > 0) return byCat;
      const all = await getAllProducts();
      return all.filter((p) =>
        /short|شورت/i.test(p.title + " " + p.slug + " " + p.category_id)
      );
    }
    case "cargo": {
      const byCat = await getProductsByCategory("cargo");
      if (byCat.length > 0) return byCat;
      const all = await getAllProducts();
      return all.filter((p) =>
        /cargo/i.test(p.title + " " + p.slug + " " + p.category_id)
      );
    }
    default: return getProductsByCategory(slug);
  }
}

// Slugs that are always valid (static data + virtual collections)
const KNOWN_SLUGS = new Set([
  "pantalons-para", "shorts-para", "cargo", "packs",
  "offers", "best-sellers", "new-arrivals",
]);

export default async function CollectionPage({ params, searchParams }: Props) {
  const category = await getCategoryForCollection(params.slug);

  // Only 404 for truly unknown slugs — all KNOWN_SLUGS are valid even without Supabase rows
  if (!category && !KNOWN_SLUGS.has(params.slug)) notFound();

  let products = await getCollectionProducts(params.slug);
  const { sort } = searchParams;

  if (sort === "price-asc")    products = [...products].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);
  else if (sort === "best-sellers") products = [...products].sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));

  const displayName = category?.name ?? params.slug;
  const displayDesc = category?.description ?? "";
  const bannerUrl   = category?.banner_url;
  const categories  = getActiveCategories().slice(0, 7);

  const SORT_OPTIONS = [
    { value: "",             label: "الأحدث" },
    { value: "price-asc",   label: "الأرخص" },
    { value: "price-desc",  label: "الأغلى" },
    { value: "best-sellers", label: "الأكثر مبيعاً" },
  ];

  return (
    <>
      <JsonLdBreadcrumb
        items={[
          { name: "الرئيسية",   url: siteConfig.url },
          { name: displayName, url: `${siteConfig.url}/collections/${params.slug}` },
        ]}
      />

      {/* Banner */}
      <div className="relative h-40 sm:h-56 bg-brand-navy overflow-hidden">
        {bannerUrl && !bannerUrl.includes("placeholder") && (
          <Image src={bannerUrl} alt={displayName} fill className="object-cover opacity-40" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-2">YURIVA</p>
          <h1 className="text-2xl sm:text-4xl font-black text-white">{displayName}</h1>
          {displayDesc && (
            <p className="text-white/60 text-sm mt-2 max-w-lg">{displayDesc}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: displayName }]} className="mb-5" />

        {/* Category horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/collections/${cat.slug}`}
              className={`flex-none px-4 py-1.5 text-sm font-bold transition-all whitespace-nowrap rounded-full border ${
                cat.slug === params.slug
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "border-gray-300 text-brand-navy hover:border-brand-navy"
              }`}
            >
              {cat.name === "Packs" ? "باكات" : cat.name}
            </Link>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <p className="text-brand-gray text-sm font-medium">{products.length} منتج</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-brand-gray font-medium">ترتيب:</span>
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/collections/${params.slug}?sort=${opt.value}`}
                className={`text-xs px-3 py-1.5 border font-bold transition-colors ${
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

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-brand-light">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-xl font-black text-brand-navy mb-2">ما كاين حتى منتج فهاد التصنيف دابا</p>
            <p className="text-brand-gray mb-6">شوف التصنيفات الأخرى أو ارجع للرئيسية</p>
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
    </>
  );
}
