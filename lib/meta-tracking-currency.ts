// lib/meta-tracking-currency.ts
// Shared utility — works both client-side and server-side.
//
// UI always displays prices in MAD ("199 درهم").
// Meta tracking can use MAD or USD depending on NEXT_PUBLIC_META_TRACKING_CURRENCY.
//
// Set NEXT_PUBLIC_META_TRACKING_CURRENCY=USD in Vercel if Meta's browser pixel
// rejects MAD for Purchase. Default is MAD — no conversion.

/**
 * Fixed conservative rate: 1 USD = 10 MAD.
 * This is intentionally conservative (real rate ~10.0 as of 2025).
 * Only used for tracking — never for customer-facing prices.
 */
export const MAD_TO_USD_RATE = 10;

/** Display currency shown to customers — never changes */
export const DISPLAY_CURRENCY = "MAD" as const;

/**
 * Returns the currency string to send in Meta Pixel + CAPI payloads.
 * Reads NEXT_PUBLIC_META_TRACKING_CURRENCY from env.
 * Valid values: "MAD" (default) | "USD"
 */
export function getTrackingCurrency(): "MAD" | "USD" {
  const raw = process.env.NEXT_PUBLIC_META_TRACKING_CURRENCY ?? "";
  return raw.trim().toUpperCase() === "USD" ? "USD" : "MAD";
}

/**
 * Convert a MAD display value to the configured tracking value.
 *
 * - If tracking currency is MAD: returns value unchanged (no conversion).
 * - If tracking currency is USD: divides by MAD_TO_USD_RATE, rounds to 2 decimals.
 *
 * Examples:
 *   199 MAD, tracking=MAD → 199
 *   199 MAD, tracking=USD → 19.9
 *   250 MAD, tracking=USD → 25.0
 */
export function convertToTrackingValue(valueMAD: number): number {
  const currency = getTrackingCurrency();
  if (currency === "MAD") return valueMAD;
  // USD conversion: round to 2 decimal places
  return Math.round((valueMAD / MAD_TO_USD_RATE) * 100) / 100;
}
