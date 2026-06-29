// lib/meta-pixel.ts — CLIENT-SIDE ONLY
// Safe wrapper around window.fbq — never import in server components.
// The pixel is already initialised by TrackingPixels.tsx (fbq('init') + PageView).

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

// ── Events ──────────────────────────────────────────────────────────────────

export interface ProductMeta {
  id: string;
  title: string;
  price: number;
}

/** Fire on product detail page mount */
export function fbqViewContent(product: ProductMeta) {
  _fbq("track", "ViewContent", {
    content_ids: [product.id],
    content_name: product.title,
    content_type: "product",
    value: product.price,
    currency: "MAD",
  });
  console.log("[Meta Pixel] ViewContent fired", "product:", product.id, "price:", product.price);
}

/** Fire when the order modal opens (user initiates checkout) */
export function fbqInitiateCheckout(product: ProductMeta, quantity: number, size?: string) {
  _fbq("track", "InitiateCheckout", {
    content_ids: [product.id],
    content_name: product.title,
    content_type: "product",
    value: product.price * quantity,
    currency: "MAD",
    num_items: quantity,
    contents: [{ id: product.id, quantity, item_price: product.price, size: size ?? "" }],
  });
  console.log("[Meta Pixel] InitiateCheckout fired", "product:", product.id, "qty:", quantity, "value:", product.price * quantity);
}

/** Fire after /api/orders returns success — use the SAME eventId sent to CAPI */
export function fbqPurchase(
  product: ProductMeta,
  orderId: string,
  value: number,
  quantity: number,
  eventId: string
) {
  _fbq(
    "track",
    "Purchase",
    {
      content_ids: [product.id],
      content_name: product.title,
      content_type: "product",
      value,
      currency: "MAD",
      num_items: quantity,
      order_id: orderId,
    },
    { eventID: eventId }
  );
  console.log("[Meta Pixel] Purchase fired", "orderId:", orderId, "value:", value, "eventId:", eventId);
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
