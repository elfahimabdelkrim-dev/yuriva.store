"use client";
import { useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import ImageUploadField from "@/components/admin/ImageUploadField";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

const DEFAULTS = {
  store_name: "YURIVA",
  whatsapp_number: "212666648564",
  email: "contact.yuriva@gmail.com",
  facebook_url: "https://facebook.com/noirelite",
  instagram_url: "https://instagram.com/noirelite",
  tiktok_url: "https://tiktok.com/@yuriva",
  logo_url: "",
  announcement_text: "🔥 عرض محدود اليوم فقط | توصيل مجاني داخل المغرب | الدفع عند الاستلام",
  announcement_active: true,
  delivery_text: "التوصيل مجاني لجميع مدن المغرب. مدة التوصيل 24-72 ساعة.",
  return_policy_text: "التبديل ممكن خلال 7 أيام إلى كان مشكل فالقياس أو المنتج.",
  footer_text: "YURIVA — جميع الحقوق محفوظة",
  default_seo_title: "YURIVA | سراويل Para وShorts الرجالية — توصيل مجاني المغرب",
  default_seo_description: "اشري أحسن سراويل Para، Shorts Para وCargo pants فالمغرب. توصيل مجاني، الدفع عند الاستلام.",
  default_og_image: "",
  // Header style
  header_bg_color: "#05051F",
  header_bg_image: "",
  header_text_color: "#FFFFFF",
  header_accent_color: "#C9A84C",
  // Footer style
  footer_bg_color: "#05051F",
  footer_bg_image: "",
  footer_text_color: "#FFFFFF",
  footer_accent_color: "#C9A84C",
  // Announcement bar custom colors (requires SQL migration)
  announcement_bg_color: "#05051F",
  announcement_text_color: "#FFFFFF",
  announcement_link_text: "",
  announcement_link_url: "",
};

type FormState = typeof DEFAULTS;

/** Darija color picker + manual hex input pair */
function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-bold text-brand-navy mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 cursor-pointer border border-gray-300 p-0.5 bg-white"
          title={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#05051F"
          dir="ltr"
          className="flex-1 border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none font-mono"
        />
      </div>
    </div>
  );
}

