"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { fbqPurchase, fbqAdvancedMatch, markPurchaseFired, isPurchaseFired } from "@/lib/meta-pixel";

export default function ThankYouClient() {
  const p = useSearchParams();

  const orderId   = p.get("order_id")   || "";
  const name      = p.get("name")       || "";
  const phone     = p.get("phone")      || "";
  const city      = p.get("city")       || "";
  const address   = p.get("address")    || "";
  const product   = p.get("product")    || "";
  const productId = p.get("product_id") || "";
  const size      = p.get("size")       || "";
  const colors    = p.get("colors")     || "";
  const qty       = parseInt(p.get("qty") || "1", 10) || 1;
  const total     = parseInt(p.get("total") || "0", 10);

  const hasData = !!(orderId || name || phone);

  // ── Meta Pixel: Purchase — fires ONCE per real COD order ──────────────────────────
  // localStorage key yuriva_purchase_tracked_${orderId} prevents re-fire on refresh.
  // event_id = purchase_${orderId} matches the CAPI event_id from /api/orders.
  useEffect(() => {
    if (!orderId) return;
    if (!total)  return;

    if (isPurchaseFired(orderId)) {
      console.log("[Meta Pixel] Purchase skipped, already tracked:", orderId);
      return;
    }

    if (phone && name) {
      const parts     = name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName  = parts.slice(1).join(" ") || firstName;
      try { fbqAdvancedMatch(phone, firstName, lastName); } catch { /* ignore */ }
    }

    const eventId = `purchase_${orderId}`;
    try {
      fbqPurchase(
        { id: productId || orderId, title: product || "منتج YURIVA", price: total },
        orderId,
        total,
        qty,
        eventId
      );
      markPurchaseFired(orderId);
      console.log("[Meta Pixel] Purchase fired once for order:", orderId);
    } catch { /* pixel not loaded — safe to ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, total]);

  // ── No-data fallback (URL opened directly without query params) ─────────────────
  if (!hasData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-3">طلبك تسجل بنجاح ✅</h1>
        <p className="text-brand-gray">سيتم التواصل معك قريباً لتأكيد الطلب.</p>
      </div>
    );
  }

  const rows = [
    { label: "رقم الطلب",     value: orderId ? `#${orderId}` : null },
    { label: "الاسم",         value: name    || null },
    { label: "الهاتف",        value: phone   || null, ltr: true },
    { label: "المدينة",       value: city    || null },
    { label: "العنوان",       value: address || null },
    { label: "المنتج",        value: product || null },
    { label: "المقاس",        value: size    || null },
    { label: "الألوان",       value: colors  || null },
    { label: "الكمية",        value: qty > 0 ? String(qty) : null },
    { label: "المجموع الكلي", value: total ? formatPrice(total) : null, bold: true },
    { label: "التوصيل",       value: "مجاني 🎁" },
    { label: "الدفع",         value: "عند الاستلام" },
  ].filter((r) => r.value);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">

      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-2">طلبك تسجل بنجاح ✅</h1>
        <p className="text-brand-gray text-sm">شكراً على ثقتك فينا</p>
      </div>

      {/* Order summary */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-brand-navy px-5 py-3">
          <h2 className="text-white font-black text-sm">تفاصيل الطلب</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-brand-gray text-sm">{row.label}</span>
              <span
                className={`text-sm ${row.bold ? "font-black text-brand-navy" : "font-semibold text-brand-navy"}`}
                dir={row.ltr ? "ltr" : undefined}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
