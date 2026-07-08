"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { buildOrderWhatsAppURL } from "@/lib/whatsapp";
import type { WhatsAppOrderData } from "@/types";
import { fbqPurchase, fbqAdvancedMatch, markPurchaseFired, isPurchaseFired } from "@/lib/meta-pixel";

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

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

  // ── Meta Pixel: Purchase — fires ONCE per order after real COD order ────────
  // Requires valid orderId. Uses localStorage key yuriva_purchase_tracked_${orderId}
  // to prevent re-firing on page refresh or revisit.
  // event_id = purchase_${orderId} — matches the CAPI event_id from /api/orders.
  useEffect(() => {
    if (!orderId) return;   // no order_id = page opened directly, not from checkout
    if (!total)  return;   // no total = incomplete data, skip

    // ── dedupe check ─────────────────────────────────────────────────────────
    if (isPurchaseFired(orderId)) {
      console.log("[Meta Pixel] Purchase skipped, already tracked:", orderId);
      return;
    }

    // ── advanced matching (re-init pixels with customer signals) ─────────────
    if (phone && name) {
      const parts     = name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName  = parts.slice(1).join(" ") || firstName;
      try { fbqAdvancedMatch(phone, firstName, lastName); } catch { /* ignore */ }
    }

    // ── fire Purchase exactly once ────────────────────────────────────────────
    const eventId = `purchase_${orderId}`;
    try {
      fbqPurchase(
        { id: productId || orderId, title: product || "منتج YURIVA", price: total },
        orderId,
        total,
        qty,
        eventId
      );
      // mark as tracked so refresh / new-tab never re-fires
      markPurchaseFired(orderId);
    } catch { /* pixel not loaded — safe to ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, total]);

  // Build the WhatsApp URL for the confirmation button
  const [waUrl, setWaUrl] = useState<string>("");

  useEffect(() => {
    // Try sessionStorage first (set by InlineOrderForm right after success)
    const stored = orderId
      ? (() => { try { return sessionStorage.getItem(`wa_order_${orderId}`) || ""; } catch { return ""; } })()
      : "";

    if (stored) {
      setWaUrl(stored);
    } else if (hasData) {
      // Reconstruct from query params as fallback
      const waData: WhatsAppOrderData = {
        order_id:      orderId || undefined,
        customer_name: name,
        phone,
        city,
        address,
        total,
        delivery_price: 0,
        items: [{
          id:            orderId,
          product_id:    "",
          product_title: product,
          product_slug:  "",
          product_image: "",
          price:         total / qty,
          quantity:      qty,
          size,
          color:         colors && !colors.includes(":")
            ? { name: colors, label: colors, hex: "#000000" }
            : undefined,
          is_pack:       false,
        }],
      };
      setWaUrl(buildOrderWhatsAppURL(waData));
    } else {
      // Fallback: open WhatsApp to the store number with no message
      setWaUrl(`https://wa.me/${siteConfig.whatsappNumber}`);
    }
  }, [orderId, hasData, name, phone, city, address, total, qty, product, size, colors]);

  const openWhatsApp = () => {
    if (!waUrl) return;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = waUrl;
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!hasData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-3">طلبك تسجل بنجاح ✅</h1>
        <p className="text-brand-gray mb-8">باش نأكدو الطلب بسرعة، صيفط لينا تفاصيل الطلب فالواتساب.</p>
        {waUrl && (
          <button
            onClick={openWhatsApp}
            className="w-full bg-[#25D366] text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-base hover:bg-[#1ebe5d] active:scale-95 transition-all"
          >
            <WhatsAppIcon className="h-6 w-6" />
            رسل الطلب فالواتساب
          </button>
        )}
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

      {/* WhatsApp CTA — primary action */}
      <div className="bg-[#f0fdf4] border border-[#86efac] rounded-2xl p-5 mb-6 text-center">
        <p className="text-brand-navy font-bold text-sm leading-relaxed mb-4">
        باش نأكدو الطلب بسرعة،<br />
          صيفط لينا تفاصيل الطلب فالواتساب 👇
        </p>
        <button
          onClick={openWhatsApp}
          disabled={!waUrl}
          className="w-full bg-[#25D366] text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-base hover:bg-[#1ebe5d] active:scale-95 transition-all disabled:opacity-50"
        >
          <WhatsAppIcon className="h-6 w-6" />
          رسل الطلب فالواتساب
        </button>
        <p className="text-xs text-gray-400 mt-3">
          كتضغط على الزر، كيتفتح واتساب مع تفاصيل الطلب جاهزة باش تصيفطها
        </p>
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

      {/* Second WhatsApp button at bottom */}
      <button
        onClick={openWhatsApp}
        disabled={!waUrl}
        className="mt-6 w-full border-2 border-[#25D366] text-gray-800 font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all rounded-xl disabled:opacity-50"
      >
        <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
        رسل الطلب فالواتساب
      </button>

    </div>
  );
}
