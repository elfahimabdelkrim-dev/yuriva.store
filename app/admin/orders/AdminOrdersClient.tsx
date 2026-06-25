"use client";
import { useState, useEffect } from "react";
import { MessageCircle, RefreshCw, AlertTriangle, Search, Download, Printer, Plus } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import toast from "react-hot-toast";

const STATUS_OPTIONS: OrderStatus[] = [
  "جديد", "تم الاتصال", "تم التأكيد", "ما جاوبش",
  "رفض الطلب", "في التوصيل", "تم التسليم", "ملغي", "رجع",
];
const STATUS_COLORS: Record<string, string> = {
  "جديد": "bg-blue-100 text-blue-800", "تم الاتصال": "bg-yellow-100 text-yellow-800",
  "تم التأكيد": "bg-green-100 text-green-800", "ما جاوبش": "bg-gray-100 text-gray-700",
  "رفض الطلب": "bg-red-100 text-red-800", "في التوصيل": "bg-purple-100 text-purple-800",
  "تم التسليم": "bg-green-200 text-green-900", "ملغي": "bg-red-200 text-red-900",
  "رجع": "bg-orange-100 text-orange-800",
};

const HAS_SUPABASE = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    if (!HAS_SUPABASE) {
      if (typeof window !== "undefined") {
        const local = JSON.parse(localStorage.getItem("yuriva_orders") || "[]");
        setOrders(local);
      }
      setLoading(false); return;
    }
    try {
      const r = await fetch("/api/admin/orders");
      const d = await r.json();
      setOrders(d.orders || []);
    } catch { toast.error("خطأ في تحميل الطلبات"); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await r.json();
      if (d.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(o => o ? { ...o, status } : null);
        toast.success("تبدلت الحالة");
      }
    } catch { toast.error("خطأ"); }
    setUpdatingId(null);
  };

  const addNote = async () => {
    if (!internalNote || !selectedOrder) return;
    toast.success("تحفظت الملاحظة");
    setInternalNote(""); setAddingNote(false);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await fetch("/api/admin/orders/export");
      if (!r.ok) { toast.error("خطأ في التصدير"); setExporting(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url); toast.success("تنزّل CSV");
    } catch { toast.error("خطأ"); }
    setExporting(false);
  };

  const printSlip = (order: Order) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>طلب #${order.id?.slice(-8)}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl}h1{color:#05051F}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}.gold{color:#C9A84C;font-weight:bold}@media print{button{display:none}}</style></head>
