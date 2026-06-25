"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, Search } from "lucide-react";
import { moroccanCities } from "@/data/cities";
import toast from "react-hot-toast";

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

type DeliveryMode = "free" | "fixed" | "by_city";

interface Zone { id?: string; city: string; is_active: boolean; delivery_price: number; estimated_time: string; note: string; }

export default function AdminDeliveryPage() {
  const [mode, setMode] = useState<DeliveryMode>("free");
  const [fixedPrice, setFixedPrice] = useState(30);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Init zones from moroccanCities
  const initZones = useCallback((existing: Zone[]) => {
    const map = new Map(existing.map(z => [z.city, z]));
    return moroccanCities.map(city => map.get(city) || { city, is_active: true, delivery_price: 0, estimated_time: "24-72 ساعة", note: "" });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (!HAS_SUPABASE) { setZones(initZones([])); setLoading(false); return; }
    try {
      const r = await fetch("/api/admin/delivery");
      const d = await r.json();
      if (d.success) setZones(initZones(d.data));
    } catch { toast.error("خطأ في التحميل"); }
    setLoading(false);
  }, [initZones]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!HAS_SUPABASE) { toast.error("خاصك تربط Supabase"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/delivery", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(zones) });
      const d = await r.json();
      if (d.success) toast.success("تحفظت إعدادات التوصيل");
      else toast.error(d.error || "خطأ");
    } catch { toast.error("خطأ"); }
    setSaving(false);
  };

  const updateZone = (city: string, key: keyof Zone, val: Zone[keyof Zone]) => {
    setZones(arr => arr.map(z => z.city === city ? { ...z, [key]: val } : z));
  };

  const filtered = zones.filter(z => !search || z.city.includes(search));
  const inp = "border border-gray-300 focus:border-brand-navy px-2 py-1 text-sm outline-none w-full";

  if (loading) return <div className="text-center py-12 text-brand-gray">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-brand-navy">إعدادات التوصيل</h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-brand-navy text-white font-bold px-5 py-2 text-sm disabled:opacity-60">
          <Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      {!HAS_SUPABASE && <div className="bg-yellow-50 border border-yellow-200 p-3 mb-5 text-sm text-yellow-800">⚠️ ربط Supabase لحفظ إعدادات التوصيل</div>}

      {/* Mode */}
      <div className="bg-white border border-gray-200 p-5 mb-5">
        <h2 className="font-black text-brand-navy mb-3">وضع التوصيل</h2>
        <div className="space-y-2">
          {[
            { v: "free", l: "توصيل مجاني لجميع المدن", d: "الزبون ما خصومش والو" },
            { v: "fixed", l: "ثمن ثابت", d: "نفس الثمن لكل المدن" },
            { v: "by_city", l: "ثمن حسب المدينة", d: "كل مدينة بثمنها الخاص" },
          ].map(opt => (
            <label key={opt.v} className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 hover:border-brand-gold transition-colors">
              <input type="radio" name="mode" value={opt.v} checked={mode === opt.v} onChange={() => setMode(opt.v as DeliveryMode)} className="accent-brand-gold mt-0.5" />
              <div>
                <p className="font-bold text-brand-navy text-sm">{opt.l}</p>
                <p className="text-xs text-brand-gray">{opt.d}</p>
              </div>
            </label>
          ))}
        </div>
        {mode === "fixed" && (
          <div className="mt-3">
            <label className="block text-sm font-bold text-brand-navy mb-1">ثمن التوصيل (درهم)</label>
            <input type="number" value={fixedPrice} onChange={e => setFixedPrice(+e.target.value)}
              className="border border-gray-300 focus:border-brand-navy px-3 py-2 text-sm outline-none w-32" />
          </div>
        )}
      </div>

      {/* By city */}
      {mode === "by_city" && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-gray" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مدينة..." className="w-full border border-gray-200 pr-8 pl-3 py-1.5 text-sm outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-light sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right font-bold text-brand-navy text-xs">المدينة</th>
                  <th className="px-3 py-2 text-right font-bold text-brand-navy text-xs">ثمن التوصيل</th>
                  <th className="px-3 py-2 text-right font-bold text-brand-navy text-xs">مدة التوصيل</th>
                  <th className="px-3 py-2 text-right font-bold text-brand-navy text-xs">ملاحظة</th>
                  <th className="px-3 py-2 text-right font-bold text-brand-navy text-xs">نشط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(z => (
                  <tr key={z.city} className={`${!z.is_active ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 font-bold text-brand-navy text-xs">{z.city}</td>
                    <td className="px-3 py-2"><input type="number" value={z.delivery_price} onChange={e => updateZone(z.city, "delivery_price", +e.target.value)} className={inp} style={{ width: 70 }} /></td>
                    <td className="px-3 py-2"><input value={z.estimated_time} onChange={e => updateZone(z.city, "estimated_time", e.target.value)} className={inp} style={{ width: 120 }} /></td>
                    <td className="px-3 py-2"><input value={z.note} onChange={e => updateZone(z.city, "note", e.target.value)} className={inp} placeholder="اختياري" /></td>
                    <td className="px-3 py-2"><input type="checkbox" checked={z.is_active} onChange={e => updateZone(z.city, "is_active", e.target.checked)} className="accent-brand-gold" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
