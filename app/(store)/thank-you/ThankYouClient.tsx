"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, MessageCircle, ShoppingBag } from "lucide-react";
import { buildOrderWhatsAppURL } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import type { CartItem } from "@/types";
import { siteConfig } from "@/config/site";

interface OrderData {
  order_id?: string;
  form: { first_name: string; last_name: string; phone: string; city: string; address: string; notes: string };
  items: CartItem[];
  total: number;
}

export default function ThankYouClient() {
  const params = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);

  const orderId = params.get("order_id") || "";
  const name = params.get("name") || "";
  const phone = params.get("phone") || "";
  const city = params.get("city") || "";
  const total = parseInt(params.get("total") || "0", 10);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("yuriva_last_order");
      if (raw) setOrder(JSON.parse(raw));
    }
  }, []);

  const waURL = order
    ? buildOrderWhatsAppURL(
        {
          order_id: orderId,
          customer_name: `${order.form.first_name} ${order.form.last_name}`,
          phone: order.form.phone,
          city: order.form.city,
          address: order.form.address,
          items: order.items,
          total: order.total,
          delivery_price: 0,
          notes: order.form.notes,
        },
        siteConfig.whatsappNumber
      )
    : `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`مرحباً، أنا ${name} — طلبت من YURIVA ورقم طلبي هو ${orderId}`)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-brand-gold" />
        </div>
        <h1 className="text-2xl font-black text-brand-navy mb-2">شكراً على طلبك! 🎉</h1>
        <p className="text-brand-gray">طلبك تسجل بنجاح</p>
        {orderId && (
          <p className="text-xs text-brand-gray mt-1">رقم الطلب: <span className="font-bold text-brand-navy">#{orderId}</span></p>
        )}
      </div>

      {/* WhatsApp notice */}
      <div className="bg-brand-navy text-white p-5 mb-6 rounded-sm">
        <p className="font-bold mb-1 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-brand-gold" />
          تأكيد الطلب عبر واتساب
        </p>
        <p className="text-white/70 text-sm">
          غادي نتاصلو بيك فواتساب خلال 24 ساعة باش نأكدو الطلب قبل الإرسال
        </p>
      </div>

      {/* Order summary */}
      <div className="bg-brand-light p-5 mb-6">
        <h2 className="font-black text-brand-navy mb-4">ملخص الطلب</h2>

        {/* Items */}
        {order?.items && order.items.length > 0 && (
          <div className="space-y-3 mb-4">
            {order.items.map((item) => {
              const colorsText = item.is_pack && item.pack_colors
                ? item.pack_colors.map((pc) => `${pc.pieceIndex + 1}: ${pc.color.label}`).join("، ")
                : item.color?.label || "";
              return (
                <div key={item.id} className="flex gap-3 bg-white p-3">
                  <div className="relative w-14 h-16 flex-none overflow-hidden">
                    <Image src={item.product_image} alt={item.product_title} fill className="object-cover" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-brand-navy">{item.product_title}</p>
                    <p className="text-brand-gray text-xs">القياس: {item.size}</p>
                    {colorsText && <p className="text-brand-gray text-xs">اللون: {colorsText}</p>}
                    <p className="font-bold text-brand-navy">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delivery info */}
        <div className="space-y-1.5 text-sm border-t border-gray-200 pt-3">
          {(name || order?.form) && (
            <div className="flex justify-between">
              <span className="text-brand-gray">الاسم</span>
              <span className="font-bold text-brand-navy">{name || `${order?.form.first_name} ${order?.form.last_name}`}</span>
            </div>
          )}
          {(phone || order?.form.phone) && (
            <div className="flex justify-between">
              <span className="text-brand-gray">الهاتف</span>
              <span className="font-bold text-brand-navy" dir="ltr">{phone || order?.form.phone}</span>
            </div>
          )}
          {(city || order?.form.city) && (
            <div className="flex justify-between">
              <span className="text-brand-gray">المدينة</span>
              <span className="font-bold text-brand-navy">{city || order?.form.city}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-brand-gray">التوصيل</span>
            <span className="font-bold text-brand-gold">مجاني 🎁</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="font-black text-brand-navy">المجموع الكلي</span>
            <span className="font-black text-brand-navy">{formatPrice(total || order?.total || 0)}</span>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3">
        <a
          href={waURL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-brand-navy text-white font-bold py-4 text-center flex items-center justify-center gap-2"
        >
          <MessageCircle className="h-5 w-5" />
          تواصل معنا فواتساب
        </a>
        <Link
          href="/products"
          className="w-full border border-brand-navy text-brand-navy font-bold py-3 text-center flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-5 w-5" />
          كمل التسوق
        </Link>
      </div>

      {/* Steps */}
      <div className="mt-8 space-y-3">
        <h3 className="font-bold text-brand-navy">ما الجاي؟</h3>
        {[
          { n: "1", t: "تأكيد الطلب", d: "غادي نتاصلو بيك فواتساب باش نأكدو الطلب" },
          { n: "2", t: "التجهيز والإرسال", d: "غادي نجهزو طلبك ونبعثو لشركة التوصيل" },
          { n: "3", t: "الاستلام والدفع", d: "تستقبل الطلب وتخلص فاليد — بسيطة!" },
        ].map((step) => (
          <div key={step.n} className="flex gap-3 bg-brand-light p-3">
            <span className="w-7 h-7 bg-brand-gold text-white text-xs font-black flex items-center justify-center flex-shrink-0 rounded-full">
              {step.n}
            </span>
            <div>
              <p className="font-bold text-brand-navy text-sm">{step.t}</p>
              <p className="text-brand-gray text-xs">{step.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
