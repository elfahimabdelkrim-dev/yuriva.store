import type { Product } from "@/types";

export const staticProducts: Product[] = [
  {
    id: "1",
    category_id: "pantalons-para",
    title: "Pack 2 سراول Para",
    slug: "pack-2-pantalons-para",
    description:
      "باك 2 سراول Para عملية ومريحة، مناسبة للخروج اليومي والخدمة. فيهم جيوب واسعة وخامة خفيفة مريحة. وفر أكثر مع الباك!",
    details:
      "القماش: بولي كوتون عالي الجودة\nالجيوب: 4 جيوب واسعة\nالخصر: مطاط مع حزام\nالاستعمال: للخروج اليومي، العمل، الرياضة\nاللوان متاحة: كحل، رمادي\nما يبلاش بعد الغسيل",
    price: 189,
    old_price: 249,
    main_image: "/images/placeholder-product.svg",
    images: [
      { url: "/images/placeholder-product.svg", alt: "Pack 2 سراول Para - صورة 1", image_type: "main", sort_order: 0 },
      { url: "/images/placeholder-product-2.svg", alt: "Pack 2 سراول Para - صورة 2", image_type: "gallery", sort_order: 1 },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    colors: [
      { name: "gris", hex: "#9CA3AF", label: "رمادي" },
      { name: "noir", hex: "#1F2937", label: "كحل" },
    ],
    stock_status: "in_stock",
    is_pack: true,
    pack_pieces: 2,
    allow_piece_colors: true,
    one_size_for_pack: true,
    is_active: true,
    is_best_seller: false,
    is_new_arrival: false,
    badge: "عرض محدود",
    is_featured: true,
    seo_title: "Pack 2 سراول Para | YURIVA — 189 درهم توصيل مجاني",
    seo_description: "اشري باك 2 سراول Para بـ 189 درهم فقط. توصيل مجاني والدفع عند الاستلام. pantalon para homme maroc.",
    seo_keywords: "pack pantalon para maroc, srawal para pack, pantalon para homme maroc",
    reviews: [
      { customer_name: "محمد من كازا", rating: 5, review_text: "واللاه جودة ممتازة وجاء بسرعة. نوصي بيه!", is_active: true },
      { customer_name: "يوسف من الرباط", rating: 5, review_text: "القياس صح والخامة مزيانة بزاف. غادي نطلب زيد.", is_active: true },
    ],
    faqs: [
      { question: "واش التوصيل مجاني؟", answer: "آه، التوصيل مجاني لجميع مدن المغرب.", sort_order: 0 },
      { question: "كيفاش نختار القياس؟", answer: "شوف دليل القياسات. إلا كنتي محتار، ختار القياس الأكبر.", sort_order: 1 },
    ],
  },
  {
    id: "2",
    category_id: "shorts-para",
    title: "Pack 3 Shorts Para",
    slug: "pack-3-shorts-para",
    description:
      "باك 3 Shorts Para — الأكثر مبيعاً فمتجر YURIVA. مريح، خفيف، مناسب للصيف والرياضة والخروج. وفر مع الباك ديال 3!",
    details:
      "القماش: بولي كوتون خفيف\nالطول: حتى الركبة\nالجيوب: جيبتين جانبيتين\nالخصر: مطاط مع حزام\nاللوان: كحل، رمادي، نيلي\nمناسب للرياضة والخروج",
    price: 199,
    old_price: 299,
    main_image: "/images/placeholder-product.svg",
    images: [
      { url: "/images/placeholder-product.svg", alt: "Pack 3 Shorts Para - صورة 1", image_type: "main", sort_order: 0 },
      { url: "/images/placeholder-product-2.svg", alt: "Pack 3 Shorts Para - صورة 2", image_type: "gallery", sort_order: 1 },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    colors: [
      { name: "gris", hex: "#9CA3AF", label: "رمادي" },
      { name: "noir", hex: "#1F2937", label: "كحل" },
      { name: "bleu-fonce", hex: "#1E3A5F", label: "نيلي" },
    ],
    stock_status: "in_stock",
    is_pack: true,
    pack_pieces: 3,
    allow_piece_colors: true,
    one_size_for_pack: true,
    is_active: true,
    is_best_seller: true,
    is_new_arrival: false,
    badge: "الأكثر مبيعاً",
    is_featured: true,
    seo_title: "Pack 3 Shorts Para | YURIVA — 199 درهم فقط",
    seo_description: "اشري باك 3 Shorts Para الأكثر مبيعاً بـ 199 درهم. توصيل مجاني والدفع عند الاستلام. short para homme maroc.",
    seo_keywords: "pack shorts para maroc, short para homme maroc, shorts pack maroc",
    reviews: [
      { customer_name: "كريم من فاس", rating: 5, review_text: "بالله عجبني الباك! الثلاثة جاو مزيانين وبسرعة.", is_active: true },
      { customer_name: "أمين من مراكش", rating: 4, review_text: "جودة مزيانة والثمن معقول بزاف.", is_active: true },
    ],
    faqs: [
      { question: "واش نقدر نختار لون مختلف لكل شورت؟", answer: "آه، فالباك تقدر تختار لون مختلف لكل قطعة.", sort_order: 0 },
    ],
  },
  {
    id: "3",
    category_id: "cargo",
    title: "سروال Cargo كحل",
    slug: "pantalon-cargo-noir",
    description:
      "سروال Cargo كحل عملي بجيوب واسعة. مناسب للخروج اليومي، الرياضة، والخدمة. خامة متينة وراحة فالحركة.",
    details:
      "القماش: كوتون ريبستوب متين\nالجيوب: 6 جيوب واسعة (جانبية وأمامية وخلفية)\nالخصر: مطاط مع حزام\nالمقاس: صح ما يضيقش ما يوسعش\nاللون: كحل\nمتعدد الاستعمالات",
    price: 149,
    old_price: 199,
    main_image: "/images/placeholder-product.svg",
    images: [
      { url: "/images/placeholder-product.svg", alt: "سروال Cargo كحل - صورة 1", image_type: "main", sort_order: 0 },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    colors: [
      { name: "noir", hex: "#1F2937", label: "كحل" },
    ],
    stock_status: "in_stock",
    is_pack: false,
    is_active: true,
    is_best_seller: false,
    is_new_arrival: true,
    badge: "جديد",
    is_featured: true,
    seo_title: "سروال Cargo كحل | YURIVA — جيوب واسعة توصيل مجاني",
    seo_description: "اشري سروال Cargo كحل بـ 149 درهم. جيوب واسعة وخامة متينة. توصيل مجاني. cargo pants maroc.",
    seo_keywords: "cargo pants maroc, pantalon cargo homme maroc, سروال cargo maroc",
    reviews: [
      { customer_name: "سفيان من طنجة", rating: 5, review_text: "الجيوب واسعة بزاف وجودة الخامة ممتازة.", is_active: true },
    ],
    faqs: [
      { question: "واش الجيوب واسعة؟", answer: "آه، فيه 6 جيوب واسعة مناسبة للاستعمال اليومي.", sort_order: 0 },
    ],
  },
  {
    id: "4",
    category_id: "pantalons-para",
    title: "سروال Para رمادي",
    slug: "pantalon-para-gris",
    description:
      "سروال Para رمادي مريح وعملي، مناسب للخروج اليومي. خامة خفيفة وقياسات دقيقة. الكلاسيك اللي ما يتزعمش.",
    details:
      "القماش: بولي كوتون\nالجيوب: 4 جيوب\nالخصر: مطاط مع حزام\nاللون: رمادي\nمناسب للخروج اليومي والعمل",
    price: 129,
    old_price: 179,
    main_image: "/images/placeholder-product.svg",
    images: [
      { url: "/images/placeholder-product.svg", alt: "سروال Para رمادي - صورة 1", image_type: "main", sort_order: 0 },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    colors: [
      { name: "gris", hex: "#9CA3AF", label: "رمادي" },
    ],
    stock_status: "in_stock",
    is_pack: false,
    is_active: true,
    is_best_seller: true,
    is_new_arrival: false,
    badge: "الأكثر مبيعاً",
    is_featured: false,
    seo_title: "سروال Para رمادي | YURIVA — 129 درهم توصيل مجاني",
    seo_description: "اشري سروال Para رمادي بـ 129 درهم. خامة مريحة وتوصيل مجاني. pantalon para gris maroc.",
    seo_keywords: "pantalon para gris maroc, سروال para رمادي, srawal para maroc",
    reviews: [
      { customer_name: "عبد الرحيم من سلا", rating: 5, review_text: "جودة ممتازة وجاء بسرعة! ناصح بيه.", is_active: true },
    ],
    faqs: [],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return staticProducts.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return staticProducts.filter((p) => p.category_id === categorySlug && p.is_active);
}

export function getBestSellers(): Product[] {
  return staticProducts.filter((p) => p.is_best_seller && p.is_active);
}

export function getNewArrivals(): Product[] {
  return staticProducts.filter((p) => p.is_new_arrival && p.is_active);
}

export function getFeaturedProducts(): Product[] {
  return staticProducts.filter((p) => p.is_featured && p.is_active);
}

export function getOffers(): Product[] {
  return staticProducts.filter((p) => p.old_price && p.is_active);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return staticProducts.filter((p) => p.is_active);

  // Normalize Arabic/Darija search terms
  const aliases: Record<string, string[]> = {
    "سروال": ["pantalon", "para", "srawal", "sarwal"],
    "سراول": ["pantalon", "para", "srawal", "sarwal"],
    "شورت": ["short", "shorts"],
    "نصاصين": ["short", "shorts"],
    "cargo": ["cargo", "كارغو"],
    "باك": ["pack"],
    "srawal": ["سروال", "سراول", "pantalon", "para"],
    "sarwal": ["سروال", "سراول", "pantalon", "para"],
    "para": ["para", "سروال", "سراول"],
    "short": ["شورت", "نصاصين", "shorts"],
  };

  return staticProducts.filter((p) => {
    if (!p.is_active) return false;
    const searchIn = [
      p.title,
      p.description,
      p.category_id,
      p.badge || "",
      ...p.colors.map((c) => c.label + " " + c.name),
      p.sizes.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    if (searchIn.includes(q)) return true;

    // Check aliases
    for (const [term, alts] of Object.entries(aliases)) {
      if (q.includes(term.toLowerCase())) {
        return alts.some((alt) => searchIn.includes(alt.toLowerCase()));
      }
    }
    return false;
  });
}
