import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  getFeaturedProducts, getBestSellers, getNewArrivals, getOffers, getAllProducts,
} from "@/lib/products";
import { getHeroSlides, getHomepageSections, getCategories } from "@/lib/settings";
import { siteConfig } from "@/config/site";
import { JsonLdOrganization, JsonLdWebSite } from "@/components/seo/JsonLd";
import { staticReviews, staticFAQs } from "@/data/settings";
import ProductCard from "@/components/product/ProductCard";
import HeroSlider from "@/components/home/HeroSlider";
import SafeImage from "@/components/ui/SafeImage";
import TrustBadges from "@/components/home/TrustBadges";
import type { Product, Category } from "@/types";
import type { HomepageSection } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: siteConfig.seo.defaultTitle,
  description: siteConfig.seo.defaultDescription,
  keywords: siteConfig.seo.keywords,
  openGraph: {
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    url: siteConfig.url,
    type: "website",
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  "pantalons-para": "\u{1F456}",
  "shorts-para": "\u{1FA73}",
  cargo: "\u{1F3BD}",
  packs: "\u{1F4E6}",
  offers: "\u{1F525}",
  "best-sellers": "⭐",
  "new-arrivals": "✨",
};

/** Cap products to max, no padding with unrelated items */
function cap(arr: Product[], max = 8): Product[] {
  return arr.slice(0, max);
}

/** Returns true if a string is a usable, non-placeholder URL */
function validImg(url: string | undefined | null): url is string {
  return typeof url === "string" && url.trim().length > 0 && !url.includes("placeholder");
}

