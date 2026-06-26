import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductsByCategory, getAllProducts } from "@/lib/products";
import { staticProducts } from "@/data/products";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductAccordion from "@/components/product/ProductAccordion";
import ProductCard from "@/components/product/ProductCard";
import StarRating from "@/components/ui/StarRating";
import ProductViewContent from "@/components/product/ProductViewContent";
import { JsonLdProduct, JsonLdBreadcrumb } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
export const dynamic = "force-dynamic";
export const revalidate = 0;


interface Props { params: { slug: string }; }

export async function generateStaticParams() {
  return staticProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "المنتج غير موجود | YURIVA" };
  return {
    title: product.seo_title || `${product.title} | YURIVA`,
    description: product.seo_description || product.description,
    keywords: product.seo_keywords,
    openGraph: {
      title: product.seo_title || product.title,
      description: product.seo_description || product.description,
      images: [{ url: product.og_image || product.main_image, alt: product.title }],
      url: `${siteConfig.url}/products/${product.slug}`,
      type: "website",
    },
    alternates: { canonical: `${siteConfig.url}/products/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  // Related: same category, exclude self. Fallback to latest.
  let related: Awaited<ReturnType<typeof getAllProducts>> = [];
  try {
    if (product.category_id) {
      related = (await getProductsByCategory(product.category_id))
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
    if (related.length === 0) {
      const all = await getAllProducts();
      related = all.filter((p) => p.id !== product.id).slice(0, 4);
    }
  } catch { /* no related products if fetch fails */ }

  // Build gallery: use product.images (already includes main_image from mapProduct)
  // Fall back to main_image or placeholder if images array is empty.
  const safeImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter((img) => img && typeof img.url === "string" && img.url.trim().length > 0)
    : [];
  const allImages = safeImages.length > 0
    ? safeImages
    : [{ url: product.main_image || "/images/placeholder-product.svg", alt: product.title }];

  const accordionItems = [
    {
      title: "وصف المنتج",
      content: <div className="whitespace-pre-line text-sm text-brand-gray leading-relaxed">{product.description}</div>,
    },
    ...(product.details
      ? [{
          title: "التفاصيل",
          content: <div className="whitespace-pre-line text-sm text-brand-gray leading-relaxed">{product.details}</div>,
        }]
      : []),
    {
      title: "دليل القياسات",
      content: (
        <div className="text-sm text-brand-gray space-y-1.5">
          <p className="font-medium text-brand-navy mb-2">القياسات التقريبية حسب الوزن:</p>
          {[["M","55-65kg"],["L","65-75kg"],["XL","75-85kg"],["XXL","85-95kg"],["3XL","95-110kg"]].map(([s, w]) => (
            <div key={s} className="flex justify-between border-b border-gray-50 pb-1">
              <span className="font-bold text-brand-navy">{s}</span>
              <span>{w}</span>
            </div>
          ))}
          <p className="text-brand-gold font-medium mt-2">إلا كنتي محتار بين جوج قياسات، ختار القياس الأكبر.</p>
        </div>
      ),
    },
    {
      title: "التوصيل والإرجاع",
      content: (
        <div className="text-sm text-brand-gray space-y-2">
          <p>🚚 <strong>التوصيل مجاني</strong> لجميع مدن المغرب</p>
          <p>⏱️ مدة التوصيل: 24-72 ساعة حسب المدينة</p>
          <p>💵 <strong>الدفع عند الاستلام</strong> — ما كاين حتى دفع مسبق</p>
          <p>🔄 التبديل ممكن خلال 7 أيام إلى كان مشكل فالقياس أو المنتج</p>
        </div>
      ),
    },
    ...(Array.isArray(product.reviews) && product.reviews.filter((r) => r.is_active).length > 0
      ? [{
          title: `آراء الزبناء (${product.reviews.filter((r) => r.is_active).length})`,
          content: (
            <div className="space-y-4">
              {product.reviews.filter((r) => r.is_active).map((r, i) => (
                <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={r.rating} />
                    <span className="font-bold text-xs text-brand-navy">{r.customer_name}</span>
                  </div>
                  <p className="text-sm text-brand-gray">{r.review_text}</p>
                </div>
              ))}
            </div>
          ),
        }]
      : []),
    ...(Array.isArray(product.faqs) && product.faqs.length > 0
      ? [{
          title: "أسئلة شائعة عن المنتج",
          content: (
            <div className="space-y-3">
              {product.faqs.map((faq, i) => (
                <div key={i}>
                  <p className="font-bold text-brand-navy text-sm mb-1">{faq.question}</p>
                  <p className="text-sm text-brand-gray">{faq.answer}</p>
                </div>
              ))}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <>
      {/* Client-side ViewContent fires once on mount for Meta Pixel deduplication */}
      <ProductViewContent
        productId={product.id}
        productTitle={product.title}
        productPrice={product.price}
      />
      <JsonLdProduct product={product} />
      <JsonLdBreadcrumb
        items={[
          { name: "الرئيسية",          url: siteConfig.url },
          { name: "المنتجات",          url: `${siteConfig.url}/products` },
          { name: product.title,       url: `${siteConfig.url}/products/${product.slug}` },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <Breadcrumb
          items={[
            { label: "المنتجات", href: "/products" },
            { label: product.title },
          ]}
          className="mb-5"
        />

        {/* Main product section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-10">
          {/* Gallery */}
          <ProductGallery images={allImages} title={product.title} />

          {/* Info — sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductInfo product={product} />
          </div>
        </div>

        {/* Accordion sections */}
        <div className="border-t border-gray-100 pt-8 mb-12">
          <ProductAccordion items={accordionItems} />
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <div className="mb-6">
              <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-1">YURIVA</p>
              <h2 className="text-xl font-black text-brand-navy">منتجات مشابهة</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
