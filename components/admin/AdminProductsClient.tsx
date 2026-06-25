"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit, Eye, Trash2, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL
);

interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  old_price?: number;
  badge?: string;
  is_pack?: boolean;
  pack_pieces?: number;
  is_active?: boolean;
  category_id?: string;
  main_image?: string;
}

export default function AdminProductsClient() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/products");
      const d = await r.json();
      if (d.products) setProducts(d.products);
    } catch {
      toast.error("خطأ في تحميل المنتجات");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        toast.success("تحذف/توقف المنتج");
        setDeleteConfirm(null);
        load();
      } else {
        toast.error(d.error || "خطأ");
      }
    } catch {
      toast.error("خطأ");
    }
    setDeleting(false);
  };

  const isValidUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">المنتجات</h1>
          <p className="text-brand-gray text-sm mt-1">
            {loading ? "جاري التحميل..." : `${products.length} منتج`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 border border-gray-300 text-brand-navy font-bold px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2.5 text-sm hover:bg-opacity-85"
          >
            <Plus className="h-4 w-4" />
            منتج جديد
          </Link>
        </div>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 text-sm text-yellow-800">
          ⚠️ وضع عرض فقط — ربط Supabase لإدارة المنتجات فعلياً
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-brand-light border border-gray-200">
          <p className="text-brand-navy font-bold mb-2">ما كاين منتجات دابا</p>
          <Link href="/admin/products/new" className="text-brand-gold font-bold text-sm underline">
            زيد المنتج الأول
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-light border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">المنتج</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">الثمن</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">النوع</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">الحالة</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">ID</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const canEdit = isValidUuid(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-brand-light transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.main_image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.main_image}
                              alt={p.title}
                              className="w-10 h-10 object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          <div>
                            <p className="font-bold text-brand-navy">{p.title}</p>
                            <p className="text-brand-gray text-xs" dir="ltr">{p.slug}</p>
                            {p.badge && <Badge className="mt-0.5">{p.badge}</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-brand-navy">{formatPrice(p.price)}</p>
                        {p.old_price && (
                          <p className="text-brand-gray line-through text-xs">{formatPrice(p.old_price)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_pack ? (
                          <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2 py-0.5 rounded">
                            باك {p.pack_pieces} قطع
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-brand-gray px-2 py-0.5 rounded">
                            منتج عادي
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            p.is_active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.is_active !== false ? "نشط" : "مخفي"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                            canEdit
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                          title={p.id}
                        >
                          {canEdit ? p.id.slice(0, 8) + "…" : "static"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="flex items-center gap-1 text-xs text-brand-navy hover:text-brand-gold font-bold"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              بدل
                            </Link>
                          ) : (
                            <span className="text-xs text-brand-gray">static</span>
                          )}
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="flex items-center gap-1 text-xs text-brand-gray hover:text-brand-gold"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            شوف
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => setDeleteConfirm(p.id)}
                              className="flex items-center gap-1 text-xs text-brand-gray hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الإيقاف</h3>
            <p className="text-brand-gray text-sm mb-5">
              المنتج غادي يتوقف (مش يتحذف). تقدر تعيده من نفس الصفحة.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="bg-red-500 text-white font-bold px-5 py-2 text-sm disabled:opacity-60"
              >
                {deleting ? "جاري..." : "إيقاف"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="border border-gray-300 text-brand-navy font-bold px-4 py-2 text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
