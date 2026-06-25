import type { StoreSettings, TrackingSettings, HeroSlide, Category } from "@/types";
import {
  staticStoreSettings,
  staticTrackingSettings,
  staticHeroSlides,
} from "@/data/settings";
import { staticCategories } from "@/data/categories";

function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (hasSupabase()) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();
      if (!error && data) return data as StoreSettings;
    } catch {
      /* fall through */
    }
  }
  return staticStoreSettings;
}

export async function getTrackingSettings(): Promise<TrackingSettings> {
  if (hasSupabase()) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("tracking_settings")
        .select("*")
        .single();
      if (!error && data) return data as TrackingSettings;
    } catch {
      /* fallback */
    }
  }
  return staticTrackingSettings;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (hasSupabase()) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error && data) return data as HeroSlide[];
    } catch {
      /* fallback */
    }
  }
  return staticHeroSlides;
}

/**
 * Load active categories from Supabase — falls back to static list.
 * Used on the public homepage category strip.
 */
export async function getCategories(): Promise<Category[]> {
  if (hasSupabase()) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8);
      if (!error && data && data.length > 0) return data as Category[];
    } catch {
      /* fall through */
    }
  }
  return staticCategories.filter((c) => c.is_active);
}

// ── Homepage Sections ──────────────────────────────────────────────────────

export interface HomepageSection {
  id?: string;
  section_key: string;
  title?: string;
  subtitle?: string;
  /** Small badge/label shown above the title (e.g. "عرض محدود") */
  label?: string;
  image_url?: string;
  /** Per-section background color (hex). Requires SQL: ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS bg_color TEXT */
  bg_color?: string;
  button_text?: string;
  button_link?: string;
  is_active: boolean;
  sort_order: number;
  /**
   * Flexible JSONB column for per-section settings.
   * Requires SQL: ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
   * Currently used keys:
   *   - product_limit (number): max products to show in "featured" section
   */
  extra_data?: Record<string, unknown>;
}

export const SECTION_DEFAULTS: Record<string, Omit<HomepageSection, "id" | "section_key">> = {
  hero:         { title: "لبس رجالي عملي ومريح",           subtitle: "سراول Para وShorts وCargo — توصيل مجاني والدفع عند الاستلام", label: "جديد", button_text: "شوف المنتجات", button_link: "/products", is_active: true, sort_order: 0 },
  categories:   { title: "التصنيفات",                                                                                               is_active: true, sort_order: 1 },
  featured:     { title: "أبرز منتجاتنا",                  subtitle: "جودة مضمونة — توصيل مجاني — دفع عند الاستلام",              is_active: true, sort_order: 2 },
  trust_badges: { title: "علاش YURIVA",                                                                                             is_active: true, sort_order: 3 },
  best_sellers: { title: "الأكثر مبيعاً",                  subtitle: "اختيار الزبناء المغاربة",                                    is_active: true, sort_order: 4 },
  offers_banner:{ title: "عرض محدود اليوم فقط",            subtitle: "الدفع عند الاستلام — توصيل مجاني لجميع مدن المغرب",        label: "عرض محدود", button_text: "شوف المنتجات", button_link: "/products", is_active: true, sort_order: 5 },
  offers:       { title: "أحسن العروض",                    subtitle: "منتجات بخصومات مميزة",                                       is_active: true, sort_order: 6 },
  new_arrivals: { title: "الجديد في المتجر",               subtitle: "آخر ما وصل",                                                  is_active: true, sort_order: 7 },
  reviews:      { title: "ماذا يقولون عنا؟",               subtitle: "آراء زبناء YURIVA الحقيقيين",                                is_active: true, sort_order: 8 },
  about_yuriva: { title: "علاش YURIVA هي الخيار الأحسن",  subtitle: "ليش تختار YURIVA؟",                                           is_active: true, sort_order: 9 },
  faq:          { title: "كلشي اللي خاصك تعرف",            subtitle: "أسئلة شائعة",                                                 is_active: true, sort_order: 10 },
  whatsapp_cta:  { title: "عندك سؤال؟ دردش معنا دابا!",     subtitle: "فريقنا متوفر 7 أيام على 7",                                  button_text: "ابدأ محادثة الآن", is_active: true, sort_order: 11 },
  // New editable sections (v2)
  why_choose_us: { title: "علاش YURIVA هي الخيار الأحسن",  subtitle: "جودة حقيقية — توصيل مجاني — دفع عند الاستلام",              label: "ليش تختارنا؟", is_active: true, sort_order: 12 },
  how_to_order:  { title: "كيفاش تطلب؟",                   subtitle: "3 خطوات بسيطة وصل المنتج لبيتك",                             label: "طريقة الطلب", is_active: true, sort_order: 13 },
  more_products: { title: "منتجات أخرى",                   subtitle: "اكتشف المزيد من منتجاتنا المميزة",                            label: "المزيد", is_active: false, sort_order: 14 },
  final_cta:     { title: "جرب YURIVA اليوم!",              subtitle: "توصيل مجاني + الدفع عند الاستلام",                            label: "لا تفوتها", button_text: "اطلب دابا", button_link: "/products", is_active: true, sort_order: 15 },
};

export async function getHomepageSections(): Promise<Record<string, HomepageSection>> {
  const defaults: Record<string, HomepageSection> = {};
  for (const [key, val] of Object.entries(SECTION_DEFAULTS)) {
    defaults[key] = { ...val, section_key: key };
  }

  if (!hasSupabase()) return defaults;

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("homepage_sections")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      const result: Record<string, HomepageSection> = { ...defaults };
      for (const row of data as HomepageSection[]) {
        if (row.section_key) {
          result[row.section_key] = {
            ...defaults[row.section_key],
            ...row,
            title: row.title || defaults[row.section_key]?.title,
          };
        }
      }
      return result;
    }
  } catch {
    /* fallback to defaults */
  }

  return defaults;
}
