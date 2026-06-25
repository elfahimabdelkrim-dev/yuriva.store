import type { StoreSettings, TrackingSettings, HeroSlide } from "@/types";

export const staticStoreSettings: StoreSettings = {
  store_name: "YURIVA",
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "212600000000",
  announcement_text: "🔥 عرض محدود اليوم فقط | توصيل مجاني داخل المغرب | الدفع عند الاستلام",
  announcement_active: true,
  default_seo_title: "YURIVA | سراول Para وShorts الرجالية — توصيل مجاني المغرب",
  default_seo_description: "اشري أحسن سراول Para، Shorts Para وCargo pants فالمغرب. توصيل مجاني، الدفع عند الاستلام.",
  delivery_text: "التوصيل مجاني لجميع مدن المغرب. مدة التوصيل 24-72 ساعة.",
  return_policy_text: "التبديل ممكن خلال 7 أيام إلى كان مشكل فالقياس أو المنتج.",
};

export const staticTrackingSettings: TrackingSettings = {
  meta_pixel_enabled: false,
  tiktok_pixel_enabled: false,
  google_analytics_enabled: false,
  google_tag_manager_enabled: false,
};

export const staticHeroSlides: HeroSlide[] = [
  {
    id: "1",
    title: "Pack 2 سراول Para",
    subtitle: "وفر 60 درهم — عرض محدود",
    image_url: "/images/placeholder-hero.svg",
    button_text: "اطلب دابا — 189 درهم",
    button_link: "/products/pack-2-pantalons-para",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "2",
    title: "Pack 3 Shorts Para",
    subtitle: "الأكثر مبيعاً — 199 درهم فقط",
    image_url: "/images/placeholder-hero.svg",
    button_text: "اطلب دابا",
    button_link: "/products/pack-3-shorts-para",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "3",
    title: "كولكشن جديدة Para & Cargo",
    subtitle: "جودة عالمية — توصيل مجاني",
    image_url: "/images/placeholder-hero.svg",
    button_text: "اكتشف المجموعة",
    button_link: "/collections/new-arrivals",
    is_active: true,
    sort_order: 3,
  },
];

export const staticReviews = [
  {
    id: "r1",
    customer_name: "محمد — الدار البيضاء",
    rating: 5,
    review_text: "واللاه YURIVA خدمة ممتازة. الباك وصلني في 48 ساعة والجودة فوق التوقع. غادي نطلب زيد!",
    product_title: "Pack 2 سراول Para",
    is_active: true,
  },
  {
    id: "r2",
    customer_name: "كريم — الرباط",
    rating: 5,
    review_text: "Shorts Para مريحة بزاف ومناسبة للصيف. التوصيل مجاني والدفع عند الاستلام — ممتاز!",
    product_title: "Pack 3 Shorts Para",
    is_active: true,
  },
  {
    id: "r3",
    customer_name: "يوسف — فاس",
    rating: 5,
    review_text: "سروال Cargo الأحسن اللي اشريت. جيوب واسعة وخامة متينة. نوصي بيه لكل شخص.",
    product_title: "سروال Cargo كحل",
    is_active: true,
  },
  {
    id: "r4",
    customer_name: "سفيان — طنجة",
    rating: 5,
    review_text: "تعاملت مع YURIVA 3 مرات وكل مرة نفس الجودة والسرعة. متجر محترم بزاف.",
    product_title: "سروال Para رمادي",
    is_active: true,
  },
];

export const staticFAQs = [
  {
    id: "f1",
    question: "كيفاش كيمشي الطلب عند YURIVA؟",
    answer: "اختار المنتج وعمر فورم الطلب. غادي نتاصلو بيك فواتساب باش نأكدو الطلب قبل الإرسال. تخلص غير فاليد ملي توصلك السلعة.",
    is_active: true,
  },
  {
    id: "f2",
    question: "واش التوصيل مجاني فجميع المغرب؟",
    answer: "آه، التوصيل مجاني لجميع مدن المغرب. ما كاين حتى تكاليف إضافية.",
    is_active: true,
  },
  {
    id: "f3",
    question: "شحال من وقت للتوصيل؟",
    answer: "مدة التوصيل من 24 إلى 72 ساعة حسب المدينة ديالك.",
    is_active: true,
  },
  {
    id: "f4",
    question: "كيفاش نعرف القياس المناسب ليا؟",
    answer: "شوف دليل القياسات ديالنا. بشكل عام: M ل55-65kg، L ل65-75kg، XL ل75-85kg، XXL ل85-95kg. إلا كنتي محتار بين جوج قياسات، ختار الأكبر.",
    is_active: true,
  },
  {
    id: "f5",
    question: "واش يمكن نبدل المنتج إلى ما عجبنيش القياس؟",
    answer: "آه، التبديل ممكن خلال 7 أيام إلى كان مشكل فالقياس أو المنتج، شريطة يبقى فحالة مزيانة.",
    is_active: true,
  },
  {
    id: "f6",
    question: "واش نقدر نطلب بدون واتساب؟",
    answer: "الطلب كيتسجل أوتوماتيك فالموقع. الواتساب غير للتأكيد والتواصل، مش شرط تكون فيه لتسجيل الطلب.",
    is_active: true,
  },
  {
    id: "f7",
    question: "فين تقدر تتبع الطلب ديالي؟",
    answer: "تقدر تتبع طلبك من صفحة تتبع الطلب بإدخال رقم هاتفك. بصح نتاصلو بيك فواتساب فكل خطوة.",
    is_active: true,
  },
  {
    id: "f8",
    question: "واش الدفع آمن؟",
    answer: "عندنا غير الدفع عند الاستلام — تخلص غير فاليد ملي توصلك السلعة. ما كاين حتى دفع أونلاين.",
    is_active: true,
  },
];
