"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, MessageCircle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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
  header_bg_color: "#05051F",
  header_bg_image: "",
  header_text_color: "#FFFFFF",
  header_accent_color: "#C9A84C",
  footer_bg_color: "#05051F",
  footer_bg_image: "",
  footer_text_color: "#FFFFFF",
  footer_accent_color: "#C9A84C",
  announcement_bg_color: "#05051F",
  announcement_text_color: "#FFFFFF",
  announcement_link_text: "",
  announcement_link_url: "",
};

type FormState = typeof DEFAULTS;

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

interface WaStatus {
  enabled: boolean;
  provider: string;
  adminPhone: string;
  configured: boolean;
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [waTesting, setWaTesting] = useState(false);

  const loadWaStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/whatsapp-notify-status");
      const d = await r.json() as WaStatus & { success?: boolean };
      if (d.enabled !== undefined) setWaStatus(d);
    } catch { /* ignore */ }
  }, []);

  const testWaNotify = async () => {
    setWaTesting(true);
    try {
      const r = await fetch("/api/admin/test-whatsapp-notification", { method: "POST" });
      const d = await r.json() as { success: boolean; error?: string; result?: { error?: string } };
      if (d.success) toast.success("\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0628\u0646\u062c\u0627\u062d ✅");
      else toast.error("\u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644: " + (d.error || d.result?.error || "\u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641"));
    } catch {
      toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645");
    }
    setWaTesting(false);
  };

  const load = useCallback(async () => {
    if (!HAS_SUPABASE) { setLoading(false); return; }
    try {
      const r = await fetch("/api/admin/settings");
      const d = await r.json();
      if (d.success && d.data) setForm(prev => ({ ...prev, ...d.data }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); loadWaStatus(); }, [load, loadWaStatus]);

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!HAS_SUPABASE) { toast.error("\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase \u0628\u0627\u0634 \u062a\u062d\u0641\u0638"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) toast.success("\u062a\u062d\u0641\u0638\u062a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0628\u0646\u062c\u0627\u062d");
      else toast.error(d.error || "\u0648\u0642\u0639 \u062e\u0637\u0623");
    } catch {
      toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062d\u0641\u0638");
    }
    setSaving(false);
  };

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";
  const sec = "bg-white border border-gray-200 p-5 space-y-4";
  const sub = "font-bold text-sm text-brand-navy border-b border-gray-100 pb-2 mb-3";

  if (loading) return <div className="text-center py-12 text-brand-gray">\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-brand-navy">\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2 text-sm hover:bg-opacity-85 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />{saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"}
        </button>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          \u26a0\ufe0f \u0631\u0628\u0637 Supabase \u0644\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0641\u0639\u0644\u064a\u0627\u064b
        </div>
      )}

      <div className="space-y-5">

        {/* Store info */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>\u0627\u0633\u0645 \u0627\u0644\u0645\u062a\u062c\u0631</label><input className={inp} value={form.store_name} onChange={e => set("store_name", e.target.value)} /></div>
            <div><label className={lbl}>\u0631\u0642\u0645 \u0648\u0627\u062a\u0633\u0627\u0628 (212XXXXXXXXX)</label><input className={inp} dir="ltr" value={form.whatsapp_number} onChange={e => set("whatsapp_number", e.target.value)} /></div>
            <div><label className={lbl}>\u0627\u0644\u0625\u064a\u0645\u064a\u0644</label><input type="email" className={inp} dir="ltr" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div>
            <ImageUploadField
              label="\u0644\u0648\u063a\u0648 \u0627\u0644\u0645\u062a\u062c\u0631"
              value={form.logo_url || ""}
              onChange={url => set("logo_url", url)}
              folder="media"
              subfolder="settings"
            />
          </div>
        </div>

        {/* Social links */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u064a</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Instagram</label><input className={inp} dir="ltr" value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/yuriva" /></div>
            <div><label className={lbl}>Facebook</label><input className={inp} dir="ltr" value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/yuriva" /></div>
            <div><label className={lbl}>TikTok</label><input className={inp} dir="ltr" value={form.tiktok_url} onChange={e => set("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@yuriva" /></div>
          </div>
        </div>

        {/* Announcement */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">\u0634\u0631\u064a\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.announcement_active} onChange={e => set("announcement_active", e.target.checked)} className="accent-brand-gold w-4 h-4" />
            <span className="text-sm font-medium text-brand-navy">\u062a\u0641\u0639\u064a\u0644 \u0634\u0631\u064a\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646</span>
          </label>
          <div><label className={lbl}>\u0646\u0635 \u0627\u0644\u0625\u0639\u0644\u0627\u0646</label><input className={inp} value={form.announcement_text} onChange={e => set("announcement_text", e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <ColorField label="\u0644\u0648\u0646 \u062e\u0644\u0641\u064a\u0629 \u0634\u0631\u064a\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646" value={form.announcement_bg_color || "#05051F"} onChange={v => set("announcement_bg_color", v)} />
            <ColorField label="\u0644\u0648\u0646 \u0646\u0635 \u0634\u0631\u064a\u0637 \u0627\u0644\u0625\u0639\u0644\u0627\u0646" value={form.announcement_text_color || "#FFFFFF"} onChange={v => set("announcement_text_color", v)} />
            <div><label className={lbl}>\u0646\u0635 \u0627\u0644\u0631\u0627\u0628\u0637 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)</label><input className={inp} value={form.announcement_link_text || ""} onChange={e => set("announcement_link_text", e.target.value)} /></div>
            <div><label className={lbl}>\u0631\u0627\u0628\u0637 URL (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)</label><input className={inp} dir="ltr" value={form.announcement_link_url || ""} onChange={e => set("announcement_link_url", e.target.value)} placeholder="/collections/offers" /></div>
          </div>
          <div
            className="mt-2 py-2 px-4 flex items-center justify-center gap-3 text-xs font-medium border border-gray-200"
            style={{ backgroundColor: form.announcement_bg_color || "#05051F", color: form.announcement_text_color || "#FFFFFF" }}
          >
            <span>{form.announcement_text || "\u0646\u0635 \u0627\u0644\u0625\u0639\u0644\u0627\u0646"}</span>
            {form.announcement_link_text && (
              <span className="underline font-bold">{form.announcement_link_text} \u2190</span>
            )}
          </div>
        </div>

        {/* Policies */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">\u0646\u0635\u0648\u0635 \u0627\u0644\u0633\u064a\u0627\u0633\u0627\u062a</h2>
          <div><label className={lbl}>\u0646\u0635 \u0627\u0644\u062a\u0648\u0635\u064a\u0644</label><textarea className={inp} rows={2} value={form.delivery_text} onChange={e => set("delivery_text", e.target.value)} /></div>
          <div><label className={lbl}>\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0648\u0627\u0644\u0625\u0631\u062c\u0627\u0639</label><textarea className={inp} rows={2} value={form.return_policy_text} onChange={e => set("return_policy_text", e.target.value)} /></div>
          <div><label className={lbl}>\u0646\u0635 \u0627\u0644\u0640 Footer</label><textarea className={inp} rows={2} value={form.footer_text || ""} onChange={e => set("footer_text", e.target.value)} /></div>
        </div>

        {/* SEO */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">SEO \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a</h2>
          <div><label className={lbl}>SEO Title</label><input className={inp} value={form.default_seo_title || ""} onChange={e => set("default_seo_title", e.target.value)} /></div>
          <div><label className={lbl}>SEO Description</label><textarea className={inp} rows={2} value={form.default_seo_description || ""} onChange={e => set("default_seo_description", e.target.value)} /></div>
          <div>
            <ImageUploadField
              label="\u0635\u0648\u0631\u0629 OG \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629"
              value={form.default_og_image || ""}
              onChange={url => set("default_og_image", url)}
              folder="media"
              subfolder="settings"
            />
          </div>
        </div>

        {/* Header + Footer styling */}
        <div className={sec}>
          <h2 className="font-black text-brand-navy">\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0647\u064a\u062f\u0631 \u0648\u0627\u0644\u0641\u0648\u062a\u0631</h2>

          {/* Header */}
          <div className="space-y-4 pt-2">
            <p className={sub}>\u0627\u0644\u0647\u064a\u062f\u0631 (Header)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="\u0644\u0648\u0646 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0647\u064a\u062f\u0631" value={form.header_bg_color} onChange={v => set("header_bg_color", v)} />
              <ColorField label="\u0644\u0648\u0646 \u0646\u0635 \u0627\u0644\u0647\u064a\u062f\u0631" value={form.header_text_color} onChange={v => set("header_text_color", v)} />
              <ColorField label="\u0644\u0648\u0646 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 (accent)" value={form.header_accent_color} onChange={v => set("header_accent_color", v)} />
            </div>
            <ImageUploadField
              label="\u0635\u0648\u0631\u0629 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0647\u064a\u062f\u0631"
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
                \u062d\u0630\u0641 \u0635\u0648\u0631\u0629 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0647\u064a\u062f\u0631
              </button>
            )}
            <PreviewStrip
              label="YURIVA — \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0647\u064a\u062f\u0631"
              bgColor={form.header_bg_color}
              bgImage={form.header_bg_image}
              textColor={form.header_text_color}
            />
          </div>

          {/* Footer */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <p className={sub}>\u0627\u0644\u0641\u0648\u062a\u0631 (Footer)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="\u0644\u0648\u0646 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0641\u0648\u062a\u0631" value={form.footer_bg_color} onChange={v => set("footer_bg_color", v)} />
              <ColorField label="\u0644\u0648\u0646 \u0646\u0635 \u0627\u0644\u0641\u0648\u062a\u0631" value={form.footer_text_color} onChange={v => set("footer_text_color", v)} />
              <ColorField label="\u0644\u0648\u0646 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 (accent)" value={form.footer_accent_color} onChange={v => set("footer_accent_color", v)} />
            </div>
            <ImageUploadField
              label="\u0635\u0648\u0631\u0629 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0641\u0648\u062a\u0631"
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
                \u062d\u0630\u0641 \u0635\u0648\u0631\u0629 \u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0641\u0648\u062a\u0631
              </button>
            )}
            <PreviewStrip
              label="YURIVA — \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0641\u0648\u062a\u0631"
              bgColor={form.footer_bg_color}
              bgImage={form.footer_bg_image}
              textColor={form.footer_text_color}
            />
          </div>
        </div>

        {/* WhatsApp admin notifications status */}
        <div className={sec}>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            <h2 className="font-black text-brand-navy">\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0648\u0627\u062a\u0633\u0627\u0628 \u0644\u0644\u0637\u0644\u0628\u0627\u062a</h2>
          </div>

          {waStatus ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  waStatus.enabled ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}>
                  {waStatus.enabled
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <XCircle className="h-3.5 w-3.5" />}
                  {waStatus.enabled ? "\u0645\u0641\u0639\u0651\u0644" : "\u063a\u064a\u0631 \u0645\u0641\u0639\u0651\u0644"}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  waStatus.configured ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                }`}>
                  {waStatus.configured
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <AlertCircle className="h-3.5 w-3.5" />}
                  {waStatus.configured ? "\u0645\u0643\u0648\u0651\u0646" : "\u0646\u0627\u0642\u0635 \u0627\u0644\u0625\u0639\u062f\u0627\u062f"}
                </div>
                <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                  {waStatus.provider}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">\u0631\u0642\u0645 \u0627\u0644\u0645\u062f\u064a\u0631</span>
                  <span className="font-mono font-bold text-brand-navy" dir="ltr">+{waStatus.adminPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">\u0627\u0644\u0645\u0632\u0648\u0651\u062f</span>
                  <span className="font-mono text-brand-navy">{waStatus.provider}</span>
                </div>
              </div>

              {!waStatus.enabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800 leading-relaxed">
                  \u0644\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a\u060c \u0623\u0636\u0641 \u0641\u064a <code className="font-mono bg-yellow-100 px-1">.env.local</code>:<br />
                  <code className="font-mono">WHATSAPP_NOTIFY_ENABLED=true</code>
                </div>
              )}
              {waStatus.enabled && !waStatus.configured && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-800 leading-relaxed">
                  {waStatus.provider === "webhook"
                    ? "\u0623\u0636\u0641 WHATSAPP_WEBHOOK_URL \u0641\u064a .env.local"
                    : "\u0623\u0636\u0641 WHATSAPP_CLOUD_API_TOKEN \u0648 WHATSAPP_CLOUD_PHONE_NUMBER_ID \u0641\u064a .env.local"}
                </div>
              )}

              {waStatus.enabled && waStatus.configured && (
                <button
                  onClick={testWaNotify}
                  disabled={waTesting}
                  className="flex items-center gap-2 bg-[#25D366] text-white font-bold px-4 py-2 rounded text-sm hover:bg-[#1ebe5d] disabled:opacity-60 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {waTesting ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644..." : "\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u062e\u062a\u0628\u0627\u0631"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u062d\u0627\u0644\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a...</p>
          )}

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0633\u0629 (API tokens) \u062a\u064f\u062d\u0641\u0638 \u0641\u064a .env.local \u0641\u0642\u0637 — \u0644\u0627 \u062a\u0638\u0647\u0631 \u0647\u0646\u0627 \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064a\u0629.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand-navy text-white font-bold py-3 hover:bg-opacity-85 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />{saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"}
        </button>
      </div>
    </div>
  );
}
