"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, TestTube, RefreshCw, Download, AlertCircle, CheckCircle, Bug, Wrench, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

interface EnvStatus {
  hasPrivateKey: boolean;
  hasServiceEmail: boolean;
  hasSheetId: boolean;
  privateKeyValid?: boolean;
  sheetIdWarning?: string | null;
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
    sheetIdWarning: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [repairResult, setRepairResult] = useState<{
    mode: "detect" | "fix";
    message: string;
    shiftedRows?: { row: number; firstDataCol: string; firstValue: string }[];
    repaired?: number;
    errors?: string[];
  } | null>(null);
  const [rebuildResult, setRebuildResult] = useState<{
    total: number;
    trackingTab: boolean;
  } | null>(null);
  const [comparing, setComparing] = useState(false);
  const [fixingMissing, setFixingMissing] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    db_count: number;
    sheet_count: number;
    missing: { order_id: string; customer: string; total: number; source: string; created_at: string }[];
  } | null>(null);
  const [fixResult, setFixResult] = useState<{
    synced: number;
    failed: number;
    failures?: { order_id: string; error: string }[];
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    failed: number;
    total: number;
    failures?: { order_id: string; customer: string; error: string; stage: string }[];
  } | null>(null);

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
        sheetIdWarning?: string | null;
      };
      if (d.success) {
        if (d.data) setForm(prev => ({ ...prev, ...d.data }));
        setEnvStatus({
          hasPrivateKey: d.hasPrivateKey ?? false,
          hasServiceEmail: d.hasServiceEmail ?? false,
          hasSheetId: d.hasSheetId ?? false,
          privateKeyValid: d.privateKeyValid ?? false,
          sheetIdWarning: d.sheetIdWarning ?? null,
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
      const d = await r.json() as {
        success: boolean;
        error?: string;
        sheetTitle?: string;
        sheetIdCleaned?: string;
        sheetIdWarning?: string | null;
        diagnostics?: { writeAccess?: boolean };
      };
      if (d.sheetIdWarning) {
        toast.error("Sheet ID مشبوه: " + d.sheetIdWarning + (d.sheetIdCleaned ? " — cleaned: " + d.sheetIdCleaned : ""));
      }
      if (d.success) {
        const tab = d.sheetTitle ? ` — tab: "${d.sheetTitle}"` : "";
        const write = d.diagnostics?.writeAccess ? " — كتابة OK" : " — لا كتابة";
        toast.success(`الربط يخدم${tab}${write}`);
      } else {
        toast.error(d.error || "الربط فاشل");
      }
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
        sheetIdCleaned: string;
        sheetIdWarning: string | null;
      };
      const sheetIdLine = d.hasSheetId
        ? "موجود (" + d.sheetIdLength + " حرف" + (d.sheetIdWarning ? " — WARNING: " + d.sheetIdWarning : "") + ")"
          + (d.sheetIdCleaned && d.sheetIdCleaned.length !== d.sheetIdLength
            ? "\n  cleaned: " + d.sheetIdCleaned + " (" + d.sheetIdCleaned.length + " حرف)"
            : "")
        : "غير موجود";
      const lines = [
        "GOOGLE_PRIVATE_KEY: " + (d.hasPrivateKey
          ? "موجود (" + d.privateKeyLength + " حرف، صيغة " + (d.privateKeyValid ? "صحيحة" : "غلوطة") + ")"
          : "غير موجود"),
        "GOOGLE_SERVICE_ACCOUNT_EMAIL: " + (d.hasServiceEmail
          ? "موجود (@" + d.serviceEmailDomain + ")"
          : "غير موجود"),
        "GOOGLE_SHEET_ID: " + sheetIdLine,
      ].join("\n");
      alert("تشخيص Google Sheets\n\n" + lines);
    } catch { toast.error("خطأ في التشخيص"); }
  };

  const rebuildSheet = async () => {
    if (!canTest) { toast.error("Google Sheets غير مهيأ"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    if (!confirm("سيتم مسح كل محتوى Feuille 1 وإعادة كتابته نظيفاً. هل تريد المتابعة؟")) return;
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/rebuild", { method: "POST" });
      const d = await r.json() as { success: boolean; total?: number; trackingTab?: boolean; error?: string };
      if (d.success) {
        setRebuildResult({ total: d.total ?? 0, trackingTab: d.trackingTab ?? false });
        toast.success(`تمت إعادة البناء — ${d.total ?? 0} طلب`);
      } else {
        toast.error(d.error || "خطأ في إعادة البناء");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setRebuilding(false);
  };

  // مقارنة وإصلاح Google Sheet — compare DB orders vs sheet, sync only missing
  const compareSheet = async () => {
    if (!canTest) { toast.error("Google Sheets غير مهيأ"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setComparing(true);
    setCompareResult(null);
    setFixResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/compare", { credentials: "include" });
      if (r.status === 401) { toast.error("الجلسة منتهية — سجل الدخول من جديد في صفحة /admin/login"); setComparing(false); return; }
      if (r.status === 403) { toast.error("هذا الحساب غير مصرح له بالوصول"); setComparing(false); return; }
      const d = await r.json() as {
        success: boolean;
        error?: string;
        db_count?: number;
        sheet_count?: number;
        missing?: { order_id: string; customer: string; total: number; source: string; created_at: string }[];
      };
      if (d.success) {
        setCompareResult({
          db_count:    d.db_count ?? 0,
          sheet_count: d.sheet_count ?? 0,
          missing:     d.missing ?? [],
        });
        if ((d.missing?.length ?? 0) === 0) toast.success("كل الطلبات موجودة في الورقة");
        else toast(`${d.missing!.length} طلب ناقص في الورقة`, { icon: "⚠️" });
      } else {
        toast.error(d.error || "خطأ في المقارنة");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setComparing(false);
  };

  const fixMissing = async () => {
    if (!compareResult || compareResult.missing.length === 0) return;
    if (!confirm(`سيتم إرسال ${compareResult.missing.length} طلب ناقص إلى Google Sheet. الطلبات الموجودة لن تتكرر. هل تريد المتابعة؟`)) return;
    setFixingMissing(true);
    setFixResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/compare", { method: "POST", credentials: "include" });
      if (r.status === 401) { toast.error("الجلسة منتهية — سجل الدخول من جديد في صفحة /admin/login"); setFixingMissing(false); return; }
      if (r.status === 403) { toast.error("هذا الحساب غير مصرح له بالوصول"); setFixingMissing(false); return; }
      const d = await r.json() as {
        success: boolean;
        error?: string;
        synced?: number;
        failed?: number;
        failures?: { order_id: string; error: string }[];
      };
      if (d.success) {
        setFixResult({ synced: d.synced ?? 0, failed: d.failed ?? 0, failures: d.failures });
        if ((d.failed ?? 0) === 0) toast.success(`تمت مزامنة ${d.synced ?? 0} طلب ناقص`);
        else toast.error(`${d.synced} نجح، ${d.failed} فشل`);
        // Refresh the comparison after fixing
        setCompareResult(null);
      } else {
        toast.error(d.error || "خطأ في الإصلاح");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setFixingMissing(false);
  };

  const detectRepair = async (mode: "detect" | "fix") => {
    if (!canTest) { toast.error("Google Sheets غير مهيأ"); return; }
    setRepairing(true);
    setRepairResult(null);
    try {
      const method = mode === "fix" ? "POST" : "GET";
      const r = await fetch("/api/admin/google-sheets/repair", { method });
      const d = await r.json() as {
        success: boolean;
        message?: string;
        error?: string;
        shiftedRows?: { row: number; firstDataCol: string; firstValue: string }[];
        repaired?: number;
        errors?: string[];
      };
      if (!d.success) {
        toast.error(d.error || "خطأ في الإصلاح");
        setRepairResult(null);
      } else {
        setRepairResult({
          mode,
          message:     d.message ?? "",
          shiftedRows: d.shiftedRows,
          repaired:    d.repaired,
          errors:      d.errors,
        });
        if (mode === "fix") {
          if ((d.repaired ?? 0) > 0) toast.success(`تم إصلاح ${d.repaired} صف`);
          else toast.success("لا توجد صفوف تحتاج إصلاح");
        }
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setRepairing(false);
  };

  const syncAll = async () => {
    if (!canTest) { toast.error("Google Sheets غير مهيأ — تحقق من الـ env vars"); return; }
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/sync-all", { method: "POST" });
      const d = await r.json() as { success: boolean; synced?: number; failed?: number; total?: number; error?: string; failures?: { order_id: string; customer: string; error: string; stage: string }[] };
      if (d.success) {
        const result = { synced: d.synced ?? 0, failed: d.failed ?? 0, total: d.total ?? 0, failures: d.failures };
        setSyncResult(result);
        if (result.total === 0) toast.success("ما كاين حتى طلب محتاج مزامنة — كلشي متزامن");
        else if (result.failed === 0) toast.success(`تمت مزامنة ${result.synced} طلب بنجاح`);
        else toast.error(`${result.synced} نجح، ${result.failed} فشل من أصل ${result.total}`);
      } else {
        toast.error(d.error || "خطأ في المزامنة");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setSyncing(false);
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
          ok={envStatus.hasSheetId && !envStatus.sheetIdWarning}
          label={
            !envStatus.hasSheetId ? "GOOGLE_SHEET_ID مفقود"
            : envStatus.sheetIdWarning ? "GOOGLE_SHEET_ID — تحذير"
            : "GOOGLE_SHEET_ID"
          }
          sub={
            !envStatus.hasSheetId ? "زيده فـ .env.local أو الإعدادات"
            : envStatus.sheetIdWarning ? envStatus.sheetIdWarning
            : "موجود فـ .env أو الإعدادات"
          }
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
          <p className="text-xs text-brand-gray mt-1">الـ ID ديال الـ Google Sheet من الـ URL — مثال: 44 حرف تقريباً</p>
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
          <p>GOOGLE_PRIVATE_KEY خاص يكون فـ .env.local فقط — ما تدخلوش هنا أبداً.</p>
          <p>GOOGLE_SERVICE_ACCOUNT_EMAIL و GOOGLE_SHEET_ID يمكن تكونو فـ .env.local أو تسجلوهم هنا.</p>
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

      {/* Rebuild sheet — primary clean action */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">إعادة بناء Google Sheet</h2>
        <p className="text-brand-gray text-sm mb-2">
          يمسح Feuille 1 كاملاً ويعيد كتابته بشكل نظيف — 14 عمود فقط (أ:ن)، بدون حقول تتبع.
        </p>
        <p className="text-xs text-brand-gray mb-4">
          الأعمدة: رقم الطلب • التاريخ • الاسم • الهاتف • المدينة • العنوان • المنتج • المقاس • الألوان • الكمية • المجموع • الحالة • ملاحظة • المصدر
        </p>

        {rebuildResult && (
          <div className="mb-4 p-3 border bg-green-50 border-green-200 text-sm text-green-800">
            <p className="font-bold">تمت إعادة البناء — {rebuildResult.total} طلب</p>
            <p className="text-xs mt-1">تاب Tracking: {rebuildResult.trackingTab ? "تم التحديث" : "لا يوجد بيانات تتبع للكتابة"}</p>
          </div>
        )}

        <button
          onClick={rebuildSheet}
          disabled={rebuilding || !canTest || !HAS_SUPABASE}
          title={!canTest ? "خاصك تهيئ Google Sheets أولاً" : ""}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className={"h-4 w-4 " + (rebuilding ? "animate-spin" : "")} />
          {rebuilding ? "جاري إعادة البناء..." : "إعادة بناء Google Sheet"}
        </button>
      </div>

      {/* Compare + fix missing orders */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">مقارنة وإصلاح Google Sheet</h2>
        <p className="text-brand-gray text-sm mb-4">
          يقارن الطلبات في قاعدة البيانات مع الورقة، ويظهر الطلبات الناقصة، ثم يزامن الناقص فقط بدون تكرار.
        </p>

        {compareResult && (
          <div className={"mb-4 p-3 border text-sm " + (compareResult.missing.length === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800")}>
            <p className="font-bold mb-1">
              قاعدة البيانات: {compareResult.db_count} طلب — الورقة: {compareResult.sheet_count} صف — الناقص: {compareResult.missing.length}
            </p>
            {compareResult.missing.length > 0 && (
              <ul className="text-xs space-y-0.5 mt-2">
                {compareResult.missing.map((m) => (
                  <li key={m.order_id} className="border-b border-yellow-100 pb-1 last:border-0">
                    <span className="font-mono">{m.order_id.slice(0, 8)}…</span>
                    {" — "}
                    <span className="font-bold">{m.customer || "بدون اسم"}</span>
                    {" — "}
                    <span>{m.total} درهم</span>
                    {" — "}
                    <span className="font-mono text-yellow-700">[{m.source}]</span>
                    {" — "}
                    <span dir="ltr">{m.created_at ? new Date(m.created_at).toLocaleString("ar-MA") : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {fixResult && (
          <div className={"mb-4 p-3 border text-sm " + (fixResult.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800")}>
            <p className="font-bold">تمت المزامنة: {fixResult.synced} نجح، {fixResult.failed} فشل</p>
            {fixResult.failures && fixResult.failures.length > 0 && (
              <ul className="text-xs mt-1 space-y-0.5">
                {fixResult.failures.map((f) => (
                  <li key={f.order_id}>
                    <span className="font-mono">{f.order_id.slice(0, 8)}…</span> — {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={compareSheet}
            disabled={comparing || fixingMissing || !canTest || !HAS_SUPABASE}
            title={!canTest ? "خاصك تهيئ Google Sheets أولاً" : ""}
            className="flex items-center gap-2 border border-brand-navy text-brand-navy font-bold px-4 py-2 text-sm hover:bg-brand-navy hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (comparing ? "animate-spin" : "")} />
            {comparing ? "جاري المقارنة..." : "مقارنة الطلبات مع الورقة"}
          </button>

          {compareResult && compareResult.missing.length > 0 && (
            <button
              onClick={fixMissing}
              disabled={fixingMissing || comparing}
              className="flex items-center gap-2 bg-brand-gold text-white font-bold px-4 py-2 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
            >
              <Wrench className={"h-3.5 w-3.5 " + (fixingMissing ? "animate-spin" : "")} />
              {fixingMissing ? "جاري المزامنة..." : `مزامنة ${compareResult.missing.length} طلب ناقص`}
            </button>
          )}
        </div>
      </div>

      {/* Bulk sync */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">مزامنة الطلبات القديمة</h2>
        <p className="text-brand-gray text-sm mb-4">
          زامن الطلبات اللي ما وصلاتش لـ Google Sheets بعد — كيتجاهل الطلبات اللي تزامنت بالفعل.
        </p>

        {syncResult && (
          <div className="mb-4 space-y-2">
            <div className={"p-3 text-sm border " + (syncResult.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800")}>
              {syncResult.total === 0
                ? "ما كاين حتى طلب محتاج مزامنة — كلشي متزامن"
                : `تمت المزامنة: ${syncResult.synced} نجح، ${syncResult.failed} فشل، من أصل ${syncResult.total} طلب`}
            </div>
            {syncResult.failures && syncResult.failures.length > 0 && (
              <div className="border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-bold text-red-700 mb-1">تفاصيل الأخطاء:</p>
                {syncResult.failures.map((f) => (
                  <div key={f.order_id} className="text-xs text-red-800 border-b border-red-100 pb-1 last:border-0">
                    <span className="font-bold">{f.customer || f.order_id}</span>
                    {" — "}
                    <span className="font-mono text-red-600">[{f.stage}]</span>
                    {" "}
                    <span>{f.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={syncAll}
          disabled={syncing || !canTest || !HAS_SUPABASE}
          title={!canTest ? "خاصك تهيئ Google Sheets أولاً" : ""}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} />
          {syncing ? "جاري المزامنة..." : "مزامنة الطلبات القديمة"}
        </button>

        {!HAS_SUPABASE && (
          <p className="text-xs text-yellow-700 mt-2">خاصك تربط Supabase باش تقدر تزامن</p>
        )}
      </div>

      {/* Repair shifted rows */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">إصلاح ترتيب Google Sheet</h2>
        <p className="text-brand-gray text-sm mb-4">
          اكتشف أو صلح الصفوف اللي كتبت فـ العمود الغلط (O/N بدل A).
        </p>

        {repairResult && (
          <div className={"mb-4 p-3 border text-sm " + ((repairResult.errors?.length ?? 0) > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800")}>
            <p className="font-bold mb-1">{repairResult.message}</p>
            {repairResult.mode === "detect" && repairResult.shiftedRows && repairResult.shiftedRows.length > 0 && (
              <ul className="text-xs space-y-0.5 mt-1">
                {repairResult.shiftedRows.map((r) => (
                  <li key={r.row}>
                    صف {r.row} — البداية من العمود <strong>{r.firstDataCol}</strong> — القيمة: {r.firstValue}
                  </li>
                ))}
              </ul>
            )}
            {repairResult.mode === "fix" && repairResult.repaired !== undefined && (
              <p className="text-xs mt-1">تم إصلاح {repairResult.repaired} صف</p>
            )}
            {(repairResult.errors?.length ?? 0) > 0 && (
              <ul className="text-xs mt-1 space-y-0.5">
                {repairResult.errors!.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => detectRepair("detect")}
            disabled={repairing || !canTest}
            className="flex items-center gap-2 border border-brand-navy text-brand-navy font-bold px-4 py-2 text-sm hover:bg-brand-navy hover:text-white disabled:opacity-50 transition-colors"
          >
            <Bug className="h-3.5 w-3.5" />
            {repairing ? "جاري الفحص..." : "كشف الصفوف المنحرفة"}
          </button>
          <button
            onClick={() => detectRepair("fix")}
            disabled={repairing || !canTest}
            className="flex items-center gap-2 bg-orange-500 text-white font-bold px-4 py-2 text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Wrench className="h-3.5 w-3.5" />
            {repairing ? "جاري الإصلاح..." : "إصلاح الصفوف المنحرفة"}
          </button>
        </div>
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
