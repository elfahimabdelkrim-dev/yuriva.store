"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductColor } from "@/types";
import toast from "react-hot-toast";
import ImageUploadField from "@/components/admin/ImageUploadField";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

interface ProductFormProps { product?: Product; }

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [slugError, setSlugError] = useState("");

  const [form, setForm] = useState({
    title: product?.title || "",
    slug: product?.slug || "",
    category_id: product?.category_id || "pantalons-para",
    price: product?.price?.toString() || "",
    old_price: product?.old_price?.toString() || "",
    description: product?.description || "",
    details: product?.details || "",
    badge: product?.badge || "",
    sku: product?.sku || "",
    main_image: product?.main_image || "",
    stock_quantity: product?.stock_quantity?.toString() || "",
    stock_status: product?.stock_status || "in_stock",
    show_stock_message: product?.show_stock_message || false,
    // Pack
    is_pack: product?.is_pack || false,
    pack_pieces: product?.pack_pieces?.toString() || "2",
    pack_label: "",
    allow_piece_colors: product?.allow_piece_colors ?? true,
    one_size_for_pack: product?.one_size_for_pack ?? true,
    pack_per_piece_size: false,
    required_color_count: product?.required_color_count?.toString() || "1",
    // Flags
    is_featured: product?.is_featured || false,
    is_best_seller: product?.is_best_seller || false,
    is_new_arrival: product?.is_new_arrival || false,
    is_active: product?.is_active ?? true,
    // SEO
    seo_title: product?.seo_title || "",
    seo_description: product?.seo_description || "",
    seo_keywords: product?.seo_keywords || "",
    og_image: product?.og_image || "",
    // Sizes & Colors (arrays)
    sizes: product?.sizes || (["M", "L", "XL", "XXL"] as string[]),
    colors: product?.colors || ([] as ProductColor[]),
    // Extra images
    extra_images: ([] as string[]),
    new_image_url: "",
    // New size / new color inputs
    new_size: "",
    new_color_name: "", new_color_label: "", new_color_hex: "#000000",
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const slugify = (t: string) =>
    t.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/--+/g, "-")
      .trim();

  const toggleSize = (s: string) => {
    set("sizes", form.sizes.includes(s) ? form.sizes.filter(x => x !== s) : [...form.sizes, s]);
  };

  const addCustomSize = () => {
    const s = form.new_size.trim().toUpperCase();
    if (!s) return;
    if (!form.sizes.includes(s)) set("sizes", [...form.sizes, s]);
    set("new_size", "");
  };

  const addColor = () => {
    if (!form.new_color_name || !form.new_color_label) return;
    const c: ProductColor = { name: form.new_color_name, label: form.new_color_label, hex: form.new_color_hex };
    set("colors", [...form.colors, c]);
    set("new_color_name", ""); set("new_color_label", ""); set("new_color_hex", "#000000");
  };
  const removeColor = (i: number) => set("colors", form.colors.filter((_, idx) => idx !== i));

  const removeImage = (i: number) => set("extra_images", form.extra_images.filter((_, idx) => idx !== i));

  // ── Slug helpers ──────────────────────────────────────────────────────────

  /**
   * Checks if a slug is available.
   * exclude_id: current product id (edit mode — same slug for itself is allowed).
   */
  const checkSlugAvailable = async (slug: string, excludeId?: string): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ slug });
      if (excludeId) params.set("exclude_id", excludeId);
      const r = await fetch(`/api/admin/products/check-slug?${params}`);
      if (!r.ok) return true; // Fail open
      const d = await r.json() as { available: boolean };
      return d.available;
    } catch {
      return true; // Fail open — server will catch it
    }
  };

  /**
   * For new products: find a unique slug by appending -1, -2, -3...
   * Returns the first available slug variant.
   */
  const findUniqueSlug = async (base: string): Promise<string> => {
    if (await checkSlugAvailable(base)) return base;
    for (let i = 1; i <= 20; i++) {
      const candidate = `${base}-${i}`;
      if (await checkSlugAvailable(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError("");

    if (!form.title || !form.price) { toast.error("الاسم والثمن ضروريين"); return; }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      toast.error("خاصك تربط Supabase باش تزيد / تبدل منتجات");
      return;
    }

    setLoading(true);
    try {
      const baseSlug = form.slug || slugify(form.title);
      let finalSlug = baseSlug;

      if (!isEdit) {
        // New product — auto-deduplicate slug silently
        finalSlug = await findUniqueSlug(baseSlug);
        // Update slug field so user sees what was actually saved
        if (finalSlug !== form.slug) set("slug", finalSlug);
      } else {
        // Edit — only check if slug changed from original
        if (baseSlug !== product!.slug) {
          const available = await checkSlugAvailable(baseSlug, product!.id);
          if (!available) {
            const msg = "\u0647\u0627\u062f \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0633\u062a\u0639\u0645\u0644 \u0645\u0646 \u0642\u0628\u0644\u060c \u0628\u062f\u0644 Slug \u062f\u064a\u0627\u0644 \u0627\u0644\u0645\u0646\u062a\u062c";
            setSlugError(msg);
            toast.error(msg);
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        title: form.title,
        slug: finalSlug,
        category_id: form.category_id,
        price: parseFloat(form.price),
        old_price: form.old_price ? parseFloat(form.old_price) : null,
        description: form.description,
        details: form.details,
        badge: form.badge,
        sku: form.sku,
        main_image: form.main_image,
        stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : null,
        stock_status: form.stock_status,
        show_stock_message: form.show_stock_message,
        is_pack: form.is_pack,
        pack_pieces: form.is_pack ? parseInt(form.pack_pieces) : null,
        allow_piece_colors: form.allow_piece_colors,
        one_size_for_pack: form.one_size_for_pack,
        required_color_count: parseInt(form.required_color_count) || 1,
        is_featured: form.is_featured,
        is_best_seller: form.is_best_seller,
        is_new_arrival: form.is_new_arrival,
        is_active: form.is_active,
        sizes: form.sizes,
        colors: form.colors,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        seo_keywords: form.seo_keywords,
        og_image: form.og_image,
        extra_images: form.extra_images.filter((u: string) => u.trim().length > 0),
      };

      const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json() as { success: boolean; error?: string };

      if (d.success) {
        toast.success(isEdit ? "\u062a\u062d\u0641\u0638 \u0627\u0644\u0645\u0646\u062a\u062c" : "\u062a\u0632\u0627\u062f \u0627\u0644\u0645\u0646\u062a\u062c");
        router.push("/admin/products");
      } else {
        // Detect duplicate slug error from server (race condition or fallback)
        const err = d.error || "\u0648\u0642\u0639 \u062e\u0637\u0623";
        if (err.includes("slug") || err.includes("duplicate key") || err.includes("unique constraint")) {
          const slugMsg = "\u0647\u0627\u062f \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0633\u062a\u0639\u0645\u0644 \u0645\u0646 \u0642\u0628\u0644\u060c \u0628\u062f\u0644 Slug \u062f\u064a\u0627\u0644 \u0627\u0644\u0645\u0646\u062a\u062c";
          setSlugError(slugMsg);
          toast.error(slugMsg);
        } else {
          toast.error(err);
        }
      }
    } catch {
      toast.error("\u0648\u0642\u0639 \u062e\u0637\u0623");
    }
    setLoading(false);
  };

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";
  const sec = "bg-white border border-gray-200 p-5 space-y-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          ⚠️ ربط Supabase باش تحفظ التغييرات
        </div>
      )}

      {/* ── Basic ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy">معلومات أساسية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>اسم المنتج *</label>
            <input
              value={form.title}
              onChange={e => {
                set("title", e.target.value);
                if (!isEdit) {
                  set("slug", slugify(e.target.value));
                  setSlugError("");
                }
              }}
              className={inp}
              placeholder="Pack 2 سراول Para"
            />
          </div>
          <div>
            <label className={lbl}>Slug (رابط المنتج)</label>
            <input
              value={form.slug}
              onChange={e => { set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-")); setSlugError(""); }}
              className={`${inp} ${slugError ? "border-red-400 focus:border-red-500" : ""}`}
              dir="ltr"
              placeholder="pack-2-pantalons-para"
            />
            {slugError && (
              <p className="text-red-600 text-xs mt-1 font-medium">{slugError}</p>
            )}
          </div>
          <div>
            <label className={lbl}>الثمن (درهم) *</label>
            <input type="number" value={form.price} onChange={e => set("price", e.target.value)} className={inp} placeholder="189" />
          </div>
          <div>
            <label className={lbl}>الثمن القديم (درهم)</label>
            <input type="number" value={form.old_price} onChange={e => set("old_price", e.target.value)} className={inp} placeholder="249" />
          </div>
          <div>
            <label className={lbl}>التصنيف</label>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)} className={inp}>
              <option value="pantalons-para">سراول Para</option>
              <option value="shorts-para">Shorts Para</option>
              <option value="cargo">Cargo</option>
              <option value="packs">باكات</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Badge</label>
            <input value={form.badge} onChange={e => set("badge", e.target.value)} className={inp} placeholder="عرض محدود" />
          </div>
          <div>
            <label className={lbl}>SKU</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} className={inp} dir="ltr" placeholder="YRV-001" />
          </div>
          <div>
            <label className={lbl}>كمية المخزون</label>
            <input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} className={inp} placeholder="50" />
          </div>
        </div>
        <div>
          <label className={lbl}>الوصف</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} className={inp} rows={3} />
        </div>
        <div>
          <label className={lbl}>التفاصيل</label>
          <textarea value={form.details} onChange={e => set("details", e.target.value)} className={inp} rows={3} />
        </div>
      </div>

      {/* ── Images ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy mb-1">الصور</h2>
        <ImageUploadField
          label="الصورة الرئيسية *"
          value={form.main_image}
          onChange={url => set("main_image", url)}
          folder="products"
          subfolder={form.slug || "general"}
          required
        />
        <div>
          <p className={lbl}>صور إضافية (غاليري)</p>
          {form.extra_images.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {form.extra_images.map((url, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 object-cover border border-gray-200" onError={e => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">×</button>
                </div>
              ))}
            </div>
          )}
          <ImageUploadField
            label=""
            value={form.new_image_url}
            onChange={url => { if (url) { set("extra_images", [...form.extra_images, url]); set("new_image_url", ""); } }}
            folder="products"
            subfolder={form.slug || "general"}
            compact
          />
          <p className="text-xs text-brand-gray mt-1">ارفع صورة — تتزاد للغاليري مباشرة</p>
        </div>
      </div>

      {/* ── Pack ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy">إعداد الباك</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_pack} onChange={e => set("is_pack", e.target.checked)} className="w-4 h-4 accent-brand-gold" />
          <span className="text-sm font-medium">هذا المنتج باك</span>
        </label>
        {form.is_pack && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>عدد القطع</label>
                <select value={form.pack_pieces} onChange={e => set("pack_pieces", e.target.value)} className={inp}>
                  <option value="2">2 قطع</option>
                  <option value="3">3 قطع</option>
                  <option value="4">4 قطع</option>
                  <option value="5">5 قطع</option>
                </select>
              </div>
              <div>
                <label className={lbl}>عدد الألوان اللي خاص الزبون يختار</label>
                <select value={form.required_color_count} onChange={e => set("required_color_count", e.target.value)} className={inp}>
                  <option value="1">1 لون</option>
                  <option value="2">2 ألوان</option>
                  <option value="3">3 ألوان</option>
                  <option value="4">4 ألوان</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.allow_piece_colors} onChange={e => set("allow_piece_colors", e.target.checked)} className="accent-brand-gold" />
                <span>الزبون يختار لون كل قطعة على حدة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.one_size_for_pack} onChange={e => set("one_size_for_pack", e.target.checked)} className="accent-brand-gold" />
                <span>قياس واحد للباك كله</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.pack_per_piece_size} onChange={e => set("pack_per_piece_size", e.target.checked)} className="accent-brand-gold" />
                <span>كل قطعة عندها قياس خاص بها</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── Sizes ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy">القياسات المتاحة</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {ALL_SIZES.map(s => (
            <button key={s} type="button" onClick={() => toggleSize(s)}
              className={`px-4 py-2 border text-sm font-bold transition-colors ${form.sizes.includes(s) ? "bg-brand-navy text-white border-brand-navy" : "border-gray-300 text-brand-navy hover:border-brand-navy"}`}>
              {s}
            </button>
          ))}
        </div>
        {form.sizes.filter(s => !ALL_SIZES.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {form.sizes.filter(s => !ALL_SIZES.includes(s)).map(s => (
              <span key={s} className="flex items-center gap-1 bg-brand-navy text-white text-sm font-bold px-3 py-1.5">
                {s}
                <button type="button" onClick={() => toggleSize(s)} className="text-white/60 hover:text-white">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={form.new_size} onChange={e => set("new_size", e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSize())} className="border border-gray-300 px-3 py-2 text-sm outline-none w-32" placeholder="مثلاً: 48" dir="ltr" />
          <button type="button" onClick={addCustomSize} className="bg-brand-navy text-white px-3 py-2 text-sm font-bold">+ زيد قياس</button>
        </div>
        <p className="text-xs text-brand-gray mt-1">القياسات المحددة: {form.sizes.join(", ") || "ما كاين"}</p>
      </div>

      {/* ── Colors ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy">الألوان المتاحة</h2>
        {form.colors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {form.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 border border-gray-200 px-2 py-1.5">
                <span className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: c.hex }} />
                <span className="text-xs font-medium">{c.label}</span>
                <span className="text-xs text-brand-gray" dir="ltr">({c.name})</span>
                <button type="button" onClick={() => removeColor(i)} className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="text-xs font-bold text-brand-gray mb-1 block">اسم اللون (بالإنجليزية)</label>
            <input value={form.new_color_name} onChange={e => set("new_color_name", e.target.value)} className="border border-gray-300 px-2 py-1.5 text-sm w-28 outline-none" placeholder="noir" dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-bold text-brand-gray mb-1 block">التسمية بالدارجة</label>
            <input value={form.new_color_label} onChange={e => set("new_color_label", e.target.value)} className="border border-gray-300 px-2 py-1.5 text-sm w-24 outline-none" placeholder="كحل" />
          </div>
          <div>
            <label className="text-xs font-bold text-brand-gray mb-1 block">اللون</label>
            <input type="color" value={form.new_color_hex} onChange={e => set("new_color_hex", e.target.value)} className="w-10 h-9 border border-gray-300 cursor-pointer" />
          </div>
          <button type="button" onClick={addColor} className="bg-brand-navy text-white text-sm px-3 py-1.5 font-bold">+ زيد لون</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
          {[["كحل","#000000","noir"],["رمادي","#808080","gris"],["بيج","#D2B48C","beige"],["خاكي","#6B6B3A","kaki"],["أزرق","#1E3A5F","bleu"],["بني","#8B4513","marron"]].map(([l,h,n]) => (
            <button key={n} type="button" onClick={() => { set("new_color_name", n); set("new_color_label", l); set("new_color_hex", h); }}
              className="flex items-center gap-1.5 text-xs border border-gray-100 hover:border-brand-gold px-2 py-1 text-brand-gray hover:text-brand-navy transition-colors">
              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: h }} />{l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Flags ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy mb-2">خيارات المنتج</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { k: "is_featured", l: "منتج مميز" }, { k: "is_best_seller", l: "الأكثر مبيعاً" },
            { k: "is_new_arrival", l: "وافد جديد" }, { k: "is_active", l: "نشط (مرئي)" },
            { k: "show_stock_message", l: "ورّي رسالة المخزون" },
          ].map(({ k, l }) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!form[k as keyof typeof form]} onChange={e => set(k as keyof typeof form, e.target.checked)} className="accent-brand-gold" />
              {l}
            </label>
          ))}
        </div>
      </div>

      {/* ── SEO ─────────────────── */}
      <div className={sec}>
        <h2 className="font-black text-brand-navy">SEO</h2>
        <div><label className={lbl}>عنوان SEO</label><input value={form.seo_title} onChange={e => set("seo_title", e.target.value)} className={inp} /></div>
        <div><label className={lbl}>وصف SEO</label><textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)} className={inp} rows={2} /></div>
        <div><label className={lbl}>كلمات مفتاحية</label><input value={form.seo_keywords} onChange={e => set("seo_keywords", e.target.value)} className={inp} dir="ltr" /></div>
        <ImageUploadField label="صورة OG" value={form.og_image} onChange={url => set("og_image", url)} folder="products" subfolder={form.slug || "general"} compact />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-brand-navy text-white font-bold px-8 py-3 hover:bg-opacity-85 disabled:opacity-60">
          {loading ? "جاري الحفظ..." : isEdit ? "حفظ التغييرات" : "زيد المنتج"}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-gray-300 text-brand-navy font-bold px-6 py-3 hover:bg-gray-50">إلغاء</button>
      </div>
    </form>
  );
}
