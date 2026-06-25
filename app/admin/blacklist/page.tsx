"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ShieldX } from "lucide-react";
import { validateMoroccanPhone } from "@/lib/utils";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

interface Entry { id: string; phone: string; reason?: string; created_at: string; }

export default function AdminBlacklistPage() {
  const [list, setList] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!HAS_SUPABASE) { setLoading(false); return; }
    try {
      const r = await fetch("/api/admin/blacklist");
      const d = await r.json();
      if (d.success) setList(d.data);
    } catch { toast.error("خطأ في التحميل"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!phone) { toast.error("دخل رقم الهاتف"); return; }
    if (!validateMoroccanPhone(phone)) { toast.error("الرقم غير صحيح — خاص يبدأ بـ 06 أو 07"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setAdding(true);
    try {
      const r = await fetch("/api/admin/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, reason }) });
      const d = await r.json();
      if (d.success) { toast.success("تزاد الرقم للقائمة"); setPhone(""); setReason(""); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setAdding(false);
  };

  const remove = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    try {
      const r = await fetch(`/api/admin/blacklist/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { toast.success("تحذف الرقم"); setDeleteConfirm(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <ShieldX className="h-6 w-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-black text-brand-navy">القائمة السوداء</h1>
          <p className="text-brand-gray text-sm">{list.length} رقم محظور</p>
        </div>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">
          ⚠️ ربط Supabase لإدارة القائمة السوداء
        </div>
      )}

      {/* Add form */}
      <div className="bg-white border border-gray-200 p-4 mb-5">
        <h2 className="font-black text-brand-navy mb-3 text-sm">زيد رقم للقائمة</h2>
        <div className="flex gap-2 flex-wrap">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" dir="ltr"
            className="border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none flex-1 min-w-36" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="السبب (اختياري)"
            className="border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none flex-1 min-w-36" />
          <button onClick={add} disabled={adding} className="flex items-center gap-1.5 bg-red-500 text-white font-bold px-4 py-2 text-sm hover:bg-red-600 disabled:opacity-60">
            <Plus className="h-3.5 w-3.5" />{adding ? "جاري..." : "زيد"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-brand-gray">جاري التحميل...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-bold text-brand-navy">القائمة السوداء فارغة</p>
          <p className="text-brand-gray text-sm">ما كاين حتى رقم محظور</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(entry => (
            <div key={entry.id} className="bg-white border border-gray-200 p-3 flex items-center gap-3">
              <ShieldX className="h-4 w-4 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-brand-navy" dir="ltr">{entry.phone}</p>
                {entry.reason && <p className="text-xs text-brand-gray">{entry.reason}</p>}
                <p className="text-xs text-brand-gray/60">{entry.created_at ? new Date(entry.created_at).toLocaleDateString("ar-MA") : ""}</p>
              </div>
              <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 border border-gray-200 hover:border-red-400 text-brand-gray hover:text-red-500 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-brand-gray text-sm mb-5">واش راك متأكد من حذف هاد الرقم من القائمة السوداء؟</p>
            <div className="flex gap-3">
              <button onClick={() => remove(deleteConfirm)} className="bg-red-500 text-white font-bold px-5 py-2 text-sm">حذف</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-gray-300 font-bold px-4 py-2 text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
