"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Save, X, Eye, EyeOff,
  ChevronUp, ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { staticHeroSlides } from "@/data/settings";
import toast from "react-hot-toast";
import ImageUploadField from "@/components/admin/ImageUploadField";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

interface Slide {
  id?: string; title: string; subtitle?: string; image_url: string;
  button_text: string; button_link: string; is_active: boolean; sort_order: number;
}

interface Section {
  id?: string;
  section_key: string;
  title?: string;
  subtitle?: string;
  /** Small badge/label above the section title (e.g. "عرض محدود") */
  label?: string;
  image_url?: string;
  /** Background color (hex). Requires SQL migration to persist. */
  bg_color?: string;
  button_text?: string;
  button_link?: string;
  is_active: boolean;
  sort_order: number;
  /**
   * Flexible JSONB settings per section.
   * Requires SQL: ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
   * Keys used:
   *   product_limit (number) — for "featured" section only
   */
  extra_data?: Record<string, unknown>;
}

const EMPTY_SLIDE: Omit<Slide, "id"> = {
  title: "", subtitle: "", image_url: "", button_text: "اكتشف دابا",
  button_link: "/products", is_active: true, sort_order: 0,
};

const ALL_SECTIONS: Section[] = [
  { section_key: "hero",          title: "لبس رجالي عملي ومريح", subtitle: "سراول Para، Shorts وCargo — توصيل مجاني والدفع عند الاستلام", label: "YURIVA — الأصيل من المغرب", button_text: "شوف المنتجات", button_link: "/products", is_active: true, sort_order: 0 },
  { section_key: "categories",    title: "التصنيفات",                                                                                          is_active: true, sort_order: 1  },
  { section_key: "featured",      title: "أبرز منتجاتنا",      subtitle: "جودة مضمونة — توصيل مجاني — دفع عند الاستلام",                     is_active: true, sort_order: 2  },
  { section_key: "trust_badges",  title: "علاش YURIVA",                                                                                        is_active: true, sort_order: 3  },
  { section_key: "best_sellers",  title: "الأكثر مبيعاً",       subtitle: "اختيار الزبناء المغاربة",                                           is_active: true, sort_order: 4  },
  { section_key: "offers_banner", title: "عرض محدود اليوم فقط", subtitle: "الدفع عند الاستلام — توصيل مجاني", label: "عرض محدود", button_text: "شوف المنتجات", button_link: "/products", is_active: true, sort_order: 5 },
  { section_key: "offers",        title: "أحسن العروض",         subtitle: "منتجات بخصومات مميزة",                                             is_active: true, sort_order: 6  },
  { section_key: "new_arrivals",  title: "الجديد في المتجر",    subtitle: "آخر ما وصل",                                                        is_active: true, sort_order: 7  },
  { section_key: "reviews",       title: "ماذا يقولون عنا؟",    subtitle: "آراء زبناء YURIVA الحقيقيين",                                       is_active: true, sort_order: 8  },
  { section_key: "about_yuriva",  title: "علاش YURIVA هي الخيار الأحسن", subtitle: "ليش تختار YURIVA؟",                                        is_active: true, sort_order: 9  },
  { section_key: "faq",           title: "كلشي اللي خاصك تعرف", subtitle: "أسئلة شائعة",                                                      is_active: true, sort_order: 10 },
  { section_key: "whatsapp_cta",  title: "عندك سؤال؟ دردش معنا دابا!", subtitle: "فريقنا متوفر 7 أيام على 7", button_text: "ابدأ محادثة الآن", is_active: true, sort_order: 11 },
  // v2 sections
  { section_key: "why_choose_us", title: "علاش YURIVA هي الخيار الأحسن", subtitle: "جودة حقيقية — توصيل مجاني — دفع عند الاستلام", label: "ليش تختارنا؟", is_active: true, sort_order: 12 },
  { section_key: "how_to_order",  title: "كيفاش تطلب؟",                  subtitle: "3 خطوات بسيطة وصل المنتج لبيتك", label: "طريقة الطلب", is_active: true, sort_order: 13 },
  { section_key: "more_products", title: "منتجات أخرى",                  subtitle: "اكتشف المزيد من منتجاتنا المميزة", is_active: false, sort_order: 14 },
  { section_key: "final_cta",     title: "جرب YURIVA اليوم!",             subtitle: "توصيل مجاني + الدفع عند الاستلام", label: "لا تفوتها", button_text: "اطلب دابا", button_link: "/products", is_active: true, sort_order: 15 },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "الهيرو (الصورة الكبيرة الأولى)",
  categories: "دوائر التصنيفات", featured: "أبرز منتجاتنا", trust_badges: "علاش YURIVA (ميزات)",
  best_sellers: "الأكثر مبيعاً", offers_banner: "بانر العروض الداكن", offers: "العروض الخاصة",
  new_arrivals: "الجديد", reviews: "آراء الزبناء", about_yuriva: "علاش YURIVA (قسم داكن)",
  faq: "الأسئلة الشائعة", whatsapp_cta: "CTA واتساب",
  why_choose_us: "علاش YURIVA (قسم داكن)", how_to_order: "طريقة الطلب (خطوات)",
  more_products: "منتجات إضافية", final_cta: "CTA النهائي",
};

