"use client";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function ThankYouClient() {
  const p = useSearchParams();

  const orderId = p.get("order_id") || "";
  const name    = p.get("name")     || "";
  const phone   = p.get("phone")    || "";
  const city    = p.get("city")     || "";
  const address = p.get("address")  || "";
  const product = p.get("product")  || "";
  const size    = p.get("size")     || "";
  const qty     = p.get("qty")      || "";
  const total   = parseInt(p.get("total") || "0", 10);

  const hasData = !!(orderId || name || phone);

  if (!hasData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-3">شكراً على طلبك!</h1>
        <p className="text-brand-gray">تم تسجيل طلبك بنجاح، سوف نتواصل معك قريباً.</p>
      </div>
    );
  }

  const rows = [
    { label: "رقم الطلب",   value: orderId ? `#${orderId}` : null },
    { label: "الاسم",       value: name    || null },
    { label: "الهاتف",      value: phone   || null, ltr: true },
    { label: "المدينة",     value: city    || null },
    { label: "العنوان",     value: address || null },
    { label: "المنتج",      value: product || null },
    { label: "المقاس",      value: size    || null },
    { label: "الكمية",      value: qty     || null },
    { label: "المجموع الكلي", value: total ? formatPrice(total) : null, bold: true },
  ].filter((r) => r.value);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">

      {/* ① Thank you message */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-2">شكراً على طلبك!</h1>
        <p className="text-brand-gray text-sm">تم تسجيل طلبك بنجاح</p>
      </div>

      {/* ② Contact message */}
      <p className="text-center text-brand-navy font-medium mb-8 text-sm leading-relaxed">
        سوف نتواصل معك في القريب العاجل لتأكيد الطلب.
      </p>

      {/* ③ Order information */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3">
          <h2 className="text-white font-black text-sm">معلومات الطلب</h2>
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
