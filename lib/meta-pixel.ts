// lib/meta-pixel.ts — CLIENT-SIDE ONLY
// Safe wrapper around window.fbq — never import in server components.
// Pixel is initialised by TrackingPixels.tsx (fbq("init") only).
// PageViewTracker.tsx fires all PageViews (initial + route changes).

import {
  getTrackingCurrency,
  convertToTrackingValue,
  DISPLAY_CURRENCY,
} from "@/lib/meta-tracking-currency";

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
  const displayValue   = safeValue(product.price);
  const trackingCur    = getTrackingCurrency();
  const trackingValue  = convertToTrackingValue(displayValue);
  _fbq("track", "ViewContent", {
    content_ids:  [product.id],
    content_name: product.title,
    content_type: "product",
    value:        trackingValue,
    currency:     trackingCur,
  });
  console.log(
    "[Meta Pixel] ViewContent fired",
    "product:", product.id,
    `trackingCurrency=${trackingCur}`,
    `displayCurrency=${DISPLAY_CURRENCY}`,
    `displayValue=${displayValue}`,
    `trackingValue=${trackingValue}`
  );
}

/** Fire when the order modal opens (user initiates checkout) */
export function fbqInitiateCheckout(product: ProductMeta, quantity: number, size?: string) {
  const unitPrice      = safeValue(product.price);
  const qty            = Math.max(1, Number(quantity) || 1);
  const displayValue   = unitPrice * qty;
  const trackingCur    = getTrackingCurrency();
  const trackingValue  = convertToTrackingValue(displayValue);
  _fbq("track", "InitiateCheckout", {
    content_ids:  [product.id],
    content_name: product.title,
    content_type: "product",
    value:        trackingValue,
    currency:     trackingCur,
    num_items:    qty,
    contents:     [{ id: product.id, quantity: qty, item_price: convertToTrackingValue(unitPrice), size: size ?? "" }],
  });
  console.log(
    "[Meta Pixel] InitiateCheckout fired",
    "product:", product.id, "qty:", qty,
    `trackingCurrency=${trackingCur}`,
    `displayCurrency=${DISPLAY_CURRENCY}`,
    `displayValue=${displayValue}`,
    `trackingValue=${trackingValue}`
  );
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
  const numericValue  = Number(value);
  const displayValue  = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  const trackingCur   = getTrackingCurrency();
  const trackingValue = convertToTrackingValue(displayValue);

  // Minimum valid Purchase payload — currency from config, never from UI/formatPrice
  const purchasePayload = {
    value:        trackingValue,    // number only — converted if USD
    currency:     trackingCur,      // "MAD" or "USD" from env
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
    trackingCurrency:            trackingCur,
    displayCurrency:             DISPLAY_CURRENCY,
    displayValue,
    trackingValue,
  });

  // Direct window.fbq call — no wrapper — 100% explicit about arguments
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "Purchase", purchasePayload, dedupeOptions);
    console.log(
      "[Meta Pixel] Purchase fired",
      "orderId:", orderId,
      `trackingCurrency=${trackingCur}`,
      `displayCurrency=${DISPLAY_CURRENCY}`,
      `displayValue=${displayValue}`,
      `trackingValue=${trackingValue}`,
      "eventId:", eventId
    );
  } else {
    console.warn("[Meta Pixel] Purchase NOT fired — fbq not available");
  }

  // Suppress unused-parameter lint warning
  void quantity;
}

/**
 * Advanced Matching — re-calls fbq("init") with user signals BEFORE firing Purchase.
 * Meta Pixel hashes these values client-side; we pass RAW values here.
 * Do NOT log raw phone, name, or other PII.
 */
export function fbqAdvancedMatch(rawPhone: string, firstName: string, lastName: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  // Prefer IDs stored by TrackingPixels.tsx at runtime (dynamic DB-loaded list).
  // Fall back to env vars if the global hasn't been set yet.
  const winIds = (window as unknown as Record<string, unknown>).__yuriva_pixel_ids;
  const pixelIds: string[] = Array.isArray(winIds) && winIds.length > 0
    ? (winIds as string[])
    : [
        process.env.NEXT_PUBLIC_META_PIXEL_ID,
        process.env.NEXT_PUBLIC_META_PIXEL_ID_2,
      ].filter(Boolean) as string[];

  if (pixelIds.length === 0) return;

  // Normalise phone to Meta format: digits only with country code, no +
  let phone = rawPhone.replace(/\D/g, "");
  if (phone.startsWith("0") && phone.length === 10) phone = "212" + phone.slice(1);
  else if (!phone.startsWith("212")) phone = "212" + phone;

  const matchData: Record<string, string> = { country: "ma" };
  if (phone.length >= 10)  matchData.ph = phone;
  if (firstName.trim())    matchData.fn = firstName.toLowerCase().trim();
  if (lastName.trim())     matchData.ln = lastName.toLowerCase().trim();

  // Re-init EACH pixel with advanced matching — Meta merges user signals on re-init
  for (const id of pixelIds) {
    window.fbq("init", id, matchData);
  }

  // Log capability only — never log raw values
  console.log(
    "[Meta Pixel] Advanced Matching applied to", pixelIds.length, "pixel(s):",
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

// ── Purchase deduplication guard (localStorage) ───────────────────────────────
// Key pattern: yuriva_purchase_tracked_${orderId}
// localStorage persists across tabs, refreshes, and browser restarts.
// This prevents double-firing Purchase if the customer refreshes the
// thank-you page, opens it in a new tab, or navigates back.
// sessionStorage would lose state when the tab closes — not safe enough.

const PURCHASE_KEY_PREFIX = "yuriva_purchase_tracked_";

/** Mark an orderId as Purchase-tracked — safe no-op if localStorage unavailable */
export function markPurchaseFired(orderId: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PURCHASE_KEY_PREFIX + orderId, "1");
    }
  } catch { /* ignore quota or security errors */ }
}

/** Check if an orderId was already Purchase-tracked */
export function isPurchaseFired(orderId: string): boolean {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(PURCHASE_KEY_PREFIX + orderId) === "1";
    }
  } catch { /* ignore */ }
  return false;
}
