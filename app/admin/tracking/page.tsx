"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const hasSupabase = !!(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL
);

export default function AdminTrackingPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    meta_pixel_id: "",
    tiktok_pixel_id: "",
    google_analytics_id: "",
    google_tag_manager_id: "",
    meta_pixel_enabled: false,
    tiktok_pixel_enabled: false,
    google_analytics_enabled: false,
    google_tag_manager_enabled: false,
  });

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";

  const handleSave = async () => {
    if (!hasSupabase) { toast.error("خاصك تربط Supabase باش تحفظ"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) toast.success("تحفظت إعدادات التتبع");
      else toast.error(data.error || "وقع خطأ");
    } catch {
      toast.error("وقع خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-brand-navy mb-2">إعدادات التتبع</h1>
      <p className="text-brand-gray text-sm mb-6">
        زيد IDs هنا — الـ pixels كيتحملو تلقائياً من متغيرات البيئة. ربط Supabase لحفظ ديناميكي.
      </p>
      <div className="bg-brand-light border border-gray-200 p-4 mb-5 text-sm">
        <p className="font-bold text-brand-navy mb-2">🔧 للتفعيل الآن:</p>
        <p className="text-brand-gray text-xs mb-1">زيد في .env.local:</p>
        <pre className="text-xs bg-white p-2 text-brand-navy overflow-x-auto" dir="ltr">{`NEXT_PUBLIC_META_PIXEL_ID=123456789\nNEXT_PUBLIC_TIKTOK_PIXEL_ID=CXXXXX\nNEXT_PUBLIC_GA_ID=G-XXXXXXXXXX\nNEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`}</pre>
      </div>
      <div className="space-y-4">
        {[
          { key: "meta_pixel", label: "Meta Pixel", placeholder: "123456789" },
          { key: "tiktok_pixel", label: "TikTok Pixel", placeholder: "CXXXX..." },
          { key: "google_analytics", label: "Google Analytics", placeholder: "G-XXXXXXXXXX" },
          { key: "google_tag_manager", label: "Google Tag Manager", placeholder: "GTM-XXXXXXX" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="bg-white border border-gray-200 p-4 flex items-center gap-4">
            <label className="flex items-center gap-2 w-44 flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={form[`${key}_enabled` as keyof typeof form] as boolean}
                onChange={(e) => setForm((f) => ({ ...f, [`${key}_enabled`]: e.target.checked }))}
                className="accent-brand-gold"
              />
              <span className="text-sm font-bold text-brand-navy">{label}</span>
            </label>
            <input
              value={form[`${key}_id` as keyof typeof form] as string}
              onChange={(e) => setForm((f) => ({ ...f, [`${key}_id`]: e.target.value }))}
              disabled={!form[`${key}_enabled` as keyof typeof form]}
              className={`${inp} flex-1 disabled:opacity-50`}
              placeholder={placeholder}
              dir="ltr"
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-navy text-white font-bold px-8 py-3 hover:bg-opacity-85 disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ إعدادات التتبع"}
        </button>
      </div>
    </div>
  );
}
