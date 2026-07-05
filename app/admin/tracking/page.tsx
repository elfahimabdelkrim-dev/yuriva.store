"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";

const MAX_PIXELS = 100;
const PROVIDERS = ["meta", "tiktok", "ga", "gtm"];

interface TrackingPixel {
  id: string;
  provider: string;
  label: string;
  pixel_id: string;
  is_active: boolean;
  created_at: string;
}

interface EditState {
  label: string;
  pixel_id: string;
  provider: string;
}

type FilterTab = "all" | "active" | "inactive";

function validatePidClient(id: string): string | null {
  const c = id.trim();
  if (!c)                              return "Pixel ID مطلوب";
  if (!/^\d+$/.test(c))               return "Pixel ID أرقام فقط";
  if (c.length < 10 || c.length > 20) return "Pixel ID يجب بين 10 و 20 رقم";
  return null;
}

export default function AdminTrackingPage() {
  const [pixels, setPixels]         = useState<TrackingPixel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [editMap, setEditMap]       = useState<Record<string, EditState>>({});
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<FilterTab>("all");
  const [showAdd, setShowAdd]       = useState(false);
  const [showBulk, setShowBulk]     = useState(false);
  const [newForm, setNewForm]       = useState({ provider: "meta", label: "", pixel_id: "" });
  const [adding, setAdding]         = useState(false);
  const [bulkText, setBulkText]     = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/tracking-pixels");
      const json = await res.json() as { pixels?: TrackingPixel[]; error?: string };
      if (json.pixels) {
        setPixels(json.pixels);
        const map: Record<string, EditState> = {};
        for (const px of json.pixels) {
          map[px.id] = { label: px.label, pixel_id: px.pixel_id, provider: px.provider };
        }
        setEditMap(map);
      } else {
        toast.error(json.error ?? "فشل تحميل البيكسلات");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total     = pixels.length;
  const activeN   = pixels.filter((p) => p.is_active).length;
  const inactiveN = total - activeN;
  const remaining = MAX_PIXELS - total;

  // Filtered list (client-side, instant)
  const filtered = useMemo(() => {
    let list = pixels;
    if (tab === "active")   list = list.filter((p) => p.is_active);
    if (tab === "inactive") list = list.filter((p) => !p.is_active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.label.toLowerCase().includes(q) || p.pixel_id.includes(q)
      );
    }
    return list;
  }, [pixels, tab, search]);

  // Save edited fields
  const handleSave = async (px: TrackingPixel) => {
    const edit = editMap[px.id];
    if (!edit) return;
    const pidErr = validatePidClient(edit.pixel_id);
    if (pidErr) { toast.error(pidErr); return; }
    setSaving(px.id);
    try {
      const res  = await fetch(`/api/admin/tracking-pixels/${px.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: edit.label, pixel_id: edit.pixel_id, provider: edit.provider }),
      });
      const json = await res.json() as { pixel?: TrackingPixel; error?: string };
      if (json.pixel) { toast.success("تم الحفظ"); load(); }
      else toast.error(json.error ?? "فشل الحفظ");
    } catch {
      toast.error("خطأ في الحفظ");
    } finally {
      setSaving(null);
    }
  };

  // Toggle active/inactive
  const handleToggle = async (px: TrackingPixel) => {
    setSaving(px.id);
    try {
      const res  = await fetch(`/api/admin/tracking-pixels/${px.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !px.is_active }),
      });
      const json = await res.json() as { pixel?: TrackingPixel; error?: string };
      if (json.pixel) {
        toast.success(px.is_active ? "تم التعطيل" : "تم التفعيل");
        load();
      } else {
        toast.error(json.error ?? "فشل");
      }
    } catch {
      toast.error("خطأ");
    } finally {
      setSaving(null);
    }
  };

  // Delete with confirmation
  const handleDelete = async (px: TrackingPixel) => {
    if (!window.confirm(`هل تريد حذف «${px.label}»؟`)) return;
    setDeleting(px.id);
    try {
      const res  = await fetch(`/api/admin/tracking-pixels/${px.id}`, { method: "DELETE" });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) { toast.success("تم الحذف"); load(); }
      else toast.error(json.error ?? "فشل الحذف");
    } catch {
      toast.error("خطأ في الحذف");
    } finally {
      setDeleting(null);
    }
  };

  // Add single pixel
  const handleAdd = async () => {
    if (total >= MAX_PIXELS) { toast.error("وصلتي للحد الأقصى ديال 100 Pixel"); return; }
    const pidErr = validatePidClient(newForm.pixel_id);
    if (pidErr) { toast.error(pidErr); return; }
    if (!newForm.label.trim()) { toast.error("التسمية مطلوبة"); return; }
    setAdding(true);
    try {
      const res  = await fetch("/api/admin/tracking-pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newForm.provider,
          label: newForm.label.trim(),
          pixel_id: newForm.pixel_id.trim(),
          is_active: true,
        }),
      });
      const json = await res.json() as { pixel?: TrackingPixel; error?: string };
      if (json.pixel) {
        toast.success("تم إضافة Pixel");
        setNewForm({ provider: "meta", label: "", pixel_id: "" });
        setShowAdd(false);
        load();
      } else {
        toast.error(json.error ?? "فشل الإضافة");
      }
    } catch {
      toast.error("خطأ في الإضافة");
    } finally {
      setAdding(false);
    }
  };

  // Bulk add (one pixel_id per line)
  const handleBulkAdd = async () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("الصق Pixel IDs — واحد في كل سطر"); return; }
    if (remaining <= 0) { toast.error("وصلتي للحد الأقصى ديال 100 Pixel"); return; }
    setBulkAdding(true);
    try {
      const res  = await fetch("/api/admin/tracking-pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: lines }),
      });
      const json = await res.json() as {
        pixels?: TrackingPixel[];
        error?: string;
        skipped_duplicates?: string[];
        skipped_invalid?: string[];
      };
      if (json.pixels) {
        const added = json.pixels.length;
        const dupes = json.skipped_duplicates?.length ?? 0;
        const inv   = json.skipped_invalid?.length ?? 0;
        let msg = `تم إضافة ${added} Pixel`;
        if (dupes > 0) msg += ` — ${dupes} مكرر تجاهل`;
        if (inv  > 0) msg += ` — ${inv} غير صالح تجاهل`;
        toast.success(msg);
        setBulkText("");
        setShowBulk(false);
        load();
      } else {
        toast.error(json.error ?? "فشل الإضافة");
      }
    } catch {
      toast.error("خطأ في الإضافة");
    } finally {
      setBulkAdding(false);
    }
  };

  const inp = "border border-gray-200 focus:border-brand-navy px-2 py-1 text-sm outline-none w-full";

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">إدارة Pixels التتبع</h1>
          <p className="text-brand-gray text-sm mt-0.5">
            أضف أو عدل أو احذف Meta Pixels — بدون تعديل .env
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { setShowBulk((v) => !v); setShowAdd(false); }}
            className="border border-brand-navy text-brand-navy font-bold px-3 py-2 text-sm hover:bg-brand-light"
          >
            إضافة دفعة
          </button>
          <button
            onClick={() => { setShowAdd((v) => !v); setShowBulk(false); }}
            disabled={total >= MAX_PIXELS}
            title={total >= MAX_PIXELS ? "وصلتي للحد الأقصى ديال 100 Pixel" : ""}
            className="bg-brand-navy text-white font-bold px-4 py-2 text-sm hover:bg-opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + إضافة Pixel
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {([
          { label: "الإجمالي",    value: `${total} / ${MAX_PIXELS}`, cls: "text-brand-navy" },
          { label: "نشيط",      value: String(activeN),   cls: "text-green-600" },
          { label: "غير نشيط", value: String(inactiveN), cls: "text-gray-400" },
          { label: "متبقي",     value: String(remaining),  cls: remaining <= 5 ? "text-red-500" : "text-brand-gold" },
        ] as { label: string; value: string; cls: string }[]).map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 p-3 text-center">
            <div className={`text-2xl font-black ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-brand-gray mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Single-add form */}
      {showAdd && (
        <div className="bg-brand-light border border-brand-navy/20 p-4 mb-4">
          <p className="font-bold text-brand-navy text-sm mb-3">إضافة Pixel جديد</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-brand-gray block mb-1">Provider</label>
              <select
                value={newForm.provider}
                onChange={(e) => setNewForm((f) => ({ ...f, provider: e.target.value }))}
                className="border border-gray-300 px-2 py-1.5 text-sm outline-none w-full focus:border-brand-navy"
              >
                {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-gray block mb-1">التسمية</label>
              <input
                value={newForm.label}
                onChange={(e) => setNewForm((f) => ({ ...f, label: e.target.value }))}
                className="border border-gray-300 focus:border-brand-navy px-2 py-1.5 text-sm outline-none w-full"
                placeholder="مثال: Main Pixel"
              />
            </div>
            <div>
              <label className="text-xs text-brand-gray block mb-1">Pixel ID</label>
              <input
                value={newForm.pixel_id}
                onChange={(e) => setNewForm((f) => ({ ...f, pixel_id: e.target.value.replace(/\D/g, "") }))}
                className="border border-gray-300 focus:border-brand-navy px-2 py-1.5 text-sm outline-none w-full font-mono"
                placeholder="4569111183412330"
                dir="ltr"
                maxLength={20}
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="bg-brand-navy text-white font-bold px-6 py-2 text-sm hover:bg-opacity-85 disabled:opacity-60"
            >
              {adding ? "جاري الإضافة..." : "حفظ Pixel"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm text-brand-gray hover:text-brand-navy px-3"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Bulk-add form */}
      {showBulk && (
        <div className="bg-brand-light border border-brand-navy/20 p-4 mb-4">
          <p className="font-bold text-brand-navy text-sm mb-1">إضافة Pixels دفعة واحدة</p>
          <p className="text-xs text-brand-gray mb-2">
            الصق Pixel IDs — رقم واحد في كل سطر (أرقام فقط، 10–20 رقم).
            التسميات تتولد تلقائياً.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="border border-gray-300 focus:border-brand-navy p-2 text-sm outline-none w-full font-mono resize-y"
            rows={6}
            placeholder={"4569111183412330\n1162700877684124\n..."}
            dir="ltr"
          />
          <p className="text-xs text-brand-gray mt-1 mb-3">
            {bulkText.split("\n").filter((l) => l.trim()).length} سطر — متبقي {remaining} slot
          </p>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleBulkAdd}
              disabled={bulkAdding || !bulkText.trim()}
              className="bg-brand-navy text-white font-bold px-6 py-2 text-sm hover:bg-opacity-85 disabled:opacity-60"
            >
              {bulkAdding ? "جاري الإضافة..." : "إضافة Pixels دفعة واحدة"}
            </button>
            <button
              onClick={() => setShowBulk(false)}
              className="text-sm text-brand-gray hover:text-brand-navy px-3"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Search + filter tabs */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو Pixel ID..."
          className="flex-1 border border-gray-300 focus:border-brand-navy px-3 py-1.5 text-sm outline-none"
          dir="rtl"
        />
        <div className="flex border border-gray-200 text-sm font-bold overflow-hidden flex-shrink-0">
          {(["all", "active", "inactive"] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 transition-colors ${tab === t ? "bg-brand-navy text-white" : "text-brand-gray hover:bg-gray-50"}`}
            >
              {t === "all" ? `الكل (${total})` : t === "active" ? `نشيط (${activeN})` : `غير نشيط (${inactiveN})`}
            </button>
          ))}
        </div>
      </div>

      {/* Pixel list */}
      {loading ? (
        <div className="text-center py-12 text-brand-gray text-sm">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-brand-gray text-sm">
          {pixels.length === 0
            ? "لا يوجد Pixels بعد — أضف واحداً من الأعلى"
            : "لا نتائج للبحث"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((px) => {
            const edit    = editMap[px.id] ?? { label: px.label, pixel_id: px.pixel_id, provider: px.provider };
            const isSave  = saving   === px.id;
            const isDel   = deleting === px.id;
            const changed = edit.label !== px.label || edit.pixel_id !== px.pixel_id || edit.provider !== px.provider;
            const globalIdx = pixels.indexOf(px) + 1;

            return (
              <div
                key={px.id}
                className={`bg-white border p-3 transition-opacity ${px.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
              >
                {/* Row header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs text-gray-300 font-mono w-6 text-center flex-shrink-0">#{globalIdx}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${px.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-xs font-mono uppercase text-gray-400 flex-shrink-0">{px.provider}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${px.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {px.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="flex-1" />
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(px)}
                    disabled={isSave}
                    className={`text-xs px-2.5 py-1 font-bold border transition-colors disabled:opacity-50 ${
                      px.is_active
                        ? "border-gray-300 text-gray-500 hover:bg-gray-50"
                        : "border-green-500 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {isSave ? "..." : px.is_active ? "تعطيل" : "تفعيل"}
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(px)}
                    disabled={isDel || isSave}
                    className="text-xs px-2.5 py-1 font-bold border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDel ? "..." : "حذف"}
                  </button>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-brand-gray block mb-0.5">Provider</label>
                    <select
                      value={edit.provider}
                      onChange={(e) => setEditMap((m) => ({ ...m, [px.id]: { ...edit, provider: e.target.value } }))}
                      className={inp}
                    >
                      {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-brand-gray block mb-0.5">التسمية</label>
                    <input
                      value={edit.label}
                      onChange={(e) => setEditMap((m) => ({ ...m, [px.id]: { ...edit, label: e.target.value } }))}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-brand-gray block mb-0.5">Pixel ID</label>
                    <input
                      value={edit.pixel_id}
                      onChange={(e) => setEditMap((m) => ({ ...m, [px.id]: { ...edit, pixel_id: e.target.value.replace(/\D/g, "") } }))}
                      className={`${inp} font-mono`}
                      dir="ltr"
                      maxLength={20}
                    />
                  </div>
                </div>

                {/* Save button — only shows when fields changed */}
                {changed && (
                  <button
                    onClick={() => handleSave(px)}
                    disabled={isSave}
                    className="bg-brand-navy text-white font-bold px-4 py-1 text-xs hover:bg-opacity-85 disabled:opacity-60"
                  >
                    {isSave ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 p-3 bg-brand-light border border-gray-200 text-xs text-brand-gray">
        <strong className="text-brand-navy">كيف يشتغل:</strong>{" "}
        التغييرات تظهر على الموقع فوراً بدون Rebuild.
        {" "}كل البيكسلات النشيطة تستقبل PageView ، ViewContent ، InitiateCheckout ، Purchase.
        {" "}الحد الأقصى {MAX_PIXELS} Pixel.
      </div>
    </div>
  );
}
