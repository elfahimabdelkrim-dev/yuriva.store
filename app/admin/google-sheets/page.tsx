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
    if (!HAS_SUPABASE) { toast.error("\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase"); return; }
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
      if (d.success) toast.success("\u062a\u062d\u0641\u0638\u062a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a");
      else toast.error(d.error || "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062d\u0641\u0638");
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062d\u0641\u0638"); }
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
        toast.error("Sheet ID \u0645\u0634\u0628\u0648\u0647: " + d.sheetIdWarning + (d.sheetIdCleaned ? " \u2014 cleaned: " + d.sheetIdCleaned : ""));
      }
      if (d.success) {
        const tab = d.sheetTitle ? ` \u2014 tab: "${d.sheetTitle}"` : "";
        const write = d.diagnostics?.writeAccess ? " \u2014 \u0643\u062a\u0627\u0628\u0629 OK" : " \u2014 \u0644\u0627 \u0643\u062a\u0627\u0628\u0629";
        toast.success(`\u0627\u0644\u0631\u0628\u0637 \u064a\u062e\u062f\u0645${tab}${write}`);
      } else {
        toast.error(d.error || "\u0627\u0644\u0631\u0628\u0637 \u0641\u0627\u0634\u0644");
      }
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"); }
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
        ? "\u0645\u0648\u062c\u0648\u062f (" + d.sheetIdLength + " \u062d\u0631\u0641" + (d.sheetIdWarning ? " \u2014 WARNING: " + d.sheetIdWarning : "") + ")"
          + (d.sheetIdCleaned && d.sheetIdCleaned.length !== d.sheetIdLength
            ? "\n  cleaned: " + d.sheetIdCleaned + " (" + d.sheetIdCleaned.length + " \u062d\u0631\u0641)"
            : "")
        : "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f";
      const lines = [
        "GOOGLE_PRIVATE_KEY: " + (d.hasPrivateKey
          ? "\u0645\u0648\u062c\u0648\u062f (" + d.privateKeyLength + " \u062d\u0631\u0641\u060c \u0635\u064a\u063a\u0629 " + (d.privateKeyValid ? "\u0635\u062d\u064a\u062d\u0629" : "\u063a\u0644\u0648\u0637\u0629") + ")"
          : "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"),
        "GOOGLE_SERVICE_ACCOUNT_EMAIL: " + (d.hasServiceEmail
          ? "\u0645\u0648\u062c\u0648\u062f (@" + d.serviceEmailDomain + ")"
          : "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"),
        "GOOGLE_SHEET_ID: " + sheetIdLine,
      ].join("\n");
      alert("\u062a\u0634\u062e\u064a\u0635 Google Sheets\n\n" + lines);
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0634\u062e\u064a\u0635"); }
  };

  const rebuildSheet = async () => {
    if (!canTest) { toast.error("Google Sheets \u063a\u064a\u0631 \u0645\u0647\u064a\u0623"); return; }
    if (!HAS_SUPABASE) { toast.error("\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase"); return; }
    if (!confirm("\u0633\u064a\u062a\u0645 \u0645\u0633\u062d \u0643\u0644 \u0645\u062d\u062a\u0648\u0649 Feuille 1 \u0648\u0625\u0639\u0627\u062f\u0629 \u0643\u062a\u0627\u0628\u062a\u0647 \u0646\u0638\u064a\u0641\u0627\u064b. \u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u061f")) return;
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/rebuild", { method: "POST" });
      const d = await r.json() as { success: boolean; total?: number; trackingTab?: boolean; error?: string };
      if (d.success) {
        setRebuildResult({ total: d.total ?? 0, trackingTab: d.trackingTab ?? false });
        toast.success(`\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u2014 ${d.total ?? 0} \u0637\u0644\u0628`);
      } else {
        toast.error(d.error || "\u062e\u0637\u0623 \u0641\u064a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0628\u0646\u0627\u0621");
      }
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644"); }
    setRebuilding(false);
  };

  const detectRepair = async (mode: "detect" | "fix") => {
    if (!canTest) { toast.error("Google Sheets \u063a\u064a\u0631 \u0645\u0647\u064a\u0623"); return; }
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
        toast.error(d.error || "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0625\u0635\u0644\u0627\u062d");
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
          if ((d.repaired ?? 0) > 0) toast.success(`\u062a\u0645 \u0625\u0635\u0644\u0627\u062d ${d.repaired} \u0635\u0641`);
          else toast.success("\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u062a\u062d\u062a\u0627\u062c \u0625\u0635\u0644\u0627\u062d");
        }
      }
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644"); }
    setRepairing(false);
  };

  const syncAll = async () => {
    if (!canTest) { toast.error("Google Sheets \u063a\u064a\u0631 \u0645\u0647\u064a\u0623 \u2014 \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0640 env vars"); return; }
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch("/api/admin/google-sheets/sync-all", { method: "POST" });
      const d = await r.json() as { success: boolean; synced?: number; failed?: number; total?: number; error?: string; failures?: { order_id: string; customer: string; error: string; stage: string }[] };
      if (d.success) {
        const result = { synced: d.synced ?? 0, failed: d.failed ?? 0, total: d.total ?? 0, failures: d.failures };
        setSyncResult(result);
        if (result.total === 0) toast.success("\u0645\u0627 \u0643\u0627\u064a\u0646 \u062d\u062a\u0649 \u0637\u0644\u0628 \u0645\u062d\u062a\u0627\u062c \u0645\u0632\u0627\u0645\u0646\u0629 \u2014 \u0643\u0644\u0634\u064a \u0645\u062a\u0632\u0627\u0645\u0646");
        else if (result.failed === 0) toast.success(`\u062a\u0645\u062a \u0645\u0632\u0627\u0645\u0646\u0629 ${result.synced} \u0637\u0644\u0628 \u0628\u0646\u062c\u0627\u062d`);
        else toast.error(`${result.synced} \u0646\u062c\u062d\u060c ${result.failed} \u0641\u0634\u0644 \u0645\u0646 \u0623\u0635\u0644 ${result.total}`);
      } else {
        toast.error(d.error || "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629");
      }
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644"); }
    setSyncing(false);
  };

  const exportCSV = async () => {
    if (!HAS_SUPABASE) { toast.error("\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase"); return; }
    setExporting(true);
    try {
      const r = await fetch("/api/admin/orders/export");
      if (!r.ok) { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631"); setExporting(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yuriva-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("\u062a\u0646\u0632\u0651\u0644 CSV");
    } catch { toast.error("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631"); }
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

  if (loading) return <div className="text-center py-12 text-brand-gray">\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-brand-navy mb-2">Google Sheets</h1>
      <p className="text-brand-gray text-sm mb-6">\u0632\u0627\u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0645\u0639 Google Sheets \u0623\u0648 \u0635\u062f\u0651\u0631 CSV</p>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          \u26a0\ufe0f \u0631\u0628\u0637 Supabase \u0644\u062d\u0641\u0638 \u0625\u0639\u062f\u0627\u062f\u0627\u062a Google Sheets
        </div>
      )}

      {/* Env status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatusBadge
          ok={envStatus.hasPrivateKey && (envStatus.privateKeyValid ?? true)}
          label={envStatus.hasPrivateKey ? "GOOGLE_PRIVATE_KEY" : "GOOGLE_PRIVATE_KEY \u0645\u0641\u0642\u0648\u062f"}
          sub={
            envStatus.hasPrivateKey
              ? (envStatus.privateKeyValid ? "\u0645\u0648\u062c\u0648\u062f \u0648\u0635\u064a\u063a\u062a\u0647 \u0635\u062d\u064a\u062d\u0629" : "\u0645\u0648\u062c\u0648\u062f \u0644\u0643\u0646 \u0635\u064a\u063a\u062a\u0647 \u063a\u0644\u0648\u0637\u0629")
              : "\u0632\u064a\u062f\u0647 \u0641\u0640 .env.local"
          }
        />
        <StatusBadge
          ok={envStatus.hasServiceEmail}
          label={envStatus.hasServiceEmail ? "Service Account Email" : "Service Account \u0645\u0641\u0642\u0648\u062f"}
          sub={envStatus.hasServiceEmail ? "\u0645\u0648\u062c\u0648\u062f \u0641\u0640 .env" : "GOOGLE_SERVICE_ACCOUNT_EMAIL \u0645\u0641\u0642\u0648\u062f"}
        />
        <StatusBadge
          ok={envStatus.hasSheetId && !envStatus.sheetIdWarning}
          label={
            !envStatus.hasSheetId ? "GOOGLE_SHEET_ID \u0645\u0641\u0642\u0648\u062f"
            : envStatus.sheetIdWarning ? "GOOGLE_SHEET_ID \u2014 \u062a\u062d\u0630\u064a\u0631"
            : "GOOGLE_SHEET_ID"
          }
          sub={
            !envStatus.hasSheetId ? "\u0632\u064a\u062f\u0647 \u0641\u0640 .env.local \u0623\u0648 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"
            : envStatus.sheetIdWarning ? envStatus.sheetIdWarning
            : "\u0645\u0648\u062c\u0648\u062f \u0641\u0640 .env \u0623\u0648 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"
          }
        />
      </div>

      <div className="bg-white border border-gray-200 p-5 space-y-4 mb-4">
        <h2 className="font-black text-brand-navy">\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629</h2>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className="accent-brand-gold w-4 h-4"
          />
          <span className="text-sm font-bold text-brand-navy">\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a\u0629</span>
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
          <p className="text-xs text-brand-gray mt-1">\u0627\u0644\u0640 ID \u062f\u064a\u0627\u0644 \u0627\u0644\u0640 Google Sheet \u0645\u0646 \u0627\u0644\u0640 URL \u2014 \u0645\u062b\u0627\u0644: 44 \u062d\u0631\u0641 \u062a\u0642\u0631\u064a\u0628\u0627\u064b</p>
        </div>

        <div>
          <label className={lbl}>Service Account Email (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)</label>
          <input
            className={inp}
            dir="ltr"
            value={form.service_account_email}
            onChange={e => setForm(f => ({ ...f, service_account_email: e.target.value }))}
            placeholder="yuriva-shop-orders@yuriva.iam.gserviceaccount.com"
          />
          <p className="text-xs text-brand-gray mt-1">
            \u0625\u0630\u0627 \u0641\u0627\u0631\u063a\u060c \u0643\u064a\u062a\u0642\u0631\u0623 \u0645\u0646 GOOGLE_SERVICE_ACCOUNT_EMAIL \u0641\u0640 .env.local
          </p>
        </div>

        <div className="bg-brand-light p-3 text-xs text-brand-gray space-y-1">
          <p className="font-bold text-brand-navy">\ud83d\udd10 \u0627\u0644\u0623\u0645\u0627\u0646:</p>
          <p>GOOGLE_PRIVATE_KEY \u062e\u0627\u0635 \u064a\u0643\u0648\u0646 \u0641\u0640 .env.local \u0641\u0642\u0637 \u2014 \u0645\u0627 \u062a\u062f\u062e\u0644\u0648\u0634 \u0647\u0646\u0627 \u0623\u0628\u062f\u0627\u064b.</p>
          <p>GOOGLE_SERVICE_ACCOUNT_EMAIL \u0648 GOOGLE_SHEET_ID \u064a\u0645\u0643\u0646 \u062a\u0643\u0648\u0646\u0648 \u0641\u0640 .env.local \u0623\u0648 \u062a\u0633\u062c\u0644\u0648\u0647\u0645 \u0647\u0646\u0627.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "\u062d\u0641\u0638"}
          </button>

          <button
            onClick={test}
            disabled={testing || !canTest}
            title={
              !envStatus.hasPrivateKey
                ? "\u062e\u0627\u0635\u0643 \u062a\u0632\u064a\u062f GOOGLE_PRIVATE_KEY \u0641\u0640 .env.local"
                : !envStatus.hasServiceEmail
                ? "\u062e\u0627\u0635\u0643 \u062a\u0632\u064a\u062f GOOGLE_SERVICE_ACCOUNT_EMAIL \u0641\u0640 .env.local"
                : ""
            }
            className="flex items-center gap-2 border border-brand-gold text-brand-gold font-bold px-4 py-2 text-sm hover:bg-brand-gold hover:text-white disabled:opacity-40 transition-colors"
          >
            <TestTube className="h-3.5 w-3.5" />
            {testing ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631..." : "\u0627\u062e\u062a\u0628\u0631 \u0627\u0644\u0631\u0628\u0637"}
          </button>

          <button
            onClick={debugEnv}
            className="flex items-center gap-2 border border-gray-300 text-brand-gray font-bold px-4 py-2 text-sm hover:border-brand-navy hover:text-brand-navy transition-colors"
          >
            <Bug className="h-3.5 w-3.5" />
            \u062a\u0634\u062e\u064a\u0635
          </button>
        </div>

        {!canTest && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
            <p className="font-bold mb-1">\u0628\u0627\u0634 \u062a\u062e\u062a\u0628\u0631 \u0627\u0644\u0631\u0628\u0637\u060c \u062e\u0627\u0635\u0643 \u062a\u0632\u064a\u062f \u0641\u0640 .env.local:</p>
            {!envStatus.hasPrivateKey && (
              <p>\u2022 GOOGLE_PRIVATE_KEY \u2014 Private Key \u062f\u064a\u0627\u0644 \u0627\u0644\u0640 Service Account</p>
            )}
            {!envStatus.hasServiceEmail && (
              <p>\u2022 GOOGLE_SERVICE_ACCOUNT_EMAIL \u2014 Email \u062f\u064a\u0627\u0644 \u0627\u0644\u0640 Service Account</p>
            )}
          </div>
        )}
      </div>

      {/* Rebuild sheet — primary clean action */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">\u0625\u0639\u0627\u062f\u0629 \u0628\u0646\u0627\u0621 Google Sheet</h2>
        <p className="text-brand-gray text-sm mb-2">
          \u064a\u0645\u0633\u062d Feuille 1 \u0643\u0627\u0645\u0644\u0627\u064b \u0648\u064a\u0639\u064a\u062f \u0643\u062a\u0627\u0628\u062a\u0647 \u0628\u0634\u0643\u0644 \u0646\u0638\u064a\u0641 \u2014 14 \u0639\u0645\u0648\u062f \u0641\u0642\u0637 (\u0623:ن)\u060c \u0628\u062f\u0648\u0646 \u062d\u0642\u0648\u0644 \u062a\u062a\u0628\u0639.
        </p>
        <p className="text-xs text-brand-gray mb-4">
          \u0627\u0644\u0623\u0639\u0645\u062f\u0629: \u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u2022 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u2022 \u0627\u0644\u0627\u0633\u0645 \u2022 \u0627\u0644\u0647\u0627\u062a\u0641 \u2022 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u2022 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u2022 \u0627\u0644\u0645\u0646\u062a\u062c \u2022 \u0627\u0644\u0645\u0642\u0627\u0633 \u2022 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u2022 \u0627\u0644\u0643\u0645\u064a\u0629 \u2022 \u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u2022 \u0627\u0644\u062d\u0627\u0644\u0629 \u2022 \u0645\u0644\u0627\u062d\u0638\u0629 \u2022 \u0627\u0644\u0645\u0635\u062f\u0631
        </p>

        {rebuildResult && (
          <div className="mb-4 p-3 border bg-green-50 border-green-200 text-sm text-green-800">
            <p className="font-bold">\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u2014 {rebuildResult.total} \u0637\u0644\u0628</p>
            <p className="text-xs mt-1">\u062a\u0627\u0628 Tracking: {rebuildResult.trackingTab ? "\u062a\u0645 \u0627\u0644\u062a\u062d\u062f\u064a\u062b" : "\u0644\u0627 \u064a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u062a\u062a\u0628\u0639 \u0644\u0644\u0643\u062a\u0627\u0628\u0629"}</p>
          </div>
        )}

        <button
          onClick={rebuildSheet}
          disabled={rebuilding || !canTest || !HAS_SUPABASE}
          title={!canTest ? "\u062e\u0627\u0635\u0643 \u062a\u0647\u064a\u0626 Google Sheets \u0623\u0648\u0644\u0627\u064b" : ""}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className={"h-4 w-4 " + (rebuilding ? "animate-spin" : "")} />
          {rebuilding ? "\u062c\u0627\u0631\u064a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0628\u0646\u0627\u0621..." : "\u0625\u0639\u0627\u062f\u0629 \u0628\u0646\u0627\u0621 Google Sheet"}
        </button>
      </div>

      {/* Bulk sync */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0642\u062f\u064a\u0645\u0629</h2>
        <p className="text-brand-gray text-sm mb-4">
          \u0632\u0627\u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0644\u064a \u0645\u0627 \u0648\u0635\u0644\u0627\u062a\u0634 \u0644\u0640 Google Sheets \u0628\u0639\u062f \u2014 \u0643\u064a\u062a\u062c\u0627\u0647\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0644\u064a \u062a\u0632\u0627\u0645\u0646\u062a \u0628\u0627\u0644\u0641\u0639\u0644.
        </p>

        {syncResult && (
          <div className="mb-4 space-y-2">
            <div className={"p-3 text-sm border " + (syncResult.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800")}>
              {syncResult.total === 0
                ? "\u0645\u0627 \u0643\u0627\u064a\u0646 \u062d\u062a\u0649 \u0637\u0644\u0628 \u0645\u062d\u062a\u0627\u062c \u0645\u0632\u0627\u0645\u0646\u0629 \u2014 \u0643\u0644\u0634\u064a \u0645\u062a\u0632\u0627\u0645\u0646"
                : `\u062a\u0645\u062a \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629: ${syncResult.synced} \u0646\u062c\u062d\u060c ${syncResult.failed} \u0641\u0634\u0644\u060c \u0645\u0646 \u0623\u0635\u0644 ${syncResult.total} \u0637\u0644\u0628`}
            </div>
            {syncResult.failures && syncResult.failures.length > 0 && (
              <div className="border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-bold text-red-700 mb-1">\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0623\u062e\u0637\u0627\u0621:</p>
                {syncResult.failures.map((f) => (
                  <div key={f.order_id} className="text-xs text-red-800 border-b border-red-100 pb-1 last:border-0">
                    <span className="font-bold">{f.customer || f.order_id}</span>
                    {" \u2014 "}
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
          title={!canTest ? "\u062e\u0627\u0635\u0643 \u062a\u0647\u064a\u0626 Google Sheets \u0623\u0648\u0644\u0627\u064b" : ""}
          className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2.5 text-sm hover:bg-opacity-85 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} />
          {syncing ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629..." : "\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0642\u062f\u064a\u0645\u0629"}
        </button>

        {!HAS_SUPABASE && (
          <p className="text-xs text-yellow-700 mt-2">\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase \u0628\u0627\u0634 \u062a\u0642\u062f\u0631 \u062a\u0632\u0627\u0645\u0646</p>
        )}
      </div>

      {/* Repair shifted rows */}
      <div className="bg-white border border-gray-200 p-5 mb-4">
        <h2 className="font-black text-brand-navy mb-1">\u0625\u0635\u0644\u0627\u062d \u062a\u0631\u062a\u064a\u0628 Google Sheet</h2>
        <p className="text-brand-gray text-sm mb-4">
          \u0627\u0643\u062a\u0634\u0641 \u0623\u0648 \u0635\u0644\u062d \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0644\u064a \u0643\u062a\u0628\u062a \u0641\u0640 \u0627\u0644\u0639\u0645\u0648\u062f \u0627\u0644\u063a\u0644\u0637 (O/N \u0628\u062f\u0644 A).
        </p>

        {repairResult && (
          <div className={"mb-4 p-3 border text-sm " + ((repairResult.errors?.length ?? 0) > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800")}>
            <p className="font-bold mb-1">{repairResult.message}</p>
            {repairResult.mode === "detect" && repairResult.shiftedRows && repairResult.shiftedRows.length > 0 && (
              <ul className="text-xs space-y-0.5 mt-1">
                {repairResult.shiftedRows.map((r) => (
                  <li key={r.row}>
                    \u0635\u0641 {r.row} \u2014 \u0627\u0644\u0628\u062f\u0627\u064a\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u0648\u062f <strong>{r.firstDataCol}</strong> \u2014 \u0627\u0644\u0642\u064a\u0645\u0629: {r.firstValue}
                  </li>
                ))}
              </ul>
            )}
            {repairResult.mode === "fix" && repairResult.repaired !== undefined && (
              <p className="text-xs mt-1">\u062a\u0645 \u0625\u0635\u0644\u0627\u062d {repairResult.repaired} \u0635\u0641</p>
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
            {repairing ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0641\u062d\u0635..." : "\u0643\u0634\u0641 \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u0646\u062d\u0631\u0641\u0629"}
          </button>
          <button
            onClick={() => detectRepair("fix")}
            disabled={repairing || !canTest}
            className="flex items-center gap-2 bg-orange-500 text-white font-bold px-4 py-2 text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Wrench className="h-3.5 w-3.5" />
            {repairing ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0635\u0644\u0627\u062d..." : "\u0625\u0635\u0644\u0627\u062d \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u0646\u062d\u0631\u0641\u0629"}
          </button>
        </div>
      </div>

      {/* Export CSV */}
      <div className="bg-white border border-gray-200 p-5">
        <h2 className="font-black text-brand-navy mb-2">\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0637\u0644\u0628\u0627\u062a CSV</h2>
        <p className="text-brand-gray text-sm mb-4">
          \u0635\u062f\u0651\u0631 \u062c\u0645\u064a\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0643\u0645\u0644\u0641 CSV \u2014 \u064a\u0634\u062a\u063a\u0644 \u0628\u062f\u0648\u0646 Google Sheets
        </p>
        <button
          onClick={exportCSV}
          disabled={exporting || !HAS_SUPABASE}
          className="flex items-center gap-2 bg-brand-gold text-white font-bold px-5 py-2 text-sm hover:bg-opacity-85 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631..." : "\u062a\u062d\u0645\u064a\u0644 CSV"}
        </button>
        {!HAS_SUPABASE && (
          <p className="text-xs text-yellow-700 mt-2">\u062e\u0627\u0635\u0643 \u062a\u0631\u0628\u0637 Supabase \u0628\u0627\u0634 \u062a\u0642\u062f\u0631 \u062a\u0635\u062f\u0651\u0631</p>
        )}
      </div>
    </div>
  );
}
