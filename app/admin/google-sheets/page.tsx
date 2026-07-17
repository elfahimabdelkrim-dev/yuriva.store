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

interface ReconRow {
  order_id: string;
  created_at: string;
  source: string;
  status: string;
  category: string;
  reason: string;
  customer: string;
  total: number;
  in_sheet: boolean;
  sheet_status: string | null;
  capi_status: string | null;
  meta_purchase_sent: boolean;
  safe_to_sync: boolean;
}

interface ReconSummary {
  total_db_orders: number;
  valid_real_orders: number;
  whatsapp_leads: number;
  test_orders: number;
  admin_orders: number;
  cancelled_orders: number;
  invalid_orders: number;
  missing_from_sheet: number;
  sheet_only_rows: number;
  pixel_eligible: number;
  capi_sent: number;
  capi_failed: number;
  capi_pending: number;
  capi_skipped: number;
  sheet_synced: number;
  sheet_failed: number;
  safe_to_sync: number;
  missing_oldest: string | null;
  missing_newest: string | null;
  missing_by_category: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  real_cod:      "طلب COD حقيقي",
  whatsapp_lead: "WhatsApp lead",
  test:          "تجريبي",
  admin:         "أنشئ يدوياً",
  cancelled:     "ملغي/مرفوض",
  invalid:       "بيانات ناقصة",
};

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
  const [reconciling, setReconciling] = useState(false);
  const [syncingSelected, setSyncingSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reconcileData, setReconcileData] = useState<{
    summary: ReconSummary;
    missing: ReconRow[];
    sheet_only_ids: string[];
  } | null>(null);
  const [syncSelResult, setSyncSelResult] = useState<{
    synced: number;
    skipped_existing: number;
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

  // ── نظام المطابقة الدائم — Supabase هو مصدر الحقيقة ──
  // GET  = تحليل فقط (Dry Run) — لا يكتب في الورقة ولا يرسل لـ Meta
  // POST = مزامنة الطلبات المحددة يدوياً فقط — بدون تكرار وبدون أحداث Meta
  const runReconcile = async () => {
    if (!canTest) { toast.error("Google Sheets غير مهيأ"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setReconciling(true);
    setReconcileData(null);
    setSyncSelResult(null);
    setSelectedIds([]);
    try {
      const r = await fetch("/api/admin/reconcile", { credentials: "include" });
      if (r.status === 401) { toast.error("الجلسة منتهية — سجل الدخول من جديد في /admin/login"); setReconciling(false); return; }
      if (r.status === 403) { toast.error("هذا الحساب غير مصرح له بالوصول"); setReconciling(false); return; }
      const d = await r.json() as {
        success: boolean;
        error?: string;
        summary?: ReconSummary;
        missing?: ReconRow[];
        sheet_only_ids?: string[];
      };
      if (d.success && d.summary) {
        setReconcileData({
          summary:        d.summary,
          missing:        d.missing ?? [],
          sheet_only_ids: d.sheet_only_ids ?? [],
        });
        toast.success("تم التحليل (Dry Run) — لم يتم تعديل أي شيء");
      } else {
        toast.error(d.error || "خطأ في التحليل");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setReconciling(false);
  };

  const visibleMissing = (reconcileData?.missing ?? []).filter((m) => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    const day = m.created_at.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const toggleId = (id: string) =>
    setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const syncSelected = async () => {
    if (selectedIds.length === 0) { toast.error("اختر الطلبات أولاً"); return; }
    if (!confirm(
      `سيتم إرسال ${selectedIds.length} طلب محدد إلى Google Sheet فقط.\n` +
      `- لن يتم إرسال أي حدث Purchase أو Lead إلى Meta.\n` +
      `- الطلبات الموجودة مسبقاً في الورقة يتم تجاهلها تلقائياً.\n` +
      `هل تريد المتابعة؟`
    )) return;
    setSyncingSelected(true);
    setSyncSelResult(null);
    try {
      const r = await fetch("/api/admin/reconcile", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ order_ids: selectedIds }),
      });
      if (r.status === 401) { toast.error("الجلسة منتهية — سجل الدخول من جديد في /admin/login"); setSyncingSelected(false); return; }
      if (r.status === 403) { toast.error("هذا الحساب غير مصرح له بالوصول"); setSyncingSelected(false); return; }
      const d = await r.json() as {
        success: boolean;
        error?: string;
        synced?: number;
        skipped_existing?: number;
        failed?: number;
        failures?: { order_id: string; error: string }[];
      };
      if (d.success) {
        setSyncSelResult({
          synced:           d.synced ?? 0,
          skipped_existing: d.skipped_existing ?? 0,
          failed:           d.failed ?? 0,
          failures:         d.failures,
        });
        if ((d.failed ?? 0) === 0) toast.success(`تمت مزامنة ${d.synced ?? 0} طلب — بدون أحداث Meta`);
        else toast.error(`${d.synced} نجح، ${d.failed} فشل`);
        setSelectedIds([]);
        setReconcileData(null); // إعادة التحليل مطلوبة بعد المزامنة
      } else {
        toast.error(d.error || "خطأ في المزامنة");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setSyncingSelected(false);
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

      {/* Reconciliation — Supabase is the source of truth */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">نظام المطابقة — Supabase هو مصدر الحقيقة</h2>
        <p className="text-brand-gray text-sm mb-4">
          الخطوة 1: تحليل فقط (Dry Run) — يصنف كل الطلبات بدون أي تعديل. الخطوة 2: اختر بنفسك الطلبات الناقصة وزامنها — بدون تكرار وبدون أي أحداث Meta.
        </p>

        <button
          onClick={runReconcile}
          disabled={reconciling || syncingSelected || !canTest || !HAS_SUPABASE}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors mb-4"
        >
          <RefreshCw className={"h-4 w-4 " + (reconciling ? "animate-spin" : "")} />
          {reconciling ? "جاري التحليل..." : "تحليل ومطابقة (Dry Run — بدون تعديل)"}
        </button>

        {reconcileData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="border border-gray-200 p-2"><p className="font-bold text-brand-navy">{reconcileData.summary.total_db_orders}</p><p className="text-brand-gray">كل طلبات قاعدة البيانات</p></div>
              <div className="border border-green-200 bg-green-50 p-2"><p className="font-bold text-green-700">{reconcileData.summary.valid_real_orders}</p><p className="text-brand-gray">طلبات COD حقيقية</p></div>
              <div className="border border-blue-200 bg-blue-50 p-2"><p className="font-bold text-blue-700">{reconcileData.summary.whatsapp_leads}</p><p className="text-brand-gray">WhatsApp leads</p></div>
              <div className="border border-gray-200 p-2"><p className="font-bold text-brand-navy">{reconcileData.summary.test_orders + reconcileData.summary.admin_orders}</p><p className="text-brand-gray">تجريبي / يدوي</p></div>
              <div className="border border-orange-200 bg-orange-50 p-2"><p className="font-bold text-orange-700">{reconcileData.summary.cancelled_orders}</p><p className="text-brand-gray">ملغي / مرفوض</p></div>
              <div className="border border-red-200 bg-red-50 p-2"><p className="font-bold text-red-700">{reconcileData.summary.missing_from_sheet}</p><p className="text-brand-gray">ناقص في الورقة</p></div>
              <div className="border border-red-200 bg-red-50 p-2"><p className="font-bold text-red-700">{reconcileData.summary.sheet_only_rows}</p><p className="text-brand-gray">في الورقة فقط (بدون DB)</p></div>
              <div className="border border-green-200 bg-green-50 p-2"><p className="font-bold text-green-700">{reconcileData.summary.safe_to_sync}</p><p className="text-brand-gray">آمن للمزامنة</p></div>
              <div className="border border-gray-200 p-2"><p className="font-bold text-brand-navy">{reconcileData.summary.pixel_eligible}</p><p className="text-brand-gray">مؤهل لـ Meta Purchase</p></div>
              <div className="border border-green-200 bg-green-50 p-2"><p className="font-bold text-green-700">{reconcileData.summary.capi_sent}</p><p className="text-brand-gray">CAPI مرسل</p></div>
              <div className="border border-red-200 bg-red-50 p-2"><p className="font-bold text-red-700">{reconcileData.summary.capi_failed}</p><p className="text-brand-gray">CAPI فاشل</p></div>
              <div className="border border-yellow-200 bg-yellow-50 p-2"><p className="font-bold text-yellow-700">{reconcileData.summary.capi_pending}</p><p className="text-brand-gray">CAPI معلق</p></div>
            </div>

            {(reconcileData.summary.missing_oldest || reconcileData.summary.missing_newest) && (
              <p className="text-xs text-brand-gray">
                الطلبات الناقصة: من <span dir="ltr">{reconcileData.summary.missing_oldest?.slice(0, 10)}</span> إلى <span dir="ltr">{reconcileData.summary.missing_newest?.slice(0, 10)}</span>
                {" — "}
                COD حقيقي: {reconcileData.summary.missing_by_category.real_cod ?? 0}،
                WhatsApp: {reconcileData.summary.missing_by_category.whatsapp_lead ?? 0}،
                تجريبي: {reconcileData.summary.missing_by_category.test ?? 0}،
                يدوي: {reconcileData.summary.missing_by_category.admin ?? 0}،
                ملغي: {reconcileData.summary.missing_by_category.cancelled ?? 0}،
                بيانات ناقصة: {reconcileData.summary.missing_by_category.invalid ?? 0}
              </p>
            )}

            {reconcileData.sheet_only_ids.length > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                <p className="font-bold mb-1">صفوف موجودة في الورقة فقط وليس في قاعدة البيانات ({reconcileData.sheet_only_ids.length}):</p>
                <p className="font-mono break-all">{reconcileData.sheet_only_ids.slice(0, 10).join("، ")}{reconcileData.sheet_only_ids.length > 10 ? " ..." : ""}</p>
                <p className="mt-1">هذه الصفوف لا يتم حذفها تلقائياً — راجعها يدوياً.</p>
              </div>
            )}

            {/* Filters */}
            {reconcileData.missing.length > 0 && (
              <>
                <div className="flex flex-wrap items-end gap-2 text-xs">
                  <div>
                    <label className="block font-bold text-brand-navy mb-1">التصنيف</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-300 px-2 py-1.5">
                      <option value="all">الكل ({reconcileData.missing.length})</option>
                      <option value="real_cod">COD حقيقي</option>
                      <option value="whatsapp_lead">WhatsApp lead</option>
                      <option value="test">تجريبي</option>
                      <option value="admin">يدوي</option>
                      <option value="cancelled">ملغي</option>
                      <option value="invalid">بيانات ناقصة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-brand-navy mb-1">من تاريخ</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 px-2 py-1" dir="ltr" />
                  </div>
                  <div>
                    <label className="block font-bold text-brand-navy mb-1">إلى تاريخ</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 px-2 py-1" dir="ltr" />
                  </div>
                  <button onClick={() => setSelectedIds(visibleMissing.filter((m) => m.safe_to_sync).map((m) => m.order_id))} className="border border-green-600 text-green-700 font-bold px-3 py-1.5 hover:bg-green-50">
                    اختيار الآمن فقط ({visibleMissing.filter((m) => m.safe_to_sync).length})
                  </button>
                  <button onClick={() => setSelectedIds(visibleMissing.map((m) => m.order_id))} className="border border-brand-navy text-brand-navy font-bold px-3 py-1.5 hover:bg-gray-50">
                    اختيار الكل المعروض ({visibleMissing.length})
                  </button>
                  <button onClick={() => setSelectedIds([])} className="border border-gray-300 text-brand-gray font-bold px-3 py-1.5 hover:bg-gray-50">
                    إلغاء الاختيار
                  </button>
                </div>

                {/* Missing orders table */}
                <div className="border border-gray-200 max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-light sticky top-0">
                      <tr className="text-right">
                        <th className="p-2 w-8"></th>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">الزبون</th>
                        <th className="p-2">المجموع</th>
                        <th className="p-2">المصدر</th>
                        <th className="p-2">الحالة</th>
                        <th className="p-2">التصنيف</th>
                        <th className="p-2">CAPI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMissing.map((m) => (
                        <tr key={m.order_id} className={"border-t border-gray-100 " + (selectedIds.includes(m.order_id) ? "bg-blue-50" : "")}>
                          <td className="p-2">
                            <input type="checkbox" checked={selectedIds.includes(m.order_id)} onChange={() => toggleId(m.order_id)} className="accent-brand-gold" />
                          </td>
                          <td className="p-2 whitespace-nowrap" dir="ltr">{m.created_at.slice(0, 16).replace("T", " ")}</td>
                          <td className="p-2">{m.customer || "—"}</td>
                          <td className="p-2 whitespace-nowrap">{m.total} د</td>
                          <td className="p-2 font-mono">{m.source}</td>
                          <td className="p-2">{m.status}</td>
                          <td className="p-2">
                            <span className={
                              m.category === "real_cod" ? "text-green-700 font-bold" :
                              m.category === "whatsapp_lead" ? "text-blue-700" :
                              m.category === "cancelled" ? "text-orange-700" : "text-red-600"
                            } title={m.reason}>
                              {CATEGORY_LABELS[m.category] ?? m.category}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{m.capi_status ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={syncSelected}
                  disabled={syncingSelected || selectedIds.length === 0}
                  className="flex items-center gap-2 bg-brand-gold text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
                >
                  <Wrench className={"h-4 w-4 " + (syncingSelected ? "animate-spin" : "")} />
                  {syncingSelected ? "جاري المزامنة..." : `مزامنة ${selectedIds.length} طلب محدد إلى الورقة (بدون Meta)`}
                </button>
              </>
            )}

            {reconcileData.missing.length === 0 && (
              <div className="border border-green-200 bg-green-50 p-3 text-sm text-green-800 font-bold">
                كل طلبات قاعدة البيانات موجودة في الورقة — لا يوجد نقص
              </div>
            )}
          </div>
        )}

        {syncSelResult && (
          <div className={"mt-4 p-3 border text-sm " + (syncSelResult.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800")}>
            <p className="font-bold">
              تمت المزامنة: {syncSelResult.synced} نجح، {syncSelResult.skipped_existing} موجود مسبقاً (تم تجاهله)، {syncSelResult.failed} فشل — أحداث Meta المرسلة: 0
            </p>
            {syncSelResult.failures && syncSelResult.failures.length > 0 && (
              <ul className="text-xs mt-1 space-y-0.5">
                {syncSelResult.failures.map((fl) => (
                  <li key={fl.order_id}><span className="font-mono">{fl.order_id.slice(0, 8)}…</span> — {fl.error}</li>
                ))}
              </ul>
            )}
            <p className="text-xs mt-1">أعد التحليل للتأكد من النتيجة النهائية.</p>
          </div>
        )}
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
