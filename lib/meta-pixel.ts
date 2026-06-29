// lib/meta-pixel.ts — CLIENT-SIDE ONLY
// Safe wrapper around window.fbq — never import in server components.
// Pixel is initialised by TrackingPixels.tsx (fbq("init") only).
// PageViewTracker.tsx fires all PageViews (initial + route changes).

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Safely call window.fbq — no-ops if pixel not loaded */
function _fbq(type: string, event: string, params?: object, options?: object) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (options) {
      window.fbq(type, event, params, options);
    } else if (params) {
      window.fbq(type, event, params);
    } else {
      window.fbq(type, event);
    }
  }
}

/** Ensure value is always a finite number >= 0 (Meta rejects NaN / strings) */
function safeValue(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ── Events ──────────────────────────────────────────────────────────────────

export interface ProductMeta {
  id: string;
  title: string;
  price: number;
}

/** Fire on product detail page mount */
export function fbqViewContent(product: ProductMeta) {
  const value = safeValue(product.price);
  _fbq("track", "ViewContent", {
    content_ids:  [product.id],
    content_name: product.title,
    content_type: "product",
    value,
    currency:     "MAD",
  });
  console.log("[Meta Pixel] ViewContent fired", "product:", product.id, "price:", value);
}

/** Fire when the order modal opens (user initiates checkout) */
export function fbqInitiateCheckout(product: ProductMeta, quantity: number, size?: string) {
  const unitPrice = safeValue(product.price);
  const qty       = Math.max(1, Number(quantity) || 1);
  const value     = unitPrice * qty;
  _fbq("track", "InitiateCheckout", {
    content_ids:  [product.id],
    content_name: product.title,
    content_type: "product",
    value,
    currency:     "MAD",
    num_items:    qty,
    contents:     [{ id: product.id, quantity: qty, item_price: unitPrice, size: size ?? "" }],
  });
  console.log("[Meta Pixel] InitiateCheckout fired", "product:", product.id, "qty:", qty, "value:", value);
}

/**
 * Fire after /api/orders returns success.
 * Uses the SAME eventId sent to CAPI for deduplication.
 *
 * Payload is intentionally minimal — only the 4 fields Meta requires for Purchase.
 * Extra fields (order_id, num_items, content_name) are excluded because any
 * undefined/invalid field can trigger Meta's "currency is invalid" validation error.
 *
 * 4th argument is ONLY { eventID } — no other properties.
 */
export function fbqPurchase(
  product: ProductMeta,
  orderId: string,
  value: number,
  quantity: number,
  eventId: string
) {
  // Strict numeric coercion — never NaN, Infinity, string, or negative
  const numericValue = Number(value);
  const safeVal      = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;

  // Minimum valid Purchase payload — currency hardcoded, never from a variable
  const purchasePayload = {
    value:        safeVal,          // number only
    currency:     "MAD" as const,   // hardcoded — not from env/store/formatPrice
    content_type: "product",
    content_ids:  [String(product.id || "")],
  };

  // 4th arg: ONLY eventID for CAPI deduplication — no other properties
  const dedupeOptions = { eventID: eventId };

  // RAW diagnostic log — shows exact payload before the real fbq call
  console.log("[Meta Pixel] RAW Purchase payload before fbq", {
    customData:                  purchasePayload,
    options:                     dedupeOptions,
    "typeof customData.value":   typeof purchasePayload.value,
    "customData.currency":       purchasePayload.currency,
    eventID:                     eventId,
  });

  // Direct window.fbq call — no wrapper — 100% explicit about arguments
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "Purchase", purchasePayload, dedupeOptions);
    console.log("[Meta Pixel] Purchase fired orderId:", orderId, "value:", safeVal, "eventId:", eventId);
  } else {
    console.warn("[Meta Pixel] Purchase NOT fired — fbq not available");
  }

  // Suppress unused-parameter lint warning (orderId + quantity logged above)
  void orderId; void quantity;
}

/**
 * Advanced Matching — re-calls fbq("init") with user signals BEFORE firing Purchase.
 * Meta Pixel hashes these values client-side; we pass RAW values here.
 * Do NOT log raw phone, name, or other PII.
 */
export function fbqAdvancedMatch(rawPhone: string, firstName: string, lastName: string) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || typeof window === "undefined" || typeof window.fbq !== "function") return;

  // Normalise phone to Meta format: digits only with country code, no +
  let phone = rawPhone.replace(/\D/g, "");
  if (phone.startsWith("0") && phone.length === 10) phone = "212" + phone.slice(1);
  else if (!phone.startsWith("212")) phone = "212" + phone;

  const matchData: Record<string, string> = { country: "ma" };
  if (phone.length >= 10)  matchData.ph = phone;
  if (firstName.trim())    matchData.fn = firstName.toLowerCase().trim();
  if (lastName.trim())     matchData.ln = lastName.toLowerCase().trim();

  // Re-init with advanced matching data — Meta merges user signals on re-init
  window.fbq("init", pixelId, matchData);

  // Log capability only — never log raw values
  console.log(
    "[Meta Pixel] Advanced Matching applied:",
    "has_ph=", !!(matchData.ph),
    "has_fn=", !!(matchData.fn),
    "has_ln=", !!(matchData.ln),
    "country=ma"
  );
}

/** Fire when WhatsApp opens after order is saved */
export function fbqContact() {
  _fbq("track", "Contact");
  console.log("[Meta Pixel] Contact fired");
}

/** Read a cookie value by name from document.cookie (client-only) */
export function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

// ── Purchase deduplication guard (sessionStorage) ─────────────────────────────
// Prevents double-firing Purchase if React re-renders or user navigates back.

const PURCHASE_KEY_PREFIX = "purchase_fired_";

/** Mark a purchaseEventId as fired — safe no-op if sessionStorage unavailable */
export function markPurchaseFired(eventId: string): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(PURCHASE_KEY_PREFIX + eventId, "1");
    }
  } catch { /* ignore quota or security errors */ }
}

/** Check if a purchaseEventId was already fired this session */
export function isPurchaseFired(eventId: string): boolean {
  try {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(PURCHASE_KEY_PREFIX + eventId) === "1";
    }
  } catch { /* ignore */ }
  return false;
}
