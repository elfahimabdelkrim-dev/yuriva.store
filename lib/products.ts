import type { Product, ProductColor, ProductImage, ProductReview, ProductFAQ, StockStatus } from "@/types";
import {
  staticProducts,
  getProductBySlug as staticGetBySlug,
  getProductsByCategory as staticGetByCategory,
  getBestSellers as staticGetBestSellers,
  getNewArrivals as staticGetNewArrivals,
  getFeaturedProducts as staticGetFeatured,
  getOffers as staticGetOffers,
  searchProducts as staticSearch,
} from "@/data/products";

function hasSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ─── Safe JSON parse ───────────────────────────────────────────────
function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return fallback;
}

// ─── Validate a URL is non-empty string ────────────────────────────
function isValidUrl(url: unknown): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

// ─── Build a safe ProductColor array ───────────────────────────────
function safeColors(raw: unknown): ProductColor[] {
  const arr = Array.isArray(raw) ? raw : safeJsonParse<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (c): c is ProductColor =>
      c !== null &&
      typeof c === "object" &&
      typeof (c as ProductColor).name === "string" &&
      typeof (c as ProductColor).hex === "string" &&
      typeof (c as ProductColor).label === "string"
  );
}

// ─── Build a safe sizes array ──────────────────────────────────────
function safeSizes(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : safeJsonParse<unknown[]>(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
}

// ─── Build a safe images array (includes main_image) ───────────────
function safeImages(row: Record<string, unknown>): ProductImage[] {
  const result: ProductImage[] = [];
  const seen = new Set<string>();

  const addUrl = (url: unknown, alt: string, extra?: Partial<ProductImage>) => {
    if (!isValidUrl(url) || seen.has(url)) return;
    seen.add(url);
    result.push({ url, alt, sort_order: 0, image_type: "gallery", ...extra });
  };

  // 1. Rows from product_images join
  const productImages = Array.isArray(row.product_images) ? row.product_images : [];
  for (const img of productImages) {
    if (!img || typeof img !== "object") continue;
    const i = img as Record<string, unknown>;
    const url = i.url ?? i.image_url ?? i.src;
    addUrl(url, String(i.alt ?? row.title ?? "صورة المنتج"), {
      id: String(i.id ?? ""),
      sort_order: Number(i.sort_order ?? 0),
      image_type: (i.image_type as "main" | "gallery") ?? "gallery",
    });
  }

  // 2. Raw images array (if column exists)
  const rawImages = Array.isArray(row.images) ? row.images : safeJsonParse<unknown[]>(row.images, []);
  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      if (typeof img === "string") {
        addUrl(img, String(row.title ?? "صورة المنتج"));
      } else if (img && typeof img === "object") {
        const i = img as Record<string, unknown>;
        const url = i.url ?? i.image_url ?? i.src;
        addUrl(url, String(i.alt ?? row.title ?? "صورة المنتج"), {
          sort_order: Number(i.sort_order ?? 0),
          image_type: (i.image_type as "main" | "gallery") ?? "gallery",
        });
      }
    }
  }

  // 3. main_image as first image if not already included
  if (isValidUrl(row.main_image) && !seen.has(String(row.main_image))) {
    result.unshift({
      url: String(row.main_image),
      alt: String(row.title ?? "صورة المنتج"),
      sort_order: -1,
      image_type: "main",
    });
  }

  // Sort by sort_order
  result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return result;
}