/** Sections that show their image as background (dark overlay). */
/** Sections whose image_url is used as full background (dark overlay). */
const DARK_BG_SECTIONS = new Set(["hero", "offers_banner", "about_yuriva", "whatsapp_cta", "why_choose_us", "final_cta"]);
/** Sections with a CTA button (button_text + button_link). */
const HAS_BUTTON = new Set(["hero", "offers_banner", "whatsapp_cta", "featured", "final_cta"]);
/** Sections with a small label/badge above the title. */
const HAS_LABEL = new Set(["hero", "offers_banner", "about_yuriva", "whatsapp_cta", "featured", "best_sellers", "new_arrivals", "reviews", "faq", "why_choose_us", "how_to_order", "final_cta"]);

export default function AdminHomepagePage() {
  const [slides, setSlides]               = useState<Slide[]>([]);
  const [sections, setSections]           = useState<Section[]>(ALL_SECTIONS);
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [addSlide, setAddSlide]           = useState<Omit<Slide, "id">>(EMPTY_SLIDE);
  const [editSlide, setEditSlide]         = useState<string | null>(null);
  const [editSlideData, setEditSlideData] = useState<Partial<Slide>>({});
  const [saving, setSaving]               = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingSections, setSavingSections] = useState(false);
  const [editSection, setEditSection]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!HAS_SUPABASE) {
      setSlides(staticHeroSlides.map((s, i) => ({ ...s, id: String(i), sort_order: i })));
      setLoading(false); return;
    }
    try {
      const [sr, sec] = await Promise.all([
        fetch("/api/admin/hero-slides").then((r) => r.json()),
        fetch("/api/admin/homepage-sections").then((r) => r.json()),
      ]);
      if (sr.success) setSlides(sr.data);
      if (sec.success && sec.data.length > 0) {
        const byKey: Record<string, Section> = {};
        for (const d of sec.data as Section[]) byKey[d.section_key] = d;
        setSections(
          ALL_SECTIONS.map((def) =>
            byKey[def.section_key] ? { ...def, ...byKey[def.section_key] } : def
          )
        );
      }
    } catch {
      toast.error("خطأ في التحميل");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSections = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSavingSections(true);
    try {
      const r = await fetch("/api/admin/homepage-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sections),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("تحفظت جميع الأقسام");
        setEditSection(null);
        load(); // Refresh from Supabase so sections get real IDs (prevents duplicate inserts)
      } else {
        toast.error(d.error || "خطأ في الحفظ");
      }
    } catch {
      toast.error("خطأ");
    }
    setSavingSections(false);
  };

  const updateSection = (key: string, patch: Partial<Section>) =>
    setSections((arr) => arr.map((s) => (s.section_key === key ? { ...s, ...patch } : s)));

  const addNewSlide = async () => {
    if (!addSlide.title || !addSlide.image_url) { toast.error("العنوان والصورة ضروريين"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addSlide, sort_order: slides.length }),
      });
      const d = await r.json();
      if (d.success) { toast.success("تزادت الشريحة"); setShowAdd(false); setAddSlide(EMPTY_SLIDE); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const saveSlide = async (id: string) => {
    if (!HAS_SUPABASE) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/hero-slides/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSlideData),
      });
      const d = await r.json();
      if (d.success) { toast.success("تحفظت الشريحة"); setEditSlide(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const deleteSlide = async (id: string) => {
    if (!HAS_SUPABASE) return;
    try {
      const r = await fetch(`/api/admin/hero-slides/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { toast.success("تحذفت الشريحة"); setDeleteConfirm(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
  };

  const toggleSlide = async (slide: Slide) => {
    if (!HAS_SUPABASE || !slide.id) return;
    try {
      const r = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !slide.is_active }),
      });
      const d = await r.json();
      if (d.success) load();
    } catch { toast.error("خطأ"); }
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    const arr = [...sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.forEach((s, idx) => { s.sort_order = idx + 1; });
    setSections(arr);
  };

  const inp = "border border-gray-300 focus:border-brand-navy px-2 py-1.5 text-sm outline-none w-full";
  const lbl = "text-xs font-bold text-brand-gray block mb-0.5";

  if (loading) return <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-brand-navy mb-1">بناء الصفحة الرئيسية</h1>
      <p className="text-sm text-brand-gray mb-6">
        عدل الشرائح وأقسام الصفحة. اضغط ✏️ لتعديل أي قسم ثم احفظ الكل.
      </p>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          ⚠️ وضع عرض فقط — ربط Supabase لإدارة الشرائح والأقسام
        </div>
      )}

      {/* ── Hero Slider ──────────────────────────────────────────── */}
      <section className="mb-8 bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-brand-navy">Hero Slider — شرائح الصفحة</h2>
            <p className="text-xs text-brand-gray mt-0.5">كل شريحة لها صورة خاصة + عنوان + زر. إذا ما كاين شرائح، تظهر صورة ثابتة بشكل تلقائي.</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-brand-navy text-white font-bold px-3 py-1.5 text-sm"
          >
            <Plus className="h-3.5 w-3.5" /> شريحة جديدة
          </button>
        </div>

        {showAdd && (
          <div className="bg-brand-light border border-brand-gold p-4 mb-4">
            <h3 className="font-bold text-brand-navy mb-3">شريحة جديدة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div><label className={lbl}>عنوان القسم *</label><input className={inp} value={addSlide.title} onChange={(e) => setAddSlide((f) => ({ ...f, title: e.target.value }))} /></div>
              <div><label className={lbl}>النص الصغير</label><input className={inp} value={addSlide.subtitle || ""} onChange={(e) => setAddSlide((f) => ({ ...f, subtitle: e.target.value }))} /></div>
              <div className="sm:col-span-2">
                <ImageUploadField label="صورة الشريحة * — رفع صورة من الحاسوب" value={addSlide.image_url} onChange={(url) => setAddSlide((f) => ({ ...f, image_url: url }))} folder="homepage" subfolder="slides" />
              </div>
              <div><label className={lbl}>نص الزر</label><input className={inp} value={addSlide.button_text} onChange={(e) => setAddSlide((f) => ({ ...f, button_text: e.target.value }))} /></div>
              <div><label className={lbl}>رابط الزر</label><input className={inp} dir="ltr" value={addSlide.button_link} onChange={(e) => setAddSlide((f) => ({ ...f, button_link: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={addNewSlide} disabled={saving} className="bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60">{saving ? "جاري..." : "حفظ الشريحة"}</button>
              <button onClick={() => { setShowAdd(false); setAddSlide(EMPTY_SLIDE); }} className="border border-gray-300 text-brand-navy font-bold px-3 py-2 text-sm">إلغاء</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {slides.map((slide) => (
            <div key={slide.id} className={`bg-white border ${editSlide === slide.id ? "border-brand-gold" : "border-gray-200"} p-4`}>
              {editSlide === slide.id ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div><label className={lbl}>عنوان القسم</label><input className={inp} value={editSlideData.title ?? slide.title} onChange={(e) => setEditSlideData((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={lbl}>النص الصغير</label><input className={inp} value={editSlideData.subtitle ?? (slide.subtitle || "")} onChange={(e) => setEditSlideData((f) => ({ ...f, subtitle: e.target.value }))} /></div>
                    <div className="sm:col-span-2">
                      <ImageUploadField label="صورة الشريحة — رفع صورة من الحاسوب" value={editSlideData.image_url ?? slide.image_url} onChange={(url) => setEditSlideData((f) => ({ ...f, image_url: url }))} folder="homepage" subfolder="slides" />
                    </div>
                    <div><label className={lbl}>نص الزر</label><input className={inp} value={editSlideData.button_text ?? slide.button_text} onChange={(e) => setEditSlideData((f) => ({ ...f, button_text: e.target.value }))} /></div>
                    <div><label className={lbl}>رابط الزر</label><input className={inp} dir="ltr" value={editSlideData.button_link ?? slide.button_link} onChange={(e) => setEditSlideData((f) => ({ ...f, button_link: e.target.value }))} /></div>
                    <div><label className={lbl}>ترتيب الظهور</label><input type="number" className={inp} value={editSlideData.sort_order ?? slide.sort_order} onChange={(e) => setEditSlideData((f) => ({ ...f, sort_order: +e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveSlide(slide.id!)} disabled={saving} className="flex items-center gap-1.5 bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60">
                      <Save className="h-3.5 w-3.5" />{saving ? "جاري..." : "حفظ التغييرات"}
                    </button>
                    <button onClick={() => setEditSlide(null)} className="border border-gray-300 font-bold px-3 py-2 text-sm"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {slide.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.image_url} alt={slide.title} className="w-20 h-12 object-cover rounded border border-gray-100 flex-shrink-0" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                  ) : (
                    <div className="w-20 h-12 bg-brand-light border border-dashed border-gray-300 rounded flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-4 w-4 text-brand-gray" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-navy text-sm">{slide.title}</p>
                    <p className="text-xs text-brand-gray">{slide.subtitle}</p>
                    <p className="text-xs text-brand-gold" dir="ltr">{slide.button_link}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${slide.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {slide.is_active ? "نشطة" : "موقوفة"}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleSlide(slide)} className="p-1.5 border border-gray-200 hover:border-brand-gold text-brand-gray hover:text-brand-gold" title={slide.is_active ? "إخفاء" : "إظهار"}>
                      {slide.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => { setEditSlide(slide.id!); setEditSlideData({}); }} className="p-1.5 border border-gray-200 hover:border-brand-navy text-brand-gray hover:text-brand-navy" title="تعديل">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(slide.id!)} className="p-1.5 border border-gray-200 hover:border-red-400 text-brand-gray hover:text-red-500" title="حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {slides.length === 0 && (
            <div className="text-center py-8 bg-brand-light border border-dashed border-gray-300 text-brand-gray text-sm">
              ما كاين شرائح دابا — زيد شريحة جديدة. إذا بقات فارغة، تظهر Hero ثابت بشكل تلقائي.
            </div>
          )}
        </div>
      </section>

      {/* ── Homepage Sections ─────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-brand-navy">أقسام الصفحة الرئيسية</h2>
            <p className="text-xs text-brand-gray mt-0.5">اضغط ✏️ لتعديل أي قسم، استعمل السهام لتغيير الترتيب، ثم احفظ الكل</p>
          </div>
          <button
            onClick={saveSections}
            disabled={savingSections}
            className="flex items-center gap-1.5 bg-brand-gold text-white font-bold px-3 py-1.5 text-sm disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />{savingSections ? "جاري..." : "حفظ الكل"}
          </button>
        </div>

        <div className="space-y-2">
          {sections.map((sec, i) => (
            <div key={sec.section_key} className={`border ${editSection === sec.section_key ? "border-brand-gold" : "border-gray-200"}`}>
              {/* ── Collapsed row ── */}
              <div className="flex items-center gap-2 p-3 bg-white">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="p-0.5 text-brand-gray hover:text-brand-navy disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="p-0.5 text-brand-gray hover:text-brand-navy disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>

                <span className="w-6 h-6 flex items-center justify-center bg-brand-light text-xs font-black text-brand-navy rounded flex-shrink-0">{i + 1}</span>

                {sec.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sec.image_url} alt="" className="w-14 h-9 object-cover rounded border border-gray-100 flex-shrink-0" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                ) : sec.bg_color ? (
                  <div className="w-14 h-9 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: sec.bg_color }} />
                ) : (
                  <div className="w-14 h-9 bg-brand-light border border-dashed border-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-3 w-3 text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-navy text-sm">{SECTION_LABELS[sec.section_key] || sec.section_key}</p>
                  {sec.title && <p className="text-xs text-brand-gray truncate">{sec.title}</p>}
                </div>

                {DARK_BG_SECTIONS.has(sec.section_key) && (
                  <span className="text-[10px] bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded hidden sm:inline">خلفية</span>
                )}

                <button
                  onClick={() => setEditSection(editSection === sec.section_key ? null : sec.section_key)}
                  className="p-1.5 border border-gray-200 hover:border-brand-navy text-brand-gray hover:text-brand-navy flex-shrink-0"
                  title="تعديل"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => updateSection(sec.section_key, { is_active: !sec.is_active })}
                  className={`p-1.5 border transition-colors flex-shrink-0 ${sec.is_active ? "border-green-200 text-green-600 hover:border-gray-300 hover:text-gray-400" : "border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-600"}`}
                  title={sec.is_active ? "إخفاء القسم" : "إظهار القسم"}
                >
                  {sec.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>

                <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${sec.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {sec.is_active ? "ظاهر" : "مخفي"}
                </span>
              </div>

              {/* ── Inline edit form ── */}
              {editSection === sec.section_key && (
                <div className="border-t border-gray-100 p-4 bg-brand-light/30">
                  <p className="text-xs text-brand-gold font-bold mb-3">
                    ✏️ تعديل: {SECTION_LABELS[sec.section_key]}
                    {DARK_BG_SECTIONS.has(sec.section_key) && " — الصورة ستظهر كخلفية داكنة"}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* عنوان القسم */}
                    <div>
                      <label className={lbl}>عنوان القسم</label>
                      <input className={inp} value={sec.title || ""} onChange={(e) => updateSection(sec.section_key, { title: e.target.value })} placeholder="عنوان يظهر للزبون" />
                    </div>

                    {/* النص الصغير */}
                    <div>
                      <label className={lbl}>النص الصغير (تحت العنوان)</label>
                      <input className={inp} value={sec.subtitle || ""} onChange={(e) => updateSection(sec.section_key, { subtitle: e.target.value })} placeholder="نص إضافي اختياري" />
                    </div>

                    {/* النص الصغير label/badge */}
                    {HAS_LABEL.has(sec.section_key) && (
                      <div>
                        <label className={lbl}>النص الصغير فوق العنوان (badge)</label>
                        <input className={inp} value={sec.label || ""} onChange={(e) => updateSection(sec.section_key, { label: e.target.value })} placeholder="مثل: عرض محدود — YURIVA — أسئلة شائعة" />
                      </div>
                    )}

                    {/* عدد المنتجات — فقط لقسم أبرز منتجاتنا */}
                    {sec.section_key === "featured" && (
                      <div>
                        <label className={lbl}>عدد المنتجات المميزة (product_limit)</label>
                        <select
                          className={inp}
                          value={Number(sec.extra_data?.product_limit) || 8}
                          onChange={(e) =>
                            updateSection(sec.section_key, {
                              extra_data: { ...(sec.extra_data || {}), product_limit: Number(e.target.value) },
                            })
                          }
                        >
                          {[4, 8, 12, 16, 20, 24, 30, 40, 50, 75, 100].map((n) => (
                            <option key={n} value={n}>{n} منتج</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-brand-gray mt-0.5">
                          تعرض فقط المنتجات الغير محذوفة اللي عندها منتج مميز = true — الحد الأقصى 100
                        </p>
                      </div>
                    )}

                    {/* لون الخلفية */}
                    <div>
                      <label className={lbl}>لون الخلفية (اختياري)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(sec.bg_color || "") ? sec.bg_color! : "#05051F"}
                          onChange={(e) => updateSection(sec.section_key, { bg_color: e.target.value })}
                          className="w-9 h-9 cursor-pointer border border-gray-300 p-0.5 bg-white flex-shrink-0"
                        />
                        <input
                          type="text"
                          className={inp}
                          value={sec.bg_color || ""}
                          onChange={(e) => updateSection(sec.section_key, { bg_color: e.target.value })}
                          placeholder="#05051F"
                          dir="ltr"
                        />
                        {sec.bg_color && (
                          <button type="button" onClick={() => updateSection(sec.section_key, { bg_color: "" })} className="text-red-400 hover:text-red-600 text-xs whitespace-nowrap">حذف</button>
                        )}
                      </div>
                      <p className="text-[10px] text-brand-gray mt-0.5">يتطلب SQL: ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS bg_color TEXT</p>
                    </div>

                    {/* زر CTA */}
                    {HAS_BUTTON.has(sec.section_key) && (
                      <>
                        <div>
                          <label className={lbl}>نص الزر</label>
                          <input className={inp} value={sec.button_text || ""} onChange={(e) => updateSection(sec.section_key, { button_text: e.target.value })} placeholder="شوف المنتجات" />
                        </div>
                        <div>
                          <label className={lbl}>رابط الزر</label>
                          <input className={inp} dir="ltr" value={sec.button_link || ""} onChange={(e) => updateSection(sec.section_key, { button_link: e.target.value })} placeholder="/products" />
                        </div>
                      </>
                    )}

                    {/* صورة القسم / صورة الخلفية */}
                    <div className="sm:col-span-2">
                      <ImageUploadField
                        label={
                          DARK_BG_SECTIONS.has(sec.section_key)
                            ? "صورة الخلفية (تظهر تحت طبقة داكنة) — رفع صورة من الحاسوب"
                            : "صورة القسم (تظهر فوق القسم كبانر) — رفع صورة من الحاسوب"
                        }
                        value={sec.image_url || ""}
                        onChange={(url) => updateSection(sec.section_key, { image_url: url })}
                        folder="homepage"
                        subfolder={sec.section_key}
                      />
                      {sec.image_url && (
                        <button type="button" onClick={() => updateSection(sec.section_key, { image_url: "" })} className="mt-1 text-xs text-red-500 hover:text-red-700 underline">
                          حذف الصورة
                        </button>
                      )}
                    </div>

                    {/* ترتيب الظهور */}
                    <div>
                      <label className={lbl}>ترتيب الظهور</label>
                      <input type="number" className={inp} value={sec.sort_order} onChange={(e) => updateSection(sec.section_key, { sort_order: +e.target.value })} />
                      <p className="text-[10px] text-brand-gray mt-0.5">يمكن ترتيب الأقسام بالسهام ↑↓ من فوق أيضاً</p>
                    </div>

                    {/* حفظ */}
                    <div className="sm:col-span-2 flex justify-end pt-2">
                      <button onClick={saveSections} disabled={savingSections} className="flex items-center gap-1.5 bg-brand-navy text-white font-bold px-5 py-2 text-sm disabled:opacity-60">
                        <Save className="h-3.5 w-3.5" />{savingSections ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={saveSections} disabled={savingSections} className="flex items-center gap-2 bg-brand-gold text-white font-bold px-6 py-2.5 text-sm disabled:opacity-60">
            <Save className="h-4 w-4" />{savingSections ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
          </button>
        </div>
      </section>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-brand-gray text-sm mb-5">واش راك متأكد؟ الشريحة غادي تتحذف نهائياً.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteSlide(deleteConfirm)} className="bg-red-500 text-white font-bold px-5 py-2 text-sm">حذف</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-gray-300 font-bold px-4 py-2 text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
