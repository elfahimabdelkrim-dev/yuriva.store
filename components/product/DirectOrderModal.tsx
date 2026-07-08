"use client";
import { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Product, ProductColor } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { buildOrderWhatsAppURL } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";
import { fbqInitiateCheckout, fbqContact, getCookie } from "@/lib/meta-pixel";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  defaultSize?: string;
  defaultQuantity?: number;
  selectedColor?: ProductColor | null;
  packColors?: (ProductColor | null)[];
  mode: "cod" | "whatsapp";
  onClose: () => void;
}

interface FormState {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  size: string;
  quantity: number;
  note: string;
}

export default function DirectOrderModal({
  product,
  defaultSize = "",
  defaultQuantity = 1,
  selectedColor,
  packColors,
  mode,
  onClose,
}: Props) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    city: "",
    address: "",
    size: defaultSize,
    quantity: defaultQuantity,
    note: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Close on Escape + lock body scroll ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // ── InitiateCheckout — fires once when the modal opens ───────────────────
  useEffect(() => {
    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      defaultQuantity,
      defaultSize || undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field: keyof FormState, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const clearError = (field: keyof FormState) =>
    setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) newErrors.full_name = "الاسم الكامل مطلوب";
    if (!validateMoroccanPhone(form.phone)) newErrors.phone = "دخل رقم هاتف صحيح (06، 07، +212...)";
    if (!form.city.trim()) newErrors.city = "المدينة مطلوبة";
    if (!form.address.trim()) newErrors.address = "العنوان مطلوب";
    if (Array.isArray(product.sizes) && product.sizes.length > 0 && !form.size)
      newErrors.size = "خاصك تختار القياس";
    if (form.quantity < 1) newErrors.quantity = "الكمية خاصها تكون 1 على الأقل";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildColorsJson = (): string => {
    if (product.is_pack && packColors && packColors.length > 0) {
      return JSON.stringify(packColors.filter(Boolean).map((c, i) => ({ pieceIndex: i, color: c })));
    }
    if (selectedColor) return JSON.stringify([selectedColor]);
    return "[]";
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    // Read Meta cookies from browser for CAPI user_data enrichment
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";

    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") || firstName;

      const unitPrice = product.price;
      const total = unitPrice * form.quantity;

      const orderPayload = {
        order: {
          customer_first_name: firstName,
          customer_last_name: lastName,
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.note.trim() || undefined,
          total_amount: total,
          delivery_price: 0,
          payment_method: "cod" as const,
          status: "جديد" as const,
          source: mode === "whatsapp" ? "whatsapp_direct" : "direct_cod",
        },
        items: [
          {
            product_id: product.id,
            product_title: product.title,
            product_price: unitPrice,
            quantity: form.quantity,
            size: form.size,
            colors: buildColorsJson(),
            total,
          },
        ],
        // Meta tracking — CAPI event_id generated server-side as purchase_${orderId}
        meta: {
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          event_source_url: eventSourceUrl || undefined,
        },
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json() as { success: boolean; order_id?: string; error?: string };

      if (!data.success) {
        toast.error(data.error || "خطأ في تسجيل الطلب، عاود المحاولة");
        setSubmitting(false);
        return;
      }

      const orderId = data.order_id ?? "";

      // Purchase pixel fires on /thank-you page (via localStorage dedupe).
      // This modal does NOT fire Purchase — regardless of mode.
      // WhatsApp mode = Contact + WhatsAppClick only. COD = redirects to thank-you.

      if (mode === "whatsapp") {
        const colorsLabel = (() => {
          if (product.is_pack && packColors) {
            return packColors
              .filter(Boolean)
              .map((c, i) => `قطعة ${i + 1}: ${c?.label ?? ""}`)
              .join("، ");
          }
          return selectedColor?.label ?? "غير محدد";
        })();
        void colorsLabel; // used for WhatsApp message in buildOrderWhatsAppURL

        const url = buildOrderWhatsAppURL(
          {
            customer_name: form.full_name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            address: form.address.trim(),
            notes: form.note.trim(),
            items: [
              {
                id: orderId,
                product_id: product.id,
                product_title: product.title,
                product_slug: product.slug,
                product_image: product.main_image,
                price: unitPrice,
                quantity: form.quantity,
                size: form.size,
                color: selectedColor ?? undefined,
                pack_colors: product.is_pack && packColors
                  ? packColors.filter(Boolean).map((c, i) => ({ pieceIndex: i, color: c! }))
                  : undefined,
                is_pack: product.is_pack,
                pack_pieces: product.pack_pieces,
              },
            ],
            total,
            delivery_price: 0,
            order_id: orderId,
          },
          siteConfig.whatsappNumber
        );

        toast.success("تحفظ الطلب! جاري فتح واتساب...");
        onClose();
        setTimeout(() => {
          // Fire Contact event when WhatsApp opens (after order is saved)
          fbqContact();
          window.open(url, "_blank");
        }, 300);
      } else {
        toast.success("تسجل الطلب بنجاح!");
        onClose();
        const qs = new URLSearchParams({
          order_id: orderId,
          name: form.full_name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          product: product.title,
          size: form.size || "",
          qty: String(form.quantity),
          total: String(total),
        });
        router.push(`/thank-you?${qs.toString()}`);
      }
    } catch {
      toast.error("خطأ في الاتصال، جرب من جديد");
      setSubmitting(false);
    }
  };

  const inp =
    "w-full border border-gray-300 focus:border-brand-navy px-3 py-2.5 text-sm outline-none transition-colors rounded-sm";
  const lbl = "block text-sm font-bold text-brand-navy mb-1";
  const err = "text-red-500 text-xs mt-1";
  const safeSizes = Array.isArray(product.sizes) ? product.sizes : [];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto sm:rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            {mode === "whatsapp"
              ? <MessageCircle className="h-5 w-5 text-green-600" />
              : <ShoppingBag className="h-5 w-5 text-brand-navy" />}
            <h2 className="font-black text-brand-navy text-base">
              {mode === "whatsapp" ? "اطلب عبر واتساب" : "اشترِ الآن"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-sm transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 text-brand-gray" />
          </button>
        </div>

        {/* Product summary */}
        <div className="px-4 py-3 bg-brand-light border-b border-gray-100 flex items-center gap-3">
          {product.main_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.main_image}
              alt={product.title}
              className="w-14 h-14 object-cover rounded-sm border border-gray-200 flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-bold text-brand-navy text-sm truncate">{product.title}</p>
            <p className="text-brand-gold font-black text-base">{formatPrice(product.price)}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Full name */}
          <div>
            <label className={lbl}>الاسم الكامل *</label>
            <input
              type="text"
              className={inp}
              placeholder="مثال: محمد أمين"
              value={form.full_name}
              onChange={(e) => { set("full_name", e.target.value); clearError("full_name"); }}
            />
            {errors.full_name && <p className={err}>{errors.full_name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className={lbl}>رقم الهاتف *</label>
            <input
              type="tel"
              className={inp}
              placeholder="06XXXXXXXX أو +212XXXXXXXXX"
              dir="ltr"
              value={form.phone}
              onChange={(e) => { set("phone", e.target.value); clearError("phone"); }}
            />
            {errors.phone && <p className={err}>{errors.phone}</p>}
          </div>

          {/* City */}
          <div>
            <label className={lbl}>المدينة *</label>
            <input
              type="text"
              className={inp}
              placeholder="مثال: الدار البيضاء"
              value={form.city}
              onChange={(e) => { set("city", e.target.value); clearError("city"); }}
            />
            {errors.city && <p className={err}>{errors.city}</p>}
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>العنوان الكامل *</label>
            <textarea
              className={inp + " resize-none"}
              rows={2}
              placeholder="الحي، الشارع، رقم الدار..."
              value={form.address}
              onChange={(e) => { set("address", e.target.value); clearError("address"); }}
            />
            {errors.address && <p className={err}>{errors.address}</p>}
          </div>

          {/* Size */}
          {safeSizes.length > 0 && (
            <div>
              <label className={lbl}>القياس *</label>
              <div className="flex flex-wrap gap-2">
                {safeSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { set("size", s); clearError("size"); }}
                    className={`px-4 py-2 border text-sm font-bold transition-all rounded-sm ${
                      form.size === s
                        ? "bg-brand-navy text-white border-brand-navy"
                        : "border-gray-300 text-brand-navy hover:border-brand-navy"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {errors.size && <p className={err}>{errors.size}</p>}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className={lbl}>الكمية</label>
            <div className="flex items-center border border-gray-300 w-fit rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
                className="px-4 py-2 text-brand-navy hover:bg-brand-light text-lg font-bold"
              >
                −
              </button>
              <span className="px-5 py-2 font-bold text-brand-navy min-w-[50px] text-center">
                {form.quantity}
              </span>
              <button
                type="button"
                onClick={() => set("quantity", form.quantity + 1)}
                className="px-4 py-2 text-brand-navy hover:bg-brand-light text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={lbl}>ملاحظة (اختياري)</label>
            <input
              type="text"
              className={inp}
              placeholder="أي تفصيل إضافي..."
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {/* Total */}
          <div className="bg-brand-light p-3 rounded-sm flex items-center justify-between">
            <span className="text-sm text-brand-gray font-medium">المجموع</span>
            <span className="text-lg font-black text-brand-navy">
              {formatPrice(product.price * form.quantity)}
            </span>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className={`w-full font-bold py-3.5 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-60 rounded-sm ${
              mode === "whatsapp"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-brand-navy hover:bg-opacity-85 text-white"
            }`}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mode === "whatsapp" ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <ShoppingBag className="h-5 w-5" />
            )}
            {submitting
              ? "جاري التسجيل..."
              : mode === "whatsapp"
              ? "تأكيد وفتح واتساب"
              : "تأكيد الطلب"}
          </button>

          <p className="text-xs text-center text-brand-gray">
            💳 الدفع عند الاستلام — مجاني 100%
          </p>
        </div>
      </div>
    </div>
  );
}