// ─── Main normaliser ────────────────────────────────────────────────
// Converts a raw Supabase row to the Product type.
// Handles: null/undefined fields, JSON strings, missing images, empty arrays.
function mapProduct(row: Record<string, unknown>): Product {
  const colors = safeColors(row.colors);
  const sizes  = safeSizes(row.sizes);
  const images = safeImages(row);

  // main_image: first valid URL from images, then explicit main_image, then placeholder
  const mainImage =
    (isValidUrl(row.main_image) ? String(row.main_image) : null) ||
    (images.length > 0 ? images[0].url : null) ||
    "/images/placeholder-product.svg";

  return {
    id:          String(row.id ?? ""),
    category_id: String(row.category_id ?? ""),
    title:       String(row.title ?? row.name ?? ""),
    slug:        String(row.slug ?? ""),
    description: String(row.description ?? ""),
    details:     row.details ? String(row.details) : undefined,
    price:       Number(row.price ?? 0) || 0,
    old_price:   row.old_price != null && !isNaN(Number(row.old_price)) ? Number(row.old_price) : undefined,
    main_image:  mainImage,
    images,
    sizes,
    colors,
    stock_status:       (row.stock_status as StockStatus) ?? "in_stock",
    stock_quantity:     row.stock_quantity != null ? Number(row.stock_quantity) : undefined,
    show_stock_message: Boolean(row.show_stock_message),
    is_pack:            Boolean(row.is_pack),
    pack_pieces:        row.pack_pieces != null && !isNaN(Number(row.pack_pieces)) && Number(row.pack_pieces) > 0
      ? Number(row.pack_pieces)
      : undefined,
    allow_piece_colors: row.allow_piece_colors !== false,
    one_size_for_pack:  row.one_size_for_pack !== false,
    is_featured:        Boolean(row.is_featured),
    is_active:          Boolean(row.is_active),
    is_best_seller:     Boolean(row.is_best_seller),
    is_new_arrival:     Boolean(row.is_new_arrival),
    badge:              row.badge ? String(row.badge) : undefined,
    sku:                row.sku ? String(row.sku) : undefined,
    seo_title:          row.seo_title ? String(row.seo_title) : undefined,
    seo_description:    row.seo_description ? String(row.seo_description) : undefined,
    seo_keywords:       row.seo_keywords ? String(row.seo_keywords) : undefined,
    og_image:           row.og_image ? String(row.og_image) : undefined,
    reviews: Array.isArray(row.product_reviews) && row.product_reviews.length > 0
      ? (row.product_reviews as ProductReview[])
      : Array.isArray(row.reviews)
      ? (row.reviews as ProductReview[])
      : undefined,
    faqs: Array.isArray(row.product_faqs) && row.product_faqs.length > 0
      ? (row.product_faqs as ProductFAQ[])
      : Array.isArray(row.faqs)
      ? (row.faqs as ProductFAQ[])
      : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapProducts(rows: Record<string, unknown>[]): Product[] {
  return rows.map(mapProduct);
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC FETCH FUNCTIONS
// KEY FIX: data.length > 0 — never return empty Supabase result
// when static data or a different query might have products.
// Specialized functions (featured/best-sellers/new-arrivals/offers)
// fall back to getAllProducts() if their flag-filtered query returns 0.
// ─────────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_reviews(*), product_faqs(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);
    } catch { /* fall through */ }
  }
  return staticProducts.filter((p) => p.is_active);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_reviews(*), product_faqs(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!error && data) return mapProduct(data as Record<string, unknown>);
    } catch { /* fall through */ }
  }
  return staticGetBySlug(slug) || null;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (!categorySlug) return [];
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();

      // Try 1: category_id stores the slug as TEXT
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("category_id", categorySlug)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);

      // Try 2: category_id stores UUID — look up category by slug first
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (cat?.id) {
        const { data: data2, error: e2 } = await supabase
          .from("products")
          .select("*, product_images(*)")
          .eq("category_id", cat.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (!e2 && data2 && data2.length > 0) return mapProducts(data2 as Record<string, unknown>[]);
      }
    } catch { /* fall through */ }
  }
  return staticGetByCategory(categorySlug);
}

export async function getFeaturedProducts(limit = 100): Promise<Product[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);
      return getAllProducts().then((all) => all.slice(0, safeLimit));
    } catch { /* fall through */ }
  }
  const r = staticGetFeatured();
  return r.length > 0 ? r.slice(0, safeLimit) : staticProducts.filter((p) => p.is_active).slice(0, safeLimit);
}

export async function getBestSellers(): Promise<Product[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_best_seller", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);
      return getAllProducts().then((all) => all.slice(0, 8));
    } catch { /* fall through */ }
  }
  const r = staticGetBestSellers();
  return r.length > 0 ? r : staticProducts.filter((p) => p.is_active).slice(0, 8);
}

export async function getNewArrivals(): Promise<Product[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_new_arrival", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);
      return getAllProducts().then((all) => all.slice(0, 8));
    } catch { /* fall through */ }
  }
  const r = staticGetNewArrivals();
  return r.length > 0 ? r : staticProducts.filter((p) => p.is_active).slice(0, 8);
}

export async function getOffers(): Promise<Product[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .not("old_price", "is", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error && data && data.length > 0) return mapProducts(data as Record<string, unknown>[]);
      return getAllProducts().then((all) => all.slice(0, 8));
    } catch { /* fall through */ }
  }
  const r = staticGetOffers();
  return r.length > 0 ? r : staticProducts.filter((p) => p.is_active).slice(0, 8);
}

export async function searchProducts(q: string): Promise<Product[]> {
  if (!q.trim()) return getAllProducts();
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("is_active", true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%,badge.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) return mapProducts(data as Record<string, unknown>[]);
    } catch { /* fall through */ }
  }
  return staticSearch(q);
}

export { mapProduct, mapProducts };
export { staticSearch as searchProductsStatic };

// ─── Hero slides ──────────────────────────────────────────
import type { HeroSlide } from "@/types";
import { staticHeroSlides } from "@/data/settings";

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data && data.length > 0) return data as HeroSlide[];
    } catch { /* fall through */ }
  }
  return staticHeroSlides.filter((s) => s.is_active);
}

// ─── Category with Supabase banner ────────────────────────
import type { Category } from "@/types";
import { getCategoryBySlug as staticGetCategory } from "@/data/categories";

export async function getCategoryForCollection(slug: string): Promise<Category | null> {
  if (hasSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data) return data as Category;
    } catch { /* fall through */ }
  }
  // Fall back to static category data — ensures known slugs never 404 even without Supabase rows
  const { getCategoryBySlug } = await import("@/data/categories");
  return getCategoryBySlug(slug) ?? null;
}
