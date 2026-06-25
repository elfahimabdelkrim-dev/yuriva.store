"use client";
import { useState } from "react";
import { Search, Package } from "lucide-react";

import type { Order } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { siteConfig } from "@/config/site";

const STATUS_COLORS: Record<string, string> = {
  "جديد": "bg-blue-100 text-blue-800",
  "تم الاتصال": "bg-yellow-100 text-yellow-800",
  "تم التأكيد": "bg-green-100 text-green-800",
  "ما جاوبش": "bg-gray-100 text-gray-800",
  "رفض الطلب": "bg-red-100 text-red-800",
  "في التوصيل": "bg-purple-100 text-purple-800",
  "تم التسليم": "bg-green-200 text-green-900",
  "ملغي": "bg-red-200 text-red-900",
  "رجع": "bg-orange-100 text-orange-800",
};

export default function TrackOrderClient() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) { setError("دخل رقم الهاتف ديالك"); return; }
    if (!validateMoroccanPhone(phone)) { setError("دخل رقم هاتف مغربي صحيح"); return; }

    setLoading(true);
    try {
      const savedOrders =
  typeof window !== "undefined" ? localStorage.getItem("yuriva_orders") : null;

const localOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];

const cleanPhone = phone.trim().replace(/\s/g, "");

const result = localOrders.filter((order) => {
  const orderPhone = String(order.phone || "").replace(/\s/g, "");
  return orderPhone === cleanPhone;
});

setOrders(result);

if (result.length === 0) {
  setError("ما لقيناش طلب بهاد الرقم. تأكد من الرقم أو تواصل معنا فواتساب.");
}
    } catch {
      setError("وقع خطأ، عاود المحاولة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "تتبع الطلب" }]} className="mb-5" />

      <div className="text-center mb-8">
        <Package className="h-12 w-12 text-brand-gold mx-auto mb-3" />
        <h1 className="text-2xl font-black text-brand-navy">تتبع طلبك</h1>
        <p className="text-brand-gray mt-2 text-sm">دخل رقم هاتفك اللي استعملتي فالطلب</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06XXXXXXXX"
          className="flex-1 border border-gray-300 focus:border-brand-navy px-4 py-3 text-sm outline-none"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-navy text-white px-6 py-3 font-bold flex items-center gap-2 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? "جاري البحث..." : "ابحث"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

      {orders !== null && (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-10 bg-brand-light p-6">
              <p className="text-xl font-bold text-brand-navy mb-2">ما لقيناش طلب بهاد الرقم</p>
              <p className="text-brand-gray text-sm mb-4">
                تأكد من الرقم أو تواصل معنا فواتساب
              </p>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("مرحباً، بغيت نعرف حال الطلب ديالي")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-brand-navy text-white font-bold px-6 py-3"
              >
                تواصل معنا فواتساب
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-gray">{orders.length} طلب مربوط بهاد الرقم</p>
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-brand-navy text-sm">#{order.id}</p>
                      <p className="text-xs text-brand-gray">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString("ar-MA") : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-sm ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-brand-gray">المدينة: <span className="font-bold text-brand-navy">{order.city}</span></p>
                    <p className="text-brand-gray">المجموع: <span className="font-bold text-brand-navy">{formatPrice(order.total_amount)}</span></p>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-brand-gray">• {item.product_title} × {item.quantity}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