export default async function HomePage() {
  // Fetch sections first so we can read product_limit for the featured section
  const sections = await getHomepageSections();

  // Read admin-configured product limit for featured section (default 8, max 100)
  const featuredExtra = sections["featured"]?.extra_data as Record<string, unknown> | undefined;
  const featuredLimit = Math.max(4, Math.min(100, Number(featuredExtra?.product_limit) || 8));

  const [heroSlides, featured, bestSellers, newArrivals, offers, categories, allProducts] =
    await Promise.all([
      getHeroSlides(),
      getFeaturedProducts(featuredLimit),
      getBestSellers(),
      getNewArrivals(),
      getOffers(),
      getCategories(),
      getAllProducts(),
    ]);

  const featuredDisplay    = cap(featured,    featuredLimit);
  const bestSellersDisplay = cap(bestSellers, 8);
  const newArrivalsDisplay = cap(newArrivals, 8);
  const offersDisplay      = cap(offers,      8);
  const moreDisplay        = cap(allProducts, 8);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "212666648564";

  // ── Section helpers ────────────────────────────────────────────────────
  const s     = (key: string): HomepageSection =>
    sections[key] ?? { section_key: key, is_active: true, sort_order: 99 };
  const title  = (key: string, fallback: string) => s(key).title || fallback;
  const sub    = (key: string, fallback?: string) => s(key).subtitle ?? fallback;
  const label  = (key: string, fallback?: string) => s(key).label ?? fallback;
  const btn    = (key: string, fallback: string) => s(key).button_text || fallback;
  const imgUrl = (key: string): string | null => {
    const u = s(key).image_url;
    return validImg(u) ? u : null;
  };
  const bgColor = (key: string, fallback: string) => s(key).bg_color || fallback;
  const isOn    = (key: string) => s(key).is_active !== false;

  // ── Section render order — fixed sequence ─────────────────────────────
  // Desired: best_sellers → offers → trust_badges → reviews → rest
  const FIXED_SECTION_ORDER = [
    "best_sellers",
    "offers",
    "trust_badges",
    "reviews",
    "categories",
    "featured",
    "new_arrivals",
    "about_yuriva",
    "why_choose_us",
    "how_to_order",
    "whatsapp_cta",
    "final_cta",
  ];
  const knownKeys = new Set([...FIXED_SECTION_ORDER, "offers_banner", "hero"]);
  const extraKeys = Object.keys(sections).filter((k) => !knownKeys.has(k));
  const sectionOrder = [...FIXED_SECTION_ORDER, ...extraKeys].filter((k) => k in sections);

  // ── Render each section by key ─────────────────────────────────────────
  function renderSection(key: string) {
    // offers_banner removed from homepage — dark "عرض محدود اليوم فقط" banner
    if (key === "offers_banner") return null;
    if (!isOn(key)) return null;

    switch (key) {
      case "categories":
        return (
          <section key="categories" className="bg-white border-b border-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                {categories.slice(0, 8).map((cat: Category) => (
                  <Link key={cat.id} href={`/collections/${cat.slug}`} className="group flex flex-col items-center gap-2 text-center">
                    <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-brand-light border-2 border-transparent group-hover:border-brand-gold transition-all overflow-hidden relative flex items-center justify-center">
                      {cat.image_url && !cat.image_url.includes("placeholder") ? (
                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover" unoptimized />
                      ) : (
                        <span className="text-2xl sm:text-3xl">
                          {CATEGORY_ICONS[cat.slug] || "\u{1F455}"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-brand-navy group-hover:text-brand-gold transition-colors leading-tight">
                      {cat.name === "Packs" ? "باكات" : cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );

      case "featured":
        return featuredDisplay.length > 0 ? (
          <ProductSection
            key="featured"
            sectionKey="featured"
            title={title("featured", "أبرز منتجاتنا")}
            subtitle={sub("featured", "جودة مضمونة — توصيل مجاني — دفع عند الاستلام")}
            label={label("featured")}
            products={featuredDisplay}
            viewAllHref="/products"
            viewAllLabel="شوف كل المنتجات"
            imageUrl={imgUrl("featured")}
          />
        ) : null;

      case "trust_badges":
        return <TrustBadges key="trust_badges" />;

      case "best_sellers":
        return bestSellersDisplay.length > 0 ? (
          <ProductSection
            key="best_sellers"
            sectionKey="best_sellers"
            title={title("best_sellers", "الأكثر مبيعاً")}
            subtitle={sub("best_sellers", "اختيار الزبناء المغاربة")}
            label={label("best_sellers")}
            products={bestSellersDisplay}
            viewAllHref="/collections/best-sellers"
            viewAllLabel="شوف كل المبيعات"
            bg="bg-brand-light"
            imageUrl={imgUrl("best_sellers")}
          />
        ) : null;

      case "offers_banner":
        return (
          <NavySection
            key="offers_banner"
            imageUrl={imgUrl("offers_banner")}
            bgColor={bgColor("offers_banner", "#05051F")}
          >
            <p className="text-brand-gold font-black text-xs tracking-widest uppercase mb-2">
              {label("offers_banner", "عرض محدود")}
            </p>
            <h2 className="text-white text-2xl sm:text-3xl font-black mb-3">
              {title("offers_banner", "عرض محدود اليوم فقط")}
            </h2>
            <p className="text-white/70 text-sm mb-6">
              {sub("offers_banner", "الدفع عند الاستلام — توصيل مجاني لجميع مدن المغرب")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={s("offers_banner").button_link || "/products"}
                className="inline-block bg-brand-gold text-white font-black px-8 py-3 hover:bg-brand-gold/90 transition-colors">
                {btn("offers_banner", "شوف المنتجات")}
              </Link>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="inline-block border-2 border-white text-white font-black px-8 py-3 hover:bg-white/10 transition-colors">
                اطلب عبر واتساب
              </a>
            </div>
          </NavySection>
        );

      case "offers":
        return offersDisplay.length > 0 ? (
          <ProductSection
            key="offers"
            sectionKey="offers"
            title={title("offers", "أحسن العروض")}
            subtitle={sub("offers", "منتجات بخصومات مميزة")}
            label={label("offers")}
            products={offersDisplay}
            viewAllHref="/collections/offers"
            viewAllLabel="شوف كل العروض"
            imageUrl={imgUrl("offers")}
          />
        ) : null;

      case "new_arrivals":
        return newArrivalsDisplay.length > 0 ? (
          <ProductSection
            key="new_arrivals"
            sectionKey="new_arrivals"
            title={title("new_arrivals", "الجديد في المتجر")}
            subtitle={sub("new_arrivals", "آخر ما وصل")}
            label={label("new_arrivals")}
            products={newArrivalsDisplay}
            viewAllHref="/collections/new-arrivals"
            viewAllLabel="شوف الجديد"
            bg="bg-brand-light"
            imageUrl={imgUrl("new_arrivals")}
          />
        ) : null;

      case "reviews":
        return (
          <section key="reviews" className="py-12 bg-white">
            {imgUrl("reviews") && (
              <SectionBanner imageUrl={imgUrl("reviews")!} alt={title("reviews", "آراء الزبناء")} />
            )}
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-8">
                <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-1">
                  {label("reviews", "آراء الزبناء")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-brand-navy">
                  {title("reviews", "ماذا يقولون عنا؟")}
                </h2>
                {sub("reviews") && (
                  <p className="text-brand-gray text-sm mt-1">{sub("reviews")}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staticReviews.slice(0, 6).map((r, i) => (
                  <div key={i} className="bg-brand-light p-5 border border-gray-100">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <svg key={k} className={`w-4 h-4 ${k < r.rating ? "text-brand-gold" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-brand-navy text-sm leading-relaxed mb-3 font-medium">&ldquo;{r.review_text}&rdquo;</p>
                    <p className="text-brand-gray text-xs font-bold">— {r.customer_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "about_yuriva":
        return (
          <NavySection
            key="about_yuriva"
            imageUrl={imgUrl("about_yuriva")}
            bgColor={bgColor("about_yuriva", "#05051F")}
            padY="py-14"
          >
            <div className="text-center mb-10">
              <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-2">
                {label("about_yuriva", "ليش تختار YURIVA؟")}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black">
                {title("about_yuriva", "علاش YURIVA هي الخيار الأحسن")}
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
              {[
                { icon: "\u{1F3C6}", title: "جودة حقيقية", desc: "كل قطعة مفتشة قبل التوصيل — منتجات متينة للبس اليومي والرياضة" },
                { icon: "\u{1F69A}", title: "توصيل مجاني", desc: "لجميع مدن المغرب — من الرباط حتى العيون — بلا استثناء" },
                { icon: "\u{1F4B0}", title: "الدفع عند الاستلام", desc: "ما كاين حتى مخاطرة — تشوف المنتج قبل ما تدفع" },
                { icon: "\u{1F504}", title: "تبديل سهل", desc: "مشكل فالقياس؟ بدلها بسهولة خلال 7 أيام من التوصيل" },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-black text-brand-gold text-base sm:text-lg mb-2">{item.title}</h3>
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </NavySection>
        );

      case "faq":
        return (
          <FAQBlock
            key="faq"
            faqs={staticFAQs.slice(0, 6)}
            title={title("faq", "كلشي اللي خاصك تعرف")}
            label={label("faq", "أسئلة شائعة")}
            imageUrl={imgUrl("faq")}
          />
        );

      case "whatsapp_cta":
        return (
          <NavySection
            key="whatsapp_cta"
            imageUrl={imgUrl("whatsapp_cta")}
            bgColor={bgColor("whatsapp_cta", "#05051F")}
            textCenter
          >
            <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-2">
              {label("whatsapp_cta", "تواصل معنا")}
            </p>
            <p className="font-black text-xl sm:text-2xl mb-2">
              {title("whatsapp_cta", "عندك سؤال؟ دردش معنا دابا!")}
            </p>
            <p className="text-white/70 text-sm mb-6">
              {sub("whatsapp_cta", "فريقنا متوفر 7 أيام على 7 — الرد سريع دايماً")}
            </p>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("السلام عليكم، بغيت نسأل على منتج من YURIVA")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-block bg-brand-gold text-white font-black px-10 py-3 hover:bg-brand-gold/90 transition-colors text-base"
            >
              {btn("whatsapp_cta", "ابدأ محادثة الآن")}
            </a>
          </NavySection>
        );

      case "why_choose_us":
        return (
          <NavySection
            key="why_choose_us"
            imageUrl={imgUrl("why_choose_us")}
            bgColor={bgColor("why_choose_us", "#05051F")}
            padY="py-14"
          >
            <div className="text-center mb-10">
              <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-2">
                {label("why_choose_us", "ليش تختارنا؟")}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black">
                {title("why_choose_us", "علاش YURIVA هي الخيار الأحسن")}
              </h2>
              {sub("why_choose_us") && (
                <p className="text-white/60 text-sm mt-2">{sub("why_choose_us")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
              {[
                { icon: "🏆", title: "جودة حقيقية", desc: "كل قطعة مفتشة قبل التوصيل — منتجات متينة للبس اليومي والرياضة" },
                { icon: "🚚", title: "توصيل مجاني", desc: "لجميع مدن المغرب — من الرباط حتى العيون — بلا استثناء" },
                { icon: "💰", title: "الدفع عند الاستلام", desc: "ما كاين حتى مخاطرة — تشوف المنتج قبل ما تدفع" },
                { icon: "🔄", title: "تبديل سهل", desc: "مشكل فالقياس؟ بدلها بسهولة خلال 7 أيام من التوصيل" },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-black text-brand-gold text-base sm:text-lg mb-2">{item.title}</h3>
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </NavySection>
        );

      case "how_to_order":
        return (
          <section key="how_to_order" className="bg-brand-light py-12 px-4">
            {imgUrl("how_to_order") && (
              <SectionBanner imageUrl={imgUrl("how_to_order")!} alt={title("how_to_order", "كيفاش تطلب؟")} />
            )}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-1">
                  {label("how_to_order", "طريقة الطلب")}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-brand-navy">
                  {title("how_to_order", "كيفاش تطلب؟")}
                </h2>
                {sub("how_to_order") && (
                  <p className="text-brand-gray text-sm mt-1">{sub("how_to_order")}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: "1", icon: "🛒", title: "اختار المنتج", desc: "تصفح المنتجات واختار القياس اللي يناسبك" },
                  { step: "2", icon: "📝", title: "سجل طلبيتك", desc: "دخل اسمك ورقم الهاتف والمدينة — بلا حساب" },
                  { step: "3", icon: "🚚", title: "استقبل توصيلتك", desc: "التوصيل خلال 24-72 ساعة — الدفع عند الاستلام" },
                ].map((item) => (
                  <div key={item.step} className="bg-white p-6 border border-gray-100 text-center relative">
                    <div className="absolute -top-3 right-4 bg-brand-gold text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full">
                      {item.step}
                    </div>
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="font-black text-brand-navy text-base mb-2">{item.title}</h3>
                    <p className="text-brand-gray text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "more_products":
        return moreDisplay.length > 0 ? (
          <ProductSection
            key="more_products"
            sectionKey="more_products"
            title={title("more_products", "منتجات أخرى")}
            subtitle={sub("more_products", "اكتشف المزيد من منتجاتنا")}
            label={label("more_products")}
            products={moreDisplay}
            viewAllHref="/products"
            viewAllLabel="شوف كل المنتجات"
            bg="bg-white"
            imageUrl={imgUrl("more_products")}
          />
        ) : null;

      case "final_cta":
        return (
          <NavySection
            key="final_cta"
            imageUrl={imgUrl("final_cta")}
            bgColor={bgColor("final_cta", "#05051F")}
            textCenter
          >
            <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-2">
              {label("final_cta", "لا تفوتها")}
            </p>
            <p className="font-black text-2xl sm:text-3xl mb-3">
              {title("final_cta", "جرب YURIVA اليوم!")}
            </p>
            <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">
              {sub("final_cta", "توصيل مجاني + الدفع عند الاستلام — بلا مخاطرة")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={s("final_cta").button_link || "/products"}
                className="inline-block bg-brand-gold text-white font-black px-10 py-3 hover:bg-brand-gold/90 transition-colors text-base"
              >
                {btn("final_cta", "اطلب دابا")}
              </Link>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("السلام عليكم، بغيت نسأل على منتج من YURIVA")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-block border-2 border-white text-white font-black px-8 py-3 hover:bg-white/10 transition-colors"
              >
                واتساب
              </a>
            </div>
          </NavySection>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <JsonLdOrganization />
      <JsonLdWebSite />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <HeroSlider
        slides={heroSlides}
        fallbackTitle={title("hero", "لبس رجالي عملي ومريح")}
        fallbackSubtitle={sub("hero", "سراول Para، Shorts وCargo بجودة مزيانة — توصيل مجاني والدفع عند الاستلام")}
        fallbackBtnText={btn("hero", "شوف المنتجات")}
        fallbackBtnLink={s("hero").button_link || "/products"}
        heroSectionImage={imgUrl("hero") ?? undefined}
        heroSectionBgColor={s("hero").bg_color || undefined}
        heroSectionLabel={label("hero") || undefined}
      />

      {/* ── Dynamic ordered sections ─────────────────────────────── */}
      {sectionOrder.map((key) => renderSection(key))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function NavySection({
  children, imageUrl, bgColor = "#05051F", padY = "py-10", textCenter = false,
}: {
  children: React.ReactNode;
  imageUrl?: string | null;
  bgColor?: string;
  padY?: string;
  textCenter?: boolean;
}) {
  const bg = bgColor && bgColor !== "#05051F" ? bgColor : undefined;
  return (
    <section
      className={`${padY} px-4 relative overflow-hidden`}
      style={{
        backgroundColor: bg || "#05051F",
        ...(imageUrl
          ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}),
      }}
    >
      {imageUrl && <div className="absolute inset-0 bg-[#05051F]/82 pointer-events-none" />}
      <div className={`relative z-10 max-w-7xl mx-auto ${textCenter ? "text-center" : ""}`}>
        {children}
      </div>
    </section>
  );
}

function SectionBanner({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  return (
    <div className="w-full h-36 sm:h-48 overflow-hidden relative mb-0">
      <SafeImage
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 pointer-events-none" />
    </div>
  );
}

function ProductSection({
  sectionKey, title, subtitle, label, products, viewAllHref, viewAllLabel, bg = "bg-white", imageUrl,
}: {
  sectionKey: string;
  title: string;
  subtitle?: string;
  label?: string;
  products: Product[];
  viewAllHref: string;
  viewAllLabel?: string;
  bg?: string;
  imageUrl?: string | null;
}) {
  void sectionKey;
  // Use 5-column grid for large featured sections (>12 products), 4 otherwise
  const useFiveCols = products.length > 12;
  return (
    <section className={`${bg} overflow-hidden`}>
      {imageUrl && <SectionBanner imageUrl={imageUrl} alt={title} />}
      <div className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              {label && (
                <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-1">{label}</p>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-brand-navy">{title}</h2>
              {subtitle && <p className="text-brand-gray text-sm mt-0.5">{subtitle}</p>}
            </div>
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-sm font-bold text-brand-navy border-b-2 border-brand-navy hover:border-brand-gold hover:text-brand-gold transition-colors whitespace-nowrap shrink-0 ml-4"
              >
                {viewAllLabel || "شوف الكل"} ←
              </Link>
            )}
          </div>
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${useFiveCols ? "xl:grid-cols-5" : ""} gap-3 sm:gap-4`}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQBlock({
  faqs, title, label, imageUrl,
}: {
  faqs: { question: string; answer: string }[];
  title: string;
  label?: string;
  imageUrl?: string | null;
}) {
  return (
    <section className="bg-brand-light py-12 px-4">
      {imageUrl && <SectionBanner imageUrl={imageUrl} alt={title} />}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          {label && (
            <p className="text-brand-gold text-xs font-black tracking-widest uppercase mb-1">{label}</p>
          )}
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy">{title}</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <details key={i} className="bg-white border border-gray-100 group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-brand-navy text-sm list-none">
                {faq.question}
                <span className="text-brand-gold font-black text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-brand-gray leading-relaxed border-t border-gray-50">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
