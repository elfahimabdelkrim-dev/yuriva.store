// lib/meta-capi.ts — SERVER-SIDE ONLY
// Meta Conversions API (CAPI) — Purchase event sender.
// Never import in client components. Never log or return the access token.

import crypto from "crypto";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Normalise a Moroccan phone number for CAPI hashing.
 * Meta expects: digits only, with country code, no leading +.
 * Examples:
 *   "0612345678"   → "212612345678"
 *   "+212612345678" → "212612345678"
 *   "212612345678"  → "212612345678"
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("212") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "212" + digits.slice(1);
  return digits;
}

function hashPhone(raw: string): string | null {
  const normalized = normalizePhone(raw.trim());
  if (!normalized || normalized.length < 9) return null;
  return sha256(normalized);
}

function hashCity(city: string): string {
  // Meta expects: lowercase, no spaces, no punctuation, digits allowed
  return sha256(city.toLowerCase().replace(/\s+/g, "").trim());
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CapiPurchaseParams {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;

  // Deduplication — MUST match the browser pixel eventID
  eventId: string;

  // Order data
  orderId: string;
  value: number;
  productId: string;
  productTitle: string;
  numItems: number;

  // User data (all optional — include as much as available)
  phone?: string;
  city?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;   // _fbp cookie
  fbc?: string;   // _fbc cookie

  // Source
  eventSourceUrl?: string;
}

export interface CapiResult {
  ok: boolean;
  error?: string;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function sendCapiPurchase(params: CapiPurchaseParams): Promise<CapiResult> {
  const {
    pixelId,
    accessToken,
    testEventCode,
    eventId,
    orderId,
    value,
    productId,
    productTitle,
    numItems,
    phone,
    city,
    clientIp,
    userAgent,
    fbp,
    fbc,
    eventSourceUrl,
  } = params;

  const eventTime = Math.floor(Date.now() / 1000);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yuriva.store";

  // Build user_data — hash PII, pass IP/UA/cookies in clear
  const userData: Record<string, string> = {};
  if (phone) {
    const hashed = hashPhone(phone);
    if (hashed) userData.ph = hashed;
  }
  if (city) userData.ct = hashCity(city);
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const eventPayload: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    event_source_url: eventSourceUrl || siteUrl,
    user_data: userData,
    custom_data: {
      currency: "MAD",
      value,
      content_ids: [productId],
      content_name: productTitle,
      content_type: "product",
      num_items: numItems,
      order_id: orderId,
    },
  };

  const body: Record<string, unknown> = {
    data: [eventPayload],
    access_token: accessToken,
  };

  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      // Strip access token from error text before logging
      const safeText = text.replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[REDACTED]"').slice(0, 300);
      return { ok: false, error: `CAPI HTTP ${resp.status}: ${safeText}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = String(err)
      .replace(/access_token=[^&\s]*/gi, "access_token=[REDACTED]")
      .slice(0, 200);
    return { ok: false, error: msg };
  }
}
