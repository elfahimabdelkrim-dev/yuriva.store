"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, TestTube, RefreshCw, Download, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function AdminGoogleSheetsPage() {
  const [form, setForm] = useState({ enabled: false, sheet_id: "", service_account_email: "", last_sync_status: "" });
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!HAS_SUPABASE) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/admin/google-sheets");
      const d = await r.json();
      if (d.success) {
        if (d.data) setForm(prev => ({ ...prev, ...d.data }));
        setHasKey(d.hasKey);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/google-sheets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) toast.success("تحفظت الإعدادات");
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const test = async () => {
    if (!form.sheet_id) { toast.error("دخل Google Sheet ID أولاً"); return; }
    setTesting(true);
    try {
      const r = await fetch("/api/admin/google-sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheet_id: form.sheet_id }) });
      const d = await r.json();
      if (d.success) toast.success("الربط يخدم ✓");
      else toast.error(d.error || "الربط فاشل");
    } catch { toast.error("خطأ في الاختبار"); }
    setTesting(false);
  };

  const exportCSV = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setExporting(true);
    try {
      const r = await fetch("/api/admin/orders/export");
      if (!r.ok) { toast.error("خطأ في التصدير"); setExporting(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `yuriva-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("تنزّل CSV");
    } catch { toast.error("خطأ في التصدير"); }
    setExporting(false);
  };

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";

  if (loading) return <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-brand-navy mb-2">Google Sheets</h1>
      <p className="text-brand-gray text-sm mb-6">زامن الطلبات تلقائياً مع Google Sheets أو صدّر CSV</p>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">⚠️ ربط Supabase لحفظ إعدادات Google Sheets</div>
      )}

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`p-3 border flex items-center gap-2 ${hasKey ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {hasKey ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
          <div>
            <p className="text-xs font-bold">{hasKey ? "GOOGLE_PRIVATE_KEY ✓" : "GOOGLE_PRIVATE_KEY مفقود"}</p>
            <p className="text-xs text-brand-gray/70">{hasKey ? "موجود فـ .env" : "زيده فـ .env.local"}</p>
          </div>
        </div>
        <div className={`p-3 border flex items-center gap-2 ${form.enabled ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
          {form.enabled ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />}
          <div>
            <p className="text-xs font-bold">{form.enabled ? "المزامنة مفعّلة" : "المزامنة موقوفة"}</p>
            {form.last_sync_status && <p className="text-xs text-brand-gray/70">{form.last_sync_status}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-5 space-y-4 mb-4">
        <h2 className="font-black text-brand-navy">إعدادات المزامنة</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="accent-brand-gold w-4 h-4" />
          <span className="text-sm font-bold text-brand-navy">تفعيل المزامنة التلقائية</span>
        </label>
        <div><label className={lbl}>Google Sheet ID</label><input className={inp} dir="ltr" value={form.sheet_id} onChange={e => setForm(f => ({ ...f, sheet_id: e.target.value }))} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" /></div>
        <div><label className={lbl}>Service Account Email</label><input className={inp} dir="ltr" value={form.service_account_email} onChange={e => setForm(f => ({ ...f, service_account_email: e.target.value }))} placeholder="yuriva@project.iam.gserviceaccount.com" /></div>

        <div className="bg-brand-light p-3 text-xs text-brand-gray">
          <p className="font-bold text-brand-navy mb-1">🔐 أمان:</p>
          <p>GOOGLE_PRIVATE_KEY خاص يكون فـ <code className="bg-white px-1">.env.local</code> فقط — ما تدخلوش هنا أبداً.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60">
            <Save className="h-3.5 w-3.5" />{saving ? "جاري..." : "حفظ"}
          </button>
          <button onClick={test} disabled={testing || !hasKey} title={!hasKey ? "خاصك تزيد GOOGLE_PRIVATE_KEY فـ .env.local" : ""} className="flex items-center gap-2 border border-brand-gold text-brand-gold font-bold px-4 py-2 text-sm hover:bg-brand-gold hover:text-white disabled:opacity-40 transition-colors">
            <TestTube className="h-3.5 w-3.5" />{testing ? "جاري الاختبار..." : "اختبر الربط"}
          </button>
          <button onClick={() => { toast("جاري مزامنة يدوية..."); }} disabled className="flex items-center gap-2 border border-gray-300 text-brand-gray font-bold px-4 py-2 text-sm opacity-40 cursor-not-allowed">
            <RefreshCw className="h-3.5 w-3.5" />مزامنة يدوية
          </button>
        </div>
      </div>

      {/* Export CSV */}
      <div className="bg-white border border-gray-200 p-5">
        <h2 className="font-black text-brand-navy mb-2">تصدير الطلبات CSV</h2>
        <p className="text-brand-gray text-sm mb-4">صدّر جميع الطلبات كملف CSV — يشتغل بدون Google Sheets</p>
        <button onClick={exportCSV} disabled={exporting || !HAS_SUPABASE} className="flex items-center gap-2 bg-brand-gold text-white font-bold px-5 py-2 text-sm hover:bg-opacity-85 disabled:opacity-50">
          <Download className="h-4 w-4" />{exporting ? "جاري التصدير..." : "تحميل CSV"}
        </button>
        {!HAS_SUPABASE && <p className="text-xs text-yellow-700 mt-2">خاصك تربط Supabase باش تقدر تصدّر</p>}
      </div>
    </div>
  );
}
