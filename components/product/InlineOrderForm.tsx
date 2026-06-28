"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import type { Product, ProductColor } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { fbqInitiateCheckout, fbqPurchase, fbqContact, getCookie } from "@/lib/meta-pixel";
import PackColorSelector from "./PackColorSelector";
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
}

interface FormState {
  full_name: string;
  phone:     string;
  address:   string;
}

// Build WhatsApp message from product + optional form data
function buildDirectWhatsAppMessage(opts: {
  product:       Product;
  selectedSize:  string;
  selectedColor: ProductColor | null;
  packColors:    (ProductColor | null)[];
  quantity:      number;
  total:         number;
  name?:         string;
  phone?:        string;
  address?:      string;
}): string {
  const { product, selectedSize, selectedColor, packColors, quantity, total,
          name, phone, address } = opts;

  const productUrl = typeof window !== "undefined"
    ? `${window.location.origin}/products/${product.slug}`
    : `https://yuriva.store/products/${product.slug}`;

  // Color line
  let colorLine = "";
  if (product.is_pack && packColors.some(Boolean)) {
    colorLine = packColors
      .filter(Boolean)
      .map((c, i) => `قطعة ${i + 1}: ${c?.label ?? ""}`)
      .join("، ");
  } else if (selectedColor) {
    colorLine = selectedColor.label;
  }

  const lines: string[] = [
    "السلام عليكم، بغيت نطلب من YURIVA 🛍️",
    "",
    `*المنتج:* ${product.title}`,
    `*الثمن:* ${total} درهم`,
  ];
  if (selectedSize) lines.push(`*المقاس:* ${selectedSize}`);
  if (colorLine)    lines.push(`*اللون:* ${colorLine}`);
  if (quantity > 1) lines.push(`*الكمية:* ${quantity}`);
  lines.push(`*الرابط:* ${productUrl}`);

  if (name || phone || address) {
    lines.push("", "---");
    if (name)    lines.push(`*الاسم:* ${name}`);
    if (phone)   lines.push(`*الهاتف:* ${phone}`);
    if (address) lines.push(`*العنوان:* ${address}`);
  }

  lines.push("", "من فضلكم بغيت نأكد الطلب 🙏");
  return lines.join("\n");
}

// Open WhatsApp: app scheme on mobile, wa.me on desktop
function openWhatsApp(phoneNumber: string, message: string): void {
  const encoded  = encodeURIComponent(message);
  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent);

  if (isMobile) {
    console.log("[WhatsApp Order] Opening WhatsApp app directly");
    window.location.href = `whatsapp://send?phone=${phoneNumber}&text=${encoded}`;
  } else {
    console.log("[WhatsApp Order] Opening WhatsApp web fallback");
    window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, "_blank");
  }
}