<body><h1 style="letter-spacing:3px">YURIVA</h1><hr>
<h2>طلب #${order.id?.slice(-8)}</h2>
<p><strong>الزبون:</strong> ${order.customer_first_name} ${order.customer_last_name}</p>
<p><strong>الهاتف:</strong> <span dir="ltr">${order.phone}</span></p>
<p><strong>المدينة:</strong> ${order.city}</p>
<p><strong>العنوان:</strong> ${order.address}</p>
${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ""}
<p><strong>التاريخ:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString("ar-MA") : ""}</p>
<hr>
<h3>المنتجات</h3>
<table><tr><th>المنتج</th><th>الحجم</th><th>اللون</th><th>الكمية</th><th>الثمن</th></tr>
${(order.items || []).map((item) => `<tr><td>${item.product_title}</td><td>${item.size}</td><td>${item.colors ? (JSON.parse(item.colors)[0]?.label || "—") : "—"}</td><td>${item.quantity}</td><td>${item.product_price * item.quantity} درهم</td></tr>`).join("")}
</table>
<h2 class="gold">المجموع: ${formatPrice(order.total_amount)}</h2>
<p><strong>طريقة الدفع:</strong> الدفع عند الاستلام</p>
<button onclick="window.print()">طباعة</button>
</body></html>`);
    w.document.close(); w.focus();
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const ms = !q || o.customer_first_name?.toLowerCase().includes(q) || o.customer_last_name?.toLowerCase().includes(q) || o.phone?.includes(q) || o.city?.toLowerCase().includes(q);
    const mst = statusFilter === "الكل" || o.status === statusFilter;
    return ms && mst;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-navy">الطلبات</h1>
          <p className="text-brand-gray text-sm">{orders.length} طلب إجمالي</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {HAS_SUPABASE && (
            <button onClick={exportCSV} disabled={exporting} className="flex items-center gap-1.5 border border-brand-gold text-brand-gold font-bold px-3 py-2 text-sm hover:bg-brand-gold hover:text-white transition-colors disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />{exporting ? "جاري..." : "CSV"}
            </button>
          )}
          <button onClick={fetchOrders} className="flex items-center gap-1.5 border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" />تحديث
          </button>
        </div>
      </div>

      {!HAS_SUPABASE && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 text-sm text-yellow-800">
          ⚠️ وضع static — الطلبات من localStorage. ربط Supabase للطلبات الحقيقية.
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم، هاتف، مدينة..."
            className="w-full border border-gray-300 pr-9 pl-3 py-2 text-sm outline-none focus:border-brand-navy" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-sm outline-none">
          <option value="الكل">كل الحالات</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-brand-gray">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-brand-navy font-bold mb-1">ما كاين طلبات</p>
            <p className="text-brand-gray text-sm">ما وجدناش طلبات بهاد الفلتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-light border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">الزبون</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">المدينة</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">المجموع</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">الحالة</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">التاريخ</th>
                  <th className="px-4 py-3 text-right font-bold text-brand-navy">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(order => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    className={`hover:bg-brand-light cursor-pointer ${order.is_blacklisted ? "bg-red-50" : order.is_duplicate ? "bg-yellow-50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-brand-navy">
                        {order.customer_first_name} {order.customer_last_name}
                        {order.is_blacklisted && <span className="text-red-500 mr-1 text-xs">🚫</span>}
                        {order.is_duplicate && <span className="text-yellow-600 mr-1 text-xs">⚠️</span>}
                      </p>
                      <p className="text-brand-gray text-xs" dir="ltr">{order.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-navy">{order.city}</td>
                    <td className="px-4 py-3 font-bold text-brand-navy">{formatPrice(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-brand-gray text-xs">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("ar-MA") : "—"}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <a href={`https://wa.me/${order.phone.replace(/^0/, "212")}?text=${encodeURIComponent(`مرحباً ${order.customer_first_name}، من YURIVA بخصوص طلبك`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline font-bold">
                          <MessageCircle className="h-3.5 w-3.5" />واتساب
                        </a>
                        <button onClick={() => printSlip(order)} className="inline-flex items-center gap-1 text-xs text-brand-gray hover:text-brand-navy font-bold mr-2">
                          <Printer className="h-3.5 w-3.5" />طباعة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedOrder(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl p-5 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-brand-navy">طلب #{selectedOrder.id?.slice(-8)}</h2>
              <div className="flex gap-2">
                <button onClick={() => printSlip(selectedOrder)} className="p-1.5 border border-gray-200 hover:border-brand-navy text-brand-gray hover:text-brand-navy" title="طباعة">
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedOrder(null)} className="text-brand-gray hover:text-brand-navy">✕</button>
              </div>
            </div>

            {selectedOrder.is_blacklisted && (
              <div className="bg-red-50 border border-red-200 p-3 mb-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-xs font-bold">هاد الرقم فـ القائمة السوداء</p>
              </div>
            )}
            {selectedOrder.is_duplicate && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 mb-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-700 text-xs font-bold">هذا الزبون دار طلب آخر قريباً</p>
              </div>
            )}

            <div className="space-y-3 text-sm mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-brand-gray text-xs">الاسم</p><p className="font-bold text-brand-navy">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p></div>
                <div><p className="text-brand-gray text-xs">الهاتف</p><p className="font-bold text-brand-navy" dir="ltr">{selectedOrder.phone}</p></div>
                <div><p className="text-brand-gray text-xs">المدينة</p><p className="font-bold text-brand-navy">{selectedOrder.city}</p></div>
                <div><p className="text-brand-gray text-xs">المجموع</p><p className="font-bold text-brand-navy">{formatPrice(selectedOrder.total_amount)}</p></div>
              </div>
              <div><p className="text-brand-gray text-xs">العنوان</p><p className="font-bold text-brand-navy">{selectedOrder.address}</p></div>
              {selectedOrder.notes && <div><p className="text-brand-gray text-xs">ملاحظات الزبون</p><p className="text-brand-navy">{selectedOrder.notes}</p></div>}
            </div>

            {/* Status change */}
            {HAS_SUPABASE && (
              <div className="mb-4">
                <p className="text-sm font-bold text-brand-navy mb-2">بدل الحالة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} disabled={updatingId === selectedOrder.id}
                      onClick={() => updateStatus(selectedOrder.id!, s)}
                      className={`text-xs px-2 py-1 font-bold rounded transition-all ${selectedOrder.status === s ? "bg-brand-navy text-white" : "border border-gray-300 text-brand-navy hover:border-brand-navy"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Internal note */}
            <div className="mb-4">
              <p className="text-sm font-bold text-brand-navy mb-2">ملاحظة داخلية:</p>
              {addingNote ? (
                <div className="flex gap-2">
                  <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} className="flex-1 border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-navy" placeholder="اكتب ملاحظتك هنا..." />
                  <div className="flex flex-col gap-1">
                    <button onClick={addNote} className="bg-brand-navy text-white text-xs px-2 py-1 font-bold"><Plus className="h-3 w-3" /></button>
                    <button onClick={() => { setAddingNote(false); setInternalNote(""); }} className="border border-gray-300 text-xs px-2 py-1">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingNote(true)} className="text-xs border border-dashed border-gray-300 text-brand-gray px-3 py-1.5 hover:border-brand-navy hover:text-brand-navy w-full text-center">
                  + زيد ملاحظة
                </button>
              )}
            </div>

            {/* WA quick actions */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-brand-navy">واتساب سريع:</p>
              {[
                { label: "تأكيد الطلب", msg: `مرحباً ${selectedOrder.customer_first_name}! طلبك فـ YURIVA تأكد وغادي يوصلك خلال 24-72 ساعة. شكراً على ثقتك 🙏` },
                { label: "ما جاوبش", msg: `مرحباً ${selectedOrder.customer_first_name}، هذا YURIVA. حاولنا نتاصلو بيك بخصوص طلبك. ردنا عليك ملا تفرغ باراكا الله فيك 🙏` },
                { label: "في التوصيل", msg: `مرحباً ${selectedOrder.customer_first_name}! طلبك خرج للتوصيل وغادي يوصلك قريباً. خلص فاليد ملي يوصلك 💵` },
                { label: "تأكيد التسليم", msg: `مرحباً ${selectedOrder.customer_first_name}! واصلك الطلب ديال YURIVA؟ راسلنا إلا كان عندك أي استفسار 😊` },
              ].map(action => (
                <a key={action.label}
                  href={`https://wa.me/${selectedOrder.phone.replace(/^0/, "212")}?text=${encodeURIComponent(action.msg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full border border-gray-200 hover:border-brand-gold text-sm px-3 py-2 text-brand-navy hover:text-brand-gold font-medium transition-colors">
                  <MessageCircle className="h-4 w-4 flex-shrink-0" />{action.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