/** Small inline preview strip */
function PreviewStrip({
  label, bgColor, bgImage, textColor,
}: { label: string; bgColor: string; bgImage: string; textColor: string }) {
  const style: React.CSSProperties = bgImage
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: textColor || "#FFFFFF",
      }
    : { backgroundColor: bgColor || "#05051F", color: textColor || "#FFFFFF" };

  return (
    <div className="mt-3 border border-gray-200 overflow-hidden rounded-sm">
      <div className="flex items-center justify-center h-12 text-sm font-bold" style={style}>
        {label}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!HAS_SUPABASE) { setLoading(false); return; }
    try {
      const r = await fetch("/api/admin/settings");
      const d = await r.json();
      if (d.success && d.data) setForm(prev => ({ ...prev, ...d.data }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase باش تحفظ"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) toast.success("تحفظت الإعدادات بنجاح");
      else toast.error(d.error || "وقع خطأ");
    } catch {
      toast.error("خطأ في الحفظ");
    }
    setSaving(false);
  };

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";
  const sec = "bg-white border border-gray-200 p-5 space-y-4";
  const sub = "font-bold text-sm text-brand-navy border-b border-gray-100 pb-2 mb-3";

  if (loading) return <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-brand-navy">إعدادات المتجر</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2 text-sm hover:bg-opacity-85 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          ⚠️ ربط Supabase لحفظ الإعدادات فعلياً
        </div>
      )}

      <div className="space-y-5">

        {/* ── معلومات المتجر ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">معلومات المتجر</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>اسم المتجر</label><input className={inp} value={form.store_name} onChange={e => set("store_name", e.target.value)} /></div>
            <div><label className={lbl}>رقم واتساب (212XXXXXXXXX)</label><input className={inp} dir="ltr" value={form.whatsapp_number} onChange={e => set("whatsapp_number", e.target.value)} /></div>
            <div><label className={lbl}>الإيميل</label><input type="email" className={inp} dir="ltr" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div>
            <ImageUploadField
              label="لوغو المتجر"
              value={form.logo_url || ""}
              onChange={url => set("logo_url", url)}
              folder="media"
              subfolder="settings"
            />
          </div>
        </div>

        {/* ── روابط التواصل ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">روابط التواصل الاجتماعي</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Instagram</label><input className={inp} dir="ltr" value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/yuriva" /></div>
            <div><label className={lbl}>Facebook</label><input className={inp} dir="ltr" value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/yuriva" /></div>
            <div><label className={lbl}>TikTok</label><input className={inp} dir="ltr" value={form.tiktok_url} onChange={e => set("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@yuriva" /></div>
          </div>
        </div>

        {/* ── شريط الإعلان ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">شريط الإعلان</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.announcement_active} onChange={e => set("announcement_active", e.target.checked)} className="accent-brand-gold w-4 h-4" />
            <span className="text-sm font-medium text-brand-navy">تفعيل شريط الإعلان</span>
          </label>
          <div><label className={lbl}>نص الإعلان</label><input className={inp} value={form.announcement_text} onChange={e => set("announcement_text", e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <ColorField label="لون خلفية شريط الإعلان" value={form.announcement_bg_color || "#05051F"} onChange={v => set("announcement_bg_color", v)} />
            <ColorField label="لون نص شريط الإعلان" value={form.announcement_text_color || "#FFFFFF"} onChange={v => set("announcement_text_color", v)} />
            <div><label className={lbl}>نص الرابط (اختياري)</label><input className={inp} value={form.announcement_link_text || ""} onChange={e => set("announcement_link_text", e.target.value)} placeholder="شوف العروض" /></div>
            <div><label className={lbl}>رابط URL (اختياري)</label><input className={inp} dir="ltr" value={form.announcement_link_url || ""} onChange={e => set("announcement_link_url", e.target.value)} placeholder="/collections/offers" /></div>
          </div>
          {/* Live preview of announcement bar */}
          <div
            className="mt-2 py-2 px-4 flex items-center justify-center gap-3 text-xs font-medium border border-gray-200"
            style={{ backgroundColor: form.announcement_bg_color || "#05051F", color: form.announcement_text_color || "#FFFFFF" }}
          >
            <span>{form.announcement_text || "نص الإعلان"}</span>
            {form.announcement_link_text && (
              <span className="underline font-bold">{form.announcement_link_text} ←</span>
            )}
          </div>
        </div>

        {/* ── نصوص السياسات ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">نصوص السياسات</h2>
          <div><label className={lbl}>نص التوصيل</label><textarea className={inp} rows={2} value={form.delivery_text} onChange={e => set("delivery_text", e.target.value)} /></div>
          <div><label className={lbl}>سياسة التبديل والإرجاع</label><textarea className={inp} rows={2} value={form.return_policy_text} onChange={e => set("return_policy_text", e.target.value)} /></div>
          <div><label className={lbl}>نص الـ Footer</label><textarea className={inp} rows={2} value={form.footer_text || ""} onChange={e => set("footer_text", e.target.value)} /></div>
        </div>

        {/* ── SEO الافتراضي ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">SEO الافتراضي</h2>
          <div><label className={lbl}>SEO Title</label><input className={inp} value={form.default_seo_title || ""} onChange={e => set("default_seo_title", e.target.value)} /></div>
          <div><label className={lbl}>SEO Description</label><textarea className={inp} rows={2} value={form.default_seo_description || ""} onChange={e => set("default_seo_description", e.target.value)} /></div>
          <div>
            <ImageUploadField
              label="صورة OG الافتراضية"
              value={form.default_og_image || ""}
              onChange={url => set("default_og_image", url)}
              folder="media"
              subfolder="settings"
            />
          </div>
        </div>

        {/* ── تخصيص الهيدر والفوتر ── */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">تخصيص الهيدر والفوتر</h2>

          {/* Header */}
          <div className="space-y-4 pt-2">
            <p className={sub}>الهيدر (Header)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="لون خلفية الهيدر" value={form.header_bg_color} onChange={v => set("header_bg_color", v)} />
              <ColorField label="لون نص الهيدر" value={form.header_text_color} onChange={v => set("header_text_color", v)} />
              <ColorField label="لون التفاصيل (accent)" value={form.header_accent_color} onChange={v => set("header_accent_color", v)} />
            </div>
            <ImageUploadField
              label="صورة خلفية الهيدر"
              value={form.header_bg_image || ""}
              onChange={url => set("header_bg_image", url)}
              folder="media"
              subfolder="header"
            />
            {form.header_bg_image && (
              <button
                type="button"
                onClick={() => set("header_bg_image", "")}
                className="text-xs text-red-500 hover:underline"
              >
                حذف صورة خلفية الهيدر
              </button>
            )}
            <PreviewStrip
              label="YURIVA — معاينة الهيدر"
              bgColor={form.header_bg_color}
              bgImage={form.header_bg_image}
              textColor={form.header_text_color}
            />
          </div>

          {/* Footer */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <p className={sub}>الفوتر (Footer)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="لون خلفية الفوتر" value={form.footer_bg_color} onChange={v => set("footer_bg_color", v)} />
              <ColorField label="لون نص الفوتر" value={form.footer_text_color} onChange={v => set("footer_text_color", v)} />
              <ColorField label="لون التفاصيل (accent)" value={form.footer_accent_color} onChange={v => set("footer_accent_color", v)} />
            </div>
            <ImageUploadField
              label="صورة خلفية الفوتر"
              value={form.footer_bg_image || ""}
              onChange={url => set("footer_bg_image", url)}
              folder="media"
              subfolder="footer"
            />
            {form.footer_bg_image && (
              <button
                type="button"
                onClick={() => set("footer_bg_image", "")}
                className="text-xs text-red-500 hover:underline"
              >
                حذف صورة خلفية الفوتر
              </button>
            )}
            <PreviewStrip
              label="YURIVA — معاينة الفوتر"
              bgColor={form.footer_bg_color}
              bgImage={form.footer_bg_image}
              textColor={form.footer_text_color}
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand-navy text-white font-bold py-3 hover:bg-opacity-85 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}
