"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, TestTube, RefreshCw, Download, AlertCircle, CheckCircle, Bug } from "lucide-react";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

interface EnvStatus {
  hasPrivateKey: boolean;
  hasServiceEmail: boolean;
  hasSheetId: boolean;
  privateKeyValid?: boolean;
}

export default function AdminGoogleSheetsPage() {
  const [form, setForm] = useState({
    enabled: false,
    sheet_id: "",
    service_account_email: "",
    last_sync_status: "",
  });
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    hasPrivateKey: false,
    hasServiceEmail: false,
    hasSheetId: false,
    privateKeyValid: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/google-sheets", {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      const d = await r.json() as {
        success: boolean;
        data?: typeof form;
        hasPrivateKey?: boolean;
        hasServiceEmail?: boolean;
        hasSheetId?: boolean;
        privateKeyValid?: boolean;
      };
      if (d.success) {
        if (d.data) setForm(prev => ({ ...prev, ...d.data }));
        setEnvStatus({
          hasPrivateKey: d.hasPrivateKey ?? false,
          hasServiceEmail: d.hasServiceEmail ?? false,
          hasSheetId: d.hasSheetId ?? false,
          privateKeyValid: d.privateKeyValid ?? false,
        });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/google-sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          sheet_id: form.sheet_id,
          service_account_email: form.service_account_email,
        }),
      });
      const d = await r.json() as { success: boolean; error?: string };
      if (d.success) toast.success("تحفظت الإعدادات");
      else toast.error(d.error || "خطأ في الحفظ");
    } catch { toast.error("خطأ في الحفظ"); }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await fetch("/api/admin/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: form.sheet_id,
          service_account_email: form.service_account_email || undefined,
        }),
      });
      const d = await r.json() as { success: boolean; error?: string };
      if (d.success) toast.success("الربط يخدم بشكل صحيح");
      else toast.error(d.error || "الربط فاشل");
    } catch { toast.error("خطأ في الاختبار"); }
    setTesting(false);
  };

  const debugEnv = async () => {
    try {
      const r = await fetch("/api/admin/google-sheets/debug");
      const d = await r.json() as {
        hasPrivateKey: boolean;
        hasServiceEmail: boolean;
        hasSheetId: boolean;
        privateKeyLength: number;
        privateKeyValid: boolean;
        serviceEmailDomain: string | null;
        sheetIdLength: number;
      };
      const lines = [
        "GOOGLE_PRIVATE_KEY: " + (d.hasPrivateKey
          ? "موجود (" + d.privateKeyLength + " حرف، صيغة " + (d.privateKeyValid ? "صحيحة" : "غلوطة") + ")"
          : "غير موجود"),
        "GOOGLE_SERVICE_ACCOUNT_EMAIL: " + (d.hasServiceEmail
          ? "موجود (@" + d.serviceEmailDomain + ")"
          : "غير موجود"),
        "GOOGLE_SHEET_ID: " + (d.hasSheetId
          ? "موجود (" + d.sheetIdLength + " حرف)"
          : "غير موجود"),
      ].join("\n");
      alert("تشخيص Google Sheets\n\n" + lines);
    } catch { toast.error("خطأ في التشخيص"); }
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
      a.href = url;
      a.download = "yuriva-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تنزّل CSV");
    } catch { toast.error("خطأ في التصدير"); }
    setExporting(false);
  };

  const inp = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";
  const canTest = envStatus.hasPrivateKey && envStatus.hasServiceEmail;

  const StatusBadge = ({
    ok, label, sub,
  }: { ok: boolean; label: string; sub?: string }) => (
    <div className={"p-3 border flex items-start gap-2 " + (ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
      {ok
        ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
        : <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
      <div>
        <p className="text-xs font-bold">{label}</p>
        {sub && <p className="text-xs text-brand-gray/70">{sub}</p>}
      </div>
    </div>
  );

  if (loading) return <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-brand-navy mb-2">Google Sheets</h1>
      <p className="text-brand-gray text-sm mb-6">زامن الطلبات تلقائياً مع Google Sheets أو صدّر CSV</p>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          ⚠️ ربط Supabase لحفظ إعدادات Google Sheets
        </div>
      )}

      {/* Env status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatusBadge
          ok={envStatus.hasPrivateKey && (envStatus.privateKeyValid ?? true)}
          label={envStatus.hasPrivateKey ? "GOOGLE_PRIVATE_KEY" : "GOOGLE_PRIVATE_KEY مفقود"}
          sub={
            envStatus.hasPrivateKey
              ? (envStatus.privateKeyValid ? "موجود وصيغته صحيحة" : "موجود لكن صيغته غلوطة")
              : "زيده فـ .env.local"
          }
        />
        <StatusBadge
          ok={envStatus.hasServiceEmail}
          label={envStatus.hasServiceEmail ? "Service Account Email" : "Service Account مفقود"}
          sub={envStatus.hasServiceEmail ? "موجود فـ .env" : "GOOGLE_SERVICE_ACCOUNT_EMAIL مفقود"}
        />
        <StatusBadge
          ok={envStatus.hasSheetId || form.sheet_id.length > 0}
          label={envStatus.hasSheetId || form.sheet_id.length > 0 ? "GOOGLE_SHEET_ID" : "GOOGLE_SHEET_ID مفقود"}
          sub={envStatus.hasSheetId || form.sheet_id.length > 0 ? "موجود فـ .env أو الإعدادات" : "زيده فـ .env.local أو الإعدادات"}
        />
      </div>

      <div className="bg-white border border-gray-200 p-5 space-y-4 mb-4">
        <h2 className="font-black text-brand-navy">إعدادات المزامنة</h2>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className="accent-brand-gold w-4 h-4"
          />
          <span className="text-sm font-bold text-brand-navy">تفعيل المزامنة التلقائية</span>
        </label>

        <div>
          <label className={lbl}>Google Sheet ID</label>
          <input
            className={inp}
            dir="ltr"
            value={form.sheet_id}
            onChange={e => setForm(f => ({ ...f, sheet_id: e.target.value }))}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          />
          <p className="text-xs text-brand-gray mt-1">الـ ID ديال الـ Google Sheet من الـ URL</p>
        </div>

        <div>
          <label className={lbl}>Service Account Email (اختياري)</label>
          <input
            className={inp}
            dir="ltr"
            value={form.service_account_email}
            onChange={e => setForm(f => ({ ...f, service_account_email: e.target.value }))}
            placeholder="yuriva-shop-orders@yuriva.iam.gserviceaccount.com"
          />
          <p className="text-xs text-brand-gray mt-1">
            إذا فارغ، كيتقرأ من GOOGLE_SERVICE_ACCOUNT_EMAIL فـ .env.local
          </p>
        </div>

        <div className="bg-brand-light p-3 text-xs text-brand-gray space-y-1">
          <p className="font-bold text-brand-navy">🔐 الأمان:</p>
          <p>
            GOOGLE_PRIVATE_KEY خاص يكون فـ .env.local فقط — ما تدخلوش هنا أبداً.
          </p>
          <p>
            GOOGLE_SERVICE_ACCOUNT_EMAIL و GOOGLE_SHEET_ID يمكن تكونو فـ .env.local أو تسجلوهم هنا.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>

          <button
            onClick={test}
            disabled={testing || !canTest}
            title={
              !envStatus.hasPrivateKey
                ? "خاصك تزيد GOOGLE_PRIVATE_KEY فـ .env.local"
                : !envStatus.hasServiceEmail
                ? "خاصك تزيد GOOGLE_SERVICE_ACCOUNT_EMAIL فـ .env.local"
                : ""
            }
            className="flex items-center gap-2 border border-brand-gold text-brand-gold font-bold px-4 py-2 text-sm hover:bg-brand-gold hover:text-white disabled:opacity-40 transition-colors"
          >
            <TestTube className="h-3.5 w-3.5" />
            {testing ? "جاري الاختبار..." : "اختبر الربط"}
          </button>

          <button
            onClick={debugEnv}
            className="flex items-center gap-2 border border-gray-300 text-brand-gray font-bold px-4 py-2 text-sm hover:border-brand-navy hover:text-brand-navy transition-colors"
          >
            <Bug className="h-3.5 w-3.5" />
            تشخيص
          </button>

          <button
            disabled
            className="flex items-center gap-2 border border-gray-300 text-brand-gray font-bold px-4 py-2 text-sm opacity-40 cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            مزامنة يدوية
          </button>
        </div>

        {!canTest && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
            <p className="font-bold mb-1">باش تختبر الربط، خاصك تزيد فـ .env.local:</p>
            {!envStatus.hasPrivateKey && (
              <p>• GOOGLE_PRIVATE_KEY — Private Key ديال الـ Service Account</p>
            )}
            {!envStatus.hasServiceEmail && (
              <p>• GOOGLE_SERVICE_ACCOUNT_EMAIL — Email ديال الـ Service Account</p>
            )}
          </div>
        )}
      </div>

      {/* Export CSV */}
      <div className="bg-white border border-gray-200 p-5">
        <h2 className="font-black text-brand-navy mb-2">تصدير الطلبات CSV</h2>
        <p className="text-brand-gray text-sm mb-4">
          صدّر جميع الطلبات كملف CSV — يشتغل بدون Google Sheets
        </p>
        <button
          onClick={exportCSV}
          disabled={exporting || !HAS_SUPABASE}
          className="flex items-center gap-2 bg-brand-gold text-white font-bold px-5 py-2 text-sm hover:bg-opacity-85 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "جاري التصدير..." : "تحميل CSV"}
        </button>
        {!HAS_SUPABASE && (
          <p className="text-xs text-yellow-700 mt-2">خاصك تربط Supabase باش تقدر تصدّر</p>
        )}
      </div>
    </div>
  );
}
