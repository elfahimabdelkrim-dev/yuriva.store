"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import type { Product, ProductColor } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { buildOrderWhatsAppURL } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";
import { fbqInitiateCheckout, fbqPurchase, fbqContact, getCookie } from "@/lib/meta-pixel";
import toast from "react-hot-toast";

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

interface Props {
  product: Product;
  selectedColor: ProductColor | null;
  packColors: (ProductColor | null)[];
}

interface FormState {
  full_name: string;
  phone:     string;
  address:   string;
}

export default function InlineOrderForm({ product, selectedColor, packColors }: Props) {
  const router = useRouter();

  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError,    setSizeError]    = useState("");
  const quantity = 1;

  const [form,        setForm]        = useState<FormState>({ full_name: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Separate loading states so buttons are independent
  const [submittingCod,      setSubmittingCod]      = useState(false);
  const [submittingWhatsApp, setSubmittingWhatsApp] = useState(false);
  const anySubmitting = submittingCod || submittingWhatsApp;

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const clearErr = (field: keyof FormState) =>
    setFieldErrors((e) => ({ ...e, [field]: undefined }));

  const safeSizes = Array.isArray(product.sizes) ? product.sizes : [];

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "الاسم الكامل مطلوب";
    if (!validateMoroccanPhone(form.phone)) errs.phone = "دخل رقم هاتف صحيح (06، 07، +212...)";
    if (!form.address.trim()) errs.address = "العنوان مطلوب";
    if (safeSizes.length > 0 && !selectedSize) {
      setSizeError("خاصك تختار القياس");
      setFieldErrors(errs);
      return false;
    }
    setSizeError("");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildColorsJson = (): string => {
    if (product.is_pack && packColors.length > 0) {
      return JSON.stringify(packColors.filter(Boolean).map((c, i) => ({ pieceIndex: i, color: c })));
    }
    if (selectedColor) return JSON.stringify([selectedColor]);
    return "[]";
  };

  // ── COD submit ──────────────────────────────────────────────────────────────
  const submitCod = async () => {
    if (!validate()) return;
    setSubmittingCod(true);

    const purchaseEventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";
    const total = product.price * quantity;

    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      quantity,
      selectedSize || undefined
    );

    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName  = nameParts.slice(1).join(" ") || firstName;

      const res  = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            customer_first_name: firstName,
            customer_last_name:  lastName,
            phone:   form.phone.trim(),
            city:    "",
            address: form.address.trim(),
            notes:   undefined,
            total_amount:   total,
            delivery_price: 0,
            payment_method: "cod" as const,
            status:         "جديد" as const,
            source:         "direct_cod",
          },
          items: [{
            product_id:    product.id,
            product_title: product.title,
            product_price: product.price,
            quantity,
            size:   selectedSize,
            colors: buildColorsJson(),
            total,
          }],
          meta: {
            event_id:         purchaseEventId,
            fbp:              fbp  || undefined,
            fbc:              fbc  || undefined,
            event_source_url: eventSourceUrl || undefined,
          },
        }),
      });
      const data = await res.json() as { success: boolean; order_id?: string; error?: string };

      if (!data.success) {
        toast.error(data.error || "خطأ في تسجيل الطلب، عاود المحاولة");
        setSubmittingCod(false);
        return;
      }

      const orderId = data.order_id ?? "";
      fbqPurchase(
        { id: product.id, title: product.title, price: product.price },
        orderId, total, quantity, purchaseEventId
      );

      const qs = new URLSearchParams({
        order_id: orderId,
        name:     form.full_name.trim(),
        phone:    form.phone.trim(),
        city:     "",
        address:  form.address.trim(),
        product:  product.title,
        size:     selectedSize || "",
        qty:      String(quantity),
        total:    String(total),
      });
      router.push(`/thank-you?${qs.toString()}`);
    } catch {
      toast.error("خطأ في الاتصال، جرب من جديد");
      setSubmittingCod(false);
    }
  };

  // ── WhatsApp submit ──────────────────────────────────────────────────────────
  // CRITICAL: window.open() MUST be called synchronously inside the click handler.
  // Mobile browsers (Safari, in-app WebViews) block popups opened after any await.
  // Strategy:
  //   1. validate() — sync, before any async work
  //   2. window.open("", "_blank") — sync, immediately on click
  //   3. await API order creation
  //   4. navigate the pre-opened window to the WhatsApp URL
  //   5. If API fails: still open WhatsApp (don't lose the customer)
  //   6. If popup was blocked (waWin === null): fallback to window.location.href
  const submitWhatsApp = async () => {
    console.log("[WhatsApp Order] Clicked");

    // Step 1 — validate synchronously before doing anything
    if (!validate()) {
      console.log("[WhatsApp Order] Validation failed");
      return;
    }

    const whatsappNumber = siteConfig.whatsappNumber;
    if (!whatsappNumber || whatsappNumber === "212600000000") {
      console.warn("[WhatsApp Order] NEXT_PUBLIC_WHATSAPP_NUMBER is not configured");
    }

    // Step 2 — open a blank window SYNCHRONOUSLY (must be in click handler, before any await)
    // This is the only reliable way to bypass popup blockers on mobile
    let waWin: Window | null = null;
    try {
      waWin = window.open("", "_blank");
    } catch {
      // Some environments throw — handle gracefully below
    }

    setSubmittingWhatsApp(true);

    const total = product.price * quantity;
    const purchaseEventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";

    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      quantity,
      selectedSize || undefined
    );

    // Step 3 — try to save the order (async)
    let orderId = "";
    let orderSaved = false;
    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName  = nameParts.slice(1).join(" ") || firstName;

      const res  = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            customer_first_name: firstName,
            customer_last_name:  lastName,
            phone:   form.phone.trim(),
            city:    "",
            address: form.address.trim(),
            notes:   undefined,
            total_amount:   total,
            delivery_price: 0,
            payment_method: "cod" as const,
            status:         "جديد" as const,
            source:         "whatsapp_direct",
          },
          items: [{
            product_id:    product.id,
            product_title: product.title,
            product_price: product.price,
            quantity,
            size:   selectedSize,
            colors: buildColorsJson(),
            total,
          }],
          meta: {
            event_id:         purchaseEventId,
            fbp:              fbp  || undefined,
            fbc:              fbc  || undefined,
            event_source_url: eventSourceUrl || undefined,
          },
        }),
      });
      const data = await res.json() as { success: boolean; order_id?: string };

      if (data.success && data.order_id) {
        orderId    = data.order_id;
        orderSaved = true;
        console.log("[WhatsApp Order] Order saved", orderId);
        fbqPurchase(
          { id: product.id, title: product.title, price: product.price },
          orderId, total, quantity, purchaseEventId
        );
      }
    } catch (err) {
      // Order save failed — still open WhatsApp so we don\'t lose the customer
      console.warn("[WhatsApp Order] Order save failed — opening WhatsApp anyway", err);
    }

    // Step 4 — build WhatsApp URL (with or without orderId)
    const url = buildOrderWhatsAppURL(
      {
        customer_name: form.full_name.trim(),
        phone:         form.phone.trim(),
        city:          "",
        address:       form.address.trim(),
        notes:         "",
        items: [{
          id:            orderId,
          product_id:    product.id,
          product_title: product.title,
          product_slug:  product.slug,
          product_image: product.main_image,
          price:         product.price,
          quantity,
          size:          selectedSize,
          color:         selectedColor ?? undefined,
          pack_colors:   product.is_pack && packColors
            ? packColors.filter(Boolean).map((c, i) => ({ pieceIndex: i, color: c! }))
            : undefined,
          is_pack:     product.is_pack,
          pack_pieces: product.pack_pieces,
        }],
        total,
        delivery_price: 0,
        order_id: orderId,
      },
      whatsappNumber
    );

    // Step 5 — navigate the pre-opened window (or fallback)
    console.log("[WhatsApp Order] Opening WhatsApp");
    try {
      if (waWin && !waWin.closed) {
        waWin.location.href = url;
      } else {
        // Popup was blocked by the browser — navigate current tab as fallback
        console.log("[WhatsApp Order] Open fallback used");
        window.location.href = url;
      }
    } catch {
      console.log("[WhatsApp Order] Open fallback used");
      window.location.href = url;
    }

    fbqContact();
    if (orderSaved) toast.success("تحفظ الطلب! فتح واتساب...");
    setSubmittingWhatsApp(false);
  };

  const inp    = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2.5 text-sm outline-none transition-colors rounded-sm";
  const lbl    = "block text-sm font-bold text-brand-navy mb-1";
  const errCls = "text-red-500 text-xs mt-1";
  const total  = product.price * quantity;

  return (
    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
      <h3 className="font-black text-brand-navy text-base">أكمل الطلب</h3>

      {/* ── المقاس ── */}
      {safeSizes.length > 0 && (
        <div>
          <label className={lbl}>المقاس *</label>
          <div className="flex flex-wrap gap-2">
            {safeSizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSelectedSize(s); setSizeError(""); }}
                className={`px-4 py-2 border text-sm font-bold transition-all rounded-sm ${
                  selectedSize === s
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {sizeError && <p className={errCls}>{sizeError}</p>}
        </div>
      )}

      {/* الاسم الكامل */}
      <div>
        <label className={lbl}>الاسم الكامل *</label>
        <input
          type="text"
          className={inp}
          placeholder="مثال: محمد أمين"
          value={form.full_name}
          onChange={(e) => { set("full_name", e.target.value); clearErr("full_name"); }}
        />
        {fieldErrors.full_name && <p className={errCls}>{fieldErrors.full_name}</p>}
      </div>

      {/* رقم الهاتف */}
      <div>
        <label className={lbl}>رقم الهاتف *</label>
        <input
          type="tel"
          className={inp}
          placeholder="06XXXXXXXX أو +212XXXXXXXXX"
          dir="ltr"
          value={form.phone}
          onChange={(e) => { set("phone", e.target.value); clearErr("phone"); }}
        />
        {fieldErrors.phone && <p className={errCls}>{fieldErrors.phone}</p>}
      </div>

      {/* العنوان الكامل */}
      <div>
        <label className={lbl}>العنوان الكامل *</label>
        <textarea
          className={inp + " resize-none"}
          rows={2}
          placeholder="المدينة، الحي، الشارع، رقم الدار..."
          value={form.address}
          onChange={(e) => { set("address", e.target.value); clearErr("address"); }}
        />
        {fieldErrors.address && <p className={errCls}>{fieldErrors.address}</p>}
      </div>

      {/* Total */}
      <div className="bg-brand-light p-3 flex items-center justify-between rounded-sm">
        <span className="text-sm text-brand-gray">المجموع الكلي</span>
        <span className="font-black text-brand-navy text-lg">{formatPrice(total)}</span>
      </div>

      {/* Submit buttons */}
      <div className="flex flex-col gap-3 pt-1">
        {/* اشترِ الآن */}
        <button
          type="button"
          onClick={submitCod}
          disabled={anySubmitting}
          className="btn-purchase-animate w-full bg-[#16A34A] text-white font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#15803d] active:scale-95 transition-all text-base disabled:opacity-60 disabled:[animation:none] rounded-sm"
        >
          {submittingCod ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
          {submittingCod ? "كيتم التسجيل..." : "اشترِ الآن"}
        </button>

        {/* اطلب عبر واتساب */}
        <button
          type="button"
          onClick={submitWhatsApp}
          disabled={anySubmitting}
          className="w-full border-2 border-[#25D366] text-brand-navy font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all text-base disabled:opacity-60 rounded-sm"
        >
          {submittingWhatsApp
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />}
          {submittingWhatsApp ? "كيتم فتح واتساب..." : "اطلب عبر واتساب"}
        </button>
      </div>

      <p className="text-xs text-center text-brand-gray">
        💳 الدفع عند الاستلام — توصيل مجاني 100%
      </p>
    </div>
  );
}
