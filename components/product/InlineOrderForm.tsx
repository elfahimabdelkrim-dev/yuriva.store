"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import type { Product, ProductColor } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  fbqInitiateCheckout,
  fbqPurchase,
  fbqContact,
  fbqAdvancedMatch,
  markPurchaseFired,
  isPurchaseFired,
  getCookie,
} from "@/lib/meta-pixel";
import toast from "react-hot-toast";
import { buildOrderWhatsAppURL } from "@/lib/whatsapp";
import type { WhatsAppOrderData } from "@/types";

// ── WhatsApp icon ─────────────────────────────────────────────────────────────
function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Props { product: Product; }

interface FormState {
  full_name: string;
  phone:     string;
  address:   string;
}

interface WaFormState {
  name:    string;
  phone:   string;
  size:    string;
  address: string;
}

type WaErrors = Partial<Record<keyof WaFormState, string>>;

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

// ── WhatsApp message builder ──────────────────────────────────────────────────
// Used ONLY for the WhatsApp mini-form (not the COD confirmation).
// Fires Contact + WhatsAppClick — NOT Purchase.
function buildWaMessage(opts: {
  name:        string;
  phone:       string;
  size:        string;
  address:     string;
  productName: string;
  price:       number;
  productUrl:  string;
}): string {
  return [
    "طلب جديد عبر واتساب من YURIVA ✅",
    "",
    "معلومات الزبون:",
    `الاسم الكامل: ${opts.name}`,
    `رقم الهاتف / واتساب: ${opts.phone}`,
    `القياس: ${opts.size}`,
    `العنوان: ${opts.address}`,
    "",
    "تفاصيل المنتوج:",
    `المنتوج: ${opts.productName}`,
    `الثمن: ${opts.price} درهم`,
    `الرابط: ${opts.productUrl}`,
    "",
    "ملاحظة: الزبون عمر فورم واتساب وبغى نأكدو معاه الطلب بالهاتف.",
  ].join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InlineOrderForm({ product }: Props) {
  const router = useRouter();

  // ── COD form state (unchanged) ────────────────────────────────────────────
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError,    setSizeError]    = useState("");
  const quantity = 1;

  const safeColors = Array.isArray(product.colors) ? product.colors : [];
  const reqCount   = Math.max(1, Math.min(Number(product.required_color_count) || 1, 4));
  const hasColors  = safeColors.length > 0;
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [colorError,     setColorError]     = useState("");

  const [form,          setForm]          = useState<FormState>({ full_name: "", phone: "", address: "" });
  const [fieldErrors,   setFieldErrors]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [submittingCod, setSubmittingCod] = useState(false);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const clearErr = (field: keyof FormState) =>
    setFieldErrors((e) => ({ ...e, [field]: undefined }));

  const safeSizes = Array.isArray(product.sizes) ? product.sizes : [];
  const total     = product.price * quantity;

  // ── WhatsApp mini-form state (NEW) ────────────────────────────────────────
  const [showWaForm,  setShowWaForm]  = useState(false);
  const [waForm,      setWaForm]      = useState<WaFormState>({ name: "", phone: "", size: "", address: "" });
  const [waErrors,    setWaErrors]    = useState<WaErrors>({});
  const [waBackupUrl, setWaBackupUrl] = useState<string | null>(null);
  const [waSubmitted, setWaSubmitted] = useState(false);

  // Sizes for WA mini-form: product sizes if available, else full default list
  const waSizes = safeSizes.length > 0 ? safeSizes : DEFAULT_SIZES;

  const setWa = (field: keyof WaFormState, value: string) =>
    setWaForm((f) => ({ ...f, [field]: value }));
  const clearWaErr = (field: keyof WaFormState) =>
    setWaErrors((e) => ({ ...e, [field]: undefined }));

  // Reset the WA mini-form
  const resetWaForm = () => {
    setWaForm({ name: "", phone: "", size: "", address: "" });
    setWaErrors({});
    setWaBackupUrl(null);
    setWaSubmitted(false);
  };

  // ── Color helpers ─────────────────────────────────────────────────────────
  const toggleColor = (color: ProductColor) => {
    setColorError("");
    const alreadySelected = selectedColors.some((c) => c.name === color.name);
    if (alreadySelected) {
      setSelectedColors((prev) => prev.filter((c) => c.name !== color.name));
    } else {
      if (selectedColors.length >= reqCount) {
        setColorError(reqCount === 1 ? "اختار لون واحد فقط" : `تقدر تختار غير ${reqCount} ألوان`);
        return;
      }
      setSelectedColors((prev) => [...prev, color]);
    }
  };

  const buildColorsJson = (): string =>
    JSON.stringify(selectedColors.map((c, i) => ({ pieceIndex: i, color: c })));
  const buildColorsParam = (): string =>
    selectedColors.length > 1
      ? selectedColors.map((c, i) => `${i + 1}: ${c.label}`).join("، ")
      : selectedColors[0]?.label ?? "";

  // ── COD validation ────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "الاسم ديالك مطلوب";
    if (!validateMoroccanPhone(form.phone)) errs.phone = "دخل رقم هاتف صحيح (06، 07، +212...)";
    if (!form.address.trim()) errs.address = "العنوان مطلوب";
    let sizeOk = true;
    if (safeSizes.length > 0 && !selectedSize) { setSizeError("خاصك تختار القياس"); sizeOk = false; }
    else setSizeError("");
    let colorOk = true;
    if (hasColors && selectedColors.length < reqCount) {
      setColorError(reqCount === 1 ? "اختار اللون" : `خاصك تختار ${reqCount} ألوان`);
      colorOk = false;
    } else setColorError("");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0 && sizeOk && colorOk;
  };

  // ── COD submit (Buy Now) — fires Purchase ─────────────────────────────────
  // This is a real order: saved to Supabase, synced to Google Sheets,
  // and fbqPurchase is fired (CAPI deduplication via purchaseEventId).
  // WhatsApp opens afterwards as order CONFIRMATION only — not the trigger.
  const submitCod = async () => {
    if (!validate()) return;
    setSubmittingCod(true);
    const purchaseEventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";
    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      quantity, selectedSize || undefined
    );
    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName  = nameParts.slice(1).join(" ") || firstName;
      const res = await fetch("/api/orders", {
        method: "POST",
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

      // COD Purchase event — dedup guard
      if (isPurchaseFired(purchaseEventId)) {
        console.warn("[Meta Pixel] Purchase already fired for eventId:", purchaseEventId, "— skipping");
      } else {
        fbqAdvancedMatch(form.phone, firstName, lastName);
        fbqPurchase(
          { id: product.id, title: product.title, price: product.price },
          orderId, total, quantity, purchaseEventId
        );
        markPurchaseFired(purchaseEventId);
      }

      // WhatsApp opens for order CONFIRMATION (Purchase was already fired above)
      const waData: WhatsAppOrderData = {
        order_id:      orderId,
        customer_name: form.full_name.trim(),
        phone:         form.phone.trim(),
        city:          "",
        address:       form.address.trim(),
        total,
        delivery_price: 0,
        items: [{
          id:            orderId,
          product_id:    product.id,
          product_title: product.title,
          product_slug:  product.slug,
          product_image: "",
          price:         product.price,
          quantity,
          size:          selectedSize,
          color:         selectedColors[0] ?? undefined,
          pack_colors:   selectedColors.length > 1
                           ? selectedColors.map((c, i) => ({ pieceIndex: i, color: c }))
                           : undefined,
          is_pack:       selectedColors.length > 1,
        }],
      };
      const waUrl = buildOrderWhatsAppURL(waData);
      try { sessionStorage.setItem(`wa_order_${orderId}`, waUrl); } catch { /* ignore */ }

      const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(
        typeof navigator !== "undefined" ? navigator.userAgent : ""
      );
      if (isMobile) { window.location.href = waUrl; }
      else { window.open(waUrl, "_blank", "noopener,noreferrer"); }

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

  // ── WhatsApp mini-form submit ──────────────────────────────────────────────
  // Does NOT create a Supabase order — purely opens WhatsApp with customer info.
  // Fires ONLY: fbq('track', 'Contact') + fbq('trackCustom', 'WhatsAppClick')
  // Does NOT fire: fbq('track', 'Purchase')
  const submitWa = () => {
    const errs: WaErrors = {};
    if (!waForm.name.trim())              errs.name    = "دخل الاسم الكامل";
    if (!validateMoroccanPhone(waForm.phone)) errs.phone = "دخل رقم الهاتف اللي خدام فالاتصال";
    if (!waForm.size)                     errs.size    = "اختار القياس";
    if (!waForm.address.trim())           errs.address = "دخل العنوان الكامل";
    setWaErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const productUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/products/${product.slug}`
        : `https://yuriva.store/products/${product.slug}`;

    const message = buildWaMessage({
      name:        waForm.name.trim(),
      phone:       waForm.phone.trim(),
      size:        waForm.size,
      address:     waForm.address.trim(),
      productName: product.title,
      price:       product.price,
      productUrl,
    });

    const waNumber = siteConfig.whatsappNumber || "212666648564";
    const waUrl    = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    // Tracking: Contact + WhatsAppClick — NO Purchase
    try {
      fbqContact();
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("trackCustom", "WhatsAppClick");
      }
    } catch { /* ignore */ }

    // Store backup URL (shown if WhatsApp doesn't open)
    setWaBackupUrl(waUrl);
    setWaSubmitted(true);

    // Open WhatsApp: app on mobile, wa.me in new tab on desktop
    const isMobile = typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = waUrl;
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inp    = "w-full bg-white border border-gray-200 focus:border-brand-navy px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors rounded-lg";
  const lbl    = "block text-sm font-semibold text-gray-700 mb-1";
  const errCls = "text-red-500 text-xs mt-1";
  const waInp  = "w-full bg-white border border-[#25D366]/40 focus:border-[#25D366] px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors rounded-lg";
  const waLbl  = "block text-sm font-semibold text-gray-800 mb-1";

  return (
    <div className="mt-6 rounded-3xl bg-[#0f172a] p-[3px] shadow-xl">

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-t-[1.35rem] px-5 pt-5 pb-4 border-b border-gray-100 text-center">
        <h3 className="animate-checkout-title-glow font-black text-2xl leading-snug tracking-tight">كمّل طلبك فـ 30 ثانية</h3>
        <p className="text-xs text-gray-500 mt-1.5">الدفع عند الاستلام والتأكيد عبر الهاتف</p>
      </div>

      {/* ── COD form body ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-b-[1.35rem] px-5 py-5 space-y-4">

        {/* Price block */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
          <span className="text-base font-black text-gray-900">
            الثمن: {formatPrice(total)}
          </span>
        </div>

        {/* Size selector (COD) */}
        {safeSizes.length > 0 && (
          <div>
            <label className={lbl}>المقاس</label>
            <div className="flex flex-wrap gap-2">
              {safeSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSelectedSize(s); setSizeError(""); }}
                  className={`px-4 py-2 border text-sm font-bold transition-all rounded-lg ${
                    selectedSize === s
                      ? "bg-brand-navy text-white border-brand-navy"
                      : "border-gray-300 text-gray-700 hover:border-brand-navy hover:text-brand-navy"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {sizeError && <p className={errCls}>{sizeError}</p>}
          </div>
        )}

        {/* Color selector (COD) */}
        {hasColors && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + " mb-0"}>
                {reqCount === 1 ? "اللون" : "الألوان"}
              </label>
              {reqCount > 1 && (
                <span className="text-xs text-gray-500">
                  {selectedColors.length === 0
                    ? `اختار ${reqCount} ألوان`
                    : `اخترت ${selectedColors.length} من ${reqCount}`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {safeColors.map((color) => {
                const isSelected = selectedColors.some((c) => c.name === color.name);
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => toggleColor(color)}
                    title={color.label}
                    className={`flex items-center gap-1.5 px-3 py-2 border text-sm font-medium transition-all rounded-lg ${
                      isSelected
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-gray-300 text-gray-700 hover:border-brand-navy"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/50 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.label}
                    {isSelected && reqCount > 1 && (
                      <span className="text-[10px] font-bold opacity-75 mr-0.5">
                        {selectedColors.findIndex((c) => c.name === color.name) + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {colorError && <p className={errCls}>{colorError}</p>}
          </div>
        )}

        {/* Full name (COD) */}
        <div>
          <label className={lbl}>الاسم الكامل *</label>
          <input
            type="text"
            className={inp}
            placeholder="مثال: فاطمة العلوي"
            value={form.full_name}
            onChange={(e) => { set("full_name", e.target.value); clearErr("full_name"); }}
          />
          {fieldErrors.full_name && <p className={errCls}>{fieldErrors.full_name}</p>}
        </div>

        {/* Phone (COD) */}
        <div>
          <label className={lbl}>رقم الهاتف / واتساب *</label>
          <input
            type="tel"
            className={inp}
            placeholder="مثال: 0612345678"
            dir="ltr"
            value={form.phone}
            onChange={(e) => { set("phone", e.target.value); clearErr("phone"); }}
          />
          {fieldErrors.phone && <p className={errCls}>{fieldErrors.phone}</p>}
        </div>

        {/* City + address — ONE field (COD) */}
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

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pt-1">

          {/* Buy Now (COD) — fires Purchase for real orders */}
          <button
            type="button"
            onClick={submitCod}
            disabled={submittingCod}
            className="btn-purchase-animate w-full bg-[#16A34A] text-white font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#15803d] active:scale-95 transition-all text-base disabled:opacity-60 disabled:[animation:none] rounded-xl"
          >
            {submittingCod ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
            {submittingCod ? "كيتم التسجيل..." : "اشترِ الآن"}
          </button>

          <p className="text-xs text-center text-gray-400">ما عرفديتيش تعمر الطلب؟</p>

          {/* WhatsApp button — shows mini-form, does NOT fire Purchase */}
          <button
            type="button"
            onClick={() => { setShowWaForm(true); setWaBackupUrl(null); setWaSubmitted(false); }}
            disabled={submittingCod}
            className="w-full border-2 border-[#25D366] text-gray-800 font-bold py-4 flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white transition-all text-base disabled:opacity-60 rounded-xl"
          >
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            اطلب عبر واتساب
          </button>

          {/* ── WhatsApp mini-form (appears after button click) ─────────── */}
          {showWaForm && (
            <div className="border-2 border-[#25D366]/50 rounded-2xl p-4 space-y-3 bg-[#f0fdf4]">

              {/* Mini-form header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                  <span className="text-sm font-black text-gray-900">
                    فورم الطلب عبر واتساب
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowWaForm(false); resetWaForm(); }}
                  className="text-xs text-gray-400 hover:text-gray-700 font-bold px-2 py-0.5 border border-gray-200 rounded bg-white"
                >
                  ✕ إلغاء
                </button>
              </div>

              {/* Success state — show backup link after submit */}
              {waSubmitted ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm font-bold text-green-700">
                    ✅ رسالتك جاهزة، كيفتح واتساب...
                  </p>
                  <p className="text-xs text-gray-500">
                    إذا ما فتحش واتساب تلقائياً، اضغط هنا:
                  </p>
                  {waBackupUrl && (
                    <a
                      href={waBackupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <WhatsAppIcon className="h-5 w-5 text-white" />
                      فتح واتساب مباشرة
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => { setWaSubmitted(false); setWaBackupUrl(null); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    تعديل البيانات
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Full name */}
                  <div>
                    <label className={waLbl}>الاسم الكامل *</label>
                    <input
                      type="text"
                      className={waInp}
                      placeholder="مثال: محمد العلوي"
                      value={waForm.name}
                      onChange={(e) => { setWa("name", e.target.value); clearWaErr("name"); }}
                    />
                    {waErrors.name && <p className={errCls}>{waErrors.name}</p>}
                  </div>

                  {/* 2. Phone */}
                  <div>
                    <label className={waLbl}>رقم الهاتف / واتساب *</label>
                    <input
                      type="tel"
                      className={waInp}
                      placeholder="مثال: 0612345678"
                      dir="ltr"
                      value={waForm.phone}
                      onChange={(e) => { setWa("phone", e.target.value); clearWaErr("phone"); }}
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      دخل الرقم اللي نقدر نتاصلو معاك فيه ونأكدو الطلب
                    </p>
                    {waErrors.phone && <p className={errCls}>{waErrors.phone}</p>}
                  </div>

                  {/* 3. Size */}
                  <div>
                    <label className={waLbl}>القياس *</label>
                    <div className="flex flex-wrap gap-2">
                      {waSizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setWa("size", s); clearWaErr("size"); }}
                          className={`px-3 py-1.5 border text-sm font-bold transition-all rounded-lg ${
                            waForm.size === s
                              ? "bg-[#25D366] text-white border-[#25D366]"
                              : "border-gray-300 text-gray-700 hover:border-[#25D366] bg-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {waErrors.size && <p className={errCls}>{waErrors.size}</p>}
                  </div>

                  {/* 4. Address */}
                  <div>
                    <label className={waLbl}>العنوان الكامل *</label>
                    <textarea
                      className={waInp + " resize-none"}
                      rows={2}
                      placeholder="مثال: الدار البيضاء، حي السلام، زنقة 12، رقم 5"
                      value={waForm.address}
                      onChange={(e) => { setWa("address", e.target.value); clearWaErr("address"); }}
                    />
                    {waErrors.address && <p className={errCls}>{waErrors.address}</p>}
                  </div>

                  {/* Submit WhatsApp form — fires Contact+WhatsAppClick, NOT Purchase */}
                  <button
                    type="button"
                    onClick={submitWa}
                    className="w-full bg-[#25D366] text-white font-black py-3.5 flex items-center justify-center gap-2 hover:bg-[#1ebe5d] active:scale-95 transition-all text-base rounded-xl"
                  >
                    <WhatsAppIcon className="h-5 w-5 text-white" />
                    أكمل الشراء
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
