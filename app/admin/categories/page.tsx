"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X, GripVertical, Eye, EyeOff } from "lucide-react";
import { staticCategories } from "@/data/categories";
import toast from "react-hot-toast";
import ImageUploadField from "@/components/admin/ImageUploadField";

const HAS_SUPABASE = !!(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface Category {
  id: string; name: string; slug: string; image_url?: string; banner_url?: string;
  description?: string; seo_title?: string; seo_description?: string;
  sort_order?: number; is_active?: boolean;
}

const EMPTY: Omit<Category, "id"> = {
  name: "", slug: "", image_url: "", banner_url: "", description: "",
  seo_title: "", seo_description: "", sort_order: 0, is_active: true,
};

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Category>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addData, setAddData] = useState<Omit<Category, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!HAS_SUPABASE) {
      setCats(staticCategories.map((c, i) => ({ ...c, id: c.slug, sort_order: i, is_active: c.is_active ?? true })));
      setLoading(false); return;
    }
    try {
      const r = await fetch("/api/admin/categories");
      const d = await r.json();
      if (d.success) setCats(d.data);
      else toast.error(d.error);
    } catch { toast.error("خطأ في التحميل"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const slugify = (t: string) => t.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").replace(/--+/g, "-");

  const handleAdd = async () => {
    if (!addData.name || !addData.slug) { toast.error("الاسم والـ slug ضروريين"); return; }
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase باش تزيد تصنيفات"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addData) });
      const d = await r.json();
      if (d.success) { toast.success("تزاد التصنيف"); setShowAdd(false); setAddData(EMPTY); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase باش تعدل"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editData) });
      const d = await r.json();
      if (d.success) { toast.success("تحفظ التصنيف"); setEditId(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    try {
      const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { toast.success("تحذف التصنيف"); setDeleteConfirm(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
  };

  const toggleActive = async (cat: Category) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    try {
      const r = await fetch(`/api/admin/categories/${cat.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !cat.is_active }) });
      const d = await r.json();
      if (d.success) { toast.success(cat.is_active ? "توقف" : "تفعّل"); load(); }
    } catch { toast.error("خطأ"); }
  };

  const inp = "border border-gray-300 focus:border-brand-navy px-2 py-1.5 text-sm outline-none w-full";
  const lbl = "text-xs font-bold text-brand-gray block mb-0.5";

  // Current category being edited (for subfolder)
  const editingCat = cats.find(c => c.id === editId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">التصنيفات</h1>
          <p className="text-brand-gray text-sm">{cats.length} تصنيف</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm hover:bg-opacity-85">
          <Plus className="h-4 w-4" /> زيد تصنيف جديد
        </button>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 text-sm text-yellow-800">
          ⚠️ وضع عرض فقط — ربط Supabase لإدارة التصنيفات فعلياً
        </div>
      )}

      {/* ── Add form ─────────────────────────────────────────── */}
      {showAdd && (
        <div className="bg-white border border-brand-gold p-5 mb-5">
          <h2 className="font-black text-brand-navy mb-4">تصنيف جديد</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className={lbl}>اسم التصنيف *</label>
              <input className={inp} value={addData.name} onChange={e => setAddData(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} placeholder="سراول Para" />
            </div>
            <div>
              <label className={lbl}>Slug *</label>
              <input className={inp} value={addData.slug} onChange={e => setAddData(f => ({ ...f, slug: e.target.value }))} dir="ltr" placeholder="pantalons-para" />
            </div>

            {/* Image upload fields — full width each */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-light p-4 border border-gray-100">
              <ImageUploadField
                label="صورة التصنيف (الدائرة)"
                value={addData.image_url || ""}
                onChange={url => setAddData(f => ({ ...f, image_url: url }))}
                folder="categories"
                subfolder={addData.slug || "new"}
                compact
              />
              <ImageUploadField
                label="صورة البانر (أعلى الصفحة)"
                value={addData.banner_url || ""}
                onChange={url => setAddData(f => ({ ...f, banner_url: url }))}
                folder="categories"
                subfolder={addData.slug || "new"}
                compact
              />
            </div>

            <div className="sm:col-span-2">
              <label className={lbl}>الوصف</label>
              <textarea className={inp} rows={2} value={addData.description || ""} onChange={e => setAddData(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>SEO Title</label>
              <input className={inp} value={addData.seo_title || ""} onChange={e => setAddData(f => ({ ...f, seo_title: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>SEO Description</label>
              <input className={inp} value={addData.seo_description || ""} onChange={e => setAddData(f => ({ ...f, seo_description: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>الترتيب</label>
              <input type="number" className={inp} value={addData.sort_order || 0} onChange={e => setAddData(f => ({ ...f, sort_order: +e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="add_active" checked={addData.is_active} onChange={e => setAddData(f => ({ ...f, is_active: e.target.checked }))} className="accent-brand-gold" />
              <label htmlFor="add_active" className="text-sm font-bold text-brand-navy cursor-pointer">نشط</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="bg-brand-navy text-white font-bold px-5 py-2 text-sm disabled:opacity-60">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => { setShowAdd(false); setAddData(EMPTY); }} className="border border-gray-300 text-brand-navy font-bold px-4 py-2 text-sm hover:bg-gray-50">إلغاء</button>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {cats.map(cat => (
            <div key={cat.id} className={`bg-white border ${editId === cat.id ? "border-brand-gold" : "border-gray-200"} p-4`}>
              {editId === cat.id ? (
                /* ── Edit mode ── */
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div><label className={lbl}>الاسم</label><input className={inp} value={editData.name ?? cat.name} onChange={e => setEditData(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className={lbl}>Slug</label><input className={inp} dir="ltr" value={editData.slug ?? cat.slug} onChange={e => setEditData(f => ({ ...f, slug: e.target.value }))} /></div>

                    {/* Image upload fields in edit mode */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-light p-4 border border-gray-100">
                      <ImageUploadField
                        label="صورة التصنيف (الدائرة)"
                        value={editData.image_url ?? cat.image_url ?? ""}
                        onChange={url => setEditData(f => ({ ...f, image_url: url }))}
                        folder="categories"
                        subfolder={editingCat?.slug || cat.slug || "general"}
                        compact
                      />
                      <ImageUploadField
                        label="صورة البانر (أعلى الصفحة)"
                        value={editData.banner_url ?? cat.banner_url ?? ""}
                        onChange={url => setEditData(f => ({ ...f, banner_url: url }))}
                        folder="categories"
                        subfolder={editingCat?.slug || cat.slug || "general"}
                        compact
                      />
                    </div>

                    <div className="sm:col-span-2"><label className={lbl}>الوصف</label><textarea className={inp} rows={2} value={editData.description ?? cat.description ?? ""} onChange={e => setEditData(f => ({ ...f, description: e.target.value }))} /></div>
                    <div><label className={lbl}>SEO Title</label><input className={inp} value={editData.seo_title ?? cat.seo_title ?? ""} onChange={e => setEditData(f => ({ ...f, seo_title: e.target.value }))} /></div>
                    <div><label className={lbl}>SEO Description</label><input className={inp} value={editData.seo_description ?? cat.seo_description ?? ""} onChange={e => setEditData(f => ({ ...f, seo_description: e.target.value }))} /></div>
                    <div><label className={lbl}>الترتيب</label><input type="number" className={inp} value={editData.sort_order ?? cat.sort_order ?? 0} onChange={e => setEditData(f => ({ ...f, sort_order: +e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(cat.id)} disabled={saving} className="flex items-center gap-1.5 bg-brand-navy text-white font-bold px-4 py-2 text-sm disabled:opacity-60">
                      <Save className="h-3.5 w-3.5" />{saving ? "جاري..." : "حفظ"}
                    </button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1.5 border border-gray-300 text-brand-navy font-bold px-3 py-2 text-sm hover:bg-gray-50">
                      <X className="h-3.5 w-3.5" />إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="flex items-center gap-3 flex-wrap">
                  <GripVertical className="h-4 w-4 text-gray-300 cursor-grab flex-shrink-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-10 h-10 object-cover rounded" onError={e => ((e.currentTarget as HTMLImageElement).style.display = "none")} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-navy">{cat.name}</p>
                    <p className="text-xs text-brand-gray" dir="ltr">/collections/{cat.slug}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${cat.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {cat.is_active ? "نشط" : "موقوف"}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleActive(cat)} title={cat.is_active ? "إيقاف" : "تفعيل"} className="p-1.5 border border-gray-200 hover:border-brand-gold text-brand-gray hover:text-brand-gold transition-colors">
                      {cat.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => { setEditId(cat.id); setEditData({}); }} className="p-1.5 border border-gray-200 hover:border-brand-navy text-brand-gray hover:text-brand-navy transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(cat.id)} className="p-1.5 border border-gray-200 hover:border-red-400 text-brand-gray hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-brand-gray text-sm mb-5">واش راك متأكد؟ هاد التصنيف غادي يتحذف نهائياً.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white font-bold px-5 py-2 text-sm hover:bg-red-600">حذف</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-gray-300 text-brand-navy font-bold px-4 py-2 text-sm hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
