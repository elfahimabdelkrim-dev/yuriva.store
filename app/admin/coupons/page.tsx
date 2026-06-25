"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X, Tag } from "lucide-react";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

interface Coupon {
  id: string; code: string; discount_type: "percentage" | "fixed";
  discount_value: number; min_order_amount: number;
  expires_at?: string; is_active: boolean; usage_count: number; created_at: string;
}

type CouponForm = {
  code: string; discount_type: "percentage" | "fixed";
  discount_value: number; min_order_amount: number; expires_at: string; is_active: boolean;
};
const EMPTY: CouponForm = { code: "", discount_type: "percentage", discount_value: 10, min_order_amount: 0, expires_at: "", is_active: true };

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addData, setAddData] = useState<CouponForm>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Coupon>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!HAS_SUPABASE) { setLoading(false); return; }
    try {
      const r = await fetch("/api/admin/coupons");
      const d = await r.json();
      if (d.success) setCoupons(d.data);
    } catch { toast.error("خطأ في التحميل"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!addData.code || !addData.discount_value) { toast.error("الكود والخصم ضروريين"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addData) });
      const d = await r.json();
      if (d.success) { toast.success("تزاد الكوبون"); setShowAdd(false); setAddData(EMPTY); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const save = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/coupons/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editData) });
      const d = await r.json();
      if (d.success) { toast.success("تحفظ الكوبون"); setEditId(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    try {
      const r = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { toast.success("تحذف الكوبون"); setDeleteConfirm(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
  };

  const inp = "border border-gray-300 focus:border-brand-navy px-2 py-1.5 text-sm outline-none w-full";
  const lbl = "text-xs font-bold text-brand-gray block mb-0.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">الكوبونات</h1>
          <p className="text-brand-gray text-sm">{coupons.length} كوبون</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> كوبون جديد
        </button>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 text-sm text-yellow-800">
          ⚠️ ربط Supabase لإدارة الكوبونات
        </div>
      )}

      {showAdd && (
        <div className="bg-white border border-brand-gold p-4 mb-4">
          <h2 className="font-bold text-brand-navy mb-3">كوبون جديد</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={lbl}>الكود *</label>
              <input className={inp} dir="ltr" value={addData.code} onChange={e => setAddData(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" />
            </div>
            <div>
              <label className={lbl}>نوع الخصم</label>
              <select className={inp} value={addData.discount_type} onChange={e => setAddData(f => ({ ...f, discount_type: e.target.value as "percentage" | "fixed" }))}>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (درهم)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>قيمة الخصم *</label>
              <input type="number" className={inp} value={addData.discount_value} onChange={e => setAddData(f => ({ ...f, discount_value: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>حد أدنى للطلب</label>
              <input type="number" className={inp} value={addData.min_order_amount} onChange={e => setAddData(f => ({ ...f, min_order_amount: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>تاريخ الانتهاء</label>
              <input type="date" className={inp} value={addData.expires_at || ""} onChange={e => setAddData(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="add_active_c" checked={addData.is_active} onChange={e => setAddData(f => ({ ...f, is_active: e.target.checked }))} className="accent-brand-gold" />
              <label htmlFor="add_active_c" className="text-sm font-bold text-brand-navy cursor-pointer">نشط</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60">
              {saving ? "جاري..." : "حفظ"}
            </button>
            <button onClick={() => { setShowAdd(false); setAddData(EMPTY); }} className="border border-gray-300 font-bold px-3 py-2 text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-brand-gray">جاري التحميل...</div>
      ) : coupons.length === 0 && HAS_SUPABASE ? (
        <div className="text-center py-12 bg-white border border-gray-200">
          <Tag className="h-10 w-10 text-brand-gray mx-auto mb-2" />
          <p className="font-bold text-brand-navy">ما كاين حتى كوبون</p>
          <p className="text-brand-gray text-sm">زيد أول كوبون من الزر فوق</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-light border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">الكود</th>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">الخصم</th>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">الحد الأدنى</th>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">الاستخدام</th>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">الحالة</th>
                <th className="px-4 py-3 text-right font-bold text-brand-navy">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-brand-light">
                  {editId === c.id ? (
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div>
                          <label className={lbl}>الكود</label>
                          <input className={inp} dir="ltr" value={editData.code ?? c.code} onChange={e => setEditData(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                        </div>
                        <div>
                          <label className={lbl}>النوع</label>
                          <select className={inp} value={editData.discount_type ?? c.discount_type} onChange={e => setEditData(f => ({ ...f, discount_type: e.target.value as "percentage" | "fixed" }))}>
                            <option value="percentage">%</option>
                            <option value="fixed">درهم</option>
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>القيمة</label>
                          <input type="number" className={inp} value={editData.discount_value ?? c.discount_value} onChange={e => setEditData(f => ({ ...f, discount_value: +e.target.value }))} />
                        </div>
                        <div>
                          <label className={lbl}>الحد الأدنى</label>
                          <input type="number" className={inp} value={editData.min_order_amount ?? c.min_order_amount} onChange={e => setEditData(f => ({ ...f, min_order_amount: +e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => save(c.id)} disabled={saving} className="flex items-center gap-1 bg-brand-navy text-white font-bold px-3 py-1.5 text-sm disabled:opacity-60">
                          <Save className="h-3 w-3" />{saving ? "..." : "حفظ"}
                        </button>
                        <button onClick={() => setEditId(null)} className="border border-gray-300 p-1.5 text-sm">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-black text-brand-navy" dir="ltr">{c.code}</td>
                      <td className="px-4 py-3 text-brand-gold font-bold">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} درهم`}
                      </td>
                      <td className="px-4 py-3 text-brand-gray">{c.min_order_amount > 0 ? `${c.min_order_amount} درهم` : "—"}</td>
                      <td className="px-4 py-3 text-brand-gray">{c.usage_count} مرة</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.is_active ? "نشط" : "موقوف"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditId(c.id); setEditData({}); }} className="p-1 border border-gray-200 hover:border-brand-navy text-brand-gray hover:text-brand-navy">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(c.id)} className="p-1 border border-gray-200 hover:border-red-400 text-brand-gray hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-brand-gray text-sm mb-5">واش راك متأكد من حذف هاد الكوبون؟</p>
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