export default function InlineOrderForm({ product }: Props) {
  const router = useRouter();

  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError,    setSizeError]    = useState("");
  const quantity = 1;

  // Color state (moved from ProductInfo)
  const safeColors = Array.isArray(product.colors) ? product.colors : [];
  const safePieces = Math.max(1, Math.min(Number(product.pack_pieces) || 1, 20));
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [packColors, setPackColors] = useState<(ProductColor | null)[]>(
    Array(safePieces).fill(null)
  );
  const [colorError, setColorError] = useState("");

  const [form,        setForm]        = useState<FormState>({ full_name: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submittingCod, setSubmittingCod] = useState(false);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const clearErr = (field: keyof FormState) =>
    setFieldErrors((e) => ({ ...e, [field]: undefined }));

  const safeSizes = Array.isArray(product.sizes) ? product.sizes : [];
  const total     = product.price * quantity;

  const hasColors     = safeColors.length > 0;
  const isPack        = !!product.is_pack && !!product.allow_piece_colors;
  const chosenPackCount = packColors.filter(Boolean).length;

  // Validate — used only by اشترِ الآن
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "الاسم ديالك مطلوب";
    if (!validateMoroccanPhone(form.phone)) errs.phone = "دخل رقم هاتف صحيح (06، 07، +212...)";
    if (!form.address.trim()) errs.address = "العنوان مطلوب";

    let sizeOk = true;
    if (safeSizes.length > 0 && !selectedSize) {
      setSizeError("خاصك تختار القياس");
      sizeOk = false;
    } else {
      setSizeError("");
    }

    // Color validation for اشترِ الآن
    let colorOk = true;
    if (hasColors) {
      if (isPack) {
        if (chosenPackCount < safePieces) {
          setColorError(`خاصك تختار لون لكل قطعة (${chosenPackCount} من ${safePieces})`);
          colorOk = false;
        } else {
          setColorError("");
        }
      } else {
        if (!selectedColor) {
          setColorError("خاصك تختار اللون");
          colorOk = false;
        } else {
          setColorError("");
        }
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0 && sizeOk && colorOk;
  };

  const buildColorsJson = (): string => {
    if (isPack && packColors.length > 0)
      return JSON.stringify(packColors.filter(Boolean).map((c, i) => ({ pieceIndex: i, color: c })));
    if (selectedColor) return JSON.stringify([selectedColor]);
    return "[]";
  };

  const buildColorsParam = (): string => {
    if (isPack && packColors.some(Boolean)) {
      return packColors
        .filter(Boolean)
        .map((c, i) => `قطعة ${i + 1}: ${c?.label ?? ""}`)
        .join("، ");
    }
    if (selectedColor) return selectedColor.label;
    return "";
  };

  // اشترِ الآن — full validation + order creation
  const submitCod = async () => {
    if (!validate()) return;
    setSubmittingCod(true);

    const purchaseEventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";

    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      quantity,
      selectedSize || undefined
    );

    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName  = nameParts.slice(1).join(" ") || firstName;

      const res = await fetch("/api/orders", {
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
        colors:   buildColorsParam(),
        qty:      String(quantity),
        total:    String(total),
      });
      router.push(`/thank-you?${qs.toString()}`);
    } catch {
      toast.error("خطأ في الاتصال، جرب من جديد");
      setSubmittingCod(false);
    }
  };

  // اطلب عبر واتساب — DIRECT, no validation, no API call
  const submitWhatsApp = () => {
    console.log("[WhatsApp Order] Direct WhatsApp clicked");

    const phoneNumber = siteConfig.whatsappNumber;
    const message = buildDirectWhatsAppMessage({
      product,
      selectedSize,
      selectedColor,
      packColors,
      quantity,
      total,
      name:    form.full_name.trim()  || undefined,
      phone:   form.phone.trim()      || undefined,
      address: form.address.trim()    || undefined,
    });

    try { fbqContact(); } catch { /* ignore */ }

    openWhatsApp(phoneNumber, message);
  };

  const inp    = "w-full border border-gray-300 focus:border-brand-navy px-3 py-2.5 text-sm outline-none transition-colors rounded-sm";
  const lbl    = "block text-sm font-bold text-brand-navy mb-1";
  const errCls = "text-red-500 text-xs mt-1";

  return (
    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">

      {/* Title + helper */}
      <div>
        <h3 className="font-black text-brand-navy text-lg">كمّل طلبك فـ 30 ثانية</h3>
        <p className="text-xs text-brand-gray mt-0.5">الدفع عند الاستلام والتأكيد عبر الهاتف</p>
      </div>

      {/* المقاس */}
      {safeSizes.length > 0 && (
        <div>
          <label className={lbl}>المقاس</label>
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

      {/* اللون — non-pack single color selector */}
      {!isPack && hasColors && (
        <div>
          <p className="font-bold text-brand-navy text-sm mb-2">
            اللون{selectedColor ? `: ${selectedColor.label}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {safeColors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => { setSelectedColor(color); setColorError(""); }}
                title={color.label}
                className={`flex items-center gap-1.5 px-3 py-2 border text-sm font-medium transition-all rounded-sm ${
                  selectedColor?.name === color.name
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-gray-300 text-brand-navy hover:border-brand-navy"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
              </button>
            ))}
          </div>
          {colorError && <p className={errCls}>{colorError}</p>}
        </div>
      )}

      {/* اللون — pack multi-color selector */}
      {isPack && hasColors && (
        <div>
          <p className="font-bold text-brand-navy text-sm mb-2">
            {chosenPackCount > 0
              ? `اخترت ${chosenPackCount} من ${safePieces} ألوان`
              : "اختر لون كل قطعة"}
          </p>
          <PackColorSelector
            pieces={safePieces}
            colors={safeColors}
            selected={packColors}
            onChange={(i, c) => {
              const updated = [...packColors];
              updated[i] = c;
              setPackColors(updated);
              if (colorError) setColorError("");
            }}
            error={colorError || undefined}
          />
        </div>
      )}

      {/* الاسم ديالك */}
      <div>
        <label className={lbl}>الاسم ديالك *</label>
        <input
          type="text"
          className={inp}
          placeholder="مثال: فاطمة"
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
          placeholder="مثال: 0660000000"
          dir="ltr"
          value={form.phone}
          onChange={(e) => { set("phone", e.target.value); clearErr("phone"); }}
        />
        {fieldErrors.phone && <p className={errCls}>{fieldErrors.phone}</p>}
      </div>

      {/* المدينة والعنوان */}
      <div>
        <label className={lbl}>المدينة والعنوان *</label>
        <textarea
          className={inp + " resize-none"}
          rows={2}
          placeholder="مثال: الدار البيضاء، سباتة، قرب المسجد"
          value={form.address}
          onChange={(e) => { set("address", e.target.value); clearErr("address"); }}
        />
        {fieldErrors.address && <p className={errCls}>{fieldErrors.address}</p>}
      </div>

      {/* المجموع الكلي */}
      <div className="bg-brand-light p-3 flex items-center justify-between rounded-sm">
        <span className="text-sm text-brand-gray">المجموع الكلي</span>
        <span className="font-black text-brand-navy text-lg">{formatPrice(total)}</span>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 pt-1">
        {/* اشترِ الآن */}
        <button
          type="button"
          onClick={submitCod}
          disabled={submittingCod}
          className="btn-purchase-animate w-full bg-[#16A34A] text-white font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#15803d] active:scale-95 transition-all text-base disabled:opacity-60 disabled:[animation:none] rounded-sm"
        >
          {submittingCod ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
          {submittingCod ? "كيتم التسجيل..." : "اشترِ الآن"}
        </button>

        {/* WhatsApp section */}
        <p className="text-xs text-center text-brand-gray">ما عرفتيش تعمر الطلب؟</p>

        {/* اطلب عبر واتساب — opens WhatsApp directly, no validation */}
        <button
          type="button"
          onClick={submitWhatsApp}
          disabled={submittingCod}
          className="w-full border-2 border-[#25D366] text-brand-navy font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all text-base disabled:opacity-60 rounded-sm"
        >
          <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
          اطلب عبر واتساب
        </button>
      </div>

      <p className="text-xs text-center text-brand-gray">
        💳 الدفع عند الاستلام — توصيل مجاني 100%
      </p>
    </div>
  );
}
