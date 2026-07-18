"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { validateMoroccanPhone, formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  fbqInitiateCheckout,
  fbqContact,
  getCookie,
} from "@/lib/meta-pixel";
import toast from "react-hot-toast";

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

  // ── Attribution capture — runs once on mount ──────────────────────────────────
  // Reads fbclid + utm_* from URL params, landing_page + referrer from window,
  // and persists to sessionStorage. submitCod reads these back and sends with order.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const fbclid      = url.searchParams.get("fbclid")       || "";
      const utmSource   = url.searchParams.get("utm_source")   || "";
      const utmMedium   = url.searchParams.get("utm_medium")   || "";
      const utmCampaign = url.searchParams.get("utm_campaign") || "";
      const utmContent  = url.searchParams.get("utm_content")  || "";
      const landingPage = window.location.href;
      const referrer    = document.referrer || "";

      const ss = sessionStorage;
      const store = (key: string, val: string) => { if (val) ss.setItem("yuriva_attr_" + key, val); };

      // Only capture landing_page + referrer once (first touch)
      if (!ss.getItem("yuriva_attr_landing_page")) {
        store("landing_page", landingPage);
        store("referrer",     referrer);
      }
      // fbclid + utm_*: always update if present in current URL
      store("fbclid",       fbclid);
      store("utm_source",   utmSource);
      store("utm_medium",   utmMedium);
      store("utm_campaign", utmCampaign);
      store("utm_content",  utmContent);
    } catch { /* non-critical */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── InitiateCheckout — fires once when customer clicks the COD buy button ────
  // Triggered ONLY on the "اشترِ الآن" button click (submitCod).
  // Does NOT fire on page load, field focus, refresh, or WhatsApp interactions.
  const icFiredRef = useRef(false);
  const fireInitiateCheckoutOnce = () => {
    if (icFiredRef.current) return;
    icFiredRef.current = true;
    fbqInitiateCheckout(
      { id: product.id, title: product.title, price: product.price },
      1,
      undefined
    );
    console.log("[Meta Pixel] InitiateCheckout fired:", product.title);
  };

  const [sizeError,    setSizeError]    = useState("");
  const quantity = 1;

  // Colors removed from the order form - product has no colors.
  // The backend/Google Sheet "colors" column stays supported but empty.

  const [form,          setForm]          = useState<FormState>({ full_name: "", phone: "", address: "" });
  const [fieldErrors,   setFieldErrors]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [submittingCod, setSubmittingCod] = useState(false);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const clearErr = (field: keyof FormState) =>
    setFieldErrors((e) => ({ ...e, [field]: undefined }));

  const HIDDEN_SIZES = ["XS", "S"]; // hidden from the order form
  const safeSizes = (Array.isArray(product.sizes) ? product.sizes : []).filter(
    (s) => !HIDDEN_SIZES.includes(String(s).trim().toUpperCase())
  );
  const total     = product.price * quantity;

  // ── WhatsApp mini-form state (NEW) ────────────────────────────────────────
  const [showWaForm,  setShowWaForm]  = useState(false);
  const [waForm,      setWaForm]      = useState<WaFormState>({ name: "", phone: "", size: "", address: "" });
  const [waErrors,    setWaErrors]    = useState<WaErrors>({});
  const [waBackupUrl, setWaBackupUrl] = useState<string | null>(null);

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
  };

  // Colors: always sent empty (safe for API, Google Sheet, and thank-you page)
  const buildColorsJson  = (): string => "[]";
  const buildColorsParam = (): string => "";

  // ── COD validation ────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "الاسم ديالك مطلوب";
    if (!validateMoroccanPhone(form.phone)) errs.phone = "دخل رقم هاتف صحيح (06، 07، +212...)";
    if (!form.address.trim()) errs.address = "العنوان مطلوب";
    let sizeOk = true;
    if (safeSizes.length > 0 && !selectedSize) { setSizeError("خاصك تختار القياس"); sizeOk = false; }
    else setSizeError("");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0 && sizeOk;
  };

  // ── COD submit (Buy Now) ──────────────────────────────────────────────────
  // Saves a real order to Supabase + Google Sheets.
  // Purchase pixel fires on the THANK-YOU PAGE ONLY (with localStorage dedupe).
  // This function does NOT fire Purchase — it redirects to /thank-you which does.
  const submitCod = async () => {
    // Fire InitiateCheckout once on buy-button click (before validation)
    fireInitiateCheckoutOnce();
    if (!validate()) return;
    setSubmittingCod(true);
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");
    const eventSourceUrl = typeof window !== "undefined" ? window.location.href : "";

    // Read attribution data persisted on page load
    const attrGet = (key: string): string | undefined => {
      try { return sessionStorage.getItem("yuriva_attr_" + key) || undefined; } catch { return undefined; }
    };
    const fbclid      = attrGet("fbclid");
    const utmSource   = attrGet("utm_source");
    const utmMedium   = attrGet("utm_medium");
    const utmCampaign = attrGet("utm_campaign");
    const utmContent  = attrGet("utm_content");
    const landingPage = attrGet("landing_page");
    const referrer    = attrGet("referrer");

    // Construct fbc from fbclid if _fbc cookie is absent (Meta CAPI spec)
    const fbcFinal = fbc || (fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : undefined);

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
            utm_source:   utmSource,
            utm_medium:   utmMedium,
            utm_campaign: utmCampaign,
            utm_content:  utmContent,
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
            // event_id not sent — API generates purchase_${orderId} deterministically
            fbp:              fbp       || undefined,
            fbc:              fbcFinal  || undefined,
            fbclid:           fbclid    || undefined,
            landing_page:     landingPage || undefined,
            referrer:         referrer  || undefined,
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
      // ── Purchase fires on /thank-you after redirect — NOT HERE ────────────
      // The thank-you page uses localStorage key yuriva_purchase_tracked_${orderId}
      // to fire Purchase exactly once (browser pixel), deduped with CAPI event_id
      // purchase_${orderId} generated server-side in /api/orders.

      const qs = new URLSearchParams({
        order_id:   orderId,
        name:       form.full_name.trim(),
        phone:      form.phone.trim(),
        city:       "",
        address:    form.address.trim(),
        product:    product.title,
        product_id: product.id,
        size:       selectedSize || "",
        colors:     buildColorsParam(),
        qty:        String(quantity),
        total:      String(total),
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

    // Open WhatsApp directly — no success card shown.
    // Mobile: navigate so the app opens. Desktop: new tab.
    // If desktop popup is blocked, show a small fallback link.
    const isMobile = typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent);

    setWaBackupUrl(null); // clear any previous fallback

    if (isMobile) {
      window.location.href = waUrl;
    } else {
      const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Popup blocked — show a simple fallback link, keep form open
        setWaBackupUrl(waUrl);
      } else {
        // Opened successfully — close mini-form
        setShowWaForm(false);
        resetWaForm();
      }
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
            onClick={() => { setShowWaForm(true); setWaBackupUrl(null); }}
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

              {/* Submit — fires Contact+WhatsAppClick, NOT Purchase */}
              <button
                type="button"
                onClick={submitWa}
                className="w-full bg-[#25D366] text-white font-black py-3.5 flex items-center justify-center gap-2 hover:bg-[#1ebe5d] active:scale-95 transition-all text-base rounded-xl"
              >
                <WhatsAppIcon className="h-5 w-5 text-white" />
                أكمل الشراء
              </button>

              {/* Fallback link — shown ONLY if desktop popup was blocked */}
              {waBackupUrl && (
                <a
                  href={waBackupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-[#25D366] underline"
                >
                  فتح واتساب
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
