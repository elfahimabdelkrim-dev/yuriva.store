"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Trash2, Copy, Image, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

interface MediaItem { id: string; name: string; url: string; size?: number; created_at?: string; }

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!HAS_SUPABASE) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/admin/media");
      const d = await r.json();
      if (d.success) setMedia(d.data);
      else if (d.error?.includes("bucket") || d.error?.includes("not found")) toast.error("ما لقيناش bucket product-images — شوف التعليمات تحت");
    } catch { toast.error("خطأ في تحميل الصور"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setUploading(true);
    try {
      // Upload directly to Supabase Storage from client
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await sb.storage.from("product-images").upload(name, file, { cacheControl: "3600", upsert: false });
        if (error) { toast.error(`فشل رفع ${file.name}: ${error.message}`); }
        else { uploaded++; }
      }
      if (uploaded > 0) { toast.success(`تحملو ${uploaded} صورة`); load(); }
    } catch (err) { toast.error("خطأ في الرفع"); console.error(err); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (item: MediaItem) => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    try {
      const r = await fetch("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: item.name }) });
      const d = await r.json();
      if (d.success) { toast.success("تحذفت الصورة"); setDeleteConfirm(null); load(); }
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("تنسخ الرابط"));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">مكتبة الوسائط</h1>
          <p className="text-brand-gray text-sm">{media.length} صورة</p>
        </div>
        {HAS_SUPABASE && (
          <label className="flex items-center gap-2 bg-brand-navy text-white font-bold px-4 py-2 text-sm cursor-pointer hover:bg-opacity-85">
            <Upload className="h-4 w-4" />
            {uploading ? "جاري الرفع..." : "رفع صور"}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={uploading} />
          </label>
        )}
      </div>

      {!HAS_SUPABASE ? (
        <div className="bg-yellow-50 border border-yellow-200 p-5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-800 mb-2">خاصك تربط Supabase باش ترفع صور</p>
              <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
                <li>زيد NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY فـ .env.local</li>
                <li>في Supabase dashboard، روح لـ Storage</li>
                <li>صايب bucket اسمه <strong>product-images</strong></li>
                <li>خليه <strong>Public</strong></li>
                <li>عاود تحميل الصفحة</li>
              </ol>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>
      ) : media.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300">
          <Image className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-brand-navy mb-1">ما كاين حتى صورة</p>
          <p className="text-brand-gray text-sm mb-4">ارفع أول صورة من الزر فوق</p>
          <label className="inline-flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2 text-sm cursor-pointer">
            <Upload className="h-4 w-4" />رفع صور
            <input type="file" accept="image/*" multiple className="hidden" onChange={upload} />
          </label>
          <p className="text-xs text-yellow-700 mt-4 max-w-xs mx-auto">ملاحظة: خاص bucket product-images يكون موجود وpublic فـ Supabase Storage</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {media.map(item => (
            <div key={item.id} className="group relative bg-white border border-gray-200 hover:border-brand-gold transition-colors overflow-hidden">
              <div className="aspect-square bg-brand-light">
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget.style.display = "none"); }} />
              </div>
              <div className="p-2">
                <p className="text-xs text-brand-gray truncate" title={item.name}>{item.name}</p>
                {item.size && <p className="text-xs text-brand-gray/60">{formatSize(item.size)}</p>}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button onClick={() => copyUrl(item.url)} title="نسخ الرابط" className="bg-white p-2 hover:bg-brand-gold hover:text-white transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteConfirm(item)} title="حذف" className="bg-white p-2 hover:bg-red-500 hover:text-white transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-brand-navy text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-brand-gray text-sm mb-1">واش راك متأكد من حذف هاد الصورة؟</p>
            <p className="text-xs text-red-500 mb-5">انتبه: إلا كانت الصورة مستعملة فمنتج، غادي تختفي.</p>
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
