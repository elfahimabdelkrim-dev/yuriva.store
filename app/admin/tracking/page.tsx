"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const hasSupabase = !!(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL
);

// Active Meta Pixels — both are always active and receive all events
const META_PIXELS = [
  { id: "4569111183412330", label: "Main Pixel",   badge: "رئيسي" },
  { id: "1162700877684124", label: "Second Pixel", badge: "ثانوي" },
];

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
    if (!hasSupabase) { toast.error("\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase \u0628\u0627\u0634 \u062a\u062d\u0641\u0638"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) toast.success("\u062a\u062d\u0641\u0638\u062a \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u062a\u0628\u0639");
      else toast.error(data.error || "\u0648\u0642\u0639 \u062e\u0637\u0623");
    } catch {
      toast.error("\u0648\u0642\u0639 \u062e\u0637\u0623");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-brand-navy mb-2">\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u062a\u0628\u0639</h1>
      <p className="text-brand-gray text-sm mb-6">
        \u0632\u064a\u062f IDs \u0647\u0646\u0627 — \u0627\u0644\u0640 pixels \u0643\u064a\u062a\u062d\u0645\u0644\u0648 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0645\u0646 \u0645\u062a\u063a\u064a\u0631\u0627\u062a \u0627\u0644\u0628\u064a\u0626\u0629. \u0631\u0628\u0637 Supabase \u0644\u062d\u0641\u0638 \u062f\u064a\u0646\u0627\u0645\u064a\u0643\u064a.
      </p>

      {/* ── Active Meta Pixels status ── */}
      <div className="bg-white border border-gray-200 p-4 mb-6">
        <p className="font-black text-brand-navy text-sm mb-3">Meta Pixels \u0627\u0644\u0646\u0634\u064a\u0637\u0629</p>
        <div className="space-y-2">
          {META_PIXELS.map((px, i) => (
            <div key={px.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded">
              <span className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-navy">{i + 1}. {px.label}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-brand-navy text-white rounded font-mono">{px.badge}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">Active</span>
                </div>
                <p className="text-xs font-mono text-gray-500 mt-0.5" dir="ltr">{px.id}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          \u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0643\u0633\u0644\u0627\u062a \u0643\u062a\u0648\u0635\u0644\u0647\u0627 PageView \u060c ViewContent \u060c InitiateCheckout \u060c Purchase \u060c AddToCart.
        </p>
      </div>

      {/* ── Env setup guide ── */}
      <div className="bg-brand-light border border-gray-200 p-4 mb-5 text-sm">
        <p className="font-bold text-brand-navy mb-2">\u0644\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0628\u064a\u0643\u0633\u0644\u0627\u062a \u0641\u064a .env.local:</p>
        <pre className="text-xs bg-white p-2 text-brand-navy overflow-x-auto" dir="ltr">{`NEXT_PUBLIC_META_PIXEL_ID=4569111183412330
NEXT_PUBLIC_META_PIXEL_ID_2=1162700877684124
NEXT_PUBLIC_TIKTOK_PIXEL_ID=CXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`}</pre>
      </div>

      {/* ── Dynamic tracking (Supabase) ── */}
      <div className="space-y-4">
        {[
          { key: "meta_pixel", label: "Meta Pixel (\u0625\u0636\u0627\u0641\u064a)", placeholder: "123456789" },
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
          {saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "\u062d\u0641\u0638 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u062a\u0628\u0639"}
        </button>
      </div>
    </div>
  );
}